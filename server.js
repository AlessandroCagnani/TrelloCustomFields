const express = require("express");
const path = require("path");
const cors = require("cors");
const axios = require("axios");
const bodyParser = require("body-parser");
const app = express();

// import functions from helper.js
const helper = require("./helper.js");

app.use(cors({ origin: "*" }));
app.use(express.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
app.use(express.json({ limit: "4MB" })); // parse application/json
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());


///////////////////////////////////////////////
/////////        USEFULL DATA       ///////////
///////////////////////////////////////////////

let key = "003b324ff68318b026ff6ff92d2e872f";

let domain = "https://alpha.blitzdata.com"

const Table = "bdt24k36e2u_Trello";

// blitzdata user
const u = '5';

// blitzdata key
const k = '632d7d4b179846e136e867075b4e36bcacd08f8ed62cb';

// blitzdata header
const blitzHeader = {
  headers: {
    "Content-Type": "application/json",
    "U": u,
    "K": k
  }
}

///////////////////////////////////////////////
/////////////       ROUTES       //////////////
///////////////////////////////////////////////

//TODO: separate the routes into different files

//////////////////// WEBHOOKS

//TODO: handle all the different possible events: delete of board, (add of new fields to the board)

app.post('/addWebhooks', (req, res) => {

  let callbackURL = 'https://bb8f-131-175-147-11.ngrok.io/webhook-handler';
  modelId = req.body.modelid

  axios.post(`https://api.trello.com/1/webhooks/?callbackURL=${callbackURL}&idModel=${modelId}&key=${key}&token=${req.body.token}`)
        .then((response) => {
          console.log('[server]: webhook created\n',response.data);
        })
        .catch((error) => {
          console.error('[server]: ERROR creating webhook\n', error);
        })

  res.status(200).json({message: 'webhooks created'});
})

/**
 * webhook handler when reciving a webhook from TRELLO;
 * update the blitzdata table with the new data from custom fields of the board
 */
app.get('/webhook-handler', (req, res) => {
  console.log('\n[server]: webhook received\n');
  res.status(200).json({message: 'webhook header received'});
});

app.post('/webhook-handler', async (req, res) => {
  console.log('\n[server]: webhook body received\n', req.body);

  let action = req.body.action;

  // add card entry on blitzadata table
  if (action.type === 'createCard') {
    let bodyArray = [];
    let bodyAndHash = helper.addCardBodyCreator(action.data.card);
    let body = bodyAndHash.body;

    // add information about the LIST name, add the BOARD name, and DATE of creation.
    console.log('[server]: List info', action.data.list);
    console.log('[server]: Board info', action.data.board);
    console.log('[server]: Date of creation', new Date(1000*parseInt(action.data.card.id.substring(0,8),16)));

    body.data['list'] = action.data.list.name;
    body.data['board'] = action.data.board.name;

    bodyArray.push(body);

    axios
    .post(domain + "/api/post.json", bodyArray, blitzHeader)
    .then((response) => {
      // console.log("[server]: response from blitzdata: ", response.data);
      console.log("[server]: card added to blitzdata: " , response.data);
    })
    .catch((error) => {
      console.error("[server]: ERROR adding card to blitzdata: ", error);
      res.status(500).json({message: 'error adding card to blitzdata'});
    })
  }

  // update card desecrption on blitzdata table
  if (action.type === 'updateCard') {

    if (action.display.translationKey === 'action_changed_description_of_card') {
      let bodyArray = [];
      let editEntry = {
        "cardid": action.data.card.id,
        "newValues": {
          "desc": action.data.card.desc
        }
      }

      let bodyAndHash = await helper.editCardBodyCreator(editEntry);
      bodyArray.push(bodyAndHash.body);

      console.log("[server]: blitz body: ", bodyArray);

      const blitzResponse = await helper.dispatchEditBlitzData(bodyArray, bodyAndHash.hash);

      if (blitzResponse) {
        res.status(200).json({message: 'card edited on blitzdata'});
      } else {
        res.status(500).json({message: 'error updating card on blitzdata'});
      }
    }
  }


  res.status(200).json({message: 'webhook resolved'});
});

//////////////////// blitz synch routes

/**
 * sync the card that are on trello but not on blitzdata
 * @param req.body.cards [Objects] list of ALL the cards available in trello
 * @route POST /syncBlitz
 */
app.post("/syncBlitz", async (req, res) => {
  const url = `${domain}/api/list/${Table}.json`;

  let cards;
  console.log("\n[server]: cards received from trello: ", req.body, "\n");

  if (req.body) {
    cards = req.body.cards;
  }

  const tableContent = await new Promise((resolve, reject) => {
    axios
      .get(url, blitzHeader)
      .then((response) => {
        // console.log("[server]: table content: ", response.data);
        resolve(response.data.items);
      })
      .catch((error) => reject(error));
  });

  let cardsToAdd = [];

  cards.forEach((card) => {
    let found = false;
    tableContent.forEach((item) => {
      if (item.cardid === card.id) {
        found = true;
      }
    });
    if (!found) {
      cardsToAdd.push(card);
    }
  });

  console.log("[server]: cards to add: ", cardsToAdd);

  let hashs = [];

  const addNewCards = await new Promise((resolve, reject) => {

    let bodyArray = [];

    cardsToAdd.forEach((card) => {

      // parse the first 8 characters of the card id as the date of creation of the card
      let date = new Date(1000*parseInt(card.id.substring(0,8),16));

      let data = {
        "cardid": card.id,
        "desc": card.desc,
        "name": card.name,
        "creationDate": date,
      }
      let hash = helper.blitzhash(data);
      hashs.push(hash);

      let body =
          {
            "action": "add",
            "data": data,
            "model": Table,
            "hash": hash,
            "blitzstamp": helper.blitzstamp(),
          };
      bodyArray.push(body);
    });

    axios.post(domain + "/api/post.json", bodyArray, blitzHeader)
        .then((response) => {
          // console.log("[server]: response from blitzdata: ", response.data);
          resolve(response.data)
        })

  });

  if (hashs.length > 0) {
    hashs.forEach((hash) => {
      if (addNewCards.results[hash].s) {
        console.log("[ blitz data ]: card with hash:", hash ," added to blitz successfully");
      } else {
        console.log("[ blitz data ]: card failed to add to blitz : " + addNewCards.results[hash].e + ", the hash is: " + hash);
      }
    });

    res.send("done");

  } else {

    res.send("nothing to add");

  }

});

/**
 * set the new field value to the blitzdata table
 *
 * @param req.body.cards {name: nameOfField, value: valueOfField, cardId: cardId} new field values to be setted
 */
app.post("/editField", async (req, res) => {
  const urlTable = `${domain}/api/list/${Table}.json`;
  const url = `${domain}/api/post.json`;

  console.log("\n[server]: body received from trello: ", req.body, "\n");

  let newField = req.body.newField;
  let cardId = req.body.cardId;

  let blitzBody = []

  const tableContent = await new Promise((resolve, reject) => {
    axios
      .get(urlTable, blitzHeader)
      .then((response) => {
        // console.log("[server]: table content: ", response.data);
        resolve(response.data.items);
      })
      .catch((error) => reject(error));
  });

  let entry = tableContent.find((item) => item.cardid === cardId);
  let hashId = entry["@hashID"];

  console.log("[server]: entry to edit: ", entry);

  let data = {}

  if (entry[newField.name] != null) {
    data[newField.name] = {"new": newField.value, "prev": entry[newField.name]};
  } else {
    data[newField.name] = {"new": newField.value};
  }


  console.log("[server]: data to send: ", data);

  let hash = helper.blitzhash(data);

  let body = {
    "action": "edit",
    "hashID": hashId,
    "data" : data,
    "model": Table,
    "hash": hash,
    "blitzstamp": helper.blitzstamp(),
  }

  blitzBody.push(body);

  console.log("[server]: blitz body: ", blitzBody);

  const addNewFields = await new Promise((resolve, reject) => {
    axios.post(url, blitzBody, blitzHeader)
        .then((response) => {
          resolve(response.data)})
  });



  if (addNewFields.results[hash].s) {
    console.log("[ blitz data ]: card with id:", cardId ," edited successfully: ", addNewFields.results[hash].s);
  } else {
    console.log("[ blitz data ]: card failed to add to blitz : " + addNewFields.results[hash].e + ", the hash is: " + hash);
  }

  res.send("done");

});

//////////////////// end blitz synch routes


app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/views/index.html");
});

app.post("/getBoard", (req, res) => {
  let url = req.body.urlBoard;

  axios.get(url).then((response) => {
    console.log(response);
    res.json(response);
  });
});


/**
 * add a new field to the board and set it on the table
  req.body: { 

    idModel: "id of the TRELLO model"
    modelType: "type of the TRELLO model"
    name: "name of the field"
    type: "type of the field"
    pos: "position of the field"

  }
 */

app.post("/setField", (req, res) => {
  try {
    axios.post("https://alpha.blitzdata.com/api/post.json", body)
  } catch (err) {
    res.status(500).json({ message: err.message, error: "failed setting item in the database" });
    //TODO: remove the fields setted on TRELLO if no sync with blitzdata
  }
})

///////////////////////////////////////////////
////////////     END ROUTES       /////////////
///////////////////////////////////////////////
// listener for
app.set("port", process.env.PORT || 8888);

var server = require("http").createServer(app);

server.on("listening", function () {
  console.log("Express server listening on port " + server.address().port);
});

server.listen(app.get("port"));

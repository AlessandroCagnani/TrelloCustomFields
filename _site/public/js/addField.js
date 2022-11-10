let appkey = "003b324ff68318b026ff6ff92d2e872f";

let t = window.TrelloPowerUp.iframe();

initPopUp();

async function initPopUp() {
  const boardFields = await new Promise((resolve, reject) => {
    t.get("board", "shared", "customFields")
        .then((fields) => resolve(fields));
  });

  let fieldContainer = document.getElementById("customFieldList");

  if (boardFields) {
    boardFields.forEach((field) => {
      fieldContainer.innerHTML += `<button>${field.name}</button>`;
    });
  }
}


// function setWebHooks(cardList) {
//
//   let body = { cardList: cardList, token: Trello.token() };
//
//   fetch("/addWebhooks", {
//     method: "post",
//     headers: {
//       Accept: "application/json",
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify(body),
//   }).then((response) => {
//     console.log("[client]: webhook created");
//   });
// }

let authSucces = async () => {
  console.log("[auth success]");

  let body = await new Promise((resolve, reject) => {
    t.cards('all').then((cards) => {
      resolve({ cards: cards } )
    });
  });

  console.log('[client] body.cards to be passed: ', body.cards);

  $.ajax({
    url: '/syncBlitz',
    type: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    dataType: 'json',
    data: JSON.stringify(body),
    success: (response) => {
      console.log("[client]: syncBlitz success\n", response);
    }
  })

  // await fetch("/syncBlitz", {method: "post", body: JSON.stringify(body)})
  //     .then((response) => {console.log('[client]: ', response)});

};

let authFailure = () => {
  console.log("[auth fail]");
};

window.Trello.authorize({
  type: "popup",
  name: "authorize your trello account",
  scope: {
    read: "true",
    write: "true",
  },
  expiration: "never",
  success: authSucces,
  error: authFailure,
});

// if (window.Trello.authorized()) {
//     console.log("[client]: already authorized");
//     authSucces();
// } else {
//   console.log("[client]: not authorized ... authorizing");
//   window.Trello.authorize({
//     type: "popup",
//     name: "authorize your trello account",
//     scope: {
//       read: "true",
//       write: "true",
//     },
//     expiration: "never",
//     success: authSucces,
//     error: authFailure,
//   });
// }


const getIdBoard = () => {
  return t.getContext().board;
};

let form = document.querySelector("#newFieldInfo");
/**
 *
 * event listener to add a new field to the board through...
 *
 * [board field]: t.get('board', 'shared', 'customFields') -> t.set('board', 'shared', 'customFields', [{name, type}]) with newly added field
 *
 * [card field]: t.get('card.id', 'shared', 'nameOfTheField') -> t.set('card.id', 'shared', 'nameOfTheField', {nameOfTheField, type, value}) with newly added field
 *
 * @type fields format: {name: "nameOfTheField, type: "typeOfTheField", [value: "valueOfTheField"]}
 */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  let formobj = new FormData(form);

  formobj.append("idModel", getIdBoard());
  formobj.append("modelType", "board");
  let body = {};

  for (const [key, value] of formobj) {
    body[key] = value;
  }
  body.token = Trello.token();

  //TODO: if no input field dont send the request and alert


  /**
   * update the board field with the new field
   *
   */
  let fieldBoardArray = [
    {
      name: body.name,
      type: body.type,
    }
  ];

  t.get('board', 'shared', 'customFields')
      .then((customFields) => {
        if (customFields) {
          customFields.forEach((field) => {
            fieldBoardArray.push({
              name: field.name,
              type: field.type,
            });
          })
        }
      })
  t.set('board', 'shared', 'customFields', fieldBoardArray)


  /**
   * update the cards field with the new field
   */
  let fieldCard =
      {
        name: body.name,
        type: body.type,
        value: undefined,
      };

  const cardsList = await new Promise((resolve, reject) => {
    t.cards('all').then((cards) => {
      resolve(cards);
    })
  });

  // adding the new field to the card
  cardsList.forEach((card) => {
    console.log('[ setting field ]: for card: ', card.name, ' with field: ', fieldCard.name);
    t.set(`${card.id}`, 'shared', `${fieldCard.name}`, fieldCard);
  })


});

document.querySelector("#newFieldButton").addEventListener("click", (e) => {
  e.preventDefault();
  let newField = document.querySelector("#newFieldInfo");

  if (e.target.innerHTML === "NEW FIELD") {
    newField.style.display = "block";
    e.target.innerHTML = "CANCEL";
  } else {
    newField.style.display = "none";
    e.target.innerHTML = "NEW FIELD";
  }
});

const axios = require("axios");


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
/////////        PRE-REQ SCRIPT     ///////////
///////////////////////////////////////////////

var makeCRCTable = function() {
    var c;
    var crcTable = [];
    for(var n =0; n < 256; n++) {
        c = n;
        for(var k =0; k < 8; k++) {
            c = ((c&1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        crcTable[n] = c;
    }
    return crcTable;
}

var crc32 = function(str) {
    str = JSON.stringify(str);
    var crcTable = crcTable || (crcTable = makeCRCTable());
    var crc = 0 ^ (-1);
    for (var i = 0; i < str.length; i++ ) {
        crc = (crc >>> 8) ^ crcTable[(crc ^ str.charCodeAt(i)) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
}

function base_convert(number, frombase, tobase) {
    return parseInt(number + "", frombase | 0).toString(tobase | 0);
}

function blitzhash(data) {
    let hash =
        base_convert(blitzstamp(), 10, 36) +
        "-" +
        base_convert(crc32(JSON.stringify(data)), 16, 36);
    return hash;
}

function blitzstamp() {
    return Math.round(new Date().getTime() / 1000) - 1577836800;
}

////////////////////////////////////////////////////////////////////////////////////////


function addCardBodyCreator(card) {
    let cardId = card.id;
    let name = card.name;
    let desc = card.desc;

    let data = {
        "cardid": cardId,
        "desc": desc,
        "name": name,
    }

    let hash = blitzhash(data);

    let body =
        {
            "action": "add",
            "data": data,
            "model": Table,
            "hash": hash,
            "blitzstamp": blitzstamp(),
        };

    return {body, hash};
}

/**
 * @param editEntry of the form { cardId: cardId, newValues: {name: "newName", desc: "newDesc", field1: "newValue1", ... , fieldN: "newValueN" } }
 */
async function editCardBodyCreator(editEntry) {
    const urlTable = `${domain}/api/list/${Table}.json`;
    const tableContent = await new Promise((resolve, reject) => {
        axios
            .get(urlTable, blitzHeader)
            .then((response) => {
                // console.log("[server]: table content: ", response.data);
                resolve(response.data.items);
            })
            .catch((error) => reject(error));
    });

    let oldEntry = tableContent.find((item) => item.cardid === editEntry.cardid);
    let data = {}
    let hashs = [];

    let newValues = editEntry.newValues;
    Object.keys(newValues).forEach((key) => {
        if (oldEntry[key] != null) {
            data[key] = {"new": newValues.key, "prev": oldEntry[key]};
        } else {
            data[key] = {"new": newValues.key};
        }
    });

    let hash = blitzhash(data);
    hashs.push(hash);

    let body = {
        "action": "edit",
        "hashID": oldEntry["@hashID"],
        "data" : data,
        "model": Table,
        "hash": hash,
        "blitzstamp": blitzstamp(),
    }

    return {body, hash};
}

/**
 *
 * @param body to edit with blitzData API call
 * @param hash of the body.data obj
 * @returns {Promise<boolean>}
 */
async function dispatchEditBlitzData(body, hash) {
    const url = `${domain}/api/post.json`;

    const response = await new Promise((resolve, reject) => {
        axios
            .post(url, body, blitzHeader)
            .then((response) => {
                resolve(response.data)})
            .catch((error) => reject(error));
    });

    if (response.results[hash].s) {
        console.log("[ blitz data ]: card edited successfully: ", response.results[hash].s);
        return true;
    } else {
        console.log("[ blitz data ]: card failed to add to blitz : " + response.results[hash].e + ", the hash is: " + hash);
        return false;
    }
}

// exports all the functions
module.exports = {
    addCardBodyCreator,
    blitzhash,
    blitzstamp,
    crc32,
    base_convert,
    makeCRCTable,
    editCardBodyCreator,
    dispatchEditBlitzData,
};



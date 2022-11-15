// auth section

let token = Cookies.get("token");

function setWebHooks(model_id) {

  let body = { modelid: model_id, token: Cookies.get("token") };

  fetch("/addWebhooks", {
    method: "post",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  }).then((response) => {
    console.log("[client]: webhook created:\n", response);
  });
}

async function auth() {

  let authSucces = async () => {
    console.log("[auth success]");
    Cookies.set("token", Trello.token(), { expires: 30 });

    token = Cookies.get("token");

    console.log("[client]: token setted: ", token);
  }
  let authFailure = () => {
    console.log("[auth fail] no token setted");
  };

  await window.Trello.authorize({
    type: "popup",
    name: "authorize your trello account",
    scope: {
      read: "true",
      write: "true",
    },
    expiration: "30days",
    success: authSucces,
    error: authFailure,
  });
}
console.log("[client]: token setted for session?: ", sessionStorage.getItem("token") != 1);
if (sessionStorage.getItem("token") != 1) {
  token ? console.log("[client]: already authenticated: ", token) : auth();
  sessionStorage.setItem("token", 1);
}

/**
 * Function to open the popUp of the power up
 * @param {*} t     reference to iframe by trello
 * @param {*} opts
 * @returns         the pop up to be displayed
 */
let onBtnClick = function (t, opts) {
  return t.modal({
    title: "Custom Fields",
    url: "/views/CustomFields.html",
    fullscreen: false,
    accentColor: "#0079BF",
    height: 500,
  });
};

/**

code for the visualization of the button

*/
window.TrelloPowerUp.initialize({
  "board-buttons": function (t, opts) {
    // init webhooks
    console.log("[client]: webhook setted: ", sessionStorage.getItem("webhooks") == 1);
    if (sessionStorage.getItem("webhooks") != 1) {
      t.board('id')
        .then((id) => {
          console.log('[client]: board id: ', id)
          setWebHooks(id.id);
        });
      sessionStorage.setItem("webhooks", 1);
    }

    t.get("board", "shared", "customFields")
      .then((fields) => {
        console.log("fields on the board: \n", fields)
      });

    t.lists('all')
        .then((lists) => console.log("lists on the board: \n",lists));

    //TODO: pass the information for the iframe here
    return [
      {
        //   icon : {},
        text: "Custom Fields",
        callback: onBtnClick,
        condition: "always",
      },
    ];
  },
  "card-back-section": function (t, opts) {
    var GRAY_ICON = 'https://cdn.hyperdev.com/us-east-1%3A3d31b21c-01a0-4da2-8827-4bc6e88b7618%2Ficon-gray.svg';
    //TODO: pass the information for the iframe here
    return [
      {
        title: "My custom field",
        icon: GRAY_ICON,
        content: {
          type: "iframe",
          url: t.signUrl("https://cstm-field-trello.herokuapp.com/views/cardBack.html"),
          height: 200,
        },
        action: {
          text: "Manage fields",
          callback: onBtnClick,
        }
      }
    ]
  },

  },
  {
    appKey: "003b324ff68318b026ff6ff92d2e872f",
    appName: "Custom Field",
  }
);



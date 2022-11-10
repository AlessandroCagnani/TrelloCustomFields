
window.Trello.authenticated()? console.log("[client]: already authenticated") : auth();


/**
 * Function to open the popUp of the power up
 * @param {*} t     reference to iframe by trello
 * @param {*} opts
 * @returns         the pop up to be displayed
 */
let onBtnClick = function (t, opts) {
  return t.popup({
    title: "set the field",
    url: "/views/addField.html",
    height: 278,
  });
};

/**

code for the visualization of the button

*/
window.TrelloPowerUp.initialize({
  "board-buttons": function (t, opts) {
    return [
      {
        //   icon : {},
        text: "Add Field",
        callback: onBtnClick,
        condition: "always",
      },
    ];
  },
  "card-back-section": function (t, opts) {
    var GRAY_ICON = 'https://cdn.hyperdev.com/us-east-1%3A3d31b21c-01a0-4da2-8827-4bc6e88b7618%2Ficon-gray.svg';
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
});

// auth section
async function auth() {

  let authSucces = async () => {
    console.log("[auth success]");
    Cookies.set("token", Trello.token(), { expires: 30 });
  }
  let authFailure = () => {
    console.log("[auth fail]");
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


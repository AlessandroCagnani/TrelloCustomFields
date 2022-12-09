let t = window.TrelloPowerUp.iframe();

// initBlitzFrame()

// async function initBlitzFrame() {

//     $.ajax({
//         url: 'https://alpha.blitzdata.com/datatable/edit/bdt24k36e2u_trello_v2/1?rp=datatable/tableView/bdt24k36e2u_trello_v2&ajax=1',
//         type: 'GET',
//         headers: {
//             'u': '5',
//             'k': '632d7d4b179846e136e867075b4e36bcacd08f8ed62cb',
//             'Access-Control-Allow-Origin': '*'
//         }
//     }).then((res) => {
//         console.log('[client] res: ', res);
//     })

// }

async function getSrc() {
  const res = await fetch(
    "https://alpha.blitzdata.com/datatable/edit/bdt24k36e2u_trello_v2/1?rp=datatable/tableView/bdt24k36e2u_trello_v2&ajax=1",
    {
      method: "GET",
      headers: {
        u: "5",
        k: "632d7d4b179846e136e867075b4e36bcacd08f8ed62cb"
      },
    }
  );
  const blob = await res.blob();
  console.log(blob);
  const urlObject = URL.createObjectURL(blob);
  console.log(urlObject);
//   document.querySelector("iframe").setAttribute("src", urlObject);
}

getSrc();

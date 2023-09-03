/*TODO
  手元の最新と比較
  比較して最新じゃなかった場合
    手元の情報まで情報を取得
    手元の情報と同じになったら終わり
    最新の情報を更新
  取得した情報を時間でソート
  discordへ送信
*/

/**
 * 指定したURLのRSSを取得する関数
 *
 * @param {string} url - RSSのURL
 * @return {string[[]]} - [tile, link, pubData] の配列(二次元配列)
 */
function getRssData(url = URL) {
  var xml = UrlFetchApp.fetch(url).getContentText();
  var document = XmlService.parse(xml);
  var root = document.getRootElement();
  const channel = root.getChild("channel");
  const items = channel.getChildren("item");

  let articles = [];
  for (let item of items) {
    let title = item.getChildText("title");
    let link = item.getChildText("link");
    let pubDate = item.getChildText("pubDate");
    articles.push([title, link, pubDate]);
  }
  console.log(articles);
  return articles;
}

/**
 * スプレッドシートにデータをセットする関数
 *
 * @param {string} url - スプレッドシートのURL
 * @param {string} sheetName - シート名
 * @param {string[[]]} array - シートに登録する2次元配列
 * @return {boolean} - 登録に成功したか失敗したかが帰ってくる
 */
function setDataToSheet(array, url = SHEET_URL, sheetName = SHEET_NAME) {
  var spreadSheet = SpreadsheetApp.openByUrl(url);
  var sheet = spreadSheet.getSheetByName(sheetName);
  sheet.getRange(1, 1, array.length, array[0].length).setValues(array);
  return true;
}

/**
 * スプレッドシートから全データを取得する
 *
 * @param {string} url - スプレッドシートのURL
 * @param {string} sheetName - シート名
 * @return {array} - スプレッドシートの情報が2次元配列で返る
 */
function getTableFromSheet(url = SHEET_URL, sheetName = SHEET_NAME) {
  var spreadSheet = SpreadsheetApp.openByUrl(url);
  var sheet = spreadSheet.getSheetByName(sheetName);
  return sheet.getDataRange().getValues();
}

/**
 * discordにメッセージを捜真する関数
 *
 * @param {string} message - 送信するメッセージの内容
 * @param {string} webhookUrl - webhookURL
 * @return {boolean} - 登録に成功したか失敗したかが帰ってくる
 */
const sendDiscordMessage = async function (message, webhookUrl = WEBHOOK_URL) {
  //APIのリクエストでPOSTデータするパラメーターを設定する
  let payload = {
    content: message,
    avatar_url:
      "https://wp-assets.rss.com/blog/wp-content/uploads/2019/10/10111557/social_style_3_rss-512-1.png",
  };
  let headers = {
    "Content-Type": "application/json",
  };
  //HTTP POSTで前述で設定したパラメーターをオプションで設定する。
  let options = {
    method: "post",
    payload: JSON.stringify(payload),
    headers: headers,
  };
  //APIにリクエストし、結果をログ出力する
  let responseDataPOST = UrlFetchApp.fetch(
    webhookUrl,
    options
  ).getContentText();
};

function main() {
  // スプレッドシートからデータを取得する
  data = getTableFromSheet();
  // メッセージ作成用の変数
  message = [];
  // 行数分ループ
  for (let i of data) {
    // RSSを取得
    rssData = getRssData((url = i[1]));
    // 日付が一致するか比較
    if (rssData[0][2] == i[2]) {
      break;
    }
    for (let j of rssData) {
      if (j[2] == i[2]) {
        i[2] = rssData[0][2];
        break;
      }
      message.push(j);
    }
  }

  // discordにメッセージを送信する
  for (let m of message) {
    sendDiscordMessage(m.join("\n"));
    Utilities.sleep(25);
  }

  // スプレッドシートを更新する
  setDataToSheet(data);
}

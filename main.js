// 環境変数
const SHEET_URL =
  PropertiesService.getScriptProperties().getProperty("SHEET_URL");
const SHEET_NAME =
  PropertiesService.getScriptProperties().getProperty("SHEET_NAME");
const WEBHOOK_URL =
  PropertiesService.getScriptProperties().getProperty("WEBHOOK_URL");

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
 * 2次元配列を日付順でソートする
 *
 * @param {string[]} array - [[タイトル,URL,日付],...] の2次元配列
 * @return {string[]} - ソートした配列が帰ってくる
 */
function SortTwoDimensionalArrayByDate(array) {
  array.sort(function (a, b) {
    return new Date(a[2]) - new Date(b[2]);
  });

  return array;
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
    if (i[2] == rssData[0][2]) {
      break;
    }
    // breakしたかどうかのフラグ
    isBreak = false;
    for (let j of rssData) {
      if (j[2] == i[2]) {
        i[2] = rssData[0][2];
        isBreak = true;
        break;
      }
      message.push(j);
    }
    // breakしなかった場合(一致する日付がrssになかった場合)
    if (isBreak == false) {
      // rssの最新の日付で更新
      i[2] = rssData[0][2];
    }
  }

  // スプレッドシートを更新する
  setDataToSheet(data);

  // 送信メッセージを日付順にソート
  message = SortTwoDimensionalArrayByDate(message);

  // discordにメッセージを送信する
  for (let m of message) {
    sendDiscordMessage(m.join("\n"));
    Utilities.sleep(25);
  }
}

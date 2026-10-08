/** Web アプリの入力画面を表示する。 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('申請情報整理 PDF の作成')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * 入力値を一時 Google ドキュメント経由で PDF にし、ブラウザーへ返す。
 * 入力内容や PDF はスプレッドシート・Drive へ保存しない。
 * @param {Object} payload フォーム入力
 * @return {{filename: string, base64: string}}
 */
function createPdf(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('入力内容を確認して、もう一度お試しください。');
  }
  if (JSON.stringify(payload).length > 50000 ||
      !Array.isArray(payload.participants) || payload.participants.length > 100) {
    throw new Error('入力できる文字数または受講者数の上限を超えています。');
  }

  var pdf = generatePdf_(payload);
  return {
    filename: pdf.getName(),
    base64: Utilities.base64Encode(pdf.getBytes())
  };
}

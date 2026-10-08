/** Google Apps Script web app entry point. */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('訓練実施結果 入力フォーム')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Creates a PDF from a validated, transient payload. The temporary document is
 * always moved to trash, including when PDF conversion fails.
 */
function generatePdf(payload) {
  const data = validatePayload_(payload);
  const document = DocumentApp.create('訓練実施結果_' + new Date().getTime());
  try {
    const body = document.getBody();
    body.appendParagraph('訓練実施結果 入力内容').setHeading(DocumentApp.ParagraphHeading.TITLE);
    body.appendParagraph('この文書は入力内容の確認用です。公式様式の代わりにはなりません。');
    appendSection_(body, '1. 会社・計画の情報', data.company);
    appendSection_(body, '2. 訓練の基本情報', data.training);
    data.attendees.forEach(function (attendee, index) {
      appendSection_(body, '3. 受講者 ' + (index + 1), attendee);
    });
    appendSection_(body, '4. 実施結果の説明', data.results);
    document.saveAndClose();
    const pdf = DriveApp.getFileById(document.getId()).getAs(MimeType.PDF);
    return { filename: '訓練実施結果.pdf', mimeType: 'application/pdf', data: Utilities.base64Encode(pdf.getBytes()) };
  } finally {
    DriveApp.getFileById(document.getId()).setTrashed(true);
  }
}

function appendSection_(body, title, values) {
  body.appendParagraph(title).setHeading(DocumentApp.ParagraphHeading.HEADING1);
  Object.keys(values).forEach(function (key) {
    const value = values[key];
    if (Array.isArray(value)) {
      body.appendParagraph(key + '：' + value.join('、'));
    } else if (value !== '') {
      body.appendParagraph(key + '：' + value);
    }
  });
}

function validatePayload_(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('入力内容を読み取れませんでした。');
  const company = cleanGroup_(payload.company, ['事業主名', '雇用保険適用事業所名', '所在地', '法人番号', '雇用保険適用事業所番号', '担当者・役職', '電話', 'メール', '管轄労働局', '計画届提出日', '提出済み確認', '該当区分']);
  const training = cleanGroup_(payload.training, ['訓練コース名', '講座名', '訓練機関名', '実施方法', '開始日', '終了日', '標準学習時間', '標準学習期間', '費用', '税区分', '支払日', '支払方法', '訓練目的', '業務上の活用', '計画との一致']);
  const results = cleanGroup_(payload.results, ['訓練の必要性', '事業展開・DX・GXとのつながり', '結果と活用', '計画変更と届出状況']);
  if (!company['事業主名'] || !company['メール'] || !training['訓練コース名'] || !training['開始日'] || !training['終了日']) {
    throw new Error('必須項目が不足しています。フォームを確認してください。');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(company['メール'])) throw new Error('メールアドレスの形式が正しくありません。');
  if (training['開始日'] && training['終了日'] && training['開始日'] > training['終了日']) throw new Error('訓練終了日は開始日以降にしてください。');
  if (!Array.isArray(payload.attendees) || payload.attendees.length < 1 || payload.attendees.length > 100) throw new Error('受講者は1〜100名で入力してください。');
  const attendeeKeys = ['氏名', '所属・職務', '受講開始日', '修了日', '修了状況', '実績', '学習場所', '修得内容', '証明書有無', '証明書名称', '実務活用予定'];
  const attendees = payload.attendees.map(function (row) {
    const attendee = cleanGroup_(row, attendeeKeys);
    if (!attendee['氏名']) throw new Error('受講者氏名は必須です。');
    if (attendee['受講開始日'] && attendee['修了日'] && attendee['受講開始日'] > attendee['修了日']) throw new Error('受講修了日は受講開始日以降にしてください。');
    return attendee;
  });
  return { company: company, training: training, attendees: attendees, results: results };
}

function cleanGroup_(source, allowedKeys) {
  if (!source || typeof source !== 'object') throw new Error('入力内容の形式が正しくありません。');
  const output = {};
  allowedKeys.forEach(function (key) {
    const value = source[key];
    if (Array.isArray(value)) output[key] = value.slice(0, 20).map(cleanValue_).join('、');
    else output[key] = cleanValue_(value);
  });
  return output;
}

function cleanValue_(value) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') throw new Error('入力値の形式が正しくありません。');
  const text = String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  if (text.length > 5000) throw new Error('入力できる文字数を超えています。');
  return text;
}

/**
 * 入力内容を申請準備用の確認PDFに整形して返す。
 * 正式な申請様式や受給可否の判定を代替するものではない。
 * @param {Object} payload company/plan/training/participants/result
 * @return {GoogleAppsScript.Base.Blob} ダウンロード用PDF Blob
 */
function generatePdf_(payload) {
  payload = payload || {};
  var company = payload.company || {};
  var plan = payload.plan || {};
  var training = payload.training || {};
  var result = payload.result || {};
  var participants = Array.isArray(payload.participants) ? payload.participants : [];
  var now = new Date();
  var timezone = Session.getScriptTimeZone();
  var today = Utilities.formatDate(now, timezone, 'yyyyMMdd');
  var companyName = pdfText_(company.employerName) || '申請情報';
  var safeName = companyName.replace(/[\\/:*?"<>|]/g, '_').substring(0, 60);
  var filename = safeName + '_リスキリング助成金申請情報_' + today + '.pdf';
  var doc = DocumentApp.create(filename.replace(/\.pdf$/i, ''));
  var docId = doc.getId();

  try {
    var body = doc.getBody();
    body.setMarginTop(42).setMarginBottom(42).setMarginLeft(48).setMarginRight(48);
    body.appendParagraph('人材開発支援助成金　申請情報整理シート')
      .setHeading(DocumentApp.ParagraphHeading.TITLE);
    body.appendParagraph('事業展開等リスキリング支援コース｜eラーニング・通信制')
      .setHeading(DocumentApp.ParagraphHeading.SUBTITLE);
    body.appendParagraph('作成日：' + Utilities.formatDate(now, timezone, 'yyyy年M月d日'));
    body.appendParagraph(
      '重要：このPDFは申請情報の整理・確認用です。厚生労働省の正式な申請様式を代替するものではなく、助成金の受給可否を判断するものでもありません。提出時は最新の公式様式・チェックリストを確認し、必要に応じて管轄労働局へ相談してください。'
    ).setBackgroundColor('#fff2cc');

    pdfSection_(body, '1. 会社・計画の情報');
    pdfTable_(body, [
      ['申請事業主名', company.employerName], ['雇用保険適用事業所名', company.workplaceName],
      ['事業所所在地', company.address], ['法人番号', company.corporateNumber],
      ['雇用保険適用事業所番号', company.insuranceOfficeNumber],
      ['担当者・役職', pdfJoin_([company.contactName, company.contactTitle], '／')],
      ['電話・メール', pdfJoin_([company.phone, company.email], '／')],
      ['管轄労働局', company.laborBureau], ['計画届の提出日', plan.submissionDate],
      ['訓練開始前に計画届を提出済みか', pdfYesNo_(plan.submitted)],
      ['事業展開等実施計画の該当項目', pdfList_(plan.categories)]
    ]);

    pdfSection_(body, '2. 訓練の情報');
    pdfTable_(body, [
      ['訓練コース名', training.courseName], ['講座・科目名', training.lectureName],
      ['訓練実施機関名', training.providerName],
      ['訓練方法', training.method === 'elearning' ? 'eラーニング（様式第8-3号）' : training.method === 'correspondence' ? '通信制（様式第8-4号）' : training.method],
      ['訓練実施期間', pdfJoin_([training.startDate, training.endDate], ' ～ ')],
      ['標準学習時間・期間', pdfJoin_([training.standardHours && training.standardHours + '時間', training.standardMonths && training.standardMonths + 'か月'], '／')],
      ['受講料・税区分', pdfJoin_([training.fee && training.fee + '円', training.taxType], '／')],
      ['支払日・支払方法', pdfJoin_([training.paymentDate, training.paymentMethod], '／')],
      ['研修目的', training.purpose], ['修得した技能を活用する業務', training.application]
    ]);

    pdfSection_(body, '3. 受講者ごとの実施結果');
    if (participants.length === 0) {
      body.appendParagraph('受講者情報は未入力です。');
    }
    participants.forEach(function(p, index) {
      p = p || {};
      body.appendParagraph('受講者 ' + (index + 1)).setHeading(DocumentApp.ParagraphHeading.HEADING2);
      pdfTable_(body, [
        ['受講者氏名', p.name], ['所属・職務', p.role],
        ['受講開始日・修了日', pdfJoin_([p.startDate, p.completionDate], ' ～ ')],
        ['修了状況', p.status], ['受講実績（時間・進捗率等）', p.actuals],
        ['学習場所', p.location], ['修得内容', p.learned],
        ['修了証等', pdfYesNo_(p.certificate) + (p.certificateName ? '／' + pdfText_(p.certificateName) : '')],
        ['実務への活用予定', p.workPlan]
      ]);
    });

    pdfSection_(body, '4. 実施結果の説明');
    pdfTextBlock_(body, '訓練を実施した理由・業務上の必要性', result.necessity);
    pdfTextBlock_(body, '受講内容と事業展開・DX/GX等とのつながり', result.connection);
    pdfTextBlock_(body, '受講結果・今後の業務での活用方法', result.outcome);
    pdfTextBlock_(body, '計画から変更があった場合の内容・届出状況', result.changes);

    pdfSection_(body, '5. 提出前の確認事項');
    [
      '□ 訓練開始前の計画届提出日と期限を確認した（原則、開始日の6か月前から1か月前まで）。',
      '□ 訓練内容・実施期間・受講者が届出内容と一致している。変更がある場合は変更届の要否を確認した。',
      '□ eラーニングは様式第8-3号、通信制は様式第8-4号を選び、適用される最新版を確認した。',
      '□ LMS等の受講記録、修了証、通信制の場合は添削課題等で受講実績・修了を確認できる。',
      '□ 請求書・領収書・振込記録など訓練費用の支払証憑と、カリキュラム等を準備した。',
      '□ 支給申請書類・添付書類を最新の公式チェックリストで確認した。',
      '□ 訓練終了日の翌日から原則2か月以内の支給申請期限を確認した。',
      '□ 不明点を管轄労働局に確認した。'
    ].forEach(function(item) { body.appendParagraph(item); });
    body.appendParagraph('訓練方法に応じて、eラーニングは修了証・LMS受講履歴等、通信制は修了証・添削課題および提出・返却記録等の準備状況も確認してください。');
    body.appendParagraph('公式様式・申請書類一覧（厚生労働省）：https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/38819_00007.html');
    body.appendParagraph('本資料だけで受給可否は判断できません。最新の制度・様式と個別要件は管轄労働局へ確認してください。');

    doc.saveAndClose();
    return DriveApp.getFileById(docId).getAs(MimeType.PDF).setName(filename);
  } finally {
    // PDF生成のため一時Googleドキュメントを作成する。出力後（成功・失敗を問わず）ゴミ箱へ移動する。
    DriveApp.getFileById(docId).setTrashed(true);
  }
}

function pdfSection_(body, title) {
  body.appendParagraph(title).setHeading(DocumentApp.ParagraphHeading.HEADING1);
}

function pdfTable_(body, rows) {
  var table = body.appendTable();
  rows.forEach(function(row) {
    var cells = table.appendTableRow();
    cells.appendTableCell(pdfText_(row[0])).setBackgroundColor('#eaf2f8');
    cells.appendTableCell(pdfText_(row[1]) || '（未入力）');
  });
}

function pdfTextBlock_(body, label, value) {
  body.appendParagraph(label).setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph(pdfText_(value) || '（未入力）');
}

function pdfText_(value) {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.map(pdfText_).filter(Boolean).join('、');
  if (typeof value === 'boolean') return value ? 'はい' : 'いいえ';
  if (typeof value === 'object') return '';
  return String(value).trim();
}

function pdfList_(value) {
  return pdfText_(value) || '（未入力）';
}

function pdfYesNo_(value) {
  if (value === true || value === 'yes' || value === 'true') return 'はい';
  if (value === false || value === 'no' || value === 'false') return 'いいえ';
  return pdfText_(value) || '（未入力）';
}

function pdfJoin_(values, separator) {
  return values.map(pdfText_).filter(function(value) { return value !== ''; }).join(separator);
}

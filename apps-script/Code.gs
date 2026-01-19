const SHEET_NAME = 'scores';
const MAX_NAME_LENGTH = 24;

function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  const limit = Math.max(1, Math.min(50, parseInt(params.limit || '10', 10)));
  const data = getTopScores(limit);
  return jsonResponse({ ok: true, data: data });
}

function doPost(e) {
  const payload = parseJson(e && e.postData ? e.postData.contents : null);
  if (!payload) {
    return jsonResponse({ ok: false, error: 'invalid_json' });
  }

  const nickname = normalizeNickname(payload.nickname || '');
  const score = Number(payload.score || 0);
  const date = String(payload.date || new Date().toISOString());

  if (!nickname || !Number.isFinite(score)) {
    return jsonResponse({ ok: false, error: 'invalid_payload' });
  }

  upsertScore(nickname, score, date);
  return jsonResponse({ ok: true });
}

function getTopScores(limit) {
  const sheet = getSheet();
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) {
    return [];
  }

  const scoresByNickname = {};
  for (let i = 1; i < rows.length; i += 1) {
    const nickname = String(rows[i][0] || '').trim();
    if (!nickname) continue;

    const score = Number(rows[i][1] || 0);
    const date = String(rows[i][2] || '');
    const key = nickname.toLowerCase();

    if (!scoresByNickname[key] || score > scoresByNickname[key].score) {
      scoresByNickname[key] = { nickname: nickname, score: score, date: date };
    }
  }

  return Object.values(scoresByNickname)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function upsertScore(nickname, score, date) {
  const sheet = getSheet();
  const rows = sheet.getDataRange().getValues();
  const key = nickname.toLowerCase();

  for (let i = 1; i < rows.length; i += 1) {
    const existingName = String(rows[i][0] || '').trim();
    if (!existingName) continue;

    if (existingName.toLowerCase() === key) {
      const existingScore = Number(rows[i][1] || 0);
      if (score > existingScore) {
        sheet.getRange(i + 1, 2, 1, 2).setValues([[score, date]]);
      }
      return;
    }
  }

  sheet.appendRow([nickname, score, date]);
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['nickname', 'score', 'date']);
  }

  return sheet;
}

function parseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

function normalizeNickname(value) {
  return String(value || '').trim().slice(0, MAX_NAME_LENGTH);
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

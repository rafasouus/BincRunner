# Google Sheets ranking setup

1. Create a Google Sheet named `binc-runner-ranking` (any name works).
2. Open **Extensions > Apps Script** and paste the contents of `apps-script/Code.gs`.
3. Deploy as **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy the Web App URL (it ends with `/exec`).
5. Set the URL in `.env.local` as `VITE_SCORE_API_URL`.

Optional: create a sheet tab named `scores` (the script creates it if missing).

## Endpoints

- `GET ?limit=10` returns `{ ok: true, data: [...] }`
- `POST` body: `{ nickname: "rafa", score: 1234, date: "2025-01-01T00:00:00.000Z" }`

## Notes

- The script stores one row per nickname (highest score wins).
- The leaderboard aggregates by nickname and returns the top scores.

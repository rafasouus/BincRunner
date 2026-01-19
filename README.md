<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1nvaP11C-Glf9ibF_7sCRFEknIOhA6omk

## Run locally (Windows)

**Prerequisites:** Node.js 18+ (LTS recommended)

1. Install dependencies:
   `npm install`
2. Start the dev server:
   `npm run dev`
3. Open the app:
   `http://localhost:3000`

## Google Sheets ranking (global top 10)

1. Create a Google Sheet and open **Extensions > Apps Script**.
2. Paste the contents of `apps-script/Code.gs`.
3. Deploy as **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy the Web App URL (ends with `/exec`).
5. Set it in `.env.local`:
   `VITE_SCORE_API_URL=https://script.google.com/macros/s/XXXXX/exec`
6. Restart the dev server.

Docs: `apps-script/README.md`

## GitHub Pages (online)

This repo includes a GitHub Actions workflow that builds and deploys `dist/` to Pages.

1. Push to GitHub.
2. In GitHub: **Settings > Pages**.
3. Set **Source** to **GitHub Actions**.
4. Wait for the workflow to finish.
5. Access: `https://<user>.github.io/<repo>/`.

Note: the workflow sets the Vite base path from the repo name automatically.

## Build and preview

1. Build:
   `npm run build`
2. Preview:
   `npm run preview`

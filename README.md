# Wazeer (Vercel + Groq)

This is a Vercel-native rebuild: a static frontend (`index.html`, `style.css`,
`script.js`) plus one serverless API route (`api/chat.js`). No Flask, no
`app.py`, no `.env` file — Vercel handles all of that differently, which is
why the previous version broke.

## Replace your repo contents

In your `gyu` GitHub repo, **delete these old Flask files** — they don't
belong in a Vercel Node project and can confuse the build:
- `app.py`
- `requirements.txt` (if present)
- `templates/` folder (if present)
- `static/` folder (if present)

Then add/replace these files at the **root** of the repo:
- `index.html`
- `style.css`
- `script.js`
- `package.json`
- `api/chat.js`

Commit and push to `main` — Vercel will auto-redeploy.

## Set your API key in Vercel (required)

A `.env` file does NOT work on Vercel. You must add the key in the dashboard:

1. Go to your project on vercel.com → **Settings** → **Environment Variables**
2. Add:
   - Name: `GROQ_API_KEY`
   - Value: your key from https://console.groq.com/keys
   - Environment: Production (and Preview if you want branch previews to work too)
3. Save, then go to **Deployments** → click the "..." on the latest deployment
   → **Redeploy** (env vars only apply to new deployments, not old ones).

## Verify it worked

1. Visit your `.vercel.app` URL — you should see the dark ChatGPT-style UI
   with working CSS (not plain black-and-white text).
2. Type a message and send it. If you get "Error: ...", the message itself
   will now tell you what's wrong (missing API key, bad model name, etc.)
   instead of a generic "could not reach the server."
3. If something still fails, check **Vercel → your project → Logs** (or the
   Functions tab) for the actual server-side error message.

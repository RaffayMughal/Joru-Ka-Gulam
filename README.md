# Wazeer (Vercel + Groq)

A Vercel-native chatbot: a static frontend (`index.html`, `style.css`, `script.js`) plus one serverless API route (`api/chat.js`) that proxies chat requests to Groq. No Flask, no `app.py`, no `.env` file committed — Vercel injects your environment variables at runtime.

## ✨ Features

- Animated gradient background orbs + glassmorphism chat panel
- Left sidebar with conversation history — start new chats, switch between past ones, delete any of them
- Typing indicator and smooth message animations
- Full conversation history sent with each request for context
- All conversations persist across page refreshes (stored in the browser's `localStorage`)
- "Clear" button resets the current conversation; the sidebar keeps the rest
- 📎 File upload: attach images (auto-routed to a vision model), PDFs, Word docs (`.docx`), or plain text-based files — up to 8MB
- Groq-powered responses via the OpenAI-compatible `/chat/completions` endpoint

## 📁 Structure

```
.
├── index.html      # Chat UI markup
├── style.css       # Colors, orbs, layout, animations
├── script.js       # Frontend chat logic (calls /api/chat)
├── api/
│   └── chat.js     # Serverless function → Groq API
└── package.json
```

## 🚀 Deploy

1. Push this repo to GitHub (already done if you're reading this on GitHub).
2. Import the repo into [Vercel](https://vercel.com/new).
3. In **Project Settings → Environment Variables**, add:

   | Key | Value |
   |---|---|
   | `GROQ_API_KEY` | your Groq API key |

4. Deploy. Vercel automatically serves the static files and builds `api/chat.js` as a serverless function.

## 🧠 Changing the model

`api/chat.js` currently calls `openai/gpt-oss-20b` for regular text chat. Swap the `model` field for any other Groq-hosted model (e.g. `llama-3.3-70b-versatile`, `mixtral-8x7b-32768`) depending on speed/quality trade-offs.

## 📎 File uploads

- **Images** (`png`, `jpg`, `webp`, `gif`) are sent as base64 data URLs. `api/chat.js` automatically detects an image in the request and switches the model to `qwen/qwen3.6-27b` (Groq's current multimodal model) for that request only. If Groq deprecates this one too, check https://console.groq.com/docs/deprecations and swap the `model` value in `api/chat.js`.
- **PDFs** (`.pdf`) have their text extracted in the browser via [pdf.js](https://mozilla.github.io/pdf.js/) (loaded from cdnjs). Scanned/image-only PDFs with no embedded text won't extract anything — you'll get a clear error if that happens.
- **Word docs** (`.docx`) have their text extracted in the browser via [mammoth.js](https://github.com/mwilliamson/mammoth.js) (loaded from cdnjs). Legacy `.doc` files aren't supported — only `.docx`.
- **Other text-based files** (`.txt`, `.md`, `.csv`, `.json`, `.js`, `.ts`, `.py`, `.log`, `.html`, `.css`) are read as plain text.
- All extracted/read text is included as context alongside your message, truncated to ~12,000 characters to keep requests fast.
- Max file size is 8MB (adjust `MAX_FILE_BYTES` in `script.js`).
- Files are **not** uploaded anywhere persistent — everything is read/parsed in the browser and sent directly to Groq as part of that one request.

## 🔒 Notes

- Your API key never reaches the browser — it's read server-side from `process.env.GROQ_API_KEY`.
- Do not commit a `.env` file. Use Vercel's environment variable dashboard (or `vercel env pull` locally for `vercel dev`).

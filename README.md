# Wazeer (Vercel + Groq)

A Vercel-native chatbot: a static frontend (`index.html`, `style.css`, `script.js`) plus one serverless API route (`api/chat.js`) that proxies chat requests to Groq. No Flask, no `app.py`, no `.env` file committed — Vercel injects your environment variables at runtime.

## ✨ Features

- Animated gradient background orbs + glassmorphism chat panel
- Typing indicator and smooth message animations
- Full conversation history sent with each request for context
- Chat history persists across page refreshes (stored in the browser's `localStorage`)
- "Clear" button in the header wipes the conversation and starts fresh
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

`api/chat.js` currently calls `openai/gpt-oss-20b`. Swap the `model` field for any other Groq-hosted model (e.g. `llama-3.3-70b-versatile`, `mixtral-8x7b-32768`) depending on speed/quality trade-offs.

## 🔒 Notes

- Your API key never reaches the browser — it's read server-side from `process.env.GROQ_API_KEY`.
- Do not commit a `.env` file. Use Vercel's environment variable dashboard (or `vercel env pull` locally for `vercel dev`).

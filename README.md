# Aurora AI Chatbot — GitHub + Vercel Deployment Guide

This project is a Groq-powered chatbot with a custom animated frontend, deployed as a **permanent, free, public link** using GitHub + Vercel — no Gradio, no Hugging Face paywall.

---

## Files in this project

```
vercel-chatbot/
├── api/
│   └── chat.js        <- Serverless function that calls Groq (keeps your API key secret)
├── index.html          <- The chat page structure
├── style.css            <- The aurora/glow animated design
├── script.js            <- Handles sending messages + streaming replies
├── package.json         <- Project metadata (no dependencies needed)
├── .gitignore           <- Keeps node_modules and secrets out of GitHub
└── README.md             <- This guide
```

Every file is required. Don't rename any of them — Vercel looks for `api/chat.js` specifically to create your backend endpoint.

---

## Step 1: Create a GitHub account (if you don't have one)

1. Go to **github.com** → **Sign up**
2. Verify your email — free, no credit card

---

## Step 2: Create a new GitHub repository

1. Click the **+** icon (top right) → **New repository**
2. Name it something like `aurora-ai-chatbot`
3. Keep it **Public** or **Private** — either works with Vercel
4. Don't add a README, .gitignore, or license here — we already have them
5. Click **Create repository**

---

## Step 3: Upload your files to GitHub

**Easiest method (no coding tools needed):**

1. On your new empty repository page, click **uploading an existing file**
2. Drag in all the files and folders from this project:
   - `index.html`
   - `style.css`
   - `script.js`
   - `package.json`
   - `.gitignore`
   - `README.md`
   - the whole `api` folder (containing `chat.js`)
3. Scroll down, click **Commit changes**

**Important:** Make sure the `api` folder structure is preserved — `chat.js` must end up at the path `api/chat.js` in your repo, not loose in the main folder.

---

## Step 4: Import the project into Vercel

1. Go to **vercel.com** → **Sign up** (choose "Continue with GitHub" — this links the two automatically)
2. Click **Add New** → **Project**
3. Find your `aurora-ai-chatbot` repository in the list → click **Import**
4. Framework Preset: leave as **Other** (Vercel auto-detects the `api` folder as serverless functions)
5. Don't click Deploy yet — go to Step 5 first

---

## Step 5: Add your Groq API key as an Environment Variable

This keeps your key secret and out of your code entirely.

1. On the import screen (or later in **Project Settings → Environment Variables**):
2. Click **Add**
3. **Name**: `GROQ_API_KEY`
4. **Value**: paste your Groq key (get one free at **console.groq.com/keys** if you don't have it)
5. Environment: select **Production, Preview, and Development** (all three)
6. Save

---

## Step 6: Deploy

1. Click **Deploy**
2. Vercel builds your project — takes about 30–60 seconds
3. You'll see a **"Congratulations"** screen with your live link

---

## Step 7: Get your permanent link

Your chatbot is now live at:

```
https://aurora-ai-chatbot-yourname.vercel.app
```

(Vercel generates the exact subdomain based on your project name — it's shown right on the success screen.)

This link:
- Works forever, no expiry
- Works even when your laptop is off
- Works on any phone, tablet, or browser
- Has no Gradio/Docker paywall or ZeroGPU quota — completely free
- Automatically redeploys every time you push a change to GitHub

---

## How it works (in plain terms)

- **`index.html` + `style.css` + `script.js`** run entirely in the visitor's browser — this is your chat interface, with the aurora glow animation
- When someone sends a message, `script.js` sends it to `/api/chat`
- **`api/chat.js`** runs on Vercel's servers (not the visitor's browser), calls Groq using your secret key, and streams the reply back word-by-word
- Your `GROQ_API_KEY` never appears in the browser or in your GitHub repo — it only lives inside Vercel's Environment Variables

---

## Making changes later

Whenever you want to update the design or behavior:

1. Edit the file directly on GitHub (click the file → pencil icon → edit → commit)
2. Vercel automatically detects the change and redeploys within about a minute
3. Refresh your live link to see the update

No need to touch Vercel's dashboard again after the first setup, unless you're changing the API key.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Blank page / 404 | Make sure `index.html` is at the root of the repo, not inside a subfolder |
| "Error: Server misconfigured: GROQ_API_KEY not set" | Add the Environment Variable in Vercel Project Settings, then redeploy |
| Chat doesn't respond, no error shown | Open browser DevTools (F12) → Console tab, check for errors; also confirm `api/chat.js` is exactly at that path |
| Changes on GitHub don't show up | Check the **Deployments** tab in Vercel — it should show a new build in progress; if not, confirm GitHub is properly connected under Project Settings → Git |

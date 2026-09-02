# Chatbot (Flask + Groq)

## Setup

1. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Get a Groq API key from https://console.groq.com/keys

3. Copy `.env.example` to `.env` and paste your key in:
   ```
   cp .env.example .env
   ```
   Then edit `.env` so it looks like:
   ```
   GROQ_API_KEY=gsk_your_actual_key_here
   ```

4. Run the app:
   ```
   python app.py
   ```

5. Open your browser to:
   ```
   http://127.0.0.1:5000
   ```

## How it works

- `app.py` — Flask server. `/` renders the chat UI. `/api/chat` receives your
  message, sends it (plus conversation history) to Groq, and returns the reply
  as JSON. `/api/reset` clears the conversation when you click "New chat".
- `templates/index.html` — the page, with JS that posts to `/api/chat` and
  renders your message + the bot's reply in the chat window.
- `static/style.css` — the dark ChatGPT-style theme.

## Common issues

- **"GROQ_API_KEY" error / 401** — your `.env` file is missing or the key is
  wrong. Double check there's no extra space or quotes around the key.
- **Nothing happens when you click send** — open your browser's dev console
  (F12 → Console) and check for errors; also confirm the Flask server is
  actually running in your terminal (you should see request logs there).
- **Model not found** — Groq's available model names change over time; check
  https://console.groq.com/docs/models and swap the `model` value in
  `app.py` if `llama-3.3-70b-versatile` is no longer listed.

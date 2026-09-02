import os
from flask import Flask, render_template, request, jsonify
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Reads GROQ_API_KEY from your .env file (see .env.example)
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# Simple in-memory history per server run (single user / demo purposes).
# For multiple users you'd key this by session id instead.
conversation_history = [
    {"role": "system", "content": "You are a helpful assistant."}
]


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    user_message = (data.get("message") or "").strip()

    if not user_message:
        return jsonify({"error": "Empty message"}), 400

    conversation_history.append({"role": "user", "content": user_message})

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",  # swap for any Groq-hosted model
            messages=conversation_history,
            temperature=0.7,
            max_tokens=1024,
        )
        reply = completion.choices[0].message.content
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    conversation_history.append({"role": "assistant", "content": reply})

    return jsonify({"reply": reply})


@app.route("/api/reset", methods=["POST"])
def reset():
    global conversation_history
    conversation_history = [
        {"role": "system", "content": "You are a helpful assistant."}
    ]
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(debug=True, port=5000)

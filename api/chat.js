// api/chat.js
// Vercel serverless function that proxies chat requests to Groq's
// OpenAI-compatible API. Keeps your GROQ_API_KEY server-side and secret.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GROQ_API_KEY is not set on the server" });
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }

  // If any message includes an image, use Groq's vision-capable model instead
  // of the default text model — image_url content blocks need it.
  // NOTE: meta-llama/llama-4-scout-17b-16e-instruct was deprecated by Groq
  // (announced June 2026) — qwen/qwen3.6-27b is their current multimodal model.
  const hasImage = messages.some(
    (m) => Array.isArray(m.content) && m.content.some((part) => part.type === "image_url")
  );
  const model = hasImage ? "qwen/qwen3.6-27b" : "openai/gpt-oss-20b";

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    if (!groqRes.ok) {
      const errBody = await groqRes.text();
      console.error("Groq API error:", errBody);
      let message = "Groq API request failed";
      try {
        message = JSON.parse(errBody)?.error?.message || message;
      } catch (_) {
        /* errBody wasn't JSON — keep the generic message */
      }
      return res.status(groqRes.status).json({ error: message });
    }

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content ?? "";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

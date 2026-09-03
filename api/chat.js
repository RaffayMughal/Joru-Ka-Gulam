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

  // ── LANGUAGE MIRRORING SYSTEM PROMPT ──
  const LANGUAGE_SYSTEM_PROMPT = {
    role: "system",
    content: [
      "You are Wazeer, a friendly, sharp, and concise AI assistant powered by Groq.",
      "",
      "CRITICAL LANGUAGE RULE — YOU MUST FOLLOW THIS ALWAYS:",
      "- Detect the language the user is writing in automatically.",
      "- Always reply in the EXACT same language the user used in their message.",
      "- If the user writes in Urdu, reply in Urdu script.",
      "- If the user writes in English, reply in English.",
      "- If the user writes in Arabic, reply in Arabic.",
      "- If the user writes in Hindi, reply in Hindi.",
      "- If the user writes in Punjabi, reply in Punjabi.",
      "- If the user writes in Roman Urdu (Urdu in English letters like kya haal hai), reply in the same Roman Urdu style.",
      "- If the user mixes two languages (code-switching), mirror that exact mix naturally.",
      "- NEVER force English on a non-English user.",
      "- NEVER translate unless explicitly asked to translate.",
      "- Match the user tone — casual stays casual, formal stays formal.",
      "",
      "FORMATTING RULE:",
      "- Never use markdown symbols like **, *, #, ##, or - in your responses.",
      "- Write in plain text only.",
      "- Keep responses concise and helpful."
    ].join("\n")
  };

  // Inject our system prompt at the start, removing any existing system messages to avoid conflicts
  const filteredMessages = messages.filter(function(m) { return m.role !== "system"; });
  const finalMessages = [LANGUAGE_SYSTEM_PROMPT].concat(filteredMessages);

  // If any message includes an image, use Groq vision-capable model
  var hasImage = false;
  for (var i = 0; i < finalMessages.length; i++) {
    var m = finalMessages[i];
    if (Array.isArray(m.content)) {
      for (var j = 0; j < m.content.length; j++) {
        if (m.content[j].type === "image_url") {
          hasImage = true;
          break;
        }
      }
    }
    if (hasImage) break;
  }

  var model = hasImage ? "qwen/qwen3.6-27b" : "openai/gpt-oss-20b";

  try {
    var groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: model,
        messages: finalMessages,
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    if (!groqRes.ok) {
      var errBody = await groqRes.text();
      console.error("Groq API error:", errBody);
      var errorMsg = "Groq API request failed";
      try {
        var parsed = JSON.parse(errBody);
        if (parsed && parsed.error && parsed.error.message) {
          errorMsg = parsed.error.message;
        }
      } catch (e) {
        if (errBody) errorMsg = errBody;
      }
      return res.status(groqRes.status).json({ error: errorMsg });
    }

    var data = await groqRes.json();
    var reply = "";
    if (data && data.choices && data.choices[0] && data.choices[0].message) {
      reply = data.choices[0].message.content || "";
    }

    return res.status(200).json({ reply: reply });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

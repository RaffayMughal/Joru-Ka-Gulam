export const config = {
  runtime: "edge",
};

const SYSTEM_PROMPT = "You are a helpful, intelligent AI assistant.";

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response("Invalid request body", { status: 400 });
  }

  const history = Array.isArray(body.messages) ? body.messages : [];
  const messages = [{ role: "system", content: SYSTEM_PROMPT }, ...history];

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response("Server misconfigured: GROQ_API_KEY not set", { status: 500 });
  }

  let groqRes;
  try {
    groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages,
        temperature: 0.7,
        max_tokens: 1024,
        stream: true,
      }),
    });
  } catch (e) {
    return new Response("Failed to reach Groq API", { status: 502 });
  }

  if (!groqRes.ok || !groqRes.body) {
    const errText = await groqRes.text();
    return new Response(errText || "Groq API error", { status: groqRes.status });
  }

  const reader = groqRes.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop();

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;

            const data = trimmed.replace("data:", "").trim();
            if (data === "[DONE]") {
              controller.close();
              return;
            }

            try {
              const json = JSON.parse(data);
              const token = json.choices && json.choices[0] && json.choices[0].delta
                ? json.choices[0].delta.content
                : null;
              if (token) {
                controller.enqueue(encoder.encode(token));
              }
            } catch (e) {
              // Skip malformed JSON chunks
            }
          }
        }
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

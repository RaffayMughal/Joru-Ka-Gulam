const messagesEl = document.getElementById("messages");
const formEl = document.getElementById("chat-form");
const inputEl = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const examplesEl = document.getElementById("examples");

let history = [];

function addMessage(role, text) {
  const wrapper = document.createElement("div");
  wrapper.className = "message " + (role === "user" ? "user" : "bot");

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  wrapper.appendChild(bubble);
  messagesEl.appendChild(wrapper);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  return bubble;
}

async function sendMessage(text) {
  if (!text.trim()) return;

  addMessage("user", text);
  history.push({ role: "user", content: text });

  inputEl.value = "";
  sendBtn.disabled = true;

  const botBubble = addMessage("bot", "");
  let botText = "";

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history }),
    });

    if (!res.ok || !res.body) {
      const errText = await res.text();
      botBubble.textContent = "Error: " + errText;
      sendBtn.disabled = false;
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      botText += chunk;
      botBubble.textContent = botText;
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    history.push({ role: "assistant", content: botText });
  } catch (err) {
    botBubble.textContent = "Error: " + err.message;
  } finally {
    sendBtn.disabled = false;
    inputEl.focus();
  }
}

formEl.addEventListener("submit", (e) => {
  e.preventDefault();
  sendMessage(inputEl.value);
});

examplesEl.addEventListener("click", (e) => {
  if (e.target.classList.contains("example-chip")) {
    sendMessage(e.target.textContent);
  }
});

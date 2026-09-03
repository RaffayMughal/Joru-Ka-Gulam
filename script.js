const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const typingIndicator = document.getElementById("typing-indicator");

// Keep a running history so the model has context
const history = [
  { role: "system", content: "You are Wazeer, a friendly, sharp, and concise AI assistant." }
];

function addMessage(role, text) {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${role === "user" ? "user" : "bot"}`;

  const avatar = document.createElement("div");
  avatar.className = `avatar ${role === "user" ? "user-avatar" : "bot-avatar"}`;
  avatar.textContent = role === "user" ? "You" : "W";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  wrapper.appendChild(avatar);
  wrapper.appendChild(bubble);
  chatWindow.appendChild(wrapper);
  scrollToBottom();
}

function scrollToBottom() {
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function setLoading(isLoading) {
  typingIndicator.classList.toggle("hidden", !isLoading);
  sendBtn.disabled = isLoading;
  chatInput.disabled = isLoading;
  if (isLoading) scrollToBottom();
}

async function sendMessage(userText) {
  history.push({ role: "user", content: userText });
  setLoading(true);

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || `Request failed with ${res.status}`);
    }

    const data = await res.json();
    const reply = data.reply?.trim() || "Hmm, I didn't get a response. Try again?";

    history.push({ role: "assistant", content: reply });
    addMessage("bot", reply);
  } catch (err) {
    console.error(err);
    addMessage("bot", "⚠️ Something went wrong reaching the model. Please try again.");
  } finally {
    setLoading(false);
  }
}

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  addMessage("user", text);
  chatInput.value = "";
  sendMessage(text);
});

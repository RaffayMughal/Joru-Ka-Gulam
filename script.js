const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const typingIndicator = document.getElementById("typing-indicator");
const clearBtn = document.getElementById("clear-btn");

const STORAGE_KEY = "wazeer_chat_history";
const SYSTEM_PROMPT = { role: "system", content: "You are Wazeer, a friendly, sharp, and concise AI assistant." };
const GREETING = "Hey! I'm Wazeer 👋 Ask me anything and I'll answer at Groq speed.";

// Keep a running history so the model has context.
// Persisted to localStorage so a refresh doesn't lose the conversation.
let history = loadHistory();

function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved) && saved.length) return saved;
  } catch (_) {
    /* ignore corrupt storage */
  }
  return [SYSTEM_PROMPT];
}

function saveHistory() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (_) {
    /* storage full or unavailable — chat still works, just won't persist */
  }
}

function renderHistory() {
  chatWindow.innerHTML = "";
  const visible = history.filter((m) => m.role !== "system");
  if (visible.length === 0) {
    addMessage("bot", GREETING);
    return;
  }
  visible.forEach((m) => addMessage(m.role === "assistant" ? "bot" : "user", m.content));
}

function clearChat() {
  history = [SYSTEM_PROMPT];
  saveHistory();
  chatWindow.innerHTML = "";
  addMessage("bot", GREETING);
}

clearBtn.addEventListener("click", clearChat);
renderHistory();

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
  saveHistory();
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
    saveHistory();
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

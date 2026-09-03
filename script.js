const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const typingIndicator = document.getElementById("typing-indicator");
const clearBtn = document.getElementById("clear-btn");
const fileInput = document.getElementById("file-input");
const attachBtn = document.getElementById("attach-btn");
const attachmentPreview = document.getElementById("attachment-preview");

const STORAGE_KEY = "wazeer_chat_history";
const SYSTEM_PROMPT = { role: "system", content: "You are Wazeer, a friendly, sharp, and concise AI assistant." };
const GREETING = "Hey! I'm Wazeer 👋 Ask me anything and I'll answer at Groq speed.";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_TEXT_CHARS = 12000; // truncate huge text files before sending to the model
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

// Keep a running history so the model has context.
// Persisted to localStorage so a refresh doesn't lose the conversation.
let history = loadHistory();
let pendingAttachment = null; // { kind: "text"|"image", name, content|dataUrl }

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
    /* storage full (e.g. big base64 images) — chat still works, just won't persist */
  }
}

function renderHistory() {
  chatWindow.innerHTML = "";
  const visible = history.filter((m) => m.role !== "system");
  if (visible.length === 0) {
    addMessage("bot", GREETING);
    return;
  }
  visible.forEach((m) =>
    addMessage(m.role === "assistant" ? "bot" : "user", m.displayText ?? m.content, m.attachmentMeta)
  );
}

function clearChat() {
  history = [SYSTEM_PROMPT];
  saveHistory();
  clearAttachment();
  chatWindow.innerHTML = "";
  addMessage("bot", GREETING);
}

clearBtn.addEventListener("click", clearChat);
renderHistory();

// ---------- Message rendering ----------

function addMessage(role, text, attachmentMeta) {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${role === "user" ? "user" : "bot"}`;

  const avatar = document.createElement("div");
  avatar.className = `avatar ${role === "user" ? "user-avatar" : "bot-avatar"}`;
  avatar.textContent = role === "user" ? "You" : "W";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  if (attachmentMeta) {
    if (attachmentMeta.kind === "image" && attachmentMeta.dataUrl) {
      const img = document.createElement("img");
      img.src = attachmentMeta.dataUrl;
      img.alt = attachmentMeta.name || "attached image";
      img.className = "bubble-image";
      bubble.appendChild(img);
    } else {
      const chip = document.createElement("div");
      chip.className = "bubble-file-chip";
      chip.textContent = `📄 ${attachmentMeta.name}`;
      bubble.appendChild(chip);
    }
  }

  if (text) {
    const textEl = document.createElement("div");
    textEl.className = "bubble-text";
    textEl.textContent = text;
    bubble.appendChild(textEl);
  }

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

// ---------- File attach handling ----------

attachBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  fileInput.value = ""; // allow re-selecting the same file later
  if (!file) return;

  if (file.size > MAX_FILE_BYTES) {
    addMessage("bot", `⚠️ "${file.name}" is over the 5MB limit. Try a smaller file.`);
    return;
  }

  try {
    if (IMAGE_TYPES.includes(file.type)) {
      const dataUrl = await readFileAsDataURL(file);
      pendingAttachment = { kind: "image", name: file.name, dataUrl };
    } else {
      const text = await readFileAsText(file);
      const truncated = text.length > MAX_TEXT_CHARS;
      pendingAttachment = {
        kind: "text",
        name: file.name,
        content: text.slice(0, MAX_TEXT_CHARS),
        truncated
      };
    }
    renderAttachmentPreview();
  } catch (err) {
    console.error(err);
    addMessage("bot", `⚠️ Couldn't read "${file.name}". Try a plain text file or an image.`);
  }
});

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function renderAttachmentPreview() {
  attachmentPreview.innerHTML = "";
  attachmentPreview.classList.remove("hidden");
  attachBtn.classList.add("has-file");

  if (pendingAttachment.kind === "image") {
    const thumb = document.createElement("img");
    thumb.src = pendingAttachment.dataUrl;
    thumb.className = "thumb";
    attachmentPreview.appendChild(thumb);
  } else {
    const icon = document.createElement("div");
    icon.className = "file-icon";
    const ext = pendingAttachment.name.split(".").pop()?.toUpperCase().slice(0, 4) || "FILE";
    icon.textContent = ext;
    attachmentPreview.appendChild(icon);
  }

  const name = document.createElement("div");
  name.className = "file-name";
  name.textContent = pendingAttachment.truncated
    ? `${pendingAttachment.name} (truncated to fit)`
    : pendingAttachment.name;
  attachmentPreview.appendChild(name);

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "remove-file";
  removeBtn.setAttribute("aria-label", "Remove attachment");
  removeBtn.textContent = "✕";
  removeBtn.addEventListener("click", clearAttachment);
  attachmentPreview.appendChild(removeBtn);
}

function clearAttachment() {
  pendingAttachment = null;
  attachmentPreview.classList.add("hidden");
  attachmentPreview.innerHTML = "";
  attachBtn.classList.remove("has-file");
}

// ---------- Sending ----------

async function sendMessage(userText) {
  const attachment = pendingAttachment;
  clearAttachment();

  let apiContent = userText;
  let displayText = userText;
  let attachmentMeta = null;

  if (attachment?.kind === "image") {
    apiContent = [
      { type: "text", text: userText || "Describe this image." },
      { type: "image_url", image_url: { url: attachment.dataUrl } }
    ];
    attachmentMeta = { kind: "image", name: attachment.name, dataUrl: attachment.dataUrl };
  } else if (attachment?.kind === "text") {
    const label = attachment.truncated
      ? `(truncated to ${MAX_TEXT_CHARS} characters)`
      : "";
    apiContent = `Attached file "${attachment.name}" ${label}:\n\`\`\`\n${attachment.content}\n\`\`\`\n\n${userText || "Please review the attached file."}`;
    attachmentMeta = { kind: "text", name: attachment.name };
  }

  addMessage("user", displayText, attachmentMeta);

  history.push({
    role: "user",
    content: apiContent,
    displayText,
    attachmentMeta
  });
  saveHistory();
  setLoading(true);

  try {
    // Strip UI-only fields before sending to the API
    const apiMessages = history.map((m) => ({ role: m.role, content: m.content }));

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: apiMessages })
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
  if (!text && !pendingAttachment) return;

  chatInput.value = "";
  sendMessage(text);
});

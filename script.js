const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const typingIndicator = document.getElementById("typing-indicator");
const clearBtn = document.getElementById("clear-btn");
const fileInput = document.getElementById("file-input");
const attachBtn = document.getElementById("attach-btn");
const attachmentPreview = document.getElementById("attachment-preview");

const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebar-toggle");
const sidebarClose = document.getElementById("sidebar-close");
const sidebarOverlay = document.getElementById("sidebar-overlay");
const newChatBtn = document.getElementById("new-chat-btn");
const conversationList = document.getElementById("conversation-list");

const CONVERSATIONS_KEY = "wazeer_conversations";
const ACTIVE_ID_KEY = "wazeer_active_id";
const LEGACY_KEY = "wazeer_chat_history";

const SYSTEM_PROMPT = { role: "system", content: "You are Wazeer, a friendly, sharp, and concise AI assistant. Never use markdown symbols like **, *, #, ##, or - in your responses. Write in plain text only." };
const GREETING = "Hey! I'm Wazeer 👋 Ask me anything and I'll answer at Groq speed.";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_CHARS = 12000;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

let pendingAttachment = null;
let loadingTimeoutId = null; // <-- FIX: Track the timeout so we can cancel it

// ---------- Clean markdown from bot replies ----------

function cleanText(text) {
  return text
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*\*(.*?)\*\*/gs, '$1')
    .replace(/\*(.*?)\*/gs, '$1')
    .replace(/^[\-\*]\s+/gm, '')
    .replace(/^•\s+/gm, '')
    .replace(/`{3}[\s\S]*?`{3}/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/_{1,2}(.*?)_{1,2}/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---------- Conversation state ----------

function uid() {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function newConversation() {
  const now = Date.now();
  return {
    id: uid(),
    title: "New chat",
    createdAt: now,
    updatedAt: now,
    messages: [SYSTEM_PROMPT]
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(CONVERSATIONS_KEY));
    if (Array.isArray(saved) && saved.length) {
      const activeId = localStorage.getItem(ACTIVE_ID_KEY);
      const active = saved.find((c) => c.id === activeId) ? activeId : saved[0].id;
      return { conversations: saved, activeId: active };
    }
  } catch (_) {}

  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY));
    if (Array.isArray(legacy) && legacy.some((m) => m.role !== "system")) {
      const conv = newConversation();
      conv.messages = legacy;
      const firstUser = legacy.find((m) => m.role === "user");
      if (firstUser) conv.title = titleFromText(firstUser.displayText ?? firstUser.content);
      localStorage.removeItem(LEGACY_KEY);
      return { conversations: [conv], activeId: conv.id };
    }
  } catch (_) {}

  const conv = newConversation();
  return { conversations: [conv], activeId: conv.id };
}

let { conversations, activeId } = loadState();

function saveState() {
  try {
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
    localStorage.setItem(ACTIVE_ID_KEY, activeId);
  } catch (_) {}
}

function getActive() {
  return conversations.find((c) => c.id === activeId) || conversations[0];
}

function titleFromText(text) {
  if (!text) return "New chat";
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length > 40 ? `${clean.slice(0, 40)}…` : clean;
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

// ---------- Sidebar ----------

function renderSidebar() {
  conversationList.innerHTML = "";

  if (conversations.length === 0) {
    const empty = document.createElement("div");
    empty.className = "conversation-empty";
    empty.textContent = "No conversations yet";
    conversationList.appendChild(empty);
    return;
  }

  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);

  sorted.forEach((conv) => {
    const item = document.createElement("div");
    item.className = `conversation-item${conv.id === activeId ? " active" : ""}`;

    const title = document.createElement("div");
    title.className = "conv-title";
    title.textContent = conv.title || "New chat";
    title.title = `${conv.title || "New chat"} · ${timeAgo(conv.updatedAt)}`;

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "conv-delete";
    deleteBtn.setAttribute("aria-label", "Delete conversation");
    deleteBtn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 7H20M9 7V4.5C9 4.22386 9.22386 4 9.5 4H14.5C14.7761 4 15 4.22386 15 4.5V7M18 7L17.3 18.3C17.25 19.25 16.45 20 15.5 20H8.5C7.55 20 6.75 19.25 6.7 18.3L6 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteConversation(conv.id);
    });

    item.appendChild(title);
    item.appendChild(deleteBtn);
    item.addEventListener("click", () => switchConversation(conv.id));
    conversationList.appendChild(item);
  });
}

function switchConversation(id) {
  if (id === activeId) {
    closeSidebarOnMobile();
    return;
  }
  activeId = id;
  saveState();
  clearAttachment();
  renderChatWindow();
  renderSidebar();
  closeSidebarOnMobile();
}

function createConversation() {
  const conv = newConversation();
  conversations.push(conv);
  activeId = conv.id;
  saveState();
  clearAttachment();
  renderChatWindow();
  renderSidebar();
  closeSidebarOnMobile();
  chatInput.focus();
}

function deleteConversation(id) {
  conversations = conversations.filter((c) => c.id !== id);

  if (conversations.length === 0) {
    conversations = [newConversation()];
  }

  if (id === activeId) {
    activeId = conversations[0].id;
  }

  saveState();
  clearAttachment();
  renderChatWindow();
  renderSidebar();
}

newChatBtn.addEventListener("click", createConversation);

// ---------- Sidebar open/close (mobile) ----------

function openSidebar() {
  sidebar.classList.add("open");
  sidebarOverlay.classList.remove("hidden");
}

function closeSidebar() {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.add("hidden");
}

function closeSidebarOnMobile() {
  if (window.innerWidth <= 860) closeSidebar();
}

sidebarToggle.addEventListener("click", () => {
  sidebar.classList.contains("open") ? closeSidebar() : openSidebar();
});
sidebarClose.addEventListener("click", closeSidebar);
sidebarOverlay.addEventListener("click", closeSidebar);

// ---------- Message rendering ----------

function renderChatWindow() {
  chatWindow.innerHTML = "";
  const conv = getActive();
  const visible = conv.messages.filter((m) => m.role !== "system");

  if (visible.length === 0) {
    addMessage("bot", GREETING);
    return;
  }
  visible.forEach((m) =>
    addMessage(m.role === "assistant" ? "bot" : "user", m.displayText ?? m.content, m.attachmentMeta)
  );
}

function clearChat() {
  const conv = getActive();
  conv.messages = [SYSTEM_PROMPT];
  conv.title = "New chat";
  conv.updatedAt = Date.now();
  saveState();
  clearAttachment();
  chatWindow.innerHTML = "";
  addMessage("bot", GREETING);
  renderSidebar();
}

clearBtn.addEventListener("click", clearChat);

function addMessage(role, text, attachmentMeta, isStatus) {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${role === "user" ? "user" : "bot"}`;
  if (isStatus) wrapper.dataset.status = "true";

  const avatar = document.createElement("div");
  avatar.className = `avatar ${role === "user" ? "user-avatar" : "bot-avatar"}`;
  avatar.textContent = role === "user" ? "You" : "W";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  if (isStatus) bubble.classList.add("bubble-status");

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

function removeLastBotStatus() {
  const el = chatWindow.querySelector('[data-status="true"]');
  if (el) el.remove();
}

function scrollToBottom() {
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// ---------- FIXED setLoading FUNCTION ----------
function setLoading(isLoading) {
  sendBtn.disabled = isLoading;
  chatInput.disabled = isLoading;

  if (isLoading) {
    // Clear any existing timeout to prevent overlap
    if (loadingTimeoutId) clearTimeout(loadingTimeoutId);
    
    if (typeof window.startThinking === "function") window.startThinking();
    
    // Store the timeout ID so we can cancel it if the response comes back fast
    loadingTimeoutId = setTimeout(() => {
      if (typeof window.stopThinking === "function") window.stopThinking();
      typingIndicator.classList.remove("hidden");
      scrollToBottom();
    }, 2400);
  } else {
    // FIX: Cancel the pending timeout so dots don't appear after response
    if (loadingTimeoutId) {
      clearTimeout(loadingTimeoutId);
      loadingTimeoutId = null;
    }
    if (typeof window.stopThinking === "function") window.stopThinking();
    typingIndicator.classList.add("hidden");
  }

  if (isLoading) scrollToBottom();
}

// ---------- File attach handling ----------

attachBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  fileInput.value = "";
  if (!file) return;

  if (file.size > MAX_FILE_BYTES) {
    addMessage("bot", `⚠️ "${file.name}" is over the ${MAX_FILE_BYTES / (1024 * 1024)}MB limit. Try a smaller file.`);
    return;
  }

  const lowerName = file.name.toLowerCase();
  const isPdf = file.type === "application/pdf" || lowerName.endsWith(".pdf");
  const isDocx =
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lowerName.endsWith(".docx");

  try {
    if (IMAGE_TYPES.includes(file.type)) {
      const dataUrl = await readFileAsDataURL(file);
      pendingAttachment = { kind: "image", name: file.name, dataUrl };
    } else if (isPdf) {
      addMessage("bot", `Reading "${file.name}"…`, null, true);
      const text = await extractPdfText(file);
      setAttachmentFromText(file.name, text);
      removeLastBotStatus();
    } else if (isDocx) {
      addMessage("bot", `Reading "${file.name}"…`, null, true);
      const text = await extractDocxText(file);
      setAttachmentFromText(file.name, text);
      removeLastBotStatus();
    } else {
      const text = await readFileAsText(file);
      setAttachmentFromText(file.name, text);
    }
    renderAttachmentPreview();
  } catch (err) {
    console.error(err);
    removeLastBotStatus();
    addMessage("bot", `⚠️ Couldn't read "${file.name}". ${err.message || "Try a different file."}`);
  }
});

function setAttachmentFromText(name, text) {
  const truncated = text.length > MAX_TEXT_CHARS;
  pendingAttachment = {
    kind: "text",
    name,
    content: text.slice(0, MAX_TEXT_CHARS),
    truncated
  };
}

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

async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => item.str).join(" ") + "\n\n";
    if (text.length > MAX_TEXT_CHARS * 2) break;
  }
  if (!text.trim()) {
    throw new Error("No extractable text found (it may be a scanned/image-only PDF).");
  }
  return text;
}

async function extractDocxText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  if (!result.value.trim()) {
    throw new Error("No extractable text found in this document.");
  }
  return result.value;
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
  const conv = getActive();
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

  const wasFirstUserMessage = !conv.messages.some((m) => m.role === "user");

  conv.messages.push({
    role: "user",
    content: apiContent,
    displayText,
    attachmentMeta
  });

  if (wasFirstUserMessage) {
    conv.title = titleFromText(displayText || attachment?.name || "New chat");
  }
  conv.updatedAt = Date.now();
  saveState();
  renderSidebar();
  setLoading(true);

  try {
    const apiMessages = conv.messages.map((m) => ({ role: m.role, content: m.content }));

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: apiMessages })
    });

    if (!res.ok) {
      const errText = await res.text();
      let message = `Request failed with ${res.status}`;
      try {
        message = JSON.parse(errText)?.error || message;
      } catch (_) {
        if (errText) message = errText;
      }
      throw new Error(message);
    }

    const data = await res.json();
    const rawReply = data.reply?.trim() || "Hmm, I didn't get a response. Try again?";

    const reply = cleanText(rawReply);

    conv.messages.push({ role: "assistant", content: reply });
    conv.updatedAt = Date.now();
    saveState();
    renderSidebar();
    addMessage("bot", reply);
  } catch (err) {
    console.error(err);
    addMessage("bot", `⚠️ ${err.message || "Something went wrong reaching the model."}`);
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

// ---------- Init ----------

// FIX: Ensure typing indicator is hidden on fresh load
typingIndicator.classList.add("hidden");
renderChatWindow();
renderSidebar();

// ---------- Plus / attach menu ----------

const attachMenu = document.getElementById("attach-menu");
const plusBtn = document.getElementById("plus-btn");

if (plusBtn && attachMenu) {
  attachMenu.style.display = "none";

  plusBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = attachMenu.style.display === "block";
    attachMenu.style.display = isOpen ? "none" : "block";
  });

  document.addEventListener("click", () => {
    if (attachMenu) attachMenu.style.display = "none";
  });

  attachMenu.addEventListener("click", (e) => e.stopPropagation());
}

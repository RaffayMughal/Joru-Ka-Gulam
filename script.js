// 1. Generate 100 Floating Particles
const particlesContainer = document.getElementById('particles-container');
if (particlesContainer) {
  for (let i = 0; i < 100; i++) {
    const span = document.createElement('span');
    span.style.left = Math.random() * 100 + '%';
    span.style.width = (Math.random() * 4 + 2) + 'px';
    span.style.height = span.style.width;
    span.style.animationDuration = (Math.random() * 15 + 10) + 's';
    span.style.animationDelay = (Math.random() * 10) + 's';
    particlesContainer.appendChild(span);
  }
}

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
const sidebarOverlay = document.getElementById("sidebar-overlay");
const newChatIconBtn = document.getElementById("new-chat-icon-btn");
const conversationList = document.getElementById("conversation-list");

const CONVERSATIONS_KEY = "wazeer_conversations";
const ACTIVE_ID_KEY = "wazeer_active_id";

const SYSTEM_PROMPT = { 
  role: "system", 
  content: "You are Wazeer, a friendly AI assistant for Badshah. Always reply in the same language the user is using. Never use markdown symbols like **, #, or `. Write in plain text only. IMPORTANT: When a user uploads an image to analyze, asks for code, or requests a complex task, DO NOT give a long direct answer right away. Instead, ask 1 or 2 short clarifying questions to understand exactly what they need. Keep your replies concise, friendly, and conversational." 
};
const GREETING = "Assalamu Alaikum Badshah! Main hoon Wazeer 🤖 Aap ka apna AI assistant.";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_CHARS = 4000;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

let pendingAttachment = null;
let loadingTimeoutId = null;

function cleanText(text) {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')   // remove closed think blocks
    .replace(/<think>[\s\S]*$/gi, '')             // remove unclosed think blocks (to the end)
    .replace(/<\/?think>/gi, '')                  // remove any stray think tags
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*\*(.*?)\*\*/gs, '$1')
    .replace(/\*(.*?)\*/gs, '$1')
    .replace(/^[\-\*]\s+/gm, '')
    .replace(/`{3}[\s\S]*?`{3}/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}function uid() { return `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
function newConversation() { return { id: uid(), title: "New chat", createdAt: Date.now(), updatedAt: Date.now(), messages: [SYSTEM_PROMPT] }; }

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(CONVERSATIONS_KEY));
    if (Array.isArray(saved) && saved.length) {
      const activeId = localStorage.getItem(ACTIVE_ID_KEY);
      const active = saved.find((c) => c.id === activeId) ? activeId : saved[0].id;
      return { conversations: saved, activeId: active };
    }
  } catch (_) {}
  const conv = newConversation();
  return { conversations: [conv], activeId: conv.id };
}

let { conversations, activeId } = loadState();

function saveState() {
  try { localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations)); localStorage.setItem(ACTIVE_ID_KEY, activeId); } catch (_) {}
}

function getActive() { return conversations.find((c) => c.id === activeId) || conversations[0]; }
function titleFromText(text) { if (!text) return "New chat"; const clean = text.trim().replace(/\s+/g, " "); return clean.length > 40 ? `${clean.slice(0, 40)}…` : clean; }

function renderSidebar() {
  const countEl = document.getElementById('conv-count');
  if (countEl) countEl.textContent = conversations.length;

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
    
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "conv-delete";
    deleteBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M4 7H20M9 7V4.5C9 4.22386 9.22386 4 9.5 4H14.5C14.7761 4 15 4.22386 15 4.5V7M18 7L17.3 18.3C17.25 19.25 16.45 20 15.5 20H8.5C7.55 20 6.75 19.25 6.7 18.3L6 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    deleteBtn.addEventListener("click", (e) => { e.stopPropagation(); deleteConversation(conv.id); });
    
    item.appendChild(title);
    item.appendChild(deleteBtn);
    item.addEventListener("click", () => switchConversation(conv.id));
    conversationList.appendChild(item);
  });
}

function switchConversation(id) { if (id === activeId) return; activeId = id; saveState(); clearAttachment(); renderChatWindow(); renderSidebar(); closeSidebarOnMobile(); }
function createConversation() { const conv = newConversation(); conversations.push(conv); activeId = conv.id; saveState(); clearAttachment(); renderChatWindow(); renderSidebar(); closeSidebarOnMobile(); chatInput.focus(); }
function deleteConversation(id) { conversations = conversations.filter((c) => c.id !== id); if (conversations.length === 0) conversations = [newConversation()]; if (id === activeId) activeId = conversations[0].id; saveState(); clearAttachment(); renderChatWindow(); renderSidebar(); }
function closeSidebarOnMobile() { if (window.innerWidth <= 860) { sidebar.classList.remove("open"); sidebarOverlay.classList.add("hidden"); } }

// ─ SETTINGS & THEME ──
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
if (settingsBtn && settingsPanel) {
  settingsBtn.addEventListener('click', (e) => { e.stopPropagation(); settingsPanel.classList.toggle('open'); const np = document.getElementById('notif-panel'); if(np) np.classList.remove('open'); });
  document.addEventListener('click', (e) => { if (!settingsPanel.contains(e.target) && !settingsBtn.contains(e.target)) settingsPanel.classList.remove('open'); });
  settingsPanel.addEventListener('click', (e) => e.stopPropagation());
}

const themeToggleSettings = document.getElementById('theme-toggle-settings');
const themeIcon = themeToggleSettings ? themeToggleSettings.querySelector('.theme-icon') : null;
const savedTheme = localStorage.getItem('wazeer_theme');
if (savedTheme === 'light') { document.body.classList.add('light-mode'); if (themeIcon) themeIcon.textContent = '🌙'; }
if (themeToggleSettings) {
  themeToggleSettings.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    if (themeIcon) themeIcon.textContent = isLight ? '🌙' : '☀️';
    localStorage.setItem('wazeer_theme', isLight ? 'light' : 'dark');
  });
}

// ─ NOTIFICATIONS & MARK ALL READ ──
const notifBtn = document.getElementById('notif-btn');
const notifPanel = document.getElementById('notif-panel');
const notifDot = document.getElementById('notif-dot');
const markAllReadBtn = document.getElementById('mark-all-read');
const notifItems = document.querySelectorAll('.notif-item');

if (notifBtn && notifPanel) {
  notifBtn.addEventListener('click', (e) => { 
    e.stopPropagation(); 
    notifPanel.classList.toggle('open'); 
    if (notifPanel.classList.contains('open') && notifDot) notifDot.style.display = 'none'; 
    if(settingsPanel) settingsPanel.classList.remove('open'); 
  });
  document.addEventListener('click', (e) => { if (!notifPanel.contains(e.target) && !notifBtn.contains(e.target)) notifPanel.classList.remove('open'); });
  notifPanel.addEventListener('click', (e) => e.stopPropagation());
}

// Mark all as read functionality
if (markAllReadBtn) {
  markAllReadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    notifItems.forEach(item => item.classList.remove('unread'));
    if (notifDot) notifDot.style.display = 'none';
  });
}

// Click individual notification to mark as read
notifItems.forEach(item => {
  item.addEventListener('click', () => {
    item.classList.remove('unread');
  });
});

// ─ CHAT FUNCTIONS ──
function renderChatWindow() {
  chatWindow.innerHTML = "";
  const conv = getActive();
  const visible = conv.messages.filter((m) => m.role !== "system");
  if (visible.length === 0) { addMessage("bot", GREETING); return; }
  visible.forEach((m) => addMessage(m.role === "assistant" ? "bot" : "user", m.displayText ?? m.content, m.attachmentMeta));
}

function clearChat() { const conv = getActive(); conv.messages = [SYSTEM_PROMPT]; conv.title = "New chat"; conv.updatedAt = Date.now(); saveState(); clearAttachment(); chatWindow.innerHTML = ""; addMessage("bot", GREETING); renderSidebar(); }
clearBtn.addEventListener("click", clearChat);

function addMessage(role, text, attachmentMeta, isStatus) {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${role === "user" ? "user" : "bot"}`;
  if (isStatus) wrapper.dataset.status = "true";
  const avatar = document.createElement("div");
  avatar.className = `avatar ${role === "user" ? "user-avatar" : "bot-avatar"}`;
  avatar.textContent = role === "user" ? "B" : "W";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  if (isStatus) bubble.classList.add("bubble-status");
  if (attachmentMeta) {
    if (attachmentMeta.kind === "image" && attachmentMeta.dataUrl) { const img = document.createElement("img"); img.src = attachmentMeta.dataUrl; img.className = "bubble-image"; bubble.appendChild(img); } 
    else { const chip = document.createElement("div"); chip.className = "bubble-file-chip"; chip.textContent = `📄 ${attachmentMeta.name}`; bubble.appendChild(chip); }
  }
  if (text) { const textEl = document.createElement("div"); textEl.className = "bubble-text"; textEl.textContent = text; bubble.appendChild(textEl); }
  wrapper.appendChild(avatar); wrapper.appendChild(bubble); chatWindow.appendChild(wrapper); chatWindow.scrollTop = chatWindow.scrollHeight;
}

function setLoading(isLoading) {
  sendBtn.disabled = isLoading; chatInput.disabled = isLoading;
  if (isLoading) {
    if (loadingTimeoutId) clearTimeout(loadingTimeoutId);
    if (typeof window.startThinking === "function") window.startThinking();
    loadingTimeoutId = setTimeout(() => { if (typeof window.stopThinking === "function") window.stopThinking(); typingIndicator.classList.remove("hidden"); chatWindow.scrollTop = chatWindow.scrollHeight; }, 2400);
  } else {
    if (loadingTimeoutId) { clearTimeout(loadingTimeoutId); loadingTimeoutId = null; }
    if (typeof window.stopThinking === "function") window.stopThinking();
    typingIndicator.classList.add("hidden");
  }
}

attachBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0]; fileInput.value = ""; if (!file) return;
  if (file.size > MAX_FILE_BYTES) { addMessage("bot", `⚠️ "${file.name}" is over the 8MB limit.`); return; }
  try {
    if (IMAGE_TYPES.includes(file.type)) { const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); }); pendingAttachment = { kind: "image", name: file.name, dataUrl }; } 
    else { const text = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsText(file); }); pendingAttachment = { kind: "text", name: file.name, content: text.slice(0, MAX_TEXT_CHARS), truncated: text.length > MAX_TEXT_CHARS }; }
    renderAttachmentPreview();
  } catch (err) { addMessage("bot", `⚠️ Couldn't read "${file.name}".`); }
});

function renderAttachmentPreview() {
  attachmentPreview.innerHTML = ""; attachmentPreview.classList.remove("hidden"); attachBtn.classList.add("has-file");
  if (pendingAttachment.kind === "image") { const thumb = document.createElement("img"); thumb.src = pendingAttachment.dataUrl; thumb.className = "thumb"; attachmentPreview.appendChild(thumb); } 
  else { const icon = document.createElement("div"); icon.className = "file-icon"; icon.textContent = pendingAttachment.name.split(".").pop()?.toUpperCase().slice(0, 4) || "FILE"; attachmentPreview.appendChild(icon); }
  const name = document.createElement("div"); name.className = "file-name"; name.textContent = pendingAttachment.truncated ? `${pendingAttachment.name} (truncated)` : pendingAttachment.name; attachmentPreview.appendChild(name);
  const removeBtn = document.createElement("button"); removeBtn.type = "button"; removeBtn.className = "remove-file"; removeBtn.textContent = "✕"; removeBtn.addEventListener("click", clearAttachment); attachmentPreview.appendChild(removeBtn);
}

function clearAttachment() { pendingAttachment = null; attachmentPreview.classList.add("hidden"); attachmentPreview.innerHTML = ""; attachBtn.classList.remove("has-file"); }

async function sendMessage(userText) {
  const conv = getActive(); const attachment = pendingAttachment; clearAttachment();
  let apiContent = userText; let displayText = userText; let attachmentMeta = null;
  if (attachment?.kind === "image") { apiContent = [{ type: "text", text: userText || "Describe this image." }, { type: "image_url", image_url: { url: attachment.dataUrl } }]; attachmentMeta = { kind: "image", name: attachment.name, dataUrl: attachment.dataUrl }; } 
  else if (attachment?.kind === "text") { apiContent = `Attached file "${attachment.name}"${attachment.truncated ? ' (truncated)' : ''}:\n\`\`\`\n${attachment.content}\n\`\`\`\n\n${userText || "Please review."}`; attachmentMeta = { kind: "text", name: attachment.name }; }
  
  addMessage("user", displayText, attachmentMeta);
  const wasFirst = !conv.messages.some((m) => m.role === "user");
  conv.messages.push({ role: "user", content: apiContent, displayText, attachmentMeta });
  if (wasFirst) conv.title = titleFromText(displayText || attachment?.name || "New chat");
  conv.updatedAt = Date.now(); saveState(); renderSidebar(); setLoading(true);
  
  try {
    const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: conv.messages.map((m) => ({ role: m.role, content: m.content })) }) });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    const reply = cleanText(data.reply?.trim() || "Hmm, I didn't get a response.");
    conv.messages.push({ role: "assistant", content: reply }); conv.updatedAt = Date.now(); saveState(); renderSidebar(); addMessage("bot", reply);
  } catch (err) { addMessage("bot", `⚠️ ${err.message || "Something went wrong."}`); } 
  finally { setLoading(false); }
}

chatForm.addEventListener("submit", (e) => { e.preventDefault(); const text = chatInput.value.trim(); if (!text && !pendingAttachment) return; chatInput.value = ""; sendMessage(text); });

// Init
if (newChatIconBtn) newChatIconBtn.addEventListener("click", createConversation);
typingIndicator.classList.add("hidden");
renderChatWindow();
renderSidebar();

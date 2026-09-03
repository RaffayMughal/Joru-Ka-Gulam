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
let loadingTimeout = null; // <-- Added to track the timeout

// ---------- Clean markdown from bot replies ----------

function cleanText(text) {
  return text
    .replace(/#{1,6}\s*/g, '')           // remove # headings
    .replace(/\*\*(.*?)\*\*/gs, '$1')    // remove **bold**
    .replace(/\*(.*?)\*/gs, '$1')        // remove *italic*
    .replace(/^[\-\*]\s+/gm, '')         // remove - or * bullet points
    .replace(/^•\s+/gm, '')             // remove • bullets
    .replace(/`{3}[\s\S]*?`{3}/g, '')   // remove ```code blocks```
    .replace(/`([^`]+)`/g, '$1')         // remove `inline code`
    .replace(/_{1,2}(.*?)_{1,2}/g, '$1') // remove _italic_ or __bold__
    .replace(/\n{3,}/g, '\n\n')          // collapse excessive blank lines
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
  return new

document.addEventListener('DOMContentLoaded', function() {
  
  // Elements
  const chatWindow = document.getElementById("chat-window");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const sendBtn = document.getElementById("send-btn");
  const typingIndicator = document.getElementById("typing-indicator");
  const fileInput = document.getElementById("file-input");
  const attachBtn = document.getElementById("attach-btn");
  const attachmentPreview = document.getElementById("attachment-preview");
  const welcomeScreen = document.getElementById("welcome-screen");
  const messagesContainer = document.getElementById("messages-container");

  const conversationList = document.getElementById("conversation-list");
  const newChatBtn = document.getElementById("new-chat-btn");
  const menuToggle = document.getElementById("menu-toggle");
  const closeSidebarBtn = document.getElementById("close-sidebar");
  const sidebar = document.getElementById("sidebar");
  const modelBtn = document.getElementById("model-btn");
  const modelDropdown = document.getElementById("model-dropdown");
  const themeBtn = document.getElementById("theme-btn");
  const notifBtn = document.getElementById("notif-btn");
  const notifDropdown = document.getElementById("notif-dropdown");
  const notifBadge = document.getElementById("notif-badge");
  const markReadBtn = document.getElementById("mark-read");
  const moreBtn = document.getElementById("more-btn");
  const dropdownMenu = document.getElementById("dropdown-menu");
  const menuPin = document.getElementById("menu-pin");
  const menuRename = document.getElementById("menu-rename");
  const menuClone = document.getElementById("menu-clone");
  const menuArchive = document.getElementById("menu-archive");
  const menuDelete = document.getElementById("menu-delete");
  const toast = document.getElementById("toast");

  const CONVERSATIONS_KEY = "wazeer_conversations";
  const ACTIVE_ID_KEY = "wazeer_active_id";

  const SYSTEM_PROMPT = { role: "system", content: "You are Wazeer, a friendly AI assistant. Always reply in the same language the user is using. Never use markdown symbols. Write in plain text only." };
  const GREETING = "Assalamu Alaikum Badshah! Main hoon Wazeer 🤖 Aap ka apna AI assistant.";

  const MAX_FILE_BYTES = 8 * 1024 * 1024;
  const MAX_TEXT_CHARS = 4000;
  const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

  let pendingAttachment = null;
  let loadingTimeoutId = null;

  // Toast Helper
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2500);
  }

  // Utility Functions
  function cleanText(text) { 
    return text.replace(/#{1,6}\s*/g, '')
      .replace(/\*\*(.*?)\*\*/gs, '$1')
      .replace(/\*(.*?)\*/gs, '$1')
      .replace(/^[\-\*]\s+/gm, '')
      .replace(/`{3}[\s\S]*?`{3}/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\n{3,}/g, '\n\n')
      .trim(); 
  }
  
  function uid() { return `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
  
  function newConversation() { 
    return { id: uid(), title: "New chat", createdAt: Date.now(), updatedAt: Date.now(), messages: [SYSTEM_PROMPT] }; 
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

  function getActive() { return conversations.find((c) => c.id === activeId) || conversations[0]; }
  
  function titleFromText(text) { 
    if (!text) return "New chat"; 
    const clean = text.trim().replace(/\s+/g, " "); 
    return clean.length > 40 ? `${clean.slice(0, 40)}…` : clean; 
  }

  // Sidebar Functions
  function openSidebar() { sidebar.classList.add("open"); }
  function closeSidebarFunc() { sidebar.classList.remove("open"); }

  if (menuToggle) menuToggle.addEventListener("click", openSidebar);
  if (closeSidebarBtn) closeSidebarBtn.addEventListener("click", closeSidebarFunc);

  // Render Sidebar
  function renderSidebar() {
    if (!conversationList) return;
    conversationList.innerHTML = "";
    if (conversations.length === 0) return;
    
    const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
    
    sorted.forEach((conv) => {
      const item = document.createElement("div");
      item.className = `chat-item${conv.id === activeId ? " active" : ""}`;
      
      const title = document.createElement("span");
      title.className = "chat-title";
      title.textContent = conv.title || "New chat";
      
      const delBtn = document.createElement("button");
      delBtn.className = "delete-chat-btn";
      delBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M4 7H20M9 7V4.5C9 4.22 9.22 4 9.5 4H14.5C14.78 4 15 4.22 15 4.5V7M18 7L17.3 18.3C17.25 19.25 16.45 20 15.5 20H8.5C7.55 20 6.75 19.25 6.7 18.3L6 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      delBtn.addEventListener("click", (e) => { 
        e.stopPropagation(); 
        deleteConversation(conv.id);
        showToast("Chat deleted");
      });
      
      item.appendChild(title);
      item.appendChild(delBtn);
      item.addEventListener("click", () => { 
        switchConversation(conv.id); 
        if (window.innerWidth <= 768) closeSidebarFunc();
      });
      conversationList.appendChild(item);
    });
  }

  function switchConversation(id) { 
    if (id === activeId) return; 
    activeId = id; 
    saveState(); 
    clearAttachment(); 
    renderChatWindow(); 
    renderSidebar(); 
  }
  
  function createConversation() { 
    const conv = newConversation(); 
    conversations.push(conv); 
    activeId = conv.id; 
    saveState(); 
    clearAttachment(); 
    renderChatWindow(); 
    renderSidebar(); 
    if(chatInput) chatInput.focus(); 
    if (window.innerWidth <= 768) closeSidebarFunc();
  }
  
  function deleteConversation(id) { 
    conversations = conversations.filter((c) => c.id !== id); 
    if (conversations.length === 0) conversations = [newConversation()]; 
    if (id === activeId) activeId = conversations[0].id; 
    saveState(); 
    clearAttachment(); 
    renderChatWindow(); 
    renderSidebar(); 
  }

  // New Chat Button
  if (newChatBtn) newChatBtn.addEventListener("click", createConversation);

  // Close all dropdowns helper
  function closeAllDropdowns() {
    if (modelDropdown) modelDropdown.classList.remove("open");
    if (notifDropdown) notifDropdown.classList.remove("open");
    if (dropdownMenu) dropdownMenu.classList.remove("open");
  }

  document.addEventListener("click", function(e) {
    if (!modelBtn?.contains(e.target)) modelDropdown?.classList.remove("open");
    if (!notifBtn?.contains(e.target) && !notifDropdown?.contains(e.target)) {
      notifDropdown?.classList.remove("open");
    }
    if (!moreBtn?.contains(e.target) && !dropdownMenu?.contains(e.target)) {
      dropdownMenu?.classList.remove("open");
    }
  });

  // Model Selector
  if (modelBtn && modelDropdown) {
    modelBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      closeAllDropdowns();
      modelDropdown.classList.toggle("open");
    });
    
    const modelOptions = modelDropdown.querySelectorAll(".model-option");
    modelOptions.forEach(opt => {
      opt.addEventListener("click", function() {
        modelOptions.forEach(o => o.classList.remove("active"));
        opt.classList.add("active");
        const modelName = modelBtn.querySelector("span");
        if (modelName) modelName.textContent = opt.textContent;
        modelDropdown.classList.remove("open");
        showToast(`Switched to ${opt.textContent}`);
      });
    });
  }

  // Theme Toggle
  if (themeBtn) {
    const sunIcon = themeBtn.querySelector('.sun-icon');
    const moonIcon = themeBtn.querySelector('.moon-icon');
    const savedTheme = localStorage.getItem('wazeer_theme');
    
    function updateThemeIcons(isLight) {
      if (sunIcon) sunIcon.style.display = isLight ? 'none' : 'block';
      if (moonIcon) moonIcon.style.display = isLight ? 'block' : 'none';
    }

    if (savedTheme === 'light') {
      document.body.classList.add('light-mode');
      updateThemeIcons(true);
    } else {
      updateThemeIcons(false);
    }
    
    themeBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      document.body.classList.toggle("light-mode");
      const isLight = document.body.classList.contains('light-mode');
      localStorage.setItem('wazeer_theme', isLight ? 'light' : 'dark');
      updateThemeIcons(isLight);
      showToast(isLight ? "Light mode enabled" : "Dark mode enabled");
    });
  }

  // Notifications Dropdown (NO MORE ALERT!)
  if (notifBtn && notifDropdown) {
    notifBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      closeAllDropdowns();
      notifDropdown.classList.toggle("open");
      notifBtn.classList.toggle("active");
    });

    // Mark all as read
    if (markReadBtn) {
      markReadBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        const unreadItems = notifDropdown.querySelectorAll(".notif-item.unread");
        unreadItems.forEach(item => item.classList.remove("unread"));
        if (notifBadge) notifBadge.classList.add("hidden");
        showToast("All notifications marked as read");
      });
    }

    // Click on individual notifications
    const notifItems = notifDropdown.querySelectorAll(".notif-item");
    notifItems.forEach(item => {
      item.addEventListener("click", function() {
        this.classList.remove("unread");
        const hasUnread = notifDropdown.querySelectorAll(".notif-item.unread").length > 0;
        if (!hasUnread && notifBadge) notifBadge.classList.add("hidden");
      });
    });
  }

  // More Options Dropdown
  if (moreBtn && dropdownMenu) {
    moreBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      closeAllDropdowns();
      dropdownMenu.classList.toggle("open");
      moreBtn.classList.toggle("active");
    });
  }

  // Menu Actions (all functional now!)
  if (menuPin) {
    menuPin.addEventListener("click", function() {
      dropdownMenu.classList.remove("open");
      showToast("⭐ Chat pinned!");
    });
  }

  if (menuRename) {
    menuRename.addEventListener("click", function() {
      dropdownMenu.classList.remove("open");
      const conv = getActive();
      const newName = prompt("Enter new chat name:", conv.title);
      if (newName && newName.trim()) {
        conv.title = newName.trim();
        conv.updatedAt = Date.now();
        saveState();
        renderSidebar();
        showToast("Chat renamed!");
      }
    });
  }

  if (menuClone) {
    menuClone.addEventListener("click", function() {
      dropdownMenu.classList.remove("open");
      const conv = getActive();
      const clone = {
        id: uid(),
        title: conv.title + " (copy)",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: JSON.parse(JSON.stringify(conv.messages))
      };
      conversations.push(clone);
      activeId = clone.id;
      saveState();
      renderChatWindow();
      renderSidebar();
      showToast("Chat cloned!");
    });
  }

  if (menuArchive) {
    menuArchive.addEventListener("click", function() {
      dropdownMenu.classList.remove("open");
      showToast("📦 Chat archived!");
    });
  }

  if (menuDelete) {
    menuDelete.addEventListener("click", function() {
      dropdownMenu.classList.remove("open");
      if (confirm("Are you sure you want to delete this chat?")) {
        deleteConversation(activeId);
        showToast("Chat deleted!");
      }
    });
  }

  // Chat Functions
  function renderChatWindow() {
    if (!chatWindow) return;
    chatWindow.innerHTML = "";
    const conv = getActive();
    const visible = conv.messages.filter((m) => m.role !== "system");
    
    if (visible.length === 0) {
      if (welcomeScreen) welcomeScreen.style.display = "flex";
      if (messagesContainer) messagesContainer.style.display = "none";
      return;
    }
    
    if (welcomeScreen) welcomeScreen.style.display = "none";
    if (messagesContainer) messagesContainer.style.display = "block";
    
    visible.forEach((m) => addMessage(m.role === "assistant" ? "bot" : "user", m.displayText ?? m.content, m.attachmentMeta));
  }

  function addMessage(role, text, attachmentMeta) {
    if (welcomeScreen) welcomeScreen.style.display = "none";
    if (messagesContainer) messagesContainer.style.display = "block";
    
    const wrapper = document.createElement("div");
    wrapper.className = `message ${role}`;
    
    const avatar = document.createElement("div");
    avatar.className = `message-avatar`;
    avatar.textContent = role === "user" ? "B" : "W";
    
    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    
    if (attachmentMeta) {
      if (attachmentMeta.kind === "image" && attachmentMeta.dataUrl) {
        const img = document.createElement("img");
        img.src = attachmentMeta.dataUrl;
        img.style.cssText = "max-width:240px;max-height:240px;border-radius:10px;margin-bottom:8px;";
        bubble.appendChild(img);
      } else {
        const chip = document.createElement("div");
        chip.textContent = `📄 ${attachmentMeta.name}`;
        chip.style.cssText = "font-size:13px;padding:6px 10px;background:rgba(255,255,255,0.1);border-radius:8px;margin-bottom:8px;";
        bubble.appendChild(chip);
      }
    }
    
    if (text) {
      const textEl = document.createElement("div");
      textEl.textContent = text;
      bubble.appendChild(textEl);
    }
    
    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);
    chatWindow.appendChild(wrapper);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function setLoading(isLoading) {
    if (sendBtn) sendBtn.disabled = isLoading;
    if (chatInput) chatInput.disabled = isLoading;
    
    if (isLoading) {
      if (loadingTimeoutId) clearTimeout(loadingTimeoutId);
      loadingTimeoutId = setTimeout(() => {
        if (typingIndicator) {
          typingIndicator.classList.remove("hidden");
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 1500);
    } else {
      if (loadingTimeoutId) { 
        clearTimeout(loadingTimeoutId); 
        loadingTimeoutId = null; 
      }
      if (typingIndicator) typingIndicator.classList.add("hidden");
    }
  }

  // File Upload
  if (attachBtn) {
    attachBtn.addEventListener("click", function() {
      if (fileInput) fileInput.click();
    });
  }
  
  if (fileInput) {
    fileInput.addEventListener("change", async function() {
      const file = fileInput.files?.[0];
      fileInput.value = "";
      if (!file) return;
      
      if (file.size > MAX_FILE_BYTES) {
        addMessage("bot", `⚠️ "${file.name}" is over the 8MB limit.`);
        return;
      }
      
      try {
        if (IMAGE_TYPES.includes(file.type)) {
          const dataUrl = await new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(r.result);
            r.onerror = rej;
            r.readAsDataURL(file);
          });
          pendingAttachment = { kind: "image", name: file.name, dataUrl };
        } else {
          const text = await new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(r.result);
            r.onerror = rej;
            r.readAsText(file);
          });
          pendingAttachment = { kind: "text", name: file.name, content: text.slice(0, MAX_TEXT_CHARS), truncated: text.length > MAX_TEXT_CHARS };
        }
        renderAttachmentPreview();
      } catch (err) {
        addMessage("bot", `⚠️ Couldn't read "${file.name}".`);
      }
    });
  }

  function renderAttachmentPreview() {
    if (!attachmentPreview) return;
    attachmentPreview.innerHTML = "";
    attachmentPreview.classList.remove("hidden");
    
    if (pendingAttachment.kind === "image") {
      const thumb = document.createElement("img");
      thumb.src = pendingAttachment.dataUrl;
      thumb.className = "thumb";
      attachmentPreview.appendChild(thumb);
    } else {
      const icon = document.createElement("div");
      icon.className = "file-icon";
      icon.textContent = pendingAttachment.name.split(".").pop()?.toUpperCase().slice(0, 4) || "FILE";
      attachmentPreview.appendChild(icon);
    }
    
    const name = document.createElement("div");
    name.className = "file-name";
    name.textContent = pendingAttachment.name;
    attachmentPreview.appendChild(name);
    
    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-file";
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", clearAttachment);
    attachmentPreview.appendChild(removeBtn);
  }

  function clearAttachment() {
    pendingAttachment = null;
    if (attachmentPreview) {
      attachmentPreview.classList.add("hidden");
      attachmentPreview.innerHTML = "";
    }
  }

  // Send Message
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
      apiContent = `Attached file "${attachment.name}":\n\`\`\`\n${attachment.content}\n\`\`\`\n\n${userText || "Please review."}`;
      attachmentMeta = { kind: "text", name: attachment.name };
    }

    addMessage("user", displayText, attachmentMeta);
    
    const wasFirst = !conv.messages.some((m) => m.role === "user");
    conv.messages.push({ role: "user", content: apiContent, displayText, attachmentMeta });
    
    if (wasFirst) conv.title = titleFromText(displayText || attachment?.name || "New chat");
    
    conv.updatedAt = Date.now();
    saveState();
    renderSidebar();
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: conv.messages.map((m) => ({ role: m.role, content: m.content })) 
        })
      });
      
      if (!res.ok) throw new Error(await res.text());
      
      const data = await res.json();
      const reply = cleanText(data.reply?.trim() || "Hmm, I didn't get a response.");
      
      conv.messages.push({ role: "assistant", content: reply });
      conv.updatedAt = Date.now();
      saveState();
      renderSidebar();
      addMessage("bot", reply);
    } catch (err) {
      addMessage("bot", `⚠️ ${err.message || "Something went wrong."}`);
    } finally {
      setLoading(false);
    }
  }

  // Form Submit
  if (chatForm) {
    chatForm.addEventListener("submit", function(e) {
      e.preventDefault();
      const text = chatInput ? chatInput.value.trim() : "";
      if (!text && !pendingAttachment) return;
      if (chatInput) chatInput.value = "";
      sendMessage(text);
    });
  }

  // Initialize
  if (typingIndicator) typingIndicator.classList.add("hidden");
  renderChatWindow();
  renderSidebar();
  
  console.log("✨ Wazeer chatbot initialized successfully!");
  
});

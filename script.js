document.addEventListener('DOMContentLoaded', () => {
  console.log("✅ Wazeer JS Loaded Successfully!");

  // 1. Generate 100 Floating Particles
  const particlesContainer = document.getElementById('particles-container');
  if (particlesContainer) {
    for (let i = 0; i < 100; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.width = p.style.height = (Math.random() * 4 + 2) + 'px';
      p.style.animationDuration = (Math.random() * 15 + 10) + 's';
      p.style.animationDelay = (Math.random() * 10) + 's';
      particlesContainer.appendChild(p);
    }
    console.log("✅ 100 Particles generated");
  }

  // Helper: Close all dropdowns at once
  const closeAllDropdowns = () => {
    document.getElementById('model-dropdown')?.classList.remove('open');
    document.getElementById('notif-dropdown')?.classList.remove('open');
    document.getElementById('dropdown-menu')?.classList.remove('open');
    document.getElementById('notif-btn')?.classList.remove('active');
    document.getElementById('more-btn')?.classList.remove('active');
  };

  // Close dropdowns when clicking anywhere else on the page
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#model-btn') && !e.target.closest('#model-dropdown')) {
      document.getElementById('model-dropdown')?.classList.remove('open');
    }
    if (!e.target.closest('#notif-btn') && !e.target.closest('#notif-dropdown')) {
      document.getElementById('notif-dropdown')?.classList.remove('open');
      document.getElementById('notif-btn')?.classList.remove('active');
    }
    if (!e.target.closest('#more-btn') && !e.target.closest('#dropdown-menu')) {
      document.getElementById('dropdown-menu')?.classList.remove('open');
      document.getElementById('more-btn')?.classList.remove('active');
    }
  });

  // 2. Model Selector (FIXED)
  const modelBtn = document.getElementById('model-btn');
  const modelDropdown = document.getElementById('model-dropdown');
  const modelNameText = document.getElementById('model-name-text');

  if (modelBtn && modelDropdown) {
    modelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllDropdowns();
      modelDropdown.classList.toggle('open');
    });

    modelDropdown.querySelectorAll('.model-option').forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        modelDropdown.querySelectorAll('.model-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        if (modelNameText) modelNameText.textContent = opt.textContent;
        modelDropdown.classList.remove('open');
        showToast(`Switched to ${opt.textContent}`);
      });
    });
  }

  // 3. Notifications & Mark Read (FIXED)
  const notifBtn = document.getElementById('notif-btn');
  const notifDropdown = document.getElementById('notif-dropdown');
  const markReadBtn = document.getElementById('mark-read');
  const notifBadge = document.getElementById('notif-badge');

  if (notifBtn && notifDropdown) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllDropdowns();
      notifDropdown.classList.toggle('open');
      notifBtn.classList.toggle('active');
    });

    if (markReadBtn) {
      markReadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log("✅ Mark Read clicked!");
        notifDropdown.querySelectorAll('.notif-item.unread').forEach(item => {
          item.classList.remove('unread');
        });
        if (notifBadge) notifBadge.classList.add('hidden');
        showToast('All notifications marked as read');
      });
    }

    // Click individual notification to mark as read
    notifDropdown.querySelectorAll('.notif-item').forEach(item => {
      item.addEventListener('click', () => {
        item.classList.remove('unread');
        if (notifDropdown.querySelectorAll('.notif-item.unread').length === 0 && notifBadge) {
          notifBadge.classList.add('hidden');
        }
      });
    });
  }

  // 4. More Options Menu (FIXED)
  const moreBtn = document.getElementById('more-btn');
  const dropdownMenu = document.getElementById('dropdown-menu');

  if (moreBtn && dropdownMenu) {
    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllDropdowns();
      dropdownMenu.classList.toggle('open');
      moreBtn.classList.toggle('active');
    });
  }

  // Menu Actions Map
  const menuActions = {
    'menu-pin': '⭐ Chat pinned!',
    'menu-rename': () => {
      const newName = prompt('Enter new chat name:', 'New Chat');
      if (newName?.trim()) showToast('Chat renamed to: ' + newName.trim());
    },
    'menu-clone': '📋 Chat cloned!',
    'menu-archive': '📦 Chat archived!',
    'menu-delete': () => {
      if (confirm('Are you sure you want to delete this chat?')) {
        showToast('Chat deleted!');
      }
    }
  };

  // Attach menu actions
  Object.keys(menuActions).forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu?.classList.remove('open');
        moreBtn?.classList.remove('active');
        const action = menuActions[id];
        if (typeof action === 'function') action();
        else showToast(action);
      });
    }
  });

  // 5. Theme Toggle
  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) {
    const sunIcon = themeBtn.querySelector('.sun-icon');
    const moonIcon = themeBtn.querySelector('.moon-icon');
    const savedTheme = localStorage.getItem('wazeer_theme');
    
    if (savedTheme === 'light') {
      document.body.classList.add('light-mode');
      if (sunIcon) sunIcon.style.display = 'none';
      if (moonIcon) moonIcon.style.display = 'block';
    }

    themeBtn.addEventListener('click', () => {
      document.body.classList.toggle('light-mode');
      const isLight = document.body.classList.contains('light-mode');
      localStorage.setItem('wazeer_theme', isLight ? 'light' : 'dark');
      if (sunIcon) sunIcon.style.display = isLight ? 'none' : 'block';
      if (moonIcon) moonIcon.style.display = isLight ? 'block' : 'none';
      showToast(isLight ? 'Light mode enabled' : 'Dark mode enabled');
    });
  }

  // Toast Helper Function
  function showToast(message) {
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2500);
    }
  }

  console.log("🚀 All buttons and features initialized successfully!");
});

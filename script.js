const landingView = document.getElementById('landing-view');
const chatView = document.getElementById('chat-view');
const messagesEl = document.getElementById('chat-messages');

const inputA = document.getElementById('chat-input');
const sendA = document.getElementById('send-btn');
const inputB = document.getElementById('chat-input-2');
const sendB = document.getElementById('send-btn-2');

let started = false;
let history = []; // { role: 'user' | 'assistant', content: string }

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
}

function wireInput(inputEl, sendEl) {
  inputEl.addEventListener('input', () => {
    autoResize(inputEl);
    sendEl.disabled = inputEl.value.trim().length === 0;
  });
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputEl.value.trim().length > 0) sendMessage(inputEl.value.trim());
    }
  });
  sendEl.addEventListener('click', () => {
    if (inputEl.value.trim().length > 0) sendMessage(inputEl.value.trim());
  });
}

wireInput(inputA, sendA);
wireInput(inputB, sendB);

function addMessage(role, text) {
  const msg = document.createElement('div');
  msg.className = 'message ' + (role === 'user' ? 'user' : 'bot');
  msg.textContent = text;
  messagesEl.appendChild(msg);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return msg;
}

async function sendMessage(text) {
  if (!started) {
    started = true;
    landingView.style.display = 'none';
    chatView.style.display = 'flex';
  }

  inputA.value = '';
  inputB.value = '';
  autoResize(inputA);
  autoResize(inputB);
  sendA.disabled = true;
  sendB.disabled = true;

  addMessage('user', text);
  history.push({ role: 'user', content: text });

  const typingMsg = addMessage('bot', 'Thinking…');

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history })
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      typingMsg.textContent = 'Error: ' + (data.error || 'Request failed');
      return;
    }

    typingMsg.textContent = data.reply;
    history.push({ role: 'assistant', content: data.reply });

  } catch (err) {
    typingMsg.textContent = 'Error: could not reach the server.';
  }
}

document.getElementById('new-chat-btn').addEventListener('click', (e) => {
  e.preventDefault();
  history = [];
  messagesEl.innerHTML = '';
  started = false;
  chatView.style.display = 'none';
  landingView.style.display = 'flex';
});

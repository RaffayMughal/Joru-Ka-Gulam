/**
 * Synaptic network background for Wazeer.
 *
 * Ambient behavior: nodes drift slowly and draw a faint line to nearby
 * nodes, like idle neural activity. The cursor joins the network as a
 * temporary node.
 *
 * Signature moment: calling triggerSynapseBurst(x, y) fires a burst of
 * warm "spark" particles outward from that point, which fade and merge
 * back into the ambient network. Hooked automatically to the send
 * button and Enter-to-send.
 */
(function () {
  const canvas = document.getElementById('synapse-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const AMBIENT_COLOR = [124, 58, 237];   // purple, matches --accent
  const AMBIENT_COLOR_ALT = [14, 165, 233]; // cyan
  const SPARK_COLOR = [251, 191, 36];     // gold, reserved for the burst
  const LINK_DISTANCE = 130;
  const CURSOR_LINK_DISTANCE = 170;

  let width, height, dpr;
  let nodes = [];
  let sparks = [];
  let mouse = { x: -9999, y: -9999, active: false };
  let reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const density = Math.max(36, Math.min(90, Math.floor((width * height) / 22000)));
    nodes = Array.from({ length: density }, createNode);
  }

  function createNode() {
    const alt = Math.random() < 0.35;
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r: 1.2 + Math.random() * 1.4,
      color: alt ? AMBIENT_COLOR_ALT : AMBIENT_COLOR,
      twinkle: Math.random() * Math.PI * 2,
    };
  }

  function createSpark(x, y, angle, speed) {
    return {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.012 + Math.random() * 0.01,
      r: 1.5 + Math.random() * 1.8,
    };
  }

  window.triggerSynapseBurst = function (x, y) {
    if (reduceMotion) return;
    const count = 22;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 1.2 + Math.random() * 2.2;
      sparks.push(createSpark(x, y, angle, speed));
    }
  };

  function step() {
    ctx.clearRect(0, 0, width, height);

    // Ambient nodes drift and wrap around edges
    for (const n of nodes) {
      n.x += n.vx;
      n.y += n.vy;
      n.twinkle += 0.01;
      if (n.x < -20) n.x = width + 20;
      if (n.x > width + 20) n.x = -20;
      if (n.y < -20) n.y = height + 20;
      if (n.y > height + 20) n.y = -20;
    }

    // Connections between nearby nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < LINK_DISTANCE) {
          const opacity = (1 - dist / LINK_DISTANCE) * 0.16;
          ctx.strokeStyle = `rgba(${a.color[0]}, ${a.color[1]}, ${a.color[2]}, ${opacity})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // Connection to cursor, so the cursor feels part of the network
      if (mouse.active) {
        const dx = nodes[i].x - mouse.x, dy = nodes[i].y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CURSOR_LINK_DISTANCE) {
          const opacity = (1 - dist / CURSOR_LINK_DISTANCE) * 0.25;
          ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }
    }

    // Draw nodes
    for (const n of nodes) {
      const glow = 0.5 + Math.sin(n.twinkle) * 0.2;
      ctx.beginPath();
      ctx.fillStyle = `rgba(${n.color[0]}, ${n.color[1]}, ${n.color[2]}, ${glow})`;
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Update and draw sparks (the send-burst effect)
    sparks = sparks.filter((s) => s.life > 0);
    for (const s of sparks) {
      s.x += s.vx;
      s.y += s.vy;
      s.vx *= 0.96;
      s.vy *= 0.96;
      s.life -= s.decay;
      ctx.beginPath();
      ctx.fillStyle = `rgba(${SPARK_COLOR[0]}, ${SPARK_COLOR[1]}, ${SPARK_COLOR[2]}, ${Math.max(s.life, 0)})`;
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(step);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  });
  window.addEventListener('mouseleave', () => { mouse.active = false; });

  // Hook the burst to whatever send affordance exists in the page
  function wireSendTrigger() {
    const sendBtn = document.querySelector('.send-button');
    const input = document.querySelector('textarea[id^="chat-input"], #user-input, .input-bar');

    function fireFromButton() {
      if (!sendBtn) return;
      const rect = sendBtn.getBoundingClientRect();
      window.triggerSynapseBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }

    if (sendBtn) sendBtn.addEventListener('click', fireFromButton);
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) fireFromButton();
      });
    }
  }

  resize();
  wireSendTrigger();
  requestAnimationFrame(step);
})();

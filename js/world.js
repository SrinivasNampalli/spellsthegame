import { canvas, game, dom } from './context.js';
import { biomes } from './data.js';
import { sprites } from './assets.js';
import { showToast } from './ui.js';
import { clamp } from './utils.js';

let onBiomeChanged = null;

export function setOnBiomeChanged(fn) {
  onBiomeChanged = fn;
}

export function resizeCanvas() {
  const maxWidth = Math.min(1400, window.innerWidth * 0.9);
  const maxHeight = Math.min(900, window.innerHeight * 0.9);
  const aspectRatio = 16 / 10;

  if (maxWidth / maxHeight > aspectRatio) {
    canvas.width = maxHeight * aspectRatio;
    canvas.height = maxHeight;
  } else {
    canvas.width = maxWidth;
    canvas.height = maxWidth / aspectRatio;
  }
}

export function bindResize(onResizeLayout) {
  window.addEventListener('resize', () => {
    resizeCanvas();
    try {
      onResizeLayout?.();
    } catch {
      // ignore
    }
  });
}

export function updateBackButtonVisibility() {
  const el = dom.backButtonEl;
  if (!el) return;

  if (game.currentBiome === 'home') {
    el.classList.add('hidden');
    return;
  }

  el.classList.remove('hidden');
  el.textContent = game.currentBiome === 'glitchedVoid' ? 'Back (Locked)' : 'Back';
}

export function handleBackButton() {
  if (game.transitioning || game.currentBiome === 'home') return;

  if (game.currentBiome === 'glitchedVoid') {
    showToast('Locked');
    return;
  }
  startTransition('home');
}

export function bindBackButton() {
  if (!dom.backButtonEl) return;
  dom.backButtonEl.addEventListener('click', () => handleBackButton());
}

export function returnHome() {
  if (game.currentBiome !== 'home') startTransition('home');
}

export function startTransition(targetBiome) {
  game.transitioning = true;
  game.transitionAlpha = 0;
  game.transitionTarget = targetBiome;
  game.transitionMessages = biomes[targetBiome].transitionMessages;
  game.transitionMessageIndex = 0;
  game.transitionTimer = 0;
}

export function updateTransition(deltaTime) {
  if (!game.transitioning) return false;

  game.transitionTimer += deltaTime;
  if (game.transitionAlpha < 1) game.transitionAlpha += deltaTime / 500;

  if (game.transitionTimer > (game.transitionMessageIndex + 1) * 800) {
    game.transitionMessageIndex++;
    if (game.transitionMessageIndex >= game.transitionMessages.length) {
      completeTransition();
      return false;
    }
  }
  return true;
}

function completeTransition() {
  game.currentBiome = game.transitionTarget;
  game.transitioning = false;
  game.transitionAlpha = 0;
  updateBackButtonVisibility();
  if (typeof onBiomeChanged === 'function') {
    onBiomeChanged(game.currentBiome);
  }
}

export function drawBackground(ctx) {
  const currentBiomeData = biomes[game.currentBiome];
  if (currentBiomeData.background && sprites[currentBiomeData.background]) {
    ctx.drawImage(sprites[currentBiomeData.background], 0, 0, canvas.width, canvas.height);
    return;
  }
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

export function drawTransitionScreen(ctx) {
  const a = Math.min(1, game.transitionAlpha);
  const target = game.transitionTarget;
  const t = (performance.now ? performance.now() : Date.now()) / 1000;

  const overlayByTarget = {
    home: [0, 0, 0],
    waterQueenRealm: [0, 30, 55],
    magmaKingdom: [45, 8, 0],
    mysticalLibrary: [20, 5, 40],
    glitchedVoid: [5, 0, 5],
  };

  const [or, og, ob] = overlayByTarget[target] || [0, 0, 0];
  const gradient = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, 0,
    canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.7
  );
  gradient.addColorStop(0, `rgba(${or}, ${og}, ${ob}, ${a * 0.6})`);
  gradient.addColorStop(1, `rgba(${or}, ${og}, ${ob}, ${a})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (target === 'mysticalLibrary') {
    ctx.save();
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const spirals = 4;

    for (let s = 0; s < spirals; s++) {
      ctx.beginPath();
      const offset = (s / spirals) * Math.PI * 2;
      const maxRadius = Math.max(canvas.width, canvas.height) * 0.85;

      for (let i = 0; i < 220; i++) {
        const progress = i / 220;
        const angle = progress * Math.PI * 7 + t * 2.2 + offset;
        const radius = progress * maxRadius * a;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      const opacity = a * (0.35 - s * 0.05);
      ctx.strokeStyle = `rgba(210, 170, 255, ${opacity})`;
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }

    // Pulsing center circle
    ctx.globalAlpha = a * (0.5 + Math.sin(t * 4) * 0.3);
    ctx.fillStyle = '#cc66ff';
    ctx.beginPath();
    ctx.arc(cx, cy, 20 + Math.sin(t * 3) * 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (target === 'magmaKingdom') {
    for (let i = 0; i < 50; i++) {
      const x = canvas.width * ((i * 41) % 100) / 100 + Math.sin(t * 1.5 + i) * 15;
      const y = canvas.height * (1 - ((t * 0.25 + i * 0.045) % 1));
      const r = 2.5 + ((i * 19) % 6);
      ctx.save();
      ctx.globalAlpha = a * (0.4 + Math.sin(t * 3 + i) * 0.15);
      const colorChoices = ['#ffcc66', '#ff5533', '#ff8844', '#ffaa22'];
      ctx.fillStyle = colorChoices[i % colorChoices.length];
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (target === 'waterQueenRealm') {
    for (let i = 0; i < 35; i++) {
      const phase = i * 0.8;
      const x = canvas.width * ((i * 97) % 100) / 100 + Math.sin(t * 1.6 + phase) * 20;
      const y = canvas.height * (1 - ((t * 0.14 + i * 0.032) % 1));
      const r = 2.5 + ((i * 13) % 5);
      ctx.save();
      ctx.globalAlpha = a * (0.3 + Math.sin(t * 2 + i) * 0.1);
      const brightness = 120 + Math.sin(t * 4 + i) * 30;
      ctx.strokeStyle = `rgba(${brightness}, 220, 255, 1)`;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = `rgba(${brightness}, 220, 255, 0.6)`;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  } else if (target === 'glitchedVoid') {
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 40 + 10;
      ctx.save();
      ctx.globalAlpha = a * Math.random() * 0.3;
      ctx.fillStyle = `rgb(${Math.random() * 100}, ${Math.random() * 50}, ${Math.random() * 100})`;
      ctx.fillRect(x, y, size, size);
      ctx.restore();
    }
  }

  // Messages
  const isGlitched = target === 'glitchedVoid';
  for (let i = 0; i <= game.transitionMessageIndex && i < game.transitionMessages.length; i++) {
    const message = game.transitionMessages[i];
    const yOffset = canvas.height / 2 - 100 + i * 60;

    if (isGlitched) {
      ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 100}, ${Math.random() * 100}, ${a})`;
      ctx.font = `${24 + Math.random() * 8}px monospace`;
      const glitchX = canvas.width / 2 + (Math.random() - 0.5) * 20;
      const glitchY = yOffset + (Math.random() - 0.5) * 10;
      ctx.textAlign = 'center';
      ctx.fillText(message, glitchX, glitchY);
      continue;
    }

    const styleByTarget = {
      home: { color: 'rgba(255, 215, 0, A)', font: 'bold 24px Georgia' },
      waterQueenRealm: { color: 'rgba(140, 240, 255, A)', font: 'bold 24px Georgia' },
      magmaKingdom: { color: 'rgba(255, 180, 90, A)', font: 'bold 24px Georgia' },
      mysticalLibrary: { color: 'rgba(210, 170, 255, A)', font: 'bold 24px Georgia' },
    };
    const theme = styleByTarget[target] || styleByTarget.home;
    ctx.fillStyle = theme.color.replace('A', a.toString());
    ctx.font = theme.font;
    ctx.textAlign = 'center';
    const wobble = target === 'waterQueenRealm' ? Math.sin(t * 3 + i) * 4 : 0;
    const heatShake = target === 'magmaKingdom' ? Math.sin(t * 18 + i * 2) * 2 : 0;
    ctx.fillText(message, canvas.width / 2 + heatShake, yOffset + wobble);
  }
}


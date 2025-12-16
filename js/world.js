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
  if (game.transitioning) return;
  if (game.currentBiome === 'home') return;
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

  if (game.transitionAlpha < 1) {
    game.transitionAlpha += deltaTime / 500;
  }

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
  if (typeof onBiomeChanged === 'function') onBiomeChanged(game.currentBiome);
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
    waterQueenRealm: [0, 25, 50],
    magmaKingdom: [40, 5, 0],
    mysticalLibrary: [15, 0, 35],
    glitchedVoid: [0, 0, 0],
  };
  const [or, og, ob] = overlayByTarget[target] || [0, 0, 0];
  ctx.fillStyle = `rgba(${or}, ${og}, ${ob}, ${a})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Light realm-specific FX (kept simple here; can be expanded)
  if (target === 'mysticalLibrary') {
    // Hypnotic spiral effect for mind games theme
    ctx.save();
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const spirals = 3;

    for (let s = 0; s < spirals; s++) {
      ctx.beginPath();
      const offset = (s / spirals) * Math.PI * 2;
      const maxRadius = Math.max(canvas.width, canvas.height) * 0.8;

      for (let i = 0; i < 200; i++) {
        const progress = i / 200;
        const angle = progress * Math.PI * 6 + t * 2 + offset;
        const radius = progress * maxRadius * a;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.strokeStyle = `rgba(210, 170, 255, ${a * 0.3})`;
      ctx.lineWidth = 3;
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
    for (let i = 0; i < 40; i++) {
      const x = canvas.width * ((i * 41) % 100) / 100 + Math.sin(t * 1.3 + i) * 12;
      const y = canvas.height * (1 - ((t * 0.22 + i * 0.04) % 1));
      const r = 2 + ((i * 19) % 5);
      ctx.save();
      ctx.globalAlpha = a * 0.45;
      ctx.fillStyle = (i % 2) === 0 ? '#ffcc66' : '#ff5533';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (target === 'waterQueenRealm') {
    for (let i = 0; i < 28; i++) {
      const phase = i * 0.77;
      const x = canvas.width * ((i * 97) % 100) / 100 + Math.sin(t * 1.5 + phase) * 18;
      const y = canvas.height * (1 - ((t * 0.12 + i * 0.03) % 1));
      const r = 2 + ((i * 13) % 4);
      ctx.save();
      ctx.globalAlpha = a * 0.35;
      ctx.strokeStyle = 'rgba(120, 220, 255, 1)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
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


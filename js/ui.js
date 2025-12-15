import { canvas, ctx, game, dom } from './context.js';
import { biomes, items } from './data.js';
import { clamp } from './utils.js';
import { drawCraftingUI, drawGuideUI } from './crafting.js';
import { addScreenShake, spawnDamageNumber } from './combat.js';
import { spawnParticle } from './particles.js';

export function showToast(text, ms = 1400) {
  if (!dom.toastEl) return;
  dom.toastEl.textContent = text;
  dom.toastEl.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => dom.toastEl.classList.add('hidden'), ms);
}

export function showDialogue(npcName, text) {
  game.dialogueActive = true;
  dom.dialogueBox?.classList.remove('hidden');
  if (dom.npcNameEl) dom.npcNameEl.textContent = npcName;
  if (dom.dialogueTextEl) dom.dialogueTextEl.textContent = text;
}

export function hideDialogue() {
  game.dialogueActive = false;
  game.currentNPC = null;
  dom.dialogueBox?.classList.add('hidden');
}

export function bindLevelUpUI() {
  if (window.__spellsLevelUpHook) return;
  window.__spellsLevelUpHook = true;

  window.addEventListener('player-level-up', (e) => {
    const level = e?.detail?.level ?? game?.player?.level;
    const gain = e?.detail?.gain;
    if (gain) {
      showToast(`Level up! Lv ${level} (+HP ${gain.hp}, +MP ${gain.mana}, +DMG ${gain.damage}, +DEF ${gain.defense})`, 2200);
    } else {
      showToast(`Level up! Lv ${level}`, 1800);
    }
    game.ui.levelFlashMs = 900;
    addScreenShake(220, 6);

    const px = game.player?.x + (game.player?.width || 0) / 2;
    const py = game.player?.y + 10;
    if (Number.isFinite(px) && Number.isFinite(py)) {
      spawnDamageNumber(px, py, 'LEVEL UP!', '#ffcc00');
      for (let i = 0; i < 14; i++) {
        const ang = (i / 14) * Math.PI * 2;
        spawnParticle({
          x: px,
          y: py,
          vx: Math.cos(ang) * (60 + Math.random() * 40),
          vy: Math.sin(ang) * (60 + Math.random() * 40) - 30,
          size: 3 + Math.random() * 2,
          color: Math.random() > 0.5 ? '#ffcc00' : '#ffd7ff',
          lifeMs: 650 + Math.random() * 250,
        });
      }
    }
  });
}

export function drawStatsUI() {
  const x = 12;
  const y = 12;
  const w = 220;
  const h = 74;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x, y, w, h);

  const flash01 = game.ui.levelFlashMs > 0 ? clamp(game.ui.levelFlashMs / 900, 0, 1) : 0;
  ctx.strokeStyle = flash01 > 0 ? `rgba(255, 215, 0, ${0.25 + flash01 * 0.55})` : 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`Lv ${game.player.level}`, x + 10, y + 18);

  const barX = x + 10;
  const barW = w - 20;
  const hpY = y + 26;
  const mpY = y + 44;
  const xpY = y + 62;

  const hp01 = game.player.maxHealth > 0 ? clamp(game.ui.healthShown / game.player.maxHealth, 0, 1) : 0;
  const mp01 = game.player.maxMana > 0 ? clamp(game.ui.manaShown / game.player.maxMana, 0, 1) : 0;

  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(barX, hpY, barW, 10);
  ctx.fillRect(barX, mpY, barW, 10);
  ctx.fillRect(barX, xpY, barW, 6);

  const hpColor = hp01 < 0.25 ? '#ff4444' : hp01 < 0.5 ? '#ff8833' : '#44ff44';
  ctx.fillStyle = hpColor;
  ctx.fillRect(barX, hpY, barW * hp01, 10);
  ctx.fillStyle = '#4488ff';
  ctx.fillRect(barX, mpY, barW * mp01, 10);
  ctx.fillStyle = '#ffcc00';
  ctx.fillRect(barX, xpY, barW * game.ui.xpShown, 6);

  ctx.font = '11px monospace';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#fff';
  ctx.fillText(`${Math.ceil(game.ui.healthShown)}/${game.player.maxHealth}`, x + w - 10, hpY + 9);
  ctx.fillStyle = '#cfe3ff';
  ctx.fillText(`${Math.ceil(game.ui.manaShown)}/${game.player.maxMana}`, x + w - 10, mpY + 9);

  ctx.restore();

  if (game.player.health <= 0) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ff6666';
    ctx.font = 'bold 44px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('You Died', canvas.width / 2, canvas.height / 2 - 10);
    ctx.fillStyle = '#fff';
    ctx.font = '14px monospace';
    ctx.fillText('Press R to respawn', canvas.width / 2, canvas.height / 2 + 24);
    ctx.restore();
  }
}

export function drawInventoryUI() {
  const slotSize = 45;
  const spacing = 3;
  const startX = (canvas.width - (slotSize + spacing) * 9) / 2;
  const startY = canvas.height - slotSize - 15;

  for (let i = 0; i < 9; i++) {
    const x = startX + i * (slotSize + spacing);
    const y = startY;

    ctx.fillStyle = 'rgba(240, 240, 240, 0.9)';
    ctx.fillRect(x, y, slotSize, slotSize);

    ctx.strokeStyle = 'rgba(200, 200, 200, 0.9)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, slotSize, slotSize);

    if (i === game.player.selectedSlot) {
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.9)';
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 1, y - 1, slotSize + 2, slotSize + 2);
    }

    const item = game.player.inventory[i];
    if (item) {
      ctx.font = '28px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000';
      ctx.fillText(item.icon || '❓', x + slotSize / 2, y + slotSize / 2);

      if (item.count && item.count > 1) {
        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = '#000';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeText(item.count.toString(), x + slotSize - 8, y + slotSize - 5);
        ctx.fillText(item.count.toString(), x + slotSize - 8, y + slotSize - 5);
      }
    }
  }
}

export function drawUI() {
  drawInventoryUI();
  drawStatsUI();

  if (game.craftingOpen) drawCraftingUI();
  if (game.guideOpen) drawGuideUI();

  if (game.draggedItem) {
    ctx.font = '35px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(game.draggedItem.icon || '❓', game.mouseX, game.mouseY);
    if (game.draggedItem.count && game.draggedItem.count > 1) {
      ctx.font = '12px monospace';
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(game.draggedItem.count.toString(), game.mouseX + 15, game.mouseY + 15);
      ctx.fillText(game.draggedItem.count.toString(), game.mouseX + 15, game.mouseY + 15);
    }
  }

  // Biome indicator (below stats)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(10, 92, 200, 35);
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 92, 200, 35);
  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`🌍 ${biomes[game.currentBiome].name}`, 20, 114);

  // Controls hint
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(canvas.width - 520, canvas.height - 30, 510, 25);
  ctx.fillStyle = '#ccc';
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('WASD-Move | E-Interact | F-Use | C-Craft | G-Guide | H-Home | Q-Drop | R-Respawn', canvas.width - 515, canvas.height - 12);
}


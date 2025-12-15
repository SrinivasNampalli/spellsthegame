import { game } from './context.js';
import { items } from './data.js';
import { spawnParticle } from './particles.js';
import { saveGameState } from './persistence.js';

const lastCastBySpellId = new Map();

export function canCastSelectedSpell() {
  const selected = game.player.inventory[game.player.selectedSlot];
  if (!selected || selected.type !== 'spell') return false;
  const def = items[selected.id];
  if (!def) return false;
  if (game.player.mana < (def.manaCost ?? 0)) return false;
  const now = performance.now ? performance.now() : Date.now();
  const last = lastCastBySpellId.get(selected.id) || 0;
  const cd = def.cooldownMs ?? 0;
  return now - last >= cd;
}

export function castSelectedSpellAt(targetX, targetY) {
  const selected = game.player.inventory[game.player.selectedSlot];
  if (!selected || selected.type !== 'spell') return false;
  const def = items[selected.id];
  if (!def) return false;
  if (game.dialogueActive || game.transitioning) return false;
  if (game.player.health <= 0) return false;

  const cost = def.manaCost ?? 0;
  if (game.player.mana < cost) return false;

  const now = performance.now ? performance.now() : Date.now();
  const last = lastCastBySpellId.get(selected.id) || 0;
  const cd = def.cooldownMs ?? 0;
  if (now - last < cd) return false;
  lastCastBySpellId.set(selected.id, now);

  const sx = game.player.x + game.player.width / 2;
  const sy = game.player.y + game.player.height / 2;
  const dx = targetX - sx;
  const dy = targetY - sy;
  const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  const nx = dx / dist;
  const ny = dy / dist;

  const speed = def.projectileSpeed ?? 420;
  const lifetime = def.projectileLifetime ?? 1100;
  const damage = def.damage ?? 10;
  const size = def.projectileSize ?? 18;
  const color = def.color ?? '#ff7733';

  game.projectiles.push({
    type: selected.id,
    owner: 'player',
    damage,
    x: sx,
    y: sy,
    vx: nx * speed,
    vy: ny * speed,
    age: 0,
    lifetime,
    size,
    color,
    sprite: def.sprite || null,
    icon: def.icon || '🔥',
  });

  game.player.mana = Math.max(0, game.player.mana - cost);
  saveGameState();

  for (let i = 0; i < 6; i++) {
    spawnParticle({
      x: sx,
      y: sy,
      vx: (Math.random() - 0.5) * 80,
      vy: (Math.random() - 0.5) * 80,
      size: 3 + Math.random() * 2,
      color: '#ff8844',
      lifeMs: 220 + Math.random() * 180,
    });
  }

  return true;
}

export function drawAimAssist(ctx, worldMouseX, worldMouseY) {
  const selected = game.player.inventory[game.player.selectedSlot];
  if (!selected || selected.type !== 'spell') return;
  if (game.craftingOpen || game.guideOpen) return;
  if (game.dialogueActive || game.transitioning) return;
  if (game.player.health <= 0) return;

  const def = items[selected.id];
  const baseColor = def?.color ?? 'rgba(255, 210, 120, 0.9)';

  const sx = game.player.x + game.player.width / 2;
  const sy = game.player.y + game.player.height / 2;
  const dx = worldMouseX - sx;
  const dy = worldMouseY - sy;
  const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  const nx = dx / dist;
  const ny = dy / dist;

  const maxLen = 280;
  const len = Math.min(maxLen, dist);
  const endX = sx + nx * len;
  const endY = sy + ny * len;

  // Dotted line
  ctx.save();
  ctx.globalAlpha = 0.65;
  ctx.strokeStyle = baseColor;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Crosshair
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = 'rgba(255, 235, 200, 0.95)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(worldMouseX, worldMouseY, 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(worldMouseX - 14, worldMouseY);
  ctx.lineTo(worldMouseX - 4, worldMouseY);
  ctx.moveTo(worldMouseX + 4, worldMouseY);
  ctx.lineTo(worldMouseX + 14, worldMouseY);
  ctx.moveTo(worldMouseX, worldMouseY - 14);
  ctx.lineTo(worldMouseX, worldMouseY - 4);
  ctx.moveTo(worldMouseX, worldMouseY + 4);
  ctx.lineTo(worldMouseX, worldMouseY + 14);
  ctx.stroke();

  ctx.restore();
}

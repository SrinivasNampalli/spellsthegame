import { canvas, game } from './context.js';
import { items } from './data.js';
import { clamp } from './utils.js';
import { saveGameState } from './persistence.js';

export function layoutNodesForBiome(biomeKey) {
  const nodes = game.resourceNodes.filter((n) => (n.biome || 'home') === biomeKey);
  if (!nodes.length) return;
  const margin = 30;
  for (const n of nodes) {
    const anchor = n.anchor || null;
    if (!anchor) continue;
    n.x = clamp(anchor.x * canvas.width - n.width / 2, margin, canvas.width - n.width - margin);
    n.y = clamp(anchor.y * canvas.height - n.height / 2, margin, canvas.height - n.height - margin);
  }
}

export function createResourceNodes() {
  game.resourceNodes = [];

  // Home gatherables
  game.resourceNodes.push({
    id: 'tree',
    name: 'Tree',
    icon: '🌳',
    biome: 'home',
    width: 28,
    height: 28,
    x: 0,
    y: 0,
    anchor: { x: 0.88, y: 0.22 },
    active: true,
    respawnMs: 8500,
    cooldownMs: 0,
    yield: [{ id: 'wood', count: 2 }],
  });

  game.resourceNodes.push({
    id: 'berry_bush',
    name: 'Berry Bush',
    icon: '🍓',
    biome: 'home',
    width: 28,
    height: 28,
    x: 0,
    y: 0,
    anchor: { x: 0.8, y: 0.78 },
    active: true,
    respawnMs: 8000,
    cooldownMs: 0,
    yield: [{ id: 'berry', count: 2 }],
  });

  game.resourceNodes.push({
    id: 'stone_pile',
    name: 'Stone Pile',
    icon: '🪨',
    biome: 'home',
    width: 28,
    height: 28,
    x: 0,
    y: 0,
    anchor: { x: 0.1, y: 0.78 },
    active: true,
    respawnMs: 9000,
    cooldownMs: 0,
    yield: [{ id: 'earth_stone', count: 2 }],
  });

  game.resourceNodes.push({
    id: 'feather_nest',
    name: 'Feather Nest',
    icon: '🪶',
    biome: 'home',
    width: 28,
    height: 28,
    x: 0,
    y: 0,
    anchor: { x: 0.5, y: 0.84 },
    active: true,
    respawnMs: 10000,
    cooldownMs: 0,
    yield: [{ id: 'air_feather', count: 2 }],
  });

  // Mystical Library
  game.resourceNodes.push({
    id: 'loose_pages',
    name: 'Loose Pages',
    icon: '📜',
    biome: 'mysticalLibrary',
    width: 28,
    height: 28,
    x: 0,
    y: 0,
    anchor: { x: 0.3, y: 0.72 },
    active: true,
    respawnMs: 9000,
    cooldownMs: 0,
    yield: [{ id: 'ancient_page', count: 1 }],
  });

  // Magma Kingdom
  game.resourceNodes.push({
    id: 'magma_vein',
    name: 'Magma Vein',
    icon: '🌋',
    biome: 'magmaKingdom',
    width: 28,
    height: 28,
    x: 0,
    y: 0,
    anchor: { x: 0.35, y: 0.62 },
    active: true,
    respawnMs: 11000,
    cooldownMs: 0,
    yield: [
      { id: 'iron_ore', count: 2 },
      { id: 'lava_core', count: 1 },
    ],
  });

  // Water Queen Realm
  game.resourceNodes.push({
    id: 'pearl_clam',
    name: 'Pearl Clam',
    icon: '🦪',
    biome: 'waterQueenRealm',
    width: 28,
    height: 28,
    x: 0,
    y: 0,
    anchor: { x: 0.72, y: 0.62 },
    active: true,
    respawnMs: 10000,
    cooldownMs: 0,
    yield: [
      { id: 'pearl', count: 1 },
      { id: 'water_drop', count: 1 },
    ],
  });

  // Glitched Void
  game.resourceNodes.push({
    id: 'void_tear',
    name: 'Void Tear',
    icon: '🟣',
    biome: 'glitchedVoid',
    width: 28,
    height: 28,
    x: 0,
    y: 0,
    anchor: { x: 0.55, y: 0.7 },
    active: true,
    respawnMs: 13000,
    cooldownMs: 0,
    yield: [{ id: 'void_shard', count: 1 }],
  });

  layoutNodesForBiome(game.currentBiome);
}

export function updateResourceNodes(deltaTime) {
  for (const n of game.resourceNodes) {
    if (n.active) continue;
    n.cooldownMs = Math.max(0, (n.cooldownMs || 0) - deltaTime);
    if (n.cooldownMs <= 0) n.active = true;
  }
}

export function canInteractWithNode(node, player) {
  const dx = player.x + player.width / 2 - (node.x + node.width / 2);
  const dy = player.y + player.height / 2 - (node.y + node.height / 2);
  return Math.sqrt(dx * dx + dy * dy) < 70;
}

export function giveItemsToPlayer(gifts) {
  let allAdded = true;
  for (const gift of gifts) {
    const item = items[gift.id];
    if (!item) continue;
    const ok = game.player.addItem({ ...item, id: gift.id, count: gift.count ?? 1 });
    if (!ok) allAdded = false;
  }
  return allAdded;
}

export function gatherNode(node) {
  if (!node?.active) return false;
  const ok = giveItemsToPlayer(node.yield || []);
  if (!ok) return false;
  node.active = false;
  node.cooldownMs = node.respawnMs || 8000;
  saveGameState();
  return true;
}

export function drawResourceNodes(ctx) {
  for (const n of game.resourceNodes) {
    if ((n.biome || 'home') !== game.currentBiome) continue;
    if (!n.active) continue;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(n.x + n.width / 2, n.y + n.height - 2, n.width * 0.4, n.height * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.font = '22px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(n.icon, n.x + n.width / 2, n.y + n.height / 2);
    ctx.restore();
  }
}

export function countItemInInventory(itemId) {
  let total = 0;
  for (const slot of game.player.inventory) {
    if (!slot) continue;
    if (slot.id !== itemId) continue;
    total += slot.count || 1;
  }
  return total;
}

export function consumeItemsFromInventory(itemId, count) {
  let remaining = count;
  for (let i = 0; i < game.player.inventory.length; i++) {
    const slot = game.player.inventory[i];
    if (!slot || slot.id !== itemId) continue;
    const current = slot.count || 1;
    const take = Math.min(current, remaining);
    const next = current - take;
    remaining -= take;
    if (next <= 0) game.player.inventory[i] = null;
    else slot.count = next;
    if (remaining <= 0) return true;
  }
  return false;
}


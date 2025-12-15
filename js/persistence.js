import { game } from './context.js';
import { items, biomes } from './data.js';
import { clamp } from './utils.js';

function setCookie(name, value, maxAgeSeconds) {
  const safe = encodeURIComponent(value);
  document.cookie = `${name}=${safe}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax`;
}

function getCookie(name) {
  const parts = document.cookie.split(';').map((p) => p.trim());
  for (const p of parts) {
    if (!p.startsWith(`${name}=`)) continue;
    return decodeURIComponent(p.substring(name.length + 1));
  }
  return null;
}

function serializeGameState() {
  const inv = game.player.inventory.map((slot) => {
    if (!slot) return null;
    return { id: slot.id, count: slot.count ?? 1 };
  });

  const npcState = {};
  for (const npc of game.npcs) {
    npcState[npc.name] = {
      hasGivenItem: !!npc.hasGivenItem,
      questComplete: !!npc.questComplete,
    };
  }

  const nodeState = {};
  for (const n of game.resourceNodes) {
    nodeState[n.id] = {
      active: !!n.active,
      cooldownMs: n.cooldownMs ?? 0,
    };
  }

  return {
    v: 1,
    biome: game.currentBiome,
    player: {
      x: game.player.x,
      y: game.player.y,
      health: game.player.health,
      maxHealth: game.player.maxHealth,
      mana: game.player.mana,
      maxMana: game.player.maxMana,
      level: game.player.level,
      experience: game.player.experience,
      experienceToNextLevel: game.player.experienceToNextLevel,
      damage: game.player.damage,
      defense: game.player.defense,
      gold: game.player.gold,
      selectedSlot: game.player.selectedSlot,
    },
    inventory: inv,
    discoveredRecipes: Array.from(game.discoveredRecipes || []),
    npcs: npcState,
    nodes: nodeState,
  };
}

function applyGameState(state, canvas) {
  if (!state || typeof state !== 'object') return;

  if (state.player) {
    const p = state.player;
    game.player.x = clamp(p.x ?? game.player.x, 0, canvas.width - game.player.width);
    game.player.y = clamp(p.y ?? game.player.y, 0, canvas.height - game.player.height);
    if (typeof p.maxHealth === 'number') game.player.maxHealth = p.maxHealth;
    if (typeof p.health === 'number') game.player.health = clamp(p.health, 0, game.player.maxHealth);
    if (typeof p.maxMana === 'number') game.player.maxMana = p.maxMana;
    if (typeof p.mana === 'number') game.player.mana = clamp(p.mana, 0, game.player.maxMana);
    if (typeof p.level === 'number') game.player.level = p.level;
    if (typeof p.experience === 'number') game.player.experience = p.experience;
    if (typeof p.experienceToNextLevel === 'number') game.player.experienceToNextLevel = p.experienceToNextLevel;
    if (typeof p.damage === 'number') game.player.damage = p.damage;
    if (typeof p.defense === 'number') game.player.defense = p.defense;
    if (typeof p.gold === 'number') game.player.gold = p.gold;
    if (typeof p.selectedSlot === 'number') game.player.selectedSlot = clamp(p.selectedSlot, 0, 8);
  }

  if (Array.isArray(state.inventory)) {
    game.player.inventory = state.inventory.map((slot) => {
      if (!slot) return null;
      const def = items[slot.id];
      if (!def) return null;
      return { ...def, id: slot.id, count: slot.count ?? 1 };
    });
  }

  if (Array.isArray(state.discoveredRecipes)) {
    game.discoveredRecipes = new Set(state.discoveredRecipes);
  }

  if (state.npcs) {
    for (const npc of game.npcs) {
      const s = state.npcs[npc.name];
      if (!s) continue;
      npc.hasGivenItem = !!s.hasGivenItem;
      npc.questComplete = !!s.questComplete;
    }
  }

  if (state.nodes) {
    for (const n of game.resourceNodes) {
      const s = state.nodes[n.id];
      if (!s) continue;
      n.active = !!s.active;
      n.cooldownMs = s.cooldownMs ?? 0;
    }
  }

  if (typeof state.biome === 'string' && biomes[state.biome]) {
    game.currentBiome = state.biome;
  }
}

export function saveGameState() {
  if (!game?.player) return;
  const state = serializeGameState();
  const raw = JSON.stringify(state);
  const maxAge = 60 * 60 * 24 * 365;
  try {
    setCookie('spells_save', raw, maxAge);
    localStorage.setItem('spells_save', raw);
  } catch (_) {
    try {
      localStorage.setItem('spells_save', raw);
    } catch {
      // ignore
    }
  }
}

export function loadGameState(canvas) {
  let raw = null;
  try {
    raw = getCookie('spells_save') || localStorage.getItem('spells_save');
  } catch (_) {
    raw = getCookie('spells_save');
  }
  if (!raw) return;
  try {
    const state = JSON.parse(raw);
    applyGameState(state, canvas);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Failed to load save:', e);
  }
}


import { canvas, game } from './context.js';
import { items } from './data.js';
import { sprites, drawSprite } from './assets.js';
import { clamp, relaxEntitySpacing } from './utils.js';
import { countItemInInventory, consumeItemsFromInventory, giveItemsToPlayer } from './resources.js';
import { saveGameState } from './persistence.js';

export class NPC {
  constructor(x, y, name, dialogues, color = '#00ff00', spriteKey = null, itemGift = null) {
    this.x = x;
    this.y = y;
    this.width = 48;
    this.height = 72;
    this.name = name;
    this.dialogues = dialogues;
    this.color = color;
    this.dialogueIndex = 0;
    this.interactionRange = 80;
    this.spriteKey = spriteKey;
    this.itemGift = itemGift; // string or [{id,count}]
    this.hasGivenItem = false;

    // Layout
    this.biome = 'home';
    this.anchor = null;
    this.anchors = null;

    // Optional quest
    this.quest = null; // { requires:[{id,count}], rewards:[{id,count}], completeText:string }
    this.questComplete = false;
  }

  draw(ctx) {
    if (this.spriteKey && sprites.loaded && sprites[this.spriteKey]) {
      drawSprite(ctx, sprites[this.spriteKey], this.x, this.y, this.width, this.height, this.spriteKey);
    } else {
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    this.drawNameTag(ctx);
  }

  drawNameTag(ctx) {
    const tagWidth = this.width + 20;
    const tagHeight = 16;
    const tagX = this.x - 10;
    const tagY = this.y - 20;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(tagX, tagY, tagWidth, tagHeight);
    ctx.fillStyle = '#ffcc00';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, this.x + this.width / 2, this.y - 8);
  }

  canInteract(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < this.interactionRange;
  }

  getNextDialogue() {
    const dialogue = this.dialogues[this.dialogueIndex];
    this.dialogueIndex = (this.dialogueIndex + 1) % this.dialogues.length;
    return dialogue;
  }
}

export function tryCompleteQuest(npc) {
  if (!npc?.quest) return null;
  if (npc.questComplete) return null;

  const requires = npc.quest.requires || [];
  for (const req of requires) {
    if (countItemInInventory(req.id) < (req.count ?? 1)) return null;
  }

  for (const req of requires) {
    consumeItemsFromInventory(req.id, req.count ?? 1);
  }

  const rewards = npc.quest.rewards || [];
  giveItemsToPlayer(rewards);

  npc.questComplete = true;
  saveGameState();
  return npc.quest.completeText || `${npc.name}: Nice. Here's your reward.`;
}

export function layoutNPCsForBiome(biomeKey) {
  const biomeNPCs = game.npcs.filter((n) => (n.biome || 'home') === biomeKey);
  if (!biomeNPCs.length) return;

  const margin = 40;
  for (const npc of biomeNPCs) {
    const anchor = npc.anchors?.[biomeKey] || npc.anchor || null;
    if (!anchor) continue;
    npc.x = clamp(anchor.x * canvas.width - npc.width / 2, margin, canvas.width - npc.width - margin);
    npc.y = clamp(anchor.y * canvas.height - npc.height / 2, margin, canvas.height - npc.height - margin);
  }

  relaxEntitySpacing(biomeNPCs, 140, 12);

  for (const npc of biomeNPCs) {
    npc.x = clamp(npc.x, margin, canvas.width - npc.width - margin);
    npc.y = clamp(npc.y, margin, canvas.height - npc.height - margin);
  }
}

export function createNPCs() {
  game.npcs = [];

  const elderMage = new NPC(
    0,
    0,
    'Elder Mage',
    [
      'Welcome, young apprentice! I am the Elder Mage.',
      "Take these materials - you'll need them for crafting.",
      'Press C to open the crafting table!',
      'And here, take this Fire Spell! Press F to cast it when selected.',
      'Would you like to visit my MYSTICAL LIBRARY?',
      'Press E once more to teleport!',
    ],
    '#8844ff',
    'elderMage',
    [{ id: 'wood', count: 5 }, { id: 'fire_spell', count: 1 }],
  );
  elderMage.teleportTo = 'mysticalLibrary';
  elderMage.biome = 'home';
  elderMage.anchor = { x: 0.15, y: 0.22 };
  game.npcs.push(elderMage);

  const blacksmith = new NPC(
    0,
    0,
    'Blacksmith',
    [
      "Greetings, adventurer! I'm the village blacksmith!",
      "Here's some iron ore and fire essence to get you started!",
      'Use the ore with fire essence to smelt ingots!',
      'Want to see my forge in the MAGMA KINGDOM?',
      "Press E again and I'll take you there!",
    ],
    '#44ff44',
    'blacksmith',
    [
      { id: 'iron_ore', count: 6 },
      { id: 'fire_essence', count: 3 },
    ],
  );
  blacksmith.teleportTo = 'magmaKingdom';
  blacksmith.biome = 'home';
  blacksmith.anchor = { x: 0.62, y: 0.58 };
  game.npcs.push(blacksmith);

  const mysteriousStranger = new NPC(
    0,
    0,
    'Mysterious Stranger',
    ['...', 'The void calls...', 'Take these. You may need them.', 'Press E again to enter the GLITCHED VOID...'],
    '#ff4444',
    'mysteriousDude',
    [{ id: 'fire_essence', count: 2 }],
  );
  mysteriousStranger.teleportTo = 'glitchedVoid';
  mysteriousStranger.biome = 'home';
  mysteriousStranger.anchor = { x: 0.4, y: 0.18 };
  game.npcs.push(mysteriousStranger);

  const waterQueen = new NPC(
    0,
    0,
    'Water Queen',
    [
      'The rivers flow eternal...',
      'Here, take these Water Drops. Stay hydrated!',
      'Water is essential for many potions and spells.',
      'Would you like to visit my WATER REALM?',
      'Press E again to dive in!',
    ],
    '#4488ff',
    'waterQueen',
    [{ id: 'water_drop', count: 5 }],
  );
  waterQueen.teleportTo = 'waterQueenRealm';
  waterQueen.biome = 'home';
  waterQueen.anchor = { x: 0.22, y: 0.72 };
  game.npcs.push(waterQueen);

  // Test NPCs in each realm (quests)
  const archiveWisp = new NPC(
    0,
    0,
    'Archive Wisp',
    [
      'Shhh... this library remembers everything.',
      "Bring me 4 Earth Stones, and I'll condense them into a Mana Crystal.",
      'Explore, craft, and come back when you are ready.',
    ],
    '#cc66ff',
    null,
    null,
  );
  archiveWisp.biome = 'mysticalLibrary';
  archiveWisp.anchor = { x: 0.62, y: 0.35 };
  archiveWisp.quest = {
    requires: [{ id: 'earth_stone', count: 4 }],
    rewards: [{ id: 'mana_crystal', count: 1 }],
    completeText: 'Archive Wisp: The stones hum... Here. A Mana Crystal, awakened.',
  };
  game.npcs.push(archiveWisp);

  const forgeWarden = new NPC(
    0,
    0,
    'Forge Warden',
    ['Mind your step. The magma listens.', "Bring 3 Iron Ingots and I'll temper a blade.", 'Smelt ore with Fire Essence.'],
    '#ff8844',
    null,
    null,
  );
  forgeWarden.biome = 'magmaKingdom';
  forgeWarden.anchor = { x: 0.7, y: 0.58 };
  forgeWarden.quest = {
    requires: [{ id: 'iron_ingot', count: 3 }],
    rewards: [{ id: 'iron_sword', count: 1 }],
    completeText: 'Forge Warden: Good metal. Take this Iron Sword and keep moving.',
  };
  game.npcs.push(forgeWarden);

  const tideScout = new NPC(
    0,
    0,
    'Tide Scout',
    ['Currents are shifting...', "Bring 3 Water Drops and I'll mix a Mana Potion.", 'Hydration is power.'],
    '#66aaff',
    null,
    null,
  );
  tideScout.biome = 'waterQueenRealm';
  tideScout.anchor = { x: 0.25, y: 0.52 };
  tideScout.quest = {
    requires: [{ id: 'water_drop', count: 3 }],
    rewards: [{ id: 'potion_mana', count: 1 }],
    completeText: "Tide Scout: There. One Mana Potion. Don't waste it.",
  };
  game.npcs.push(tideScout);

  const voidEcho = new NPC(
    0,
    0,
    'Corrupted Echo',
    ['…you are not supposed to be here…', 'Feed the void 1 Mana Crystal. It will spit out something.', '…or harmful…'],
    '#ff3355',
    null,
    null,
  );
  voidEcho.biome = 'glitchedVoid';
  voidEcho.anchor = { x: 0.5, y: 0.45 };
  voidEcho.quest = {
    requires: [{ id: 'mana_crystal', count: 1 }],
    rewards: [
      { id: 'fire_essence', count: 2 },
      { id: 'air_feather', count: 2 },
    ],
    completeText: 'Corrupted Echo: It takes… it gives… take these.',
  };
  game.npcs.push(voidEcho);

  // Ensure any gift items exist
  for (const npc of game.npcs) {
    if (!npc.itemGift) continue;
    if (Array.isArray(npc.itemGift)) {
      npc.itemGift = npc.itemGift.filter((g) => !!items[g.id]);
    } else if (!items[npc.itemGift]) {
      npc.itemGift = null;
    }
  }
}


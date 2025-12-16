import { canvas, game } from './context.js';
import { items } from './data.js';
import { sprites, drawSprite } from './assets.js';
import { clamp, relaxEntitySpacing } from './utils.js';
import { countItemInInventory, consumeItemsFromInventory, giveItemsToPlayer } from './resources.js';
import { saveGameState } from './persistence.js';
import { showDialogue } from './ui.js';
import { spawnTrainingDroids } from './combat.js';

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
    this.interactionRange = 85;
    this.spriteKey = spriteKey;
    this.itemGift = itemGift;
    this.hasGivenItem = false;

    this.biome = 'home';
    this.anchor = null;
    this.anchors = null;

    this.quest = null;
    this.questComplete = false;
    this.interactionCount = 0;

    this.customDialogueHandler = null;
  }

  draw(ctx) {
    if (this.hidden) return;

    if (this.spriteKey && sprites.loaded && sprites[this.spriteKey]) {
      drawSprite(ctx, sprites[this.spriteKey], this.x, this.y, this.width, this.height, this.spriteKey);
    } else {
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    this.drawNameTag(ctx);

    if (this.quest && !this.questComplete) {
      this.drawQuestIndicator(ctx);
    }
  }

  drawNameTag(ctx) {
    const tagWidth = this.width + 20;
    const tagHeight = 16;
    const tagX = this.x - 10;
    const tagY = this.y - 20;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(tagX, tagY, tagWidth, tagHeight);

    const nameColor = this.quest && !this.questComplete ? '#ffdd44' : '#ffcc00';
    ctx.fillStyle = nameColor;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, this.x + this.width / 2, this.y - 8);
  }

  drawQuestIndicator(ctx) {
    const t = Date.now() / 1000;
    const bounce = Math.sin(t * 3) * 3;
    const x = this.x + this.width / 2;
    const y = this.y - 35 + bounce;

    ctx.save();
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
    ctx.shadowBlur = 10;
    ctx.fillText('!', x, y);
    ctx.restore();
  }

  canInteract(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < this.interactionRange;
  }

  getNextDialogue() {
    this.interactionCount++;
    const dialogue = this.dialogues[this.dialogueIndex];
    this.dialogueIndex = (this.dialogueIndex + 1) % this.dialogues.length;
    return dialogue;
  }

  getInteractionHint() {
    if (this.quest && !this.questComplete) {
      return 'Press E to accept quest';
    }
    return 'Press E to talk';
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

  // STORY PROGRESSION: Elder Mage - The Beginning
  const elderMage = new NPC(
    0,
    0,
    'Elder Mage',
    [
      "Ah, you've awakened... Good. I am Elder Sage, keeper of this realm.",
      'The world beyond these walls has grown dark. Ancient evils stir.',
      'You possess the spark of magic within you. I can help you harness it.',
      'Take these basic materials. Learn to survive first.',
      'When you are ready, seek me again. I will open the path to the Great Library.',
      'There, the Archive Keeper will teach you the art of crafting.',
      'But beware... knowledge comes at a price. Are you ready?',
      'Press E again to journey to the Mystical Library...',
    ],
    '#8844ff',
    'elderMage',
    [{ id: 'wood', count: 3 }, { id: 'berry', count: 2 }],
  );
  elderMage.teleportTo = 'mysticalLibrary';
  elderMage.biome = 'home';
  elderMage.anchor = { x: 0.5, y: 0.5 }; // Center of home
  elderMage.onFirstMeet = () => {
    // Unlock crafting when first meeting Elder Mage
    game.craftingUnlocked = true;
    saveGameState();
  };
  game.npcs.push(elderMage);

  // STORY: Archive Keeper - The Mind Games Challenge (Mystical Library)
  const archiveKeeper = new NPC(
    0,
    0,
    'Archive Keeper',
    [
      'Welcome to the Great Library, young one. I am the Archive Keeper.',
      'These halls contain the sum of all knowledge - crafting, magic, forbidden secrets...',
      'The Elder Sage believes you worthy. But I... I must test this claim myself.',
      '...',
      'CRAFTING: Press C to open your table. Combine items - try 2 Wood into 4 Sticks.',
      'Knowledge is power, and power requires discipline of the MIND.',
      '...',
      'Before you lies the true test. Not of strength... but of mental fortitude.',
      'Three stations await you. Each will challenge your mind in different ways.',
      '⚗️ The Alchemy Crucible tests your LOGIC and pattern recognition.',
      '🔮 The Runic Altar tests your MEMORY under pressure.',
      '📚 The Memory Tome tests your ability to DECODE ancient secrets.',
      '...',
      'Complete all three challenges to prove your mind is sharp enough for what lies ahead.',
      'The trials... begin NOW!',
    ],
    '#cc66ff',
    null,
    null,
  );
  archiveKeeper.biome = 'mysticalLibrary';
  archiveKeeper.anchor = { x: 0.5, y: 0.3 };

  // Override dialogue for post-trial
  archiveKeeper.getNextDialogue = function() {
    // Check if all three mind games are completed
    const alchemyComplete = game.alchemyGame?.complete || false;
    const runicComplete = game.runicGame?.complete || false;
    const memoryComplete = game.memoryGame?.complete || false;
    const allComplete = alchemyComplete && runicComplete && memoryComplete;

    if (allComplete && !this._postTrialShown) {
      this._postTrialShown = true;
      this.dialogueIndex = 0;
      this.dialogues = [
        'Remarkable... You have completed all three trials.',
        'Your mind is sharp, focused, disciplined. The Elder Sage chose well.',
        'You have proven yourself worthy of the library\'s deepest secrets.',
        'The path to the Water Queen\'s Realm is now open.',
        'Go forth, and may your intellect guide you through the trials ahead.',
      ];
      game.trialCompleted = true;
      game.flags = game.flags || {};
      game.flags.waterUnlocked = true;
      saveGameState();
    }

    const dialogue = this.dialogues[this.dialogueIndex];
    this.dialogueIndex = (this.dialogueIndex + 1) % this.dialogues.length;
    return dialogue;
  };

  game.npcs.push(archiveKeeper);

  // Water Queen access gate (unlocked after Library trial)
  const tideGate = new NPC(
    0,
    0,
    'Tide Gate',
    [
      'The sea calls... Step through and do not look back.',
      'The Water Queen is watching.',
      'Press E again to enter the Water Queen Realm...',
    ],
    '#66ccff',
    null,
    null,
  );
  tideGate.biome = 'mysticalLibrary';
  tideGate.anchor = { x: 0.86, y: 0.36 };
  tideGate.getNextDialogue = function getNextDialogue() {
    if (!game.flags?.waterUnlocked) {
      this.dialogueIndex = 0;
      this.teleportTo = null;
      return 'Locked. Complete the Archive Keeper\'s mind trials to unseal this gate.';
    }
    this.teleportTo = 'waterQueenRealm';
    return NPC.prototype.getNextDialogue.call(this);
  };
  game.npcs.push(tideGate);

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

  const waterQueen = new NPC(
    0,
    0,
    'Water Queen',
    [
      'Welcome, traveler. You have journeyed far to reach my domain.',
      'The Archive Keeper speaks highly of you. Impressive.',
      'The ocean is ancient, powerful... and willing to share its gifts with the worthy.',
      'Take this Water Spell. May it serve you well in your journey.',
      '...',
      'Now then... I sense hesitation in you. Doubt, perhaps?',
      'You think yourself ready? You think you can stand against TRUE water magic?',
      'How DARE you enter my realm and question my power!',
      'I shall drown you in the depths! Feel the fury of the OCEAN!',
    ],
    '#66ccff',
    'waterQueen',
    [{ id: 'water_spell', count: 1 }],
  );
  waterQueen.biome = 'waterQueenRealm';
  waterQueen.anchor = { x: 0.52, y: 0.34 };
  waterQueen.quest = {
    requires: [{ id: 'water_core', count: 3 }],
    rewards: [
      { id: 'potion_mana', count: 1 },
      { id: 'mana_crystal', count: 1 },
    ],
    completeText: 'Water Queen: *breathing heavily* You... you survived. Perhaps you ARE worthy after all. Take this reward.',
  };
  game.npcs.push(waterQueen);

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

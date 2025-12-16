export const items = {
  // Basic materials
  wood: { name: 'Wood', icon: '🪵', maxStack: 64, desc: 'Basic crafting material' },
  plank: { name: 'Planks', icon: '🟫', maxStack: 64, desc: 'Wooden planks for crafting' },
  stick: { name: 'Stick', icon: '🦯', maxStack: 64, desc: 'Used to make tools and weapons' },
  coal: { name: 'Coal', icon: '⚫', maxStack: 64, desc: 'Fuel for torches and smelting' },
  rope: { name: 'Rope', icon: '🪢', maxStack: 64, desc: 'Useful for climbing and crafting' },

  // Utility items
  torch: { name: 'Torch', icon: '🔦', maxStack: 64, desc: 'Illuminates the darkness' },
  campfire: { name: 'Campfire', icon: '🔥', maxStack: 16, desc: 'Provides warmth and light' },

  // Elemental essences
  fire_essence: { name: 'Fire Essence', icon: '🔥', maxStack: 64, desc: 'Essence of pure flame' },
  water_drop: { name: 'Water Drop', icon: '💧', maxStack: 64, desc: 'Pure water essence' },
  earth_stone: { name: 'Earth Stone', icon: '🪨', maxStack: 64, desc: 'Stone infused with earth magic' },
  air_feather: { name: 'Air Feather', icon: '🪶', maxStack: 64, desc: 'Light as air itself' },
  mana_crystal: { name: 'Mana Crystal', icon: '🔷', maxStack: 64, desc: 'Crystallized magical energy' },

  // Consumables
  potion_health: { name: 'Health Potion', icon: '🧪', maxStack: 16, type: 'consumable', heal: 25, desc: 'Restores 25 health' },
  potion_mana: { name: 'Mana Potion', icon: '🧴', maxStack: 16, type: 'consumable', mana: 25, desc: 'Restores 25 mana' },
  berry: { name: 'Berry', icon: '🍓', maxStack: 64, type: 'consumable', heal: 3, desc: 'Restores 3 health' },

  // Magical spells
  fire_spell: {
    name: 'Fire Spell',
    icon: '🔥',
    sprite: 'fireSpell',
    maxStack: 1,
    type: 'spell',
    manaCost: 14,
    cooldownMs: 220,
    damage: 18,
    projectileSpeed: 520,
    projectileLifetime: 1300,
    projectileSize: 18,
    color: '#ff7733',
    desc: 'Left-click to cast. Costs 14 mana',
  },
  water_spell: {
    name: 'Water Spell',
    icon: '💧',
    maxStack: 1,
    type: 'spell',
    manaCost: 12,
    cooldownMs: 200,
    damage: 15,
    projectileSpeed: 480,
    projectileLifetime: 1400,
    projectileSize: 16,
    color: '#00aaff',
    desc: 'Left-click to cast. Costs 12 mana',
  },

  // Ores and metals
  iron_ore: { name: 'Iron Ore', icon: '🪨', maxStack: 64, desc: 'Raw iron, needs smelting' },
  iron_ingot: { name: 'Iron Ingot', icon: '▬', maxStack: 64, desc: 'Refined iron for crafting' },

  // Weapons
  wooden_sword: { name: 'Wooden Sword', icon: '🗡️', maxStack: 1, type: 'weapon', damage: 10, desc: 'Deals 10 damage' },
  iron_sword: { name: 'Iron Sword', icon: '⚔️', maxStack: 1, type: 'weapon', damage: 25, desc: 'Deals 25 damage' },
  enchanted_iron_sword: { name: 'Enchanted Iron Sword', icon: '⚔️', maxStack: 1, type: 'weapon', damage: 35, desc: 'A powerful enchanted blade' },
  wand_basic: { name: 'Basic Wand', icon: '🪄', maxStack: 1, type: 'weapon', damage: 8, desc: 'A simple magical wand' },

  // Realm materials
  water_core: { name: 'Water Core', icon: '💠', maxStack: 32, desc: 'Condensed tide magic from minions' },
  ancient_page: { name: 'Ancient Page', icon: '📜', maxStack: 64, desc: 'Contains ancient knowledge' },
  lava_core: { name: 'Lava Core', icon: '🌋', maxStack: 32, desc: 'Hot volcanic essence' },
  pearl: { name: 'Pearl', icon: '🦪', maxStack: 64, desc: 'Precious ocean gem' },
  void_shard: { name: 'Void Shard', icon: '🟣', maxStack: 32, desc: 'Fragment from the void' },
};

export const recipes = [
  // Basic crafting
  { result: 'plank', ingredients: { wood: 1 }, count: 4, name: 'Planks' },
  { result: 'stick', ingredients: { wood: 2 }, count: 4, name: 'Sticks' },
  { result: 'torch', ingredients: { coal: 1, stick: 1 }, count: 4, name: 'Torches' },
  { result: 'rope', ingredients: { air_feather: 3 }, count: 2, name: 'Rope' },
  { result: 'campfire', ingredients: { wood: 3, coal: 1 }, count: 1, name: 'Campfire' },

  // Weapons and tools
  { result: 'iron_ingot', ingredients: { iron_ore: 1, fire_essence: 1 }, count: 1, name: 'Iron Ingot' },
  { result: 'wooden_sword', ingredients: { wood: 2, stick: 1 }, count: 1, name: 'Wooden Sword' },
  { result: 'iron_sword', ingredients: { iron_ingot: 2, stick: 1 }, count: 1, name: 'Iron Sword' },
  { result: 'enchanted_iron_sword', ingredients: { iron_sword: 1, fire_essence: 2, mana_crystal: 1 }, count: 1, name: 'Enchanted Iron Sword' },
  { result: 'wand_basic', ingredients: { stick: 1, mana_crystal: 1 }, count: 1, name: 'Basic Wand' },

  // Potions
  { result: 'potion_health', ingredients: { water_drop: 1, fire_essence: 1 }, count: 1, name: 'Health Potion' },
  { result: 'potion_mana', ingredients: { water_drop: 2, mana_crystal: 1 }, count: 1, name: 'Mana Potion' },
  { result: 'potion_health', ingredients: { berry: 2, water_drop: 1 }, count: 1, name: 'Berry Tonic' },
  { result: 'potion_mana', ingredients: { pearl: 1, water_drop: 1 }, count: 1, name: 'Pearl Mana Potion' },

  // Advanced crafting
  { result: 'mana_crystal', ingredients: { ancient_page: 2, air_feather: 1 }, count: 1, name: 'Rune Crystal' },
  { result: 'fire_essence', ingredients: { lava_core: 1 }, count: 2, name: 'Core-to-Essence' },
];

export const biomes = {
  home: {
    name: 'Village Hub',
    background: 'homeBackground',
    music: null,
    transitionMessages: ['Returning home...', 'Welcome back!'],
  },
  waterQueenRealm: {
    name: 'Water Queen Realm',
    background: 'waterQueenBiome',
    music: null,
    transitionMessages: [
      'Water begins to swirl around you...',
      'The tides respond to her call...',
      'You arrive at the WATER QUEEN REALM!',
      'The ocean depths welcome you...',
    ],
  },
  magmaKingdom: {
    name: 'Magma Kingdom',
    background: 'magmaKingdom',
    music: null,
    transitionMessages: [
      'The blacksmith leads you through a portal...',
      'Heat radiates from the ground...',
      'You arrive at the MAGMA KINGDOM!',
      'The forge awaits!',
    ],
  },
  mysticalLibrary: {
    name: 'Mystical Library',
    background: 'mysticalLibrary',
    music: null,
    transitionMessages: [
      'The Elder Mage opens a mystical gateway...',
      'Ancient energies surround you...',
      'You step into the MYSTICAL LIBRARY!',
      'Knowledge fills the air...',
    ],
  },
  glitchedVoid: {
    name: 'Glitched Void',
    background: 'glitchedVoid',
    music: null,
    transitionMessages: ['Reality begins to fracture...', 'ERROR: REALITY.exe'],
  },
};

export function initRecipes(recipesArr) {
  for (const recipe of recipesArr) {
    if (!recipe.id) recipe.id = `${recipe.result}:${recipe.name || 'Recipe'}`;
    if (!recipe.unlock) recipe.unlock = 'ingredients';
  }
}

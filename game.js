// Game.js - Main game loop and rendering

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const backButtonEl = document.getElementById('back-button');
const toastEl = document.getElementById('toast');

// Set canvas to a reasonable size (not too wide)
function resizeCanvas() {
    const maxWidth = Math.min(1400, window.innerWidth * 0.9);
    const maxHeight = Math.min(900, window.innerHeight * 0.9);

    // Maintain 16:10 aspect ratio
    const aspectRatio = 16 / 10;

    if (maxWidth / maxHeight > aspectRatio) {
        canvas.width = maxHeight * aspectRatio;
        canvas.height = maxHeight;
    } else {
        canvas.width = maxWidth;
        canvas.height = maxWidth / aspectRatio;
    }
}

// Initial resize
resizeCanvas();

// Resize on window resize
window.addEventListener('resize', () => {
    resizeCanvas();
    try {
        if (game?.npcs?.length) layoutNPCsForBiome(game.currentBiome);
        if (game?.resourceNodes?.length) layoutNodesForBiome(game.currentBiome);
    } catch (_) {
        // Ignore early-resize during script init (game in TDZ)
    }
});

// Sprite loading - preload all character images
const sprites = {
    player: null,
    elderMage: null,
    blacksmith: null,
    mysteriousDude: null,
    waterQueen: null,
    homeBackground: null,
    magmaKingdom: null,
    mysticalLibrary: null,
    glitchedVoid: null,
    waterQueenBiome: null,
    loaded: false
};

let spritesLoaded = 0;
const totalSprites = 5; // Player + 4 NPCs

// Sprite meta to trim/crop big portraits so characters don't look "smushed"
// Trim values are percentages of the source image edges.
const spriteMeta = {
    player: { trim: { l: 0.12, t: 0.06, r: 0.12, b: 0.04 }, shadow: true },
    elderMage: { trim: { l: 0.10, t: 0.06, r: 0.10, b: 0.06 }, shadow: true },
    blacksmith: { trim: { l: 0.10, t: 0.06, r: 0.10, b: 0.06 }, shadow: true },
    mysteriousDude: { trim: { l: 0.10, t: 0.06, r: 0.10, b: 0.06 }, shadow: true },
    waterQueen: { trim: { l: 0.10, t: 0.06, r: 0.10, b: 0.06 }, shadow: true }
};

function drawSprite(ctx, img, dx, dy, dw, dh, metaKey, opts = {}) {
    if (!img) return;

    const meta = spriteMeta[metaKey] || {};
    const trim = meta.trim || null;
    const alpha = opts.alpha ?? 1;

    let sx = 0;
    let sy = 0;
    let sw = img.width;
    let sh = img.height;

    if (trim) {
        const l = Math.max(0, Math.min(0.49, trim.l ?? 0));
        const t = Math.max(0, Math.min(0.49, trim.t ?? 0));
        const r = Math.max(0, Math.min(0.49, trim.r ?? 0));
        const b = Math.max(0, Math.min(0.49, trim.b ?? 0));
        sx = Math.floor(img.width * l);
        sy = Math.floor(img.height * t);
        sw = Math.max(1, Math.floor(img.width * (1 - l - r)));
        sh = Math.max(1, Math.floor(img.height * (1 - t - b)));
    }

    ctx.save();
    ctx.globalAlpha = alpha;

    if (opts.shadow ?? meta.shadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 3;
    }

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    ctx.restore();
}

function loadSprites() {
    // Load player sprite
    sprites.player = new Image();
    sprites.player.src = 'images/maincharacter.png';
    sprites.player.onload = () => {
        spritesLoaded++;
        checkSpritesLoaded();
    };

    // Load Elder Mage sprite
    sprites.elderMage = new Image();
    sprites.elderMage.src = 'images/mageelder.png';
    sprites.elderMage.onload = () => {
        spritesLoaded++;
        checkSpritesLoaded();
    };

    // Load Blacksmith sprite
    sprites.blacksmith = new Image();
    sprites.blacksmith.src = 'images/blacksmith.png';
    sprites.blacksmith.onload = () => {
        spritesLoaded++;
        checkSpritesLoaded();
    };

    // Load Mysterious Dude sprite
    sprites.mysteriousDude = new Image();
    sprites.mysteriousDude.src = 'images/mysteriousdude.png';
    sprites.mysteriousDude.onload = () => {
        spritesLoaded++;
        checkSpritesLoaded();
    };

    // Load Water Queen sprite
    sprites.waterQueen = new Image();
    sprites.waterQueen.src = 'images/waterqueen.png';
    sprites.waterQueen.onload = () => {
        spritesLoaded++;
        checkSpritesLoaded();
    };

    // Load biome backgrounds (non-blocking)
    sprites.homeBackground = new Image();
    sprites.homeBackground.src = 'images/homeforgame.png';

    sprites.magmaKingdom = new Image();
    sprites.magmaKingdom.src = 'images/magmakingdom.png';

    sprites.mysticalLibrary = new Image();
    sprites.mysticalLibrary.src = 'images/mysticallibarrayrrecrop.png';

    sprites.glitchedVoid = new Image();
    sprites.glitchedVoid.src = 'images/glitchedvoidmysterious.png';

    sprites.waterQueenBiome = new Image();
    sprites.waterQueenBiome.src = 'images/waterqueenbiome.png';
}

function checkSpritesLoaded() {
      if (spritesLoaded >= totalSprites) {
        sprites.loaded = true;
        console.log('All sprites loaded!');
    }
}

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

function showToast(text, ms = 1400) {
    if (!toastEl) return;
    toastEl.textContent = text;
    toastEl.classList.remove('hidden');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.add('hidden'), ms);
}

// Item definitions
const items = {
    // Medieval survival / progression items
    plank: { name: 'Planks', color: '#a07035', icon: '🟫', maxStack: 64 },
    rope: { name: 'Rope', color: '#c2a46a', icon: '🪢', maxStack: 64 },
    campfire: { name: 'Campfire', color: '#ff9933', icon: '🔥', maxStack: 16 },
    mana_crystal: { name: 'Mana Crystal', color: '#66ccff', icon: '🔷', maxStack: 64 },
    potion_mana: { name: 'Mana Potion', color: '#44aaff', icon: '🧴', maxStack: 16, type: 'consumable', mana: 25 },
    enchanted_iron_sword: { name: 'Enchanted Iron Sword', color: '#88ddff', icon: '⚔️', maxStack: 1, type: 'weapon', damage: 35 },
    // Spell/potion ingredients (used by NPC gifts + older recipes)
    fire_essence: { name: 'Fire Essence', color: '#ff5533', icon: '🔥', maxStack: 64 },
    water_drop: { name: 'Water Drop', color: '#3399ff', icon: '💧', maxStack: 64 },
    earth_stone: { name: 'Earth Stone', color: '#6b5b3e', icon: '🪨', maxStack: 64 },
    air_feather: { name: 'Air Feather', color: '#dddddd', icon: '🪶', maxStack: 64 },

    // Crafted magic items (used by older recipes)
    wand_basic: { name: 'Basic Wand', color: '#aa88ff', icon: '🪄', maxStack: 1, type: 'weapon', damage: 8 },
    potion_health: { name: 'Health Potion', color: '#ff4477', icon: '🧪', maxStack: 16, type: 'consumable', heal: 25 },
    wood: { name: 'Wood', color: '#8b4513', icon: '🪵', maxStack: 64 },
    stick: { name: 'Stick', color: '#8b7355', icon: '🦯', maxStack: 64 },
    coal: { name: 'Coal', color: '#1a1a1a', icon: '⚫', maxStack: 64 },
    iron_ore: { name: 'Iron Ore', color: '#d3d3d3', icon: '🪨', maxStack: 64 },
    iron_ingot: { name: 'Iron Ingot', color: '#c0c0c0', icon: '▬', maxStack: 64 },
    stone: { name: 'Stone', color: '#808080', icon: '🗿', maxStack: 64 },
    wooden_sword: { name: 'Wooden Sword', color: '#8b7355', icon: '🗡️', maxStack: 1, type: 'weapon', damage: 10 },
    iron_sword: { name: 'Iron Sword', color: '#c0c0c0', icon: '⚔️', maxStack: 1, type: 'weapon', damage: 25 },
    wooden_pickaxe: { name: 'Wooden Pickaxe', color: '#8b7355', icon: '⛏️', maxStack: 1, type: 'tool' },
    iron_pickaxe: { name: 'Iron Pickaxe', color: '#c0c0c0', icon: '⚒️', maxStack: 1, type: 'tool' },
    torch: { name: 'Torch', color: '#ffa500', icon: '🔦', maxStack: 64 },

    // Realm gatherables
    berry: { name: 'Berry', color: '#ff3366', icon: '🍓', maxStack: 64, type: 'consumable', heal: 3 },
    ancient_page: { name: 'Ancient Page', color: '#f0e6c8', icon: '📜', maxStack: 64 },
    lava_core: { name: 'Lava Core', color: '#ff6633', icon: '🌋', maxStack: 32 },
    pearl: { name: 'Pearl', color: '#d9f2ff', icon: '🦪', maxStack: 64 },
    void_shard: { name: 'Void Shard', color: '#cc66ff', icon: '🟣', maxStack: 32 }
};

// Crafting recipes - simplified shapeless system
// Just list the ingredients needed, order doesn't matter!
const recipes = [
    // Basic ingredient processing
    { result: 'plank', ingredients: { wood: 1 }, count: 4, name: 'Planks' },
    { result: 'stick', ingredients: { wood: 2 }, count: 4, name: 'Sticks' },
    { result: 'iron_ingot', ingredients: { iron_ore: 1, fire_essence: 1 }, count: 1, name: 'Iron Ingot' },

    // Tools
    { result: 'wooden_pickaxe', ingredients: { wood: 3, stick: 2 }, count: 1, name: 'Wooden Pickaxe' },
    { result: 'iron_pickaxe', ingredients: { iron_ingot: 3, stick: 2 }, count: 1, name: 'Iron Pickaxe' },

    // Weapons
    { result: 'wooden_sword', ingredients: { wood: 2, stick: 1 }, count: 1, name: 'Wooden Sword' },
    { result: 'iron_sword', ingredients: { iron_ingot: 2, stick: 1 }, count: 1, name: 'Iron Sword' },
    { result: 'enchanted_iron_sword', ingredients: { iron_sword: 1, fire_essence: 2, mana_crystal: 1 }, count: 1, name: 'Enchanted Iron Sword' },

    // Magic items
    { result: 'wand_basic', ingredients: { earth_stone: 1, air_feather: 1 }, count: 1, name: 'Basic Wand' },
    { result: 'mana_crystal', ingredients: { earth_stone: 1, air_feather: 1, water_drop: 1 }, count: 1, name: 'Mana Crystal' },

    // Potions
    { result: 'potion_health', ingredients: { water_drop: 1, fire_essence: 1 }, count: 1, name: 'Health Potion' },
    { result: 'potion_mana', ingredients: { water_drop: 2, mana_crystal: 1 }, count: 1, name: 'Mana Potion' },

    // Realm gatherable upgrades
    { result: 'potion_health', ingredients: { berry: 2, water_drop: 1 }, count: 1, name: 'Berry Tonic' },
    { result: 'potion_mana', ingredients: { pearl: 1, water_drop: 1 }, count: 1, name: 'Pearl Mana Potion' },
    { result: 'mana_crystal', ingredients: { ancient_page: 2, air_feather: 1 }, count: 1, name: 'Rune Crystal' },
    { result: 'fire_essence', ingredients: { lava_core: 1 }, count: 2, name: 'Core-to-Essence' },

    // Utility items
    { result: 'torch', ingredients: { coal: 1, stick: 1 }, count: 4, name: 'Torches' },
    { result: 'rope', ingredients: { air_feather: 3 }, count: 2, name: 'Rope' },
    { result: 'campfire', ingredients: { wood: 3, coal: 1 }, count: 1, name: 'Campfire' },

    // More combinations - Wood processing
    { result: 'wooden_pickaxe', ingredients: { plank: 3, stick: 2 }, count: 1, name: 'Wooden Pickaxe (Planks)' },
    { result: 'wooden_sword', ingredients: { plank: 2, stick: 1 }, count: 1, name: 'Wooden Sword (Planks)' },

    // Stone crafting
    { result: 'stone', ingredients: { earth_stone: 4 }, count: 1, name: 'Stone Block' },
    { result: 'stone', ingredients: { earth_stone: 2 }, count: 1, name: 'Stone' },

    // Better potions
    { result: 'potion_health', ingredients: { water_drop: 2, fire_essence: 1, earth_stone: 1 }, count: 2, name: 'Health Potions x2' },

    // Coal alternatives
    { result: 'coal', ingredients: { wood: 4, fire_essence: 1 }, count: 2, name: 'Charcoal' },
    { result: 'coal', ingredients: { wood: 2, fire_essence: 1 }, count: 1, name: 'Charcoal' },

    // Advanced magic - multiple ways to craft wand
    { result: 'wand_basic', ingredients: { stick: 1, mana_crystal: 1 }, count: 1, name: 'Basic Wand (Crystal)' },
    { result: 'wand_basic', ingredients: { wood: 1, earth_stone: 1 }, count: 1, name: 'Basic Wand (Simple)' },

    // Resource combinations
    { result: 'iron_ore', ingredients: { stone: 2, earth_stone: 2 }, count: 1, name: 'Iron Ore' },

    // Simple element combinations
    { result: 'campfire', ingredients: { wood: 2, fire_essence: 1 }, count: 1, name: 'Campfire (Simple)' },

    // More utility
    { result: 'torch', ingredients: { stick: 1, fire_essence: 1 }, count: 2, name: 'Torches (Flame)' }
];

// Biome definitions
const biomes = {
    home: {
        name: 'Village Hub',
        background: 'homeBackground',
        music: null,
        transitionMessages: ['Returning home...', 'Welcome back!']
    },
    waterQueenRealm: {
        name: 'Water Queen Realm',
        background: 'waterQueenBiome',
        music: null,
        transitionMessages: [
            'Water begins to swirl around you...',
            'The tides respond to her call...',
            'You arrive at the WATER QUEEN REALM!',
            'The ocean depths welcome you...'
        ]
    },
    magmaKingdom: {
        name: 'Magma Kingdom',
        background: 'magmaKingdom',
        music: null,
        transitionMessages: [
            'The blacksmith leads you through a portal...',
            'Heat radiates from the ground...',
            'You arrive at the MAGMA KINGDOM!',
            'The forge awaits!'
        ]
    },
    mysticalLibrary: {
        name: 'Mystical Library',
        background: 'mysticalLibrary',
        music: null,
        transitionMessages: [
            'The Elder Mage opens a mystical gateway...',
            'Ancient energies surround you...',
            'You step into the MYSTICAL LIBRARY!',
            'Knowledge fills the air...'
        ]
    },
    glitchedVoid: {
        name: 'Glitched Void',
        background: 'glitchedVoid',
        music: null,
        transitionMessages: [
            'Reality begins to fracture...',
            '̷̰͝T̶̰̓h̸̰̕ḛ̴̓ ̶̰̈v̸̰̓o̴̰̕ḭ̶̓d̸̰̈ ̴̰̓c̶̰̕a̸̰̓l̴̰̈l̶̰̓s̸̰̕.̴̰̓.̶̰̈.̸̰̓',
            'E̸͎̍R̴̰̓R̶̰̕O̸̰̓R̴̰̈:̶̰̓ ̸̰̕R̴̰̓Ḛ̶̈A̸̰̓L̴̰̕Ḭ̶̓T̸̰̈Y̴̰̓.̶̰̕ḛ̸̓ẍ̴̰ḛ̶̓',
            '̸̢̛̩̻̈́Ẅ̴̰́ȩ̶̲̅ḷ̷̓c̶̰̓o̶͎͝m̴͎̅ẹ̶̈ ̸̰͝t̴͙̓ö̶̘ ̴͎̕t̸̰̓h̴̰̓ḛ̶̈ ̸̰̕G̴̰̓L̶̰̈Ḭ̸̓T̴̰̕C̶̰̓Ḧ̸̰Ḛ̴̓D̶̰̕ ̸̰̓V̴̰̈O̶̰̓Ḭ̸̕D̴̰̓'
        ]
    }
};

// Game state
const game = {
    lastTime: 0,
    player: null,
    npcs: [],
    interactableNearby: null,
    dialogueActive: false,
    currentDialogueIndex: 0,
    currentNPC: null,
    // camera offset for future scrolling
    cameraX: 0,
      cameraY: 0,
    craftingOpen: false,
    // Current biome
    currentBiome: 'home',
    // Transition state
    transitioning: false,
    transitionAlpha: 0,
    transitionTarget: null,
    transitionMessages: [],
    transitionMessageIndex: 0,
    transitionTimer: 0,
    // Mouse/drag state
    mouseX: 0,
    mouseY: 0,
    draggedItem: null,
    draggedFromSlot: null,
    dragButton: 0,
    splitPlaceMode: false,
    // Crafting slots - 3x3 grid
    craftingSlots: [
        [null, null, null],
        [null, null, null],
        [null, null, null]
    ],
    craftingResult: null,
    craftingResultCount: 1,
    craftingMatchedRecipe: null,
    craftingConsumeSlots: null,
    craftingMaxPossible: 0, // How many times can we craft this recipe
    // Dropped items on floor
    droppedItems: [],
    // Resource nodes (gatherables) per biome
    resourceNodes: [],
    interactableNodeNearby: null,
    // Simple particles (dust, embers, bubbles)
    particles: [],
    playerStepTimerMs: 0,
    // Equipped weapon
    equippedWeapon: null,
    // Crafting guide state
    guideOpen: false,
    guideScroll: 0,
    discoveredRecipes: new Set(),
    lastDiscoveryCheckMs: 0
};

function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

function relaxEntitySpacing(entities, minDistance, iterations = 10) {
    if (entities.length <= 1) return;
    for (let iter = 0; iter < iterations; iter++) {
        for (let i = 0; i < entities.length; i++) {
            for (let j = i + 1; j < entities.length; j++) {
                const a = entities[i];
                const b = entities[j];
                const ax = a.x + a.width / 2;
                const ay = a.y + a.height / 2;
                const bx = b.x + b.width / 2;
                const by = b.y + b.height / 2;
                let dx = ax - bx;
                let dy = ay - by;
                let dist = Math.sqrt(dx * dx + dy * dy);
                if (dist === 0) {
                    dx = (Math.random() - 0.5) * 0.01;
                    dy = (Math.random() - 0.5) * 0.01;
                    dist = Math.sqrt(dx * dx + dy * dy);
                }
                if (dist < minDistance) {
                    const push = (minDistance - dist) / 2;
                    const nx = dx / dist;
                    const ny = dy / dist;
                    a.x += nx * push;
                    a.y += ny * push;
                    b.x -= nx * push;
                    b.y -= ny * push;
                }
            }
        }
    }
}

function layoutNPCsForBiome(biomeKey) {
    const biomeNPCs = game.npcs.filter((n) => (n.biome || 'home') === biomeKey);
    if (!biomeNPCs.length) return;

    const margin = 40;
    for (const npc of biomeNPCs) {
        const anchor = npc.anchors?.[biomeKey] || npc.anchor || null;
        if (!anchor) continue;
        npc.x = clamp(anchor.x * canvas.width - npc.width / 2, margin, canvas.width - npc.width - margin);
        npc.y = clamp(anchor.y * canvas.height - npc.height / 2, margin, canvas.height - npc.height - margin);
    }

    // Keep characters from clumping if canvas is small.
    relaxEntitySpacing(biomeNPCs, 140, 12);

    for (const npc of biomeNPCs) {
        npc.x = clamp(npc.x, margin, canvas.width - npc.width - margin);
        npc.y = clamp(npc.y, margin, canvas.height - npc.height - margin);
    }
}

function layoutNodesForBiome(biomeKey) {
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

function createResourceNodes() {
    game.resourceNodes = [];

    // Home
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
        yield: [{ id: 'wood', count: 2 }]
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
        anchor: { x: 0.80, y: 0.78 },
        active: true,
        respawnMs: 8000,
        cooldownMs: 0,
        yield: [{ id: 'berry', count: 2 }]
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
        anchor: { x: 0.10, y: 0.78 },
        active: true,
        respawnMs: 9000,
        cooldownMs: 0,
        yield: [{ id: 'earth_stone', count: 2 }]
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
        anchor: { x: 0.50, y: 0.84 },
        active: true,
        respawnMs: 10000,
        cooldownMs: 0,
        yield: [{ id: 'air_feather', count: 2 }]
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
        anchor: { x: 0.30, y: 0.72 },
        active: true,
        respawnMs: 9000,
        cooldownMs: 0,
        yield: [{ id: 'ancient_page', count: 1 }]
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
        yield: [{ id: 'iron_ore', count: 2 }, { id: 'lava_core', count: 1 }]
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
        yield: [{ id: 'pearl', count: 1 }, { id: 'water_drop', count: 1 }]
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
        anchor: { x: 0.55, y: 0.70 },
        active: true,
        respawnMs: 13000,
        cooldownMs: 0,
        yield: [{ id: 'void_shard', count: 1 }]
    });

    layoutNodesForBiome(game.currentBiome);
}

function updateResourceNodes(deltaTime) {
    for (const n of game.resourceNodes) {
        if (n.active) continue;
        n.cooldownMs = Math.max(0, (n.cooldownMs || 0) - deltaTime);
        if (n.cooldownMs <= 0) n.active = true;
    }
}

function canInteractWithNode(node, player) {
    const dx = (player.x + player.width / 2) - (node.x + node.width / 2);
    const dy = (player.y + player.height / 2) - (node.y + node.height / 2);
    return Math.sqrt(dx * dx + dy * dy) < 70;
}

function gatherNode(node) {
    if (!node?.active) return false;
    const ok = giveItemsToPlayer(node.yield || []);
    if (!ok) return false;
    node.active = false;
    node.cooldownMs = node.respawnMs || 8000;
    saveGameState();
    return true;
}

function drawResourceNodes(ctx) {
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

function countItemInInventory(itemId) {
    let total = 0;
    for (const slot of game.player.inventory) {
        if (!slot) continue;
        if (slot.id !== itemId) continue;
        total += slot.count || 1;
    }
    return total;
}

function consumeItemsFromInventory(itemId, count) {
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

function giveItemsToPlayer(gifts) {
    let allAdded = true;
    for (const gift of gifts) {
        const item = items[gift.id];
        if (!item) continue;
        const ok = game.player.addItem({ ...item, id: gift.id, count: gift.count ?? 1 });
        if (!ok) allAdded = false;
    }
    return allAdded;
}

function tryCompleteQuest(npc) {
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

function serializeGameState() {
    const inv = game.player.inventory.map((slot) => {
        if (!slot) return null;
        return { id: slot.id, count: slot.count ?? 1 };
    });

    const npcState = {};
    for (const npc of game.npcs) {
        npcState[npc.name] = {
            hasGivenItem: !!npc.hasGivenItem,
            questComplete: !!npc.questComplete
        };
    }

    const nodeState = {};
    for (const n of game.resourceNodes) {
        nodeState[n.id] = {
            active: !!n.active,
            cooldownMs: n.cooldownMs ?? 0
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
            selectedSlot: game.player.selectedSlot
        },
        inventory: inv,
        discoveredRecipes: Array.from(game.discoveredRecipes || []),
        npcs: npcState,
        nodes: nodeState
    };
}

function applyGameState(state) {
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

    updateEquippedWeapon();
}

function saveGameState() {
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
        } catch (__) {
            // ignore
        }
    }
}

function loadGameState() {
    let raw = null;
    try {
        raw = getCookie('spells_save') || localStorage.getItem('spells_save');
    } catch (_) {
        raw = getCookie('spells_save');
    }
    if (!raw) return;
    try {
        const state = JSON.parse(raw);
        applyGameState(state);
    } catch (e) {
        console.warn('Failed to load save:', e);
    }
}

function spawnParticle(p) {
    game.particles.push({
        x: p.x,
        y: p.y,
        vx: p.vx ?? 0,
        vy: p.vy ?? 0,
        size: p.size ?? 3,
        color: p.color ?? '#ffffff',
        lifeMs: p.lifeMs ?? 350,
        maxLifeMs: p.lifeMs ?? 350
    });
}

function updateParticles(deltaTime) {
    for (let i = game.particles.length - 1; i >= 0; i--) {
        const p = game.particles[i];
        p.lifeMs -= deltaTime;
        if (p.lifeMs <= 0) {
            game.particles.splice(i, 1);
            continue;
        }
        const dt = deltaTime / 1000;
        p.vy += 20 * dt; // light gravity
        p.x += p.vx * dt;
        p.y += p.vy * dt;
    }
}

function drawParticles(ctx) {
    for (const p of game.particles) {
        const a = Math.max(0, Math.min(1, p.lifeMs / p.maxLifeMs));
        ctx.save();
        ctx.globalAlpha = a * 0.8;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Keyboard state
const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    e: false,
    f: false,
    c: false,
    g: false,
    q: false,
    h: false, // Home key
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
    7: false,
    8: false,
    9: false
};

// NPC class
class NPC {
    constructor(x, y, name, dialogues, color = '#00ff00', spriteKey = null, itemGift = null) {
        this.x = x;
        this.y = y;
        this.width = 48;  // Increased from 32
        this.height = 72; // Increased from 48 (1.5x larger)
        this.name = name;
        this.dialogues = dialogues;
        this.color = color;
        this.dialogueIndex = 0;
        this.interactionRange = 80; // Increased from 60
        this.spriteKey = spriteKey;
        // itemGift can be a string (single item) or array of {id, count}
        this.itemGift = itemGift;
        this.hasGivenItem = false;

        // Layout helpers (set by createNPCs)
        this.biome = 'home';
        this.anchor = null; // {x:0..1, y:0..1}
        this.anchors = null; // per-biome anchors

        // Optional quest (turn-in on dialogue start)
        this.quest = null; // { requires:[{id,count}], rewards:[{id,count}], completeText:string }
        this.questComplete = false;
    }

    draw(ctx) {
        // draw sprite if we have one
        if (this.spriteKey && sprites.loaded && sprites[this.spriteKey]) {
            drawSprite(ctx, sprites[this.spriteKey], this.x, this.y, this.width, this.height, this.spriteKey);
        } else {
            // fallback rectangle
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);

            // simple face
            ctx.fillStyle = '#000';
            ctx.fillRect(this.x + 8, this.y + 10, 6, 6);
            ctx.fillRect(this.x + 18, this.y + 10, 6, 6);
            ctx.fillRect(this.x + 10, this.y + 22, 12, 3);
        }

        // draw name tag above NPC
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

// Initialize game
function init() {
    loadSprites();

    // spawn player in center
    const startX = canvas.width / 2;
    const startY = canvas.height / 2;
    game.player = new Player(startX, startY);

    initRecipes();

    // Create NPCs
    createNPCs();
    layoutNPCsForBiome(game.currentBiome);

    // Create gatherables per biome
    createResourceNodes();

    // Restore saved state (inventory/biome/quests/nodes)
    loadGameState();
    layoutNPCsForBiome(game.currentBiome);
    layoutNodesForBiome(game.currentBiome);
    updateBackButtonVisibility();

    // keyboard stuff
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // mouse stuff for crafting
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('dblclick', handleDoubleClick);
    canvas.addEventListener('wheel', handleMouseWheel, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    if (backButtonEl) {
        backButtonEl.addEventListener('click', () => handleBackButton());
    }
    window.addEventListener('beforeunload', () => saveGameState());

    requestAnimationFrame(gameLoop);
}

function handleMouseWheel(e) {
    if (!game.guideOpen) return;
    e.preventDefault();
    const delta = Math.sign(e.deltaY);
    game.guideScroll = Math.max(0, game.guideScroll + delta);
}

function handleDoubleClick(e) {
    if (!game.craftingOpen) return;
    if (game.draggedItem) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const craftSlot = getCraftingSlotAt(mouseX, mouseY);
    if (craftSlot !== null && game.craftingSlots[craftSlot.row][craftSlot.col]) {
        if (pickUpFromSlot({ type: 'crafting', row: craftSlot.row, col: craftSlot.col }, 2)) {
            game.splitPlaceMode = true;
            checkRecipe();
        }
        return;
    }

    const hotbarSlot = getHotbarSlotAt(mouseX, mouseY);
    if (hotbarSlot !== -1 && game.player.inventory[hotbarSlot]) {
        const item = game.player.inventory[hotbarSlot];
        if ((item.count || 1) > 1) {
            if (pickUpFromSlot({ type: 'inventory', index: hotbarSlot }, 2)) {
                game.splitPlaceMode = true;
            }
        }
    }
}

// Create all NPCs in the game
function createNPCs() {
    game.npcs = []; // Clear existing NPCs

    const elderMage = new NPC(200, 150, 'Elder Mage', [
        "Welcome, young apprentice! I am the Elder Mage.",
        "Take these materials - you'll need them for crafting.",
        "Press C to open the crafting table!",
        "Would you like to visit my MYSTICAL LIBRARY? The ancient texts await...",
        "Press E once more to teleport to the Mystical Library!"
    ], '#8844ff', 'elderMage', [{id: 'wood', count: 5}]);
    elderMage.teleportTo = 'mysticalLibrary';
    elderMage.biome = 'home'; // Only appears in home
    elderMage.anchor = { x: 0.15, y: 0.22 };
    game.npcs.push(elderMage);

    const blacksmith = new NPC(600, 400, 'Blacksmith', [
        "Greetings, adventurer! I'm the village blacksmith!",
        "Here's some iron ore and fire essence to get you started!",
        "Use the ore with fire essence to smelt ingots!",
        "Want to see my forge in the MAGMA KINGDOM? It's quite toasty!",
        "Press E again and I'll take you to the Magma Kingdom!"
    ], '#44ff44', 'blacksmith', [{id: 'iron_ore', count: 10}, {id: 'fire_essence', count: 5}]);
    blacksmith.teleportTo = 'magmaKingdom';
    blacksmith.biome = 'home';
    blacksmith.anchor = { x: 0.62, y: 0.58 };
    game.npcs.push(blacksmith);

    const mysteriousStranger = new NPC(400, 100, 'Mysterious Stranger', [
        "...",
        "The void calls...",
        "Take these. You'll need them where you're going.",
        "The GLITCHED VOID... a place between worlds...",
        "̸̢̛̩̻̈́D̴̰̈́o̶̧̲̅ ̷̣̓y̶̰̓o̶͎͝u̴͎̅ ̶̣̈d̸̰͝a̴͙̓r̶̘̈e̴͎̕?̸̰̓ Press E to enter the void..."
    ], '#ff4444', 'mysteriousDude', [{id: 'fire_essence', count: 3}]);
    mysteriousStranger.teleportTo = 'glitchedVoid';
    mysteriousStranger.biome = 'home';
    mysteriousStranger.anchor = { x: 0.40, y: 0.18 };
    game.npcs.push(mysteriousStranger);

    const waterQueen = new NPC(350, 450, 'Water Queen', [
        "The rivers flow eternal...",
        "Here, take these Water Drops. Stay hydrated!",
        "Water is essential for many potions and spells.",
        "Would you like to visit my WATER REALM? The ocean awaits...",
        "Press E again to dive into the Water Queen Realm!"
    ], '#4488ff', 'waterQueen', [{id: 'water_drop', count: 5}]);
    waterQueen.teleportTo = 'waterQueenRealm';
    waterQueen.biome = 'home';
    waterQueen.anchor = { x: 0.22, y: 0.72 };
    game.npcs.push(waterQueen);

    // --- Test NPCs in each realm (so it doesn't feel empty) ---

    const archiveWisp = new NPC(0, 0, 'Archive Wisp', [
        "Shhh... this library remembers everything.",
        "Bring me 4 Earth Stones, and I'll condense them into a Mana Crystal.",
        "Explore, craft, and come back when you're ready."
    ], '#cc66ff', null, null);
    archiveWisp.biome = 'mysticalLibrary';
    archiveWisp.anchor = { x: 0.62, y: 0.35 };
    archiveWisp.quest = {
        requires: [{ id: 'earth_stone', count: 4 }],
        rewards: [{ id: 'mana_crystal', count: 1 }],
        completeText: "Archive Wisp: The stones hum... Here. A Mana Crystal, freshly awakened."
    };
    game.npcs.push(archiveWisp);

    const forgeWarden = new NPC(0, 0, 'Forge Warden', [
        "Mind your step. The magma listens.",
        "Bring 3 Iron Ingots and I'll temper a better blade.",
        "If you don't have ingots, smelt Iron Ore with Fire Essence."
    ], '#ff8844', null, null);
    forgeWarden.biome = 'magmaKingdom';
    forgeWarden.anchor = { x: 0.70, y: 0.58 };
    forgeWarden.quest = {
        requires: [{ id: 'iron_ingot', count: 3 }],
        rewards: [{ id: 'iron_sword', count: 1 }],
        completeText: "Forge Warden: Good metal. Take this Iron Sword and keep moving."
    };
    game.npcs.push(forgeWarden);

    const tideScout = new NPC(0, 0, 'Tide Scout', [
        "Currents are shifting... something's off.",
        "Bring me 3 Water Drops and I'll mix you a Mana Potion.",
        "Hydration is power."
    ], '#66aaff', null, null);
    tideScout.biome = 'waterQueenRealm';
    tideScout.anchor = { x: 0.25, y: 0.52 };
    tideScout.quest = {
        requires: [{ id: 'water_drop', count: 3 }],
        rewards: [{ id: 'potion_mana', count: 1 }],
        completeText: "Tide Scout: There. One Mana Potion. Don't waste it."
    };
    game.npcs.push(tideScout);

    const voidEcho = new NPC(0, 0, 'Corrupted Echo', [
        "…you are not supposed to be here…",
        "Feed the void 1 Mana Crystal. It will spit out something useful.",
        "…or harmful…"
    ], '#ff3355', null, null);
    voidEcho.biome = 'glitchedVoid';
    voidEcho.anchor = { x: 0.50, y: 0.45 };
    voidEcho.quest = {
        requires: [{ id: 'mana_crystal', count: 1 }],
        rewards: [{ id: 'fire_essence', count: 2 }, { id: 'air_feather', count: 2 }],
        completeText: "Corrupted Echo: I̷t̴ ̷t̷a̷k̵e̴s̵… ̶i̷t̵ ̴g̸i̴v̶e̵s̶… take these."
    };
    game.npcs.push(voidEcho);
}

// Keyboard handlers
function handleKeyDown(e) {
    const key = e.key.toLowerCase();
    if (key in keys) {
        if (key === 'e' && !keys.e) {
            handleInteraction();
        }
        if (key === 'f' && !keys.f) {
            useSelectedItem();
        }
        if (key === 'c' && !keys.c) {
            toggleCrafting();
        }
        if (key === 'g' && !keys.g) {
            toggleGuide();
        }
        if (key === 'q' && !keys.q) {
            dropItem();
        }
        if (key === 'h' && !keys.h) {
            returnHome();
        }
        // Number keys for slot selection
        if (key >= '1' && key <= '9') {
            const slotNum = parseInt(key) - 1;
            game.player.selectedSlot = slotNum;
            updateEquippedWeapon();
        }
        // TODO: re-add dash functionality later - removing for now since it's buggy
        // if (key === ' ' && !keys.space) {
        //     handleDash();
        // }
        keys[key] = true;
        e.preventDefault();
    }
}

function useSelectedItem() {
    if (game.dialogueActive || game.transitioning) return;
    const slot = game.player.selectedSlot;
    const item = game.player.inventory[slot];
    if (!item || item.type !== 'consumable') return;

    if (item.heal) {
        const healed = game.player.heal(item.heal);
        if (healed > 0) console.log(`Healed ${healed}`);
    }
    if (item.mana) {
        const oldMana = game.player.mana;
        game.player.mana = Math.min(game.player.maxMana, game.player.mana + item.mana);
        const gained = game.player.mana - oldMana;
        if (gained > 0) console.log(`Mana +${gained}`);
    }

    item.count = (item.count || 1) - 1;
    if (item.count <= 0) game.player.inventory[slot] = null;
    saveGameState();
}

// Update equipped weapon based on selected slot
function updateEquippedWeapon() {
    const selectedItem = game.player.inventory[game.player.selectedSlot];
    if (selectedItem && selectedItem.type === 'weapon') {
        game.equippedWeapon = selectedItem;
        console.log(`Equipped ${selectedItem.name} (${selectedItem.damage} damage)`);
    } else {
        game.equippedWeapon = null;
    }
}

function handleKeyUp(e) {
    const key = e.key.toLowerCase();
    if (key in keys) {
        keys[key] = false;
        e.preventDefault();
    }
}

// Handle interaction with NPCs
function handleInteraction() {
    if (game.dialogueActive) {
        if (game.currentNPC) {
            const questTurnIn = tryCompleteQuest(game.currentNPC);
            const nextDialogue = questTurnIn || game.currentNPC.getNextDialogue();
            showDialogue(game.currentNPC.name, nextDialogue);

            // Give item if NPC has one to give
            if (game.currentNPC.itemGift && !game.currentNPC.hasGivenItem) {
                // Check if itemGift is array (multiple items) or string (single item)
                if (Array.isArray(game.currentNPC.itemGift)) {
                    // Give multiple items
                    let allAdded = true;
                    for (const gift of game.currentNPC.itemGift) {
                        const item = items[gift.id];
                        if (item) {
                            for (let i = 0; i < gift.count; i++) {
                                if (!game.player.addItem({...item, id: gift.id, count: 1})) {
                                    allAdded = false;
                                    break;
                                }
                            }
                        }
                    }
                    if (allAdded) {
                        game.currentNPC.hasGivenItem = true;
                        saveGameState();
                        console.log(`${game.currentNPC.name} gave you items!`);
                    }
                } else {
                    // Give single item
                    const item = items[game.currentNPC.itemGift];
                    if (item && game.player.addItem({...item, id: game.currentNPC.itemGift, count: 1})) {
                        game.currentNPC.hasGivenItem = true;
                        saveGameState();
                        console.log(`${game.currentNPC.name} gave you ${item.name}!`);
                    }
                }
            }

            // Check for teleportation on last dialogue
            if (game.currentNPC.dialogueIndex === 0) {
                // Teleport if NPC has teleportTo property
                if (game.currentNPC.teleportTo) {
                    startTransition(game.currentNPC.teleportTo);
                }
                hideDialogue();
            }
        }
    } else if (game.interactableNearby) {
        game.currentNPC = game.interactableNearby;
        const questTurnIn = tryCompleteQuest(game.currentNPC);
        const dialogue = questTurnIn || game.currentNPC.getNextDialogue();
        showDialogue(game.currentNPC.name, dialogue);
    } else if (game.interactableNodeNearby) {
        const node = game.interactableNodeNearby;
        if (gatherNode(node)) {
            // Small pickup sparkle
            spawnParticle({
                x: node.x + node.width / 2,
                y: node.y + node.height / 2,
                vx: (Math.random() - 0.5) * 40,
                vy: -60,
                size: 3,
                color: '#ffffff',
                lifeMs: 450
            });
            console.log(`Gathered ${node.name}`);
        } else {
            console.log('Inventory full!');
        }
    }
}

function updateBackButtonVisibility() {
    if (!backButtonEl) return;
    if (game.currentBiome === 'home') {
        backButtonEl.classList.add('hidden');
        return;
    }
    backButtonEl.classList.remove('hidden');
    backButtonEl.textContent = (game.currentBiome === 'glitchedVoid') ? 'Back (Locked)' : 'Back';
}

function handleBackButton() {
    if (game.transitioning) return;
    if (game.currentBiome === 'home') return;
    if (game.currentBiome === 'glitchedVoid') {
        showToast('Locked');
        return;
    }
    startTransition('home');
}

// Toggle crafting menu
function toggleCrafting() {
    game.craftingOpen = !game.craftingOpen;
    if (!game.craftingOpen) {
        // Return items to inventory if closing
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                if (game.craftingSlots[row][col]) {
                    game.player.addItem(game.craftingSlots[row][col]);
                    game.craftingSlots[row][col] = null;
                }
            }
        }

        // Return cursor item too
        if (game.draggedItem) {
            game.player.addItem(game.draggedItem);
            game.draggedItem = null;
            game.draggedFromSlot = null;
        }

        game.splitPlaceMode = false;
        game.craftingResult = null;
        game.craftingResultCount = 1;
        game.craftingMatchedRecipe = null;
    }
    console.log(`Crafting ${game.craftingOpen ? 'opened' : 'closed'}`);
}

// Toggle crafting guide
function toggleGuide() {
    game.guideOpen = !game.guideOpen;
    if (game.guideOpen) game.guideScroll = 0;
    console.log(`Guide ${game.guideOpen ? 'opened' : 'closed'}`);
}

// Drop item from selected slot
function dropItem() {
    const slot = game.player.selectedSlot;
    const item = game.player.inventory[slot];
    if (item) {
        // Create dropped item at player position
        game.droppedItems.push({
            x: game.player.x + game.player.width / 2 - 10,
            y: game.player.y + game.player.height + 5,
            width: 20,
            height: 20,
            item: {...item}
        });
        game.player.inventory[slot] = null;
        console.log(`Dropped ${item.name}`);
    }
}

// Return to home biome
function returnHome() {
    if (game.currentBiome !== 'home') {
        startTransition('home');
    }
}

// Start biome transition
function startTransition(targetBiome) {
    game.transitioning = true;
    game.transitionAlpha = 0;
    game.transitionTarget = targetBiome;
    game.transitionMessages = biomes[targetBiome].transitionMessages;
    game.transitionMessageIndex = 0;
    game.transitionTimer = 0;
    console.log(`Starting transition to ${biomes[targetBiome].name}...`);
}

// Complete transition
function completeTrans() {
    game.currentBiome = game.transitionTarget;
    game.transitioning = false;
    game.transitionAlpha = 0;
    layoutNPCsForBiome(game.currentBiome);
    layoutNodesForBiome(game.currentBiome);
    updateBackButtonVisibility();
    saveGameState();
    console.log(`Arrived at ${biomes[game.currentBiome].name}!`);
}

// Mouse handlers
function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    game.mouseX = e.clientX - rect.left;
    game.mouseY = e.clientY - rect.top;
}

function handleMouseDown(e) {
    if (!game.craftingOpen && !game.guideOpen) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const button = e.button ?? 0;
    game.dragButton = button;

    // If we're already holding something, mouseup handles placement.
    if (game.draggedItem) return;

    // Prefer crafting grid interactions when open.
    const craftSlot = getCraftingSlotAt(mouseX, mouseY);
    if (craftSlot !== null && game.craftingSlots[craftSlot.row][craftSlot.col]) {
        pickUpFromSlot({ type: 'crafting', row: craftSlot.row, col: craftSlot.col }, button);
        checkRecipe();
        return;
    }

    // Check hotbar slots
    const hotbarSlot = getHotbarSlotAt(mouseX, mouseY);
    if (hotbarSlot !== -1 && game.player.inventory[hotbarSlot]) {
        game.splitPlaceMode = false;
        pickUpFromSlot({ type: 'inventory', index: hotbarSlot }, button);
        return;
    }
}

function handleMouseUp(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const button = e.button ?? game.dragButton ?? 0;

    // Check if clicking craft button
    if (game.craftingOpen && game.craftingResult && isCraftButtonClicked(mouseX, mouseY)) {
        craftItem();
        return;
    }

    // Check if clicking craft all button
    if (game.craftingOpen && game.craftingResult && isCraftAllButtonClicked(mouseX, mouseY)) {
        craftAllItems();
        return;
    }

    if (!game.draggedItem) return;

    // Try crafting slot first (when open)
    const craftSlot = getCraftingSlotAt(mouseX, mouseY);
    if (craftSlot !== null) {
        const effectiveButton = game.craftingOpen && game.splitPlaceMode && button === 0 ? 2 : button;
        const changed = placeIntoSlot({ type: 'crafting', row: craftSlot.row, col: craftSlot.col }, effectiveButton);
        if (changed) checkRecipe();
        if (!game.draggedItem) game.splitPlaceMode = false;
        return;
    }

    // Then hotbar
    const hotbarSlot = getHotbarSlotAt(mouseX, mouseY);
    if (hotbarSlot !== -1) {
        placeIntoSlot({ type: 'inventory', index: hotbarSlot }, button);
        if (!game.draggedItem) game.splitPlaceMode = false;
        return;
    }

    // Clicked empty space: return to original slot if we have one; otherwise keep holding (Minecraft-like).
    if (game.draggedFromSlot) {
        returnDraggedToOrigin();
        if (!game.draggedItem) game.splitPlaceMode = false;
    }
}

// Check if craft button was clicked
function isCraftButtonClicked(mx, my) {
    const ui = getCraftingUILayout();
    const btnX = ui.button.x;
    const btnY = ui.button.y;
    const btnW = ui.button.w;
    const btnH = ui.button.h;

    return mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH;
}

// Check if craft all button was clicked
function isCraftAllButtonClicked(mx, my) {
    const ui = getCraftingUILayout();
    const btnX = ui.buttonAll.x;
    const btnY = ui.buttonAll.y;
    const btnW = ui.buttonAll.w;
    const btnH = ui.buttonAll.h;

    return mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH;
}

// Craft the item!
function craftItem() {
    if (!game.craftingResult) return;
    if (!game.craftingMatchedRecipe) return;
    if (!game.craftingConsumeSlots) return;

    const resultId = game.craftingResult;
    const resultCount = game.craftingResultCount || 1;

    if (!canFitInInventory(resultId, resultCount)) {
        console.log('Not enough inventory space for result.');
        return;
    }

    // Consume 1 item from each matched ingredient slot.
    for (const slot of game.craftingConsumeSlots) {
        const slotItem = game.craftingSlots[slot.row][slot.col];
        if (!slotItem) continue;
        const nextCount = (slotItem.count || 1) - 1;
        if (nextCount <= 0) {
            game.craftingSlots[slot.row][slot.col] = null;
        } else {
            slotItem.count = nextCount;
        }
    }

    // Add result (as a stack when possible).
    game.player.addItem({ ...items[resultId], id: resultId, count: resultCount });
    discoverRecipe(game.craftingMatchedRecipe);
    console.log(`Crafted ${resultCount}x ${items[resultId].name}!`);
    checkRecipe();
}

// Craft ALL possible items
function craftAllItems() {
    if (!game.craftingResult) return;
    if (game.craftingMaxPossible <= 0) return;

    let craftedCount = 0;
    const resultId = game.craftingResult;
    const resultCount = game.craftingResultCount || 1;

    // Craft as many times as possible
    for (let i = 0; i < game.craftingMaxPossible; i++) {
        // Check if we still have the recipe matched
        if (!game.craftingResult) break;
        if (!canFitInInventory(resultId, resultCount)) {
            console.log('Inventory full! Crafted as many as possible.');
            break;
        }

        // Craft one batch
        craftItem();
        craftedCount++;
    }

    console.log(`Crafted ${craftedCount} batches (${craftedCount * resultCount} items total)!`);
}

// Show dialogue box
function showDialogue(npcName, text) {
    game.dialogueActive = true;
    const dialogueBox = document.getElementById('dialogue-box');
    const npcNameEl = document.getElementById('npc-name');
    const dialogueText = document.getElementById('dialogue-text');

    dialogueBox.classList.remove('hidden');
      npcNameEl.textContent = npcName;
    dialogueText.textContent = text;
}

// Hide dialogue box
function hideDialogue() {
    game.dialogueActive = false;
    game.currentNPC = null;
    document.getElementById('dialogue-box').classList.add('hidden');
}

// Update game state
function update(deltaTime) {
    // Update transitions
    if (game.transitioning) {
        game.transitionTimer += deltaTime;

        // Fade in (black screen appears)
        if (game.transitionAlpha < 1) {
            game.transitionAlpha += deltaTime / 500; // 500ms fade in
        }

        // Show messages every 800ms
        if (game.transitionTimer > (game.transitionMessageIndex + 1) * 800) {
            game.transitionMessageIndex++;

            // After all messages shown, complete transition
            if (game.transitionMessageIndex >= game.transitionMessages.length) {
                completeTrans();
            }
        }

        return; // Don't update game while transitioning
    }

    if (game.dialogueActive) {
        return;
    }

    // movement input
    let moveX = 0;
    let moveY = 0;

    if (keys.w) moveY -= 1;
    if (keys.s) moveY += 1;
    if (keys.a) moveX -= 1;
    if (keys.d) moveX += 1;

    // Normalize diagonal movement
    // FIXME: this math is actually wrong but close enough for now
    // should be 1/sqrt(2) = 0.7071... but 0.707 works fine
    if (moveX !== 0 && moveY !== 0) {
        const normalizer = 0.707; // approx 1/sqrt(2)
        moveX *= normalizer;
          moveY *= normalizer;
    }

    game.player.setVelocity(moveX, moveY);
    game.player.update(deltaTime);

    // Run/idle dust particles so movement feels animated even with a single-frame sprite.
    game.playerStepTimerMs += deltaTime;
    if (game.player.isMoving && game.playerStepTimerMs > 90) {
        game.playerStepTimerMs = 0;
        const footX = game.player.x + game.player.width / 2 + (Math.random() - 0.5) * 10;
        const footY = game.player.y + game.player.height - 4 + (Math.random() - 0.5) * 4;
        const dustColorByBiome = {
            home: '#d2b48c',
            magmaKingdom: '#ff8844',
            mysticalLibrary: '#cc99ff',
            glitchedVoid: '#ff3355',
            waterQueenRealm: '#66ccff'
        };
        spawnParticle({
            x: footX,
            y: footY,
            vx: (Math.random() - 0.5) * 30,
            vy: -40 - Math.random() * 20,
            size: 2 + Math.random() * 2,
            color: dustColorByBiome[game.currentBiome] || '#d2b48c',
            lifeMs: 280 + Math.random() * 220
        });
    } else if (!game.player.isMoving) {
        game.playerStepTimerMs = Math.min(game.playerStepTimerMs, 90);
    }

    game.lastDiscoveryCheckMs += deltaTime;
    if (game.lastDiscoveryCheckMs >= 500) {
        game.lastDiscoveryCheckMs = 0;
        updateRecipeDiscovery();
    }

    // bounds checking
    const maxX = canvas.width - game.player.width;
    const maxY = canvas.height - game.player.height;
    game.player.x = Math.max(0, Math.min(maxX, game.player.x));
      game.player.y = Math.max(0, Math.min(maxY, game.player.y));

    // check for nearby NPCs (only in current biome)
    game.interactableNearby = null;
    for (const npc of game.npcs) {
        // Skip NPCs not in current biome
        if (npc.biome && npc.biome !== game.currentBiome) {
            continue;
        }

        if (npc.canInteract(game.player)) {
            game.interactableNearby = npc;
            break;
        }
    }

    // check for nearby resource nodes (only in current biome)
    game.interactableNodeNearby = null;
    for (const node of game.resourceNodes) {
        if ((node.biome || 'home') !== game.currentBiome) continue;
        if (!node.active) continue;
        if (canInteractWithNode(node, game.player)) {
            game.interactableNodeNearby = node;
            break;
        }
    }

    // Check for nearby dropped items and pick them up
    for (let i = game.droppedItems.length - 1; i >= 0; i--) {
        const droppedItem = game.droppedItems[i];
        const dx = game.player.x - droppedItem.x;
        const dy = game.player.y - droppedItem.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 40) {
            if (game.player.addItem(droppedItem.item)) {
                game.droppedItems.splice(i, 1);
            }
        }
    }

    updateResourceNodes(deltaTime);
    updateUI();
    updateParticles(deltaTime);

    // Autosave (cookies/localStorage) so refresh keeps progress
    game._saveTimerMs = (game._saveTimerMs || 0) + deltaTime;
    if (game._saveTimerMs > 1200) {
        game._saveTimerMs = 0;
        saveGameState();
    }
}

function initRecipes() {
    for (const recipe of recipes) {
        if (!recipe.id) recipe.id = `${recipe.result}:${recipe.name || 'Recipe'}`;
        if (!recipe.unlock) recipe.unlock = 'ingredients'; // 'start' | 'ingredients'
    }

    // Starter knowledge so the guide feels usable early.
    discoverRecipeByResult('stick');
    discoverRecipeByResult('potion_health');
    discoverRecipeByResult('iron_ingot');
    discoverRecipeByResult('torch');
}

function discoverRecipeByResult(resultId) {
    for (const recipe of recipes) {
        if (recipe.result !== resultId) continue;
        game.discoveredRecipes.add(recipe.id);
    }
}

function discoverRecipe(recipe) {
    if (!recipe?.id) return;
    game.discoveredRecipes.add(recipe.id);
}

function updateRecipeDiscovery() {
    const inventoryItems = game.player.inventory.filter((s) => s !== null);
    const inventoryIds = new Set(inventoryItems.map((it) => it.id));

    for (const recipe of recipes) {
        if (!recipe?.id) continue;
        if (game.discoveredRecipes.has(recipe.id)) continue;
        if (recipe.unlock === 'start') {
            game.discoveredRecipes.add(recipe.id);
            continue;
        }
        if (recipe.unlock !== 'ingredients') continue;

        const needed = getRecipeIngredientSet(recipe);
        let ok = true;
        for (const itemId of needed) {
            if (!inventoryIds.has(itemId)) {
                ok = false;
                break;
            }
        }
        if (ok) game.discoveredRecipes.add(recipe.id);
    }
}

function getRecipeIngredientSet(recipe) {
    const needed = new Set();
    for (const itemId of Object.keys(recipe.ingredients)) {
        needed.add(itemId);
    }
    return needed;
}

// Update UI elements - now drawn on canvas
function updateUI() {
    // UI is now drawn directly on canvas in drawUI()
}

// Draw everything
function draw() {
    // Draw biome background
    const currentBiomeData = biomes[game.currentBiome];

    if (currentBiomeData.background && sprites[currentBiomeData.background]) {
        // Draw biome background image (scaled to fit canvas)
        ctx.drawImage(sprites[currentBiomeData.background], 0, 0, canvas.width, canvas.height);
    } else {
        // Default background - darker, more muted
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // ground tiles - subtle dark gray
        ctx.fillStyle = '#2a2a2a';
          for (let x = 0; x < canvas.width; x += 32) {
            for (let y = 0; y < canvas.height; y += 32) {
                if ((x / 32 + y / 32) % 2 === 0) {
                    ctx.fillRect(x, y, 32, 32);
                }
            }
        }
    }

    // Dropped items
    for (const droppedItem of game.droppedItems) {
        // Draw item background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(droppedItem.x, droppedItem.y, droppedItem.width, droppedItem.height);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(droppedItem.x, droppedItem.y, droppedItem.width, droppedItem.height);

        // Draw item icon
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(droppedItem.item.icon, droppedItem.x + droppedItem.width / 2, droppedItem.y + droppedItem.height / 2);
    }

    // Particles (dust/embers/bubbles)
    drawParticles(ctx);

    // Resource nodes
    drawResourceNodes(ctx);
    if (game.interactableNodeNearby && !game.dialogueActive && !game.interactableNearby) {
        const n = game.interactableNodeNearby;
        const promptX = n.x + n.width / 2;
        const promptY = n.y - 10;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Press E', promptX, promptY);
    }

    // NPCs (only show NPCs for current biome)
    for (const npc of game.npcs) {
        // Only draw NPCs that belong to current biome
        if (npc.biome && npc.biome !== game.currentBiome) {
            continue; // Skip this NPC
        }

        npc.draw(ctx);

        // interaction prompt
        if (game.interactableNearby === npc && !game.dialogueActive) {
            const promptX = npc.x + npc.width / 2;
            const promptY = npc.y - 25;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Press E', promptX, promptY);
        }
    }

    drawPlayer(ctx, game.player);

    // Draw UI elements on top
    drawUI();

    // Draw transition screen on top of everything
    if (game.transitioning) {
        drawTransitionScreen();
    }
}

// Draw transition screen
function drawTransitionScreen() {
    const a = Math.min(1, game.transitionAlpha);
    const target = game.transitionTarget;
    const t = (performance.now ? performance.now() : Date.now()) / 1000;

    // Base overlay tint per realm (keeps readability and gives each realm its own vibe)
    const overlayByTarget = {
        home: [0, 0, 0],
        waterQueenRealm: [0, 25, 50],
        magmaKingdom: [40, 5, 0],
        mysticalLibrary: [15, 0, 35],
        glitchedVoid: [0, 0, 0]
    };
    const [or, og, ob] = overlayByTarget[target] || [0, 0, 0];
    ctx.fillStyle = `rgba(${or}, ${og}, ${ob}, ${a})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Realm-specific transition FX (behind the text)
    if (target === 'waterQueenRealm') {
        // Bubbles + wave shimmer
        for (let i = 0; i < 34; i++) {
            const phase = i * 0.77;
            const x = (canvas.width * ((i * 97) % 100) / 100) + Math.sin(t * 1.5 + phase) * 18;
            const y = (canvas.height * (1 - ((t * 0.12 + i * 0.03) % 1))) + Math.sin(t * 2.2 + phase) * 8;
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
        ctx.save();
        ctx.globalAlpha = a * 0.12;
        ctx.strokeStyle = 'rgba(140, 240, 255, 1)';
        for (let y = 0; y < canvas.height; y += 24) {
            ctx.beginPath();
            for (let x = 0; x <= canvas.width; x += 18) {
                const yy = y + Math.sin(t * 2 + x * 0.02) * 4;
                if (x === 0) ctx.moveTo(x, yy);
                else ctx.lineTo(x, yy);
            }
            ctx.stroke();
        }
        ctx.restore();
    } else if (target === 'magmaKingdom') {
        // Embers rising
        for (let i = 0; i < 48; i++) {
            const seed = i * 31.7;
            const x = (canvas.width * ((i * 41) % 100) / 100) + Math.sin(t * 1.3 + seed) * 12;
            const y = canvas.height * (1 - ((t * 0.22 + i * 0.04) % 1));
            const r = 2 + ((i * 19) % 5);
            const glow = (i % 3) === 0 ? 0.6 : 0.35;
            ctx.save();
            ctx.globalAlpha = a * glow;
            ctx.fillStyle = (i % 2) === 0 ? '#ffcc66' : '#ff5533';
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    } else if (target === 'mysticalLibrary') {
        // Floating runes
        const runes = ['ᚠ', 'ᚨ', 'ᚱ', 'ᛗ', 'ᛟ', 'ᛞ', 'ᛇ', 'ᛉ', 'ᛜ', 'ᚾ'];
        ctx.save();
        ctx.globalAlpha = a * 0.55;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < 28; i++) {
            const rune = runes[i % runes.length];
            const x = canvas.width * ((i * 37) % 100) / 100 + Math.sin(t * 0.9 + i) * 22;
            const y = canvas.height * (0.15 + ((t * 0.08 + i * 0.03) % 0.8));
            const size = 18 + ((i * 11) % 14);
            ctx.font = `bold ${size}px Georgia`;
            ctx.fillStyle = (i % 2) ? 'rgba(210, 170, 255, 1)' : 'rgba(160, 220, 255, 1)';
            ctx.fillText(rune, x, y);
        }
        ctx.restore();
    } else if (target === 'glitchedVoid') {
        // Keep existing glitch vibe but add scanlines
        ctx.save();
        ctx.globalAlpha = a * 0.12;
        ctx.fillStyle = '#ffffff';
        for (let y = 0; y < canvas.height; y += 6) {
            if (((y / 6) | 0) % 2 === 0) ctx.fillRect(0, y, canvas.width, 1);
        }
        ctx.restore();
    }

    // Show messages
    const isGlitched = target === 'glitchedVoid';

    for (let i = 0; i <= game.transitionMessageIndex && i < game.transitionMessages.length; i++) {
        const message = game.transitionMessages[i];
        const yOffset = (canvas.height / 2) - 100 + (i * 60);

        if (isGlitched) {
            ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 100}, ${Math.random() * 100}, ${a})`;
            ctx.font = `${24 + Math.random() * 8}px monospace`;
            const glitchX = (canvas.width / 2) + (Math.random() - 0.5) * 20;
            const glitchY = yOffset + (Math.random() - 0.5) * 10;
            ctx.textAlign = 'center';
            ctx.fillText(message, glitchX, glitchY);
            continue;
        }

        // Theme the text slightly per realm while staying readable.
        const styleByTarget = {
            home: { color: 'rgba(255, 215, 0, A)', font: 'bold 24px Georgia' },
            waterQueenRealm: { color: 'rgba(140, 240, 255, A)', font: 'bold 24px Georgia' },
            magmaKingdom: { color: 'rgba(255, 180, 90, A)', font: 'bold 24px Georgia' },
            mysticalLibrary: { color: 'rgba(210, 170, 255, A)', font: 'bold 24px Georgia' }
        };
        const theme = styleByTarget[target] || styleByTarget.home;
        ctx.fillStyle = theme.color.replace('A', a.toString());
        ctx.font = theme.font;
        ctx.textAlign = 'center';
        const wobble = target === 'waterQueenRealm' ? Math.sin(t * 3 + i) * 4 : 0;
        const heatShake = target === 'magmaKingdom' ? (Math.sin(t * 18 + i * 2) * 2) : 0;
        ctx.fillText(message, canvas.width / 2 + heatShake, yOffset + wobble);
    }
}

// Draw all UI elements in one place
function drawUI() {
    // Only show hotbar
    drawInventoryUI();

    // Show crafting menu if open
    if (game.craftingOpen) {
        drawCraftingUI();
    }

    // Show guide if open
    if (game.guideOpen) {
        drawGuideUI();
    }

    // Draw dragged item following cursor
    if (game.draggedItem) {
        ctx.font = '35px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(game.draggedItem.icon, game.mouseX, game.mouseY);

        // Show item count if applicable
        if (game.draggedItem.count && game.draggedItem.count > 1) {
            ctx.font = '12px monospace';
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.strokeText(game.draggedItem.count.toString(), game.mouseX + 15, game.mouseY + 15);
            ctx.fillText(game.draggedItem.count.toString(), game.mouseX + 15, game.mouseY + 15);
        }
    }

    // Biome indicator top-left
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 200, 35);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 200, 35);
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('📍 ' + biomes[game.currentBiome].name, 20, 32);

    // Small controls hint bottom right
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(canvas.width - 440, canvas.height - 30, 430, 25);
    ctx.fillStyle = '#ccc';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('WASD-Move | E-Interact | F-Use | C-Craft | G-Guide | H-Home | Q-Drop', canvas.width - 435, canvas.height - 12);
}

// Draw player character
function drawPlayer(ctx, player) {
    if (sprites.loaded && sprites.player) {
        const speed01 = Math.min(1, Math.sqrt(player.velocityX * player.velocityX + player.velocityY * player.velocityY) / (player.speed || 1));
        const running = player.isMoving && speed01 > 0.1;
        const t = player.animTime || 0;

        const facingUp = player.facing === 'up';
        const facingDown = player.facing === 'down';
        const facingSide = player.facing === 'left' || player.facing === 'right';

        // Make idle more obvious and "direct" (breathing / bobbing)
        const idleBreath = Math.sin(t * 2.2);
        const bob = Math.sin(t * (running ? 14 : 2.2)) * (running ? 3.2 : 1.6) + (running ? 0 : idleBreath * 0.6);
        const sway = Math.sin(t * (running ? 14 : 2.2) + Math.PI / 2) * (running ? 0.03 : 0.012);
        const lean = clamp(player.velocityX / (player.speed || 1), -1, 1) * (running ? 0.10 : 0.02);
        const flipX = player.facing === 'left' ? -1 : 1;

        // Ground shadow
        const shadowW = (player.width * 0.55) * (running ? 0.95 : 1.0);
        const shadowH = (player.height * 0.12) * (running ? 0.9 : 1.0);
        const shadowX = player.x + player.width / 2;
        const shadowY = player.y + player.height - 4;
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(shadowX, shadowY, shadowW / 2, shadowH / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Sprite transform for run/idle feel.
        const cx = player.x + player.width / 2;
        const cy = player.y + player.height / 2;
        ctx.save();
        ctx.translate(cx, cy + bob * 0.25);
        ctx.scale(flipX, 1);

        // With a single portrait sprite, fake "up/down" facing so it doesn't always look sideways.
        const dirTilt = facingSide ? (lean + sway) : (sway * 0.6);
        ctx.rotate(dirTilt);

        const idleScaleY = running ? 1 : (1 + idleBreath * 0.018);
        const idleScaleX = running ? 1 : (1 - idleBreath * 0.010);
        const dirScaleY = facingUp ? 0.98 : 1.0;
        const dirScaleX = facingUp ? 0.98 : 1.0;
        ctx.scale(idleScaleX * dirScaleX, idleScaleY * dirScaleY);

        // glow when dashing
        if (player.isDashing) {
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 15;
        }

        drawSprite(ctx, sprites.player, -player.width / 2, -player.height / 2 + bob * 0.15, player.width, player.height, 'player');

        // Lighting overlay to imply "front/back" facing.
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        if (facingUp) ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
        else if (facingDown) ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        else ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
        ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
        ctx.restore();
        ctx.restore();
    } else {
        // fallback
        const playerColor = player.isDashing ? '#00ffff' : '#4488ff';

        ctx.fillStyle = playerColor;
        ctx.fillRect(player.x, player.y, player.width, player.height);

        ctx.fillStyle = '#000';

        if (player.facing === 'down' || player.facing === 'up') {
            ctx.fillRect(player.x + 8, player.y + 10, 6, 6);
            ctx.fillRect(player.x + 18, player.y + 10, 6, 6);
        } else if (player.facing === 'left') {
            ctx.fillRect(player.x + 6, player.y + 12, 8, 8);
        } else if (player.facing === 'right') {
            ctx.fillRect(player.x + 18, player.y + 12, 8, 8);
        }
    }

    // Draw equipped weapon
    if (game.equippedWeapon) {
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Position weapon based on facing direction
        let weaponX = player.x + player.width / 2;
        let weaponY = player.y + player.height / 2;

        if (player.facing === 'right') weaponX += 20;
        else if (player.facing === 'left') weaponX -= 20;
        else if (player.facing === 'down') weaponY += 25;
        else if (player.facing === 'up') weaponY -= 15;

        ctx.fillText(game.equippedWeapon.icon, weaponX, weaponY);
    }

    // invulnerability flash
    if (player.isInvulnerable) {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(player.x - 2, player.y - 2, player.width + 4, player.height + 4);
    }
}

// Main game loop
function gameLoop(timestamp) {
    const deltaTime = timestamp - game.lastTime;
    game.lastTime = timestamp;

      update(deltaTime);
    draw();

    requestAnimationFrame(gameLoop);
}

// Draw inventory hotbar (Minecraft style - WHITE THEME!)
function drawInventoryUI() {
    const slotSize = 45;
    const spacing = 3;
    const startX = (canvas.width - (slotSize + spacing) * 9) / 2;
    const startY = canvas.height - slotSize - 15;

    for (let i = 0; i < 9; i++) {
        const x = startX + i * (slotSize + spacing);
        const y = startY;

        // slot background - WHITE theme
        ctx.fillStyle = 'rgba(240, 240, 240, 0.9)';
        ctx.fillRect(x, y, slotSize, slotSize);

        // slot border
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.9)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, slotSize, slotSize);

        // selected slot highlight
        if (i === game.player.selectedSlot) {
            ctx.strokeStyle = '#ffcc00';
            ctx.lineWidth = 3;
            ctx.strokeRect(x - 1, y - 1, slotSize + 2, slotSize + 2);
        }

        // draw item in slot
        const item = game.player.inventory[i];
        if (item) {
            ctx.font = '28px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(item.icon, x + slotSize / 2, y + slotSize / 2);

            // Draw stack count
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

    // Display equipped weapon info
    if (game.equippedWeapon) {
        const infoX = startX;
        const infoY = startY - 25;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(infoX, infoY, 180, 20);
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`⚔ ${game.equippedWeapon.name} | DMG: ${game.equippedWeapon.damage}`, infoX + 5, infoY + 14);
    }
}

// Draw crafting UI - 3x3 GRID!
function drawCraftingUI() {
    const ui = getCraftingUILayout();
    const width = ui.width;
    const height = ui.height;
    const x = ui.x;
    const y = ui.y;

    // Background with gradient
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, 'rgba(40, 30, 20, 0.98)');
    gradient.addColorStop(1, 'rgba(25, 20, 15, 0.98)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);

    // Border with wood texture look
    ctx.strokeStyle = '#5a4a3a';
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, width, height);
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y + 2, width - 4, height - 4);

    // Title bar
    ctx.fillStyle = 'rgba(60, 45, 30, 0.8)';
    ctx.fillRect(x, y, width, 50);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 26px Arial';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText('Crafting Table', x + width / 2, y + 33);
    ctx.shadowBlur = 0;

    // Draw 3x3 crafting grid with better styling
    const slotSize = ui.grid.slotSize;
    const gridStartX = ui.grid.startX;
    const gridStartY = ui.grid.startY;
    const gridSpacing = ui.grid.spacing;

    // Grid background
    ctx.fillStyle = 'rgba(80, 60, 40, 0.4)';
    ctx.fillRect(gridStartX - 10, gridStartY - 10, 3 * slotSize + 2 * gridSpacing + 20, 3 * slotSize + 2 * gridSpacing + 20);

    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            const slotX = gridStartX + col * (slotSize + gridSpacing);
            const slotY = gridStartY + row * (slotSize + gridSpacing);
            drawCraftingSlot3x3(slotX, slotY, slotSize, row, col);
        }
    }

    // Arrow with glow effect
    ctx.fillStyle = '#ffa500';
    ctx.font = '50px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ff8800';
    ctx.shadowBlur = 10;
    ctx.fillText('→', gridStartX + 3 * slotSize + 3 * gridSpacing + 50, gridStartY + slotSize + gridSpacing);
    ctx.shadowBlur = 0;

    // Result slot
    const resultX = ui.result.x;
    const resultY = ui.result.y;
    const resultSize = ui.result.size;

    if (game.craftingResult) {
        // Glowing result slot
        ctx.shadowColor = '#44ff44';
        ctx.shadowBlur = 20;
        ctx.fillStyle = 'rgba(50, 200, 50, 0.3)';
        ctx.fillRect(resultX, resultY, resultSize, resultSize);
        ctx.strokeStyle = '#4f4';
        ctx.lineWidth = 3;
        ctx.strokeRect(resultX, resultY, resultSize, resultSize);
        ctx.shadowBlur = 0;

        ctx.font = '50px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(items[game.craftingResult].icon, resultX + resultSize/2, resultY + resultSize/2);

        // Show count
        const count = game.craftingResultCount || 1;
        if (count > 1) {
            ctx.font = 'bold 16px monospace';
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.strokeText(`x${count}`, resultX + resultSize - 12, resultY + resultSize - 8);
            ctx.fillText(`x${count}`, resultX + resultSize - 12, resultY + resultSize - 8);
        }

        // Result name
        ctx.fillStyle = '#4f4';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(items[game.craftingResult].name, resultX + resultSize/2, resultY + resultSize + 20);

        // Show max craftable amount
        if (game.craftingMaxPossible > 1) {
            ctx.fillStyle = '#ffcc00';
            ctx.font = 'bold 12px monospace';
            ctx.fillText(`(Max: ${game.craftingMaxPossible}x)`, resultX + resultSize/2, resultY + resultSize + 35);
        }

        // Craft button - styled
        const btnX = ui.button.x;
        const btnY = ui.button.y;
        ctx.fillStyle = '#44ff44';
        ctx.fillRect(btnX, btnY, 120, 40);
        ctx.strokeStyle = '#2a2';
        ctx.lineWidth = 3;
        ctx.strokeRect(btnX, btnY, 120, 40);
        ctx.fillStyle = '#000';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('CRAFT', btnX + 60, btnY + 26);

        // Craft All button (if can craft more than 1)
        if (game.craftingMaxPossible > 1) {
            const btnAllX = ui.buttonAll.x;
            const btnAllY = ui.buttonAll.y;
            ctx.fillStyle = '#ffaa00';
            ctx.fillRect(btnAllX, btnAllY, 120, 40);
            ctx.strokeStyle = '#c80';
            ctx.lineWidth = 3;
            ctx.strokeRect(btnAllX, btnAllY, 120, 40);
            ctx.fillStyle = '#000';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('CRAFT ALL', btnAllX + 60, btnAllY + 20);
            ctx.font = 'bold 11px Arial';
            ctx.fillText(`(${game.craftingMaxPossible}x)`, btnAllX + 60, btnAllY + 34);
        }
    } else {
        // Empty result slot
        ctx.fillStyle = 'rgba(60, 60, 60, 0.5)';
        ctx.fillRect(resultX, resultY, resultSize, resultSize);
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.strokeRect(resultX, resultY, resultSize, resultSize);

        ctx.fillStyle = '#888';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('?', resultX + resultSize/2, resultY + resultSize/2);
    }

    // Smart hints section
    drawCraftingHints(x, y, width, height);

    // Instructions
    ctx.fillStyle = '#bbb';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Drag items into the 3x3 grid, then click CRAFT', x + width/2, y + height - 20);
    ctx.fillStyle = '#999';
    ctx.font = '10px monospace';
    ctx.fillText('C to close | Right-click places 1 | Double-click splits | G recipe guide', x + width/2, y + height - 8);
}

// Draw a single 3x3 crafting slot
function drawCraftingSlot3x3(x, y, size, row, col) {
    // Slot with inset effect
    ctx.fillStyle = 'rgba(40, 40, 40, 0.95)';
    ctx.fillRect(x, y, size, size);

    // Inner border for depth
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);

    // Outer border
    ctx.strokeStyle = '#777';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, size, size);

    const item = game.craftingSlots[row][col];
    if (item) {
        ctx.font = '38px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.icon, x + size/2, y + size/2);

        // Show stack count
        if (item.count && item.count > 1) {
            ctx.font = 'bold 12px monospace';
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2.5;
            ctx.strokeText(item.count.toString(), x + size - 10, y + size - 6);
            ctx.fillText(item.count.toString(), x + size - 10, y + size - 6);
        }
    }
}

// Draw smart crafting hints
function drawCraftingHints(x, y, width, height) {
    const hintX = x + 20;
    const hintY = y + 250;
    const hintWidth = width - 40;

    // Hints background
    ctx.fillStyle = 'rgba(50, 40, 30, 0.6)';
    ctx.fillRect(hintX, hintY, hintWidth, 140);
    ctx.strokeStyle = '#5a4a3a';
    ctx.lineWidth = 2;
    ctx.strokeRect(hintX, hintY, hintWidth, 140);

    // Title
    ctx.fillStyle = '#ffa500';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Crafting Help', hintX + 10, hintY + 20);

    // Count items currently in the grid (for live guidance)
    const gridCounts = {};
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            const it = game.craftingSlots[row][col];
            if (!it) continue;
            gridCounts[it.id] = (gridCounts[it.id] || 0) + (it.count || 1);
        }
    }
    const gridNonEmpty = Object.keys(gridCounts).length > 0;

    ctx.fillStyle = '#ddd';
    ctx.font = '12px monospace';
    let offsetY = hintY + 40;

    // Live match feedback (when a recipe is detected)
    if (game.craftingResult && game.craftingMatchedRecipe) {
        const resultName = items[game.craftingResult]?.name || game.craftingResult;
        const resultCount = game.craftingResultCount || 1;
        ctx.fillStyle = '#4f4';
        ctx.fillText(`Matched: ${resultName} x${resultCount}`, hintX + 10, offsetY);
        offsetY += 18;

        ctx.fillStyle = '#ddd';
        ctx.fillText('Ingredients (for 1 craft):', hintX + 10, offsetY);
        offsetY += 16;

        for (const [itemId, needed] of Object.entries(game.craftingMatchedRecipe.ingredients || {})) {
            const label = items[itemId]?.name || itemId;
            const have = gridCounts[itemId] || 0;
            ctx.fillStyle = have >= needed ? '#cfc' : '#fbb';
            ctx.fillText(`  - ${label}: ${have}/${needed}`, hintX + 15, offsetY);
            offsetY += 14;
            if (offsetY > hintY + 130) break;
        }
        return;
    }

    // Grid summary + suggestions when nothing matches
    if (gridNonEmpty) {
        ctx.fillStyle = '#ddd';
        ctx.fillText('Grid:', hintX + 10, offsetY);
        offsetY += 16;
        for (const [id, cnt] of Object.entries(gridCounts).slice(0, 4)) {
            const label = items[id]?.name || id;
            ctx.fillStyle = '#ccc';
            ctx.fillText(`  - ${label} x${cnt}`, hintX + 15, offsetY);
            offsetY += 14;
        }

        offsetY += 6;
        ctx.fillStyle = '#ffcc66';
        ctx.fillText('No recipe matched yet.', hintX + 10, offsetY);
        offsetY += 16;
        ctx.fillStyle = '#bbb';
        ctx.fillText('Try these starters:', hintX + 10, offsetY);
        offsetY += 14;
        ctx.fillText('  - Sticks: 2x Wood', hintX + 15, offsetY);
        offsetY += 14;
        ctx.fillText('  - Planks: 1x Wood', hintX + 15, offsetY);
        return;
    }

    // General guidance when grid is empty
    ctx.fillStyle = '#ddd';
    ctx.fillText('Starter recipes:', hintX + 10, offsetY);
    offsetY += 16;
    ctx.fillStyle = '#ccc';
    ctx.fillText('  - Sticks: 2x Wood', hintX + 15, offsetY);
    offsetY += 14;
    ctx.fillText('  - Planks: 1x Wood', hintX + 15, offsetY);
    offsetY += 14;
    ctx.fillText('  - Torch: 1x Coal + 1x Stick', hintX + 15, offsetY);
    offsetY += 14;
    ctx.fillStyle = '#aaa';
    ctx.fillText('Need Wood? Gather from the Tree in Village Hub (Press E).', hintX + 10, offsetY);
}

// Get recipes player can currently craft
function getCraftableRecipes() {
    const craftable = [];
    const inventory = game.player.inventory.filter(item => item !== null);

    for (const recipe of recipes) {
        let canCraft = true;
        const neededItems = recipe.ingredients;

        // Check if player has all needed items
        for (const [itemId, neededCount] of Object.entries(neededItems)) {
            const playerCount = inventory.filter(inv => inv.id === itemId)
                .reduce((sum, inv) => sum + (inv.count || 1), 0);
            if (playerCount < neededCount) {
                canCraft = false;
                break;
            }
        }

        if (canCraft) {
            craftable.push(recipe);
        }
    }

    craftable.sort((a, b) => getHintPriority(b) - getHintPriority(a));
    return craftable;
}

function getHintPriority(recipe) {
    if (recipe.result === 'stick') return 1000;
    if (recipe.result === 'torch') return 900;
    const item = items[recipe.result];
    if (!item) return 0;
    if (item.type === 'tool') return 800;
    if (item.type === 'weapon') return 700;
    return 100;
}

// Get ingredients player needs for recipes
function getNeededIngredients() {
    const needed = [];
    const inventory = game.player.inventory.filter(item => item !== null);
    const inventoryIds = new Set(inventory.map(item => item.id));

    for (const recipe of recipes) {
        const neededItems = Object.keys(recipe.ingredients);

        // Find missing ingredients
        for (const itemId of neededItems) {
            if (!inventoryIds.has(itemId)) {
                needed.push({ item: itemId, recipe: recipe.result });
            }
        }
    }

    return needed;
}

// Draw crafting guide UI
function drawGuideUI() {
    const width = 620;
    const height = 480;
    const x = (canvas.width - width) / 2;
    const y = (canvas.height - height) / 2;

    // Parchment background
    const parchment = ctx.createLinearGradient(x, y, x, y + height);
    parchment.addColorStop(0, 'rgba(238, 220, 180, 0.98)');
    parchment.addColorStop(1, 'rgba(205, 175, 130, 0.98)');
    ctx.fillStyle = parchment;
    ctx.fillRect(x, y, width, height);

    // Wooden frame
    ctx.strokeStyle = '#3a2514';
    ctx.lineWidth = 8;
    ctx.strokeRect(x, y, width, height);
    ctx.strokeStyle = '#6b4a2b';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 6, y + 6, width - 12, height - 12);

    // Subtle ink scratches (cheap "texture")
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = '#2a1a0f';
    for (let i = 0; i < 18; i++) {
        const sy = y + 60 + i * 20;
        ctx.beginPath();
        ctx.moveTo(x + 24, sy);
        ctx.lineTo(x + width - 24, sy + (i % 3) - 1);
        ctx.stroke();
    }
    ctx.restore();

    // Title
    ctx.fillStyle = '#2a1a0f';
    ctx.font = 'bold 26px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('📜 The Artisan’s Codex 📜', x + width / 2, y + 42);
    ctx.fillStyle = '#5a3a20';
    ctx.font = '12px Georgia';
    ctx.fillText('Scroll wheel to browse • Press G to close', x + width / 2, y + 62);

    // Known recipes list
    const listX = x + 22;
    const listY = y + 80;
    const listW = width - 44;
    const listH = height - 120;

    ctx.fillStyle = 'rgba(60, 35, 20, 0.15)';
    ctx.fillRect(listX, listY, listW, listH);
    ctx.strokeStyle = 'rgba(60, 35, 20, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(listX, listY, listW, listH);

    const known = getDiscoveredRecipesForGuide();
    const lockedCount = recipes.length - known.length;

    const cardH = 78;
    const perPage = Math.max(1, Math.floor((listH - 10) / cardH));
    const maxScroll = Math.max(0, known.length - perPage);
    game.guideScroll = Math.max(0, Math.min(game.guideScroll, maxScroll));

    ctx.textAlign = 'left';
    ctx.font = 'bold 14px Georgia';
    ctx.fillStyle = '#2a1a0f';
    ctx.fillText(`Known recipes: ${known.length}   •   Rumors: ${lockedCount}`, listX + 10, listY + 18);

    const startIndex = game.guideScroll;
    const endIndex = Math.min(known.length, startIndex + perPage);
    let cy = listY + 28;

    for (let idx = startIndex; idx < endIndex; idx++) {
        const recipe = known[idx];
        const resultItem = items[recipe.result];
        if (!resultItem) continue;

        // Card
        ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.fillRect(listX + 8, cy, listW - 16, cardH - 6);
        ctx.strokeStyle = 'rgba(80, 50, 25, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(listX + 8, cy, listW - 16, cardH - 6);

        // Result
        ctx.font = '26px Arial';
        ctx.fillStyle = '#000';
        ctx.fillText(resultItem.icon, listX + 18, cy + 28);
        ctx.font = 'bold 16px Georgia';
        ctx.fillStyle = '#2a1a0f';
        const outCount = recipe.count ? ` x${recipe.count}` : '';
        ctx.fillText(`${resultItem.name}${outCount}`, listX + 52, cy + 24);

        // Ingredients preview
        const ingredientText = getRecipeIngredientPreviewText(recipe);
        ctx.font = '13px Georgia';
        ctx.fillStyle = '#3a2514';
        ctx.fillText(ingredientText, listX + 52, cy + 46);

        // Notes
        ctx.font = '11px Georgia';
        ctx.fillStyle = '#5a3a20';
        ctx.fillText('🧩 Place items anywhere in the grid', listX + 52, cy + 64);

        cy += cardH;
    }

    // Footer hint
    ctx.fillStyle = '#2a1a0f';
    ctx.font = '12px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('Find new materials to reveal more recipes in this codex.', x + width / 2, y + height - 18);
}

function getDiscoveredRecipesForGuide() {
    const known = [];
    for (const recipe of recipes) {
        if (!recipe?.id) continue;
        if (!items[recipe.result]) continue;
        if (game.discoveredRecipes.has(recipe.id)) known.push(recipe);
    }
    known.sort((a, b) => getHintPriority(b) - getHintPriority(a));
    return known;
}

function getRecipeIngredientPreviewText(recipe) {
    const parts = [];
    for (const [itemId, count] of Object.entries(recipe.ingredients)) {
        const item = items[itemId];
        if (!item) continue;
        parts.push(`${item.icon}${count > 1 ? `x${count}` : ''}`);
    }

    const lhs = parts.join(' + ');
    const outCount = recipe.count > 1 ? ` x${recipe.count}` : '';
    return `${lhs}  →  ${items[recipe.result]?.icon || '?'} ${items[recipe.result]?.name || recipe.result}${outCount}`;
}

// Get which hotbar slot is at mouse position
function getHotbarSlotAt(mx, my) {
    const slotSize = 45;
    const spacing = 3;
    const startX = (canvas.width - (slotSize + spacing) * 9) / 2;
    const startY = canvas.height - slotSize - 15;

    for (let i = 0; i < 9; i++) {
        const x = startX + i * (slotSize + spacing);
        const y = startY;
        if (mx >= x && mx <= x + slotSize && my >= y && my <= y + slotSize) {
            return i;
        }
    }
    return -1;
}

// Get which crafting slot is at mouse position (3x3 grid)
function getCraftingSlotAt(mx, my) {
    if (!game.craftingOpen) return null;

    const ui = getCraftingUILayout();
    const slotSize = ui.grid.slotSize;
    const gridStartX = ui.grid.startX;
    const gridStartY = ui.grid.startY;
    const gridSpacing = ui.grid.spacing;

    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            const slotX = gridStartX + col * (slotSize + gridSpacing);
            const slotY = gridStartY + row * (slotSize + gridSpacing);

            if (mx >= slotX && mx <= slotX + slotSize &&
                my >= slotY && my <= slotY + slotSize) {
                return {row, col};
            }
        }
    }
    return null;
}

// Check if current ingredients match a recipe (simplified ingredient matching)
function checkRecipe() {
    game.craftingResult = null;
    game.craftingResultCount = 1;
    game.craftingMatchedRecipe = null;
    game.craftingConsumeSlots = null;
    game.craftingMaxPossible = 0;

    // Count what's in the grid (count each individual item, not just slots)
    const gridItems = {};
    const gridSlotsByItem = {};
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            const item = game.craftingSlots[row][col];
            if (item) {
                // Count individual items in the slot (not just the slot itself)
                const itemCount = item.count || 1;
                gridItems[item.id] = (gridItems[item.id] || 0) + itemCount;

                // Track slots for this item
                if (!gridSlotsByItem[item.id]) {
                    gridSlotsByItem[item.id] = [];
                }
                gridSlotsByItem[item.id].push({ row, col, count: itemCount });
            }
        }
    }

    // Debug log
    if (Object.keys(gridItems).length > 0) {
        console.log('Grid items:', gridItems);
    }

    // Try to match a recipe (pick the best match, not the first match)
    let best = null; // { recipe, score, consumeSlots, maxCrafts }

    for (const recipe of recipes) {
        const needed = recipe.ingredients;
        let matches = true;

        // Check if grid has at least what recipe needs
        for (const [itemId, count] of Object.entries(needed)) {
            if ((gridItems[itemId] || 0) < count) {
                matches = false;
                break;
            }
        }

        // Check that grid doesn't have extra item TYPES (can have extra quantity)
        if (matches) {
            for (const itemId of Object.keys(gridItems)) {
                if (!(itemId in needed)) {
                    matches = false;
                    break;
                }
            }
        }

        if (matches) {
            // Calculate how many times we can craft this recipe
            let maxCrafts = Infinity;
            for (const [itemId, neededCount] of Object.entries(needed)) {
                const available = gridItems[itemId] || 0;
                const craftableFromThis = Math.floor(available / neededCount);
                maxCrafts = Math.min(maxCrafts, craftableFromThis);
            }

            // Build consume slots - we need to consume the exact amount needed (for 1 craft)
            const consumeSlots = [];
            for (const [itemId, neededCount] of Object.entries(needed)) {
                const slots = gridSlotsByItem[itemId] || [];
                let remaining = neededCount;

                for (const slot of slots) {
                    if (remaining <= 0) break;
                    const takeFromSlot = Math.min(remaining, slot.count);
                    for (let i = 0; i < takeFromSlot; i++) {
                        consumeSlots.push({ row: slot.row, col: slot.col });
                    }
                    remaining -= takeFromSlot;
                }
            }

            // Score: prefer recipes that use more ingredients (so "Sticks (2 wood)" beats "Planks (1 wood)")
            const requiredTotal = Object.values(needed).reduce((sum, n) => sum + n, 0);
            const requiredTypes = Object.keys(needed).length;
            const hintPriority = typeof getHintPriority === 'function' ? getHintPriority(recipe) : 0;
            const score = requiredTotal * 10000 + requiredTypes * 100 + hintPriority;

            if (!best || score > best.score) {
                best = { recipe, score, consumeSlots, maxCrafts };
            }
        }
    }

    if (best) {
        game.craftingResult = best.recipe.result;
        game.craftingResultCount = best.recipe.count || 1;
        game.craftingMatchedRecipe = best.recipe;
        game.craftingConsumeSlots = best.consumeSlots;
        game.craftingMaxPossible = best.maxCrafts;
        console.log(`Recipe matched! ${items[best.recipe.result].name} (can craft ${best.maxCrafts}x)`);
    }
}

function getCraftingUILayout() {
    const width = 650;
    const height = 450;
    const x = (canvas.width - width) / 2;
    const y = (canvas.height - height) / 2;

    const grid = {
        slotSize: 55,
        spacing: 4,
        startX: x + 40,
        startY: y + 70
    };

    const result = {
        size: 70,
        x: grid.startX + 3 * grid.slotSize + 3 * grid.spacing + 100,
        y: grid.startY + grid.slotSize - 5
    };

    const button = {
        x: x + width - 150,
        y: y + height - 105,
        w: 120,
        h: 40
    };

    const buttonAll = {
        x: x + width - 150,
        y: y + height - 60,
        w: 120,
        h: 40
    };

    return { width, height, x, y, grid, result, button, buttonAll };
}

function getStackLimit(itemId) {
    return items[itemId]?.maxStack || 1;
}

function normalizeStack(item) {
    if (!item) return null;
    const count = item.count ?? 1;
    return { ...item, count };
}

function getSlotItem(slotRef) {
    if (slotRef.type === 'inventory') return game.player.inventory[slotRef.index];
    return game.craftingSlots[slotRef.row][slotRef.col];
}

function setSlotItem(slotRef, item) {
    if (slotRef.type === 'inventory') {
        game.player.inventory[slotRef.index] = item;
        return;
    }
    game.craftingSlots[slotRef.row][slotRef.col] = item;
}

function canStackTogether(a, b) {
    if (!a || !b) return false;
    if (a.id !== b.id) return false;
    return getStackLimit(a.id) > 1;
}

function pickUpFromSlot(slotRef, button) {
    const slotItemRaw = normalizeStack(getSlotItem(slotRef));
    if (!slotItemRaw) return false;

    const takeHalf = button === 2 && (slotItemRaw.count || 1) > 1;
    if (takeHalf) {
        const takeCount = Math.ceil(slotItemRaw.count / 2);
        const remaining = slotItemRaw.count - takeCount;
        setSlotItem(slotRef, remaining > 0 ? { ...slotItemRaw, count: remaining } : null);
        game.draggedItem = { ...slotItemRaw, count: takeCount };
    } else {
        setSlotItem(slotRef, null);
        game.draggedItem = { ...slotItemRaw };
    }

    game.draggedFromSlot = { ...slotRef };
    return true;
}

function placeIntoSlot(slotRef, button) {
    const cursorRaw = normalizeStack(game.draggedItem);
    if (!cursorRaw) return false;

    const existingRaw = normalizeStack(getSlotItem(slotRef));
    const cursor = cursorRaw;
    const existing = existingRaw;
    const maxStack = getStackLimit(cursor.id);

    // Right click: place 1 item (or add 1 to existing stack).
    if (button === 2) {
        if (!existing) {
            setSlotItem(slotRef, { ...cursor, count: 1 });
            cursor.count -= 1;
            game.draggedItem = cursor.count > 0 ? cursor : null;
            game.draggedFromSlot = null;
            return true;
        }

        if (canStackTogether(existing, cursor) && (existing.count || 1) < maxStack) {
            existing.count = (existing.count || 1) + 1;
            setSlotItem(slotRef, existing);
            cursor.count -= 1;
            game.draggedItem = cursor.count > 0 ? cursor : null;
            game.draggedFromSlot = null;
            return true;
        }

        return false;
    }

    // Left click: place whole stack / merge / swap.
    if (!existing) {
        setSlotItem(slotRef, cursor);
        game.draggedItem = null;
        game.draggedFromSlot = null;
        return true;
    }

    if (canStackTogether(existing, cursor) && (existing.count || 1) < maxStack) {
        const space = maxStack - (existing.count || 1);
        const moved = Math.min(space, cursor.count || 1);
        existing.count = (existing.count || 1) + moved;
        cursor.count = (cursor.count || 1) - moved;
        setSlotItem(slotRef, existing);
        game.draggedItem = cursor.count > 0 ? cursor : null;
        game.draggedFromSlot = null;
        return true;
    }

    // Swap (cursor keeps holding the old item).
    setSlotItem(slotRef, cursor);
    game.draggedItem = existing;
    game.draggedFromSlot = null;
    return true;
}

function returnDraggedToOrigin() {
    if (!game.draggedItem || !game.draggedFromSlot) return;

    const originItem = getSlotItem(game.draggedFromSlot);
    if (!originItem) {
        setSlotItem(game.draggedFromSlot, game.draggedItem);
        game.draggedItem = null;
        game.draggedFromSlot = null;
        return;
    }

    const cursor = normalizeStack(game.draggedItem);
    if (game.player.addItem(cursor)) {
        game.draggedItem = null;
        game.draggedFromSlot = null;
        return;
    }

    setSlotItem(game.draggedFromSlot, cursor);
    game.draggedItem = originItem;
    game.draggedFromSlot = null;
}

function canFitInInventory(itemId, count) {
    const maxStack = getStackLimit(itemId);
    if (maxStack <= 1) {
        const emptySlots = game.player.inventory.filter((s) => s === null).length;
        return emptySlots >= count;
    }

    let space = 0;
    for (const slot of game.player.inventory) {
        if (!slot) continue;
        if (slot.id !== itemId) continue;
        const slotCount = slot.count || 1;
        space += Math.max(0, maxStack - slotCount);
    }

    const emptySlots = game.player.inventory.filter((s) => s === null).length;
    space += emptySlots * maxStack;
    return space >= count;
}

// Old pattern-matching functions removed - now using simple ingredient matching!

// Start the game when page loads
window.addEventListener('load', init);

// Game.js - Main game loop and rendering

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Sprite loading - preload all character images
const sprites = {
    player: null,
    mentor: null,
    potionAssistant: null,
    loaded: false
};

let spritesLoaded = 0;
  const totalSprites = 3;

function loadSprites() {
    // Load player sprite
    sprites.player = new Image();
    sprites.player.src = 'maincharacter.png';
    sprites.player.onload = () => {
        spritesLoaded++;
        checkSpritesLoaded();
    };

    // Load mentor sprite
    sprites.mentor = new Image();
    sprites.mentor.src = 'mentor.png';
    sprites.mentor.onload = () => {
        spritesLoaded++;
        checkSpritesLoaded();
    };

    // Load potion guy sprite
    sprites.potionAssistant = new Image();
    sprites.potionAssistant.src = 'potionassisant.png';
    sprites.potionAssistant.onload = () => {
        spritesLoaded++;
        checkSpritesLoaded();
    };
}

function checkSpritesLoaded() {
      if (spritesLoaded >= totalSprites) {
        sprites.loaded = true;
        console.log('All sprites loaded!');
    }
}

// Item definitions
const items = {
    fire_essence: { name: 'Fire Essence', color: '#ff4500', icon: '🔥' },
    water_drop: { name: 'Water Drop', color: '#4169e1', icon: '💧' },
    earth_stone: { name: 'Earth Stone', color: '#8b4513', icon: '🪨' },
    air_feather: { name: 'Air Feather', color: '#87ceeb', icon: '🪶' },
    wand_basic: { name: 'Basic Wand', color: '#daa520', icon: '🪄' },
    potion_health: { name: 'Health Potion', color: '#dc143c', icon: '🧪' },
    crystal: { name: 'Crystal', color: '#9400d3', icon: '💎' }
};

// Crafting recipes
const recipes = [
    { result: 'wand_basic', ingredients: ['earth_stone', 'air_feather'], name: 'Basic Wand' },
    { result: 'potion_health', ingredients: ['water_drop', 'fire_essence'], name: 'Health Potion' }
];

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
    // Mouse/drag state
    mouseX: 0,
    mouseY: 0,
    draggedItem: null,
    draggedFromSlot: null,
    // Crafting slots
    craftingSlots: [null, null],  // 2 ingredient slots
    craftingResult: null
};

// Keyboard state
const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
      e: false,
    c: false
};

// NPC class
class NPC {
    constructor(x, y, name, dialogues, color = '#00ff00', spriteKey = null, itemGift = null) {
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 48;
        this.name = name;
        this.dialogues = dialogues;
        this.color = color;
        this.dialogueIndex = 0;
        this.interactionRange = 60;
        this.spriteKey = spriteKey;
        this.itemGift = itemGift;  // item to give player
          this.hasGivenItem = false;
    }

    draw(ctx) {
        // draw sprite if we have one
        if (this.spriteKey && sprites.loaded && sprites[this.spriteKey]) {
            ctx.drawImage(sprites[this.spriteKey], this.x, this.y, this.width, this.height);
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

    // Create NPCs
    createNPCs();

    // keyboard stuff
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // mouse stuff for crafting
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mousemove', handleMouseMove);

    requestAnimationFrame(gameLoop);
}

// Create all NPCs in the game
function createNPCs() {
    game.npcs.push(new NPC(200, 150, 'Elder Mage', [
        "Welcome, young apprentice! I am the Elder Mage of this realm.",
        "Take this Fire Essence - you'll need it for crafting.",
        "Press C to open crafting! Combine items to create new ones.",
        "Fire Essence + Water Drop = Health Potion!"
    ], '#8844ff', 'mentor', 'fire_essence'));

    game.npcs.push(new NPC(600, 400, 'Potion Master', [
        "Greetings, traveler! Here's a Water Drop for you.",
        "Combine Water and Fire to brew a Health Potion!",
        "Come back when you have some gold!",
        "Every adventurer needs good equipment."
    ], '#44ff44', 'potionAssistant', 'water_drop'));

    game.npcs.push(new NPC(400, 100, 'Mysterious Stranger', [
        "The shadows whisper secrets...",
        "Take this Earth Stone... you might need it.",
        "Sometimes the greatest power comes from balance.",
        "Seek the ancient temple in the Volcanic Peaks..."
    ], '#ff4444', null, 'earth_stone'));
}

// Keyboard handlers
function handleKeyDown(e) {
    const key = e.key.toLowerCase();
    if (key in keys) {
        if (key === 'e' && !keys.e) {
            handleInteraction();
        }
        if (key === 'c' && !keys.c) {
            toggleCrafting();
        }
        // TODO: re-add dash functionality later - removing for now since it's buggy
        // if (key === ' ' && !keys.space) {
        //     handleDash();
        // }
        keys[key] = true;
          e.preventDefault();
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
            const nextDialogue = game.currentNPC.getNextDialogue();
            showDialogue(game.currentNPC.name, nextDialogue);

            // Give item if NPC has one to give
            if (game.currentNPC.itemGift && !game.currentNPC.hasGivenItem) {
                const item = items[game.currentNPC.itemGift];
                if (item && game.player.addItem({...item, id: game.currentNPC.itemGift})) {
                      game.currentNPC.hasGivenItem = true;
                    console.log(`${game.currentNPC.name} gave you ${item.name}!`);
                }
            }

            if (game.currentNPC.dialogueIndex === 0) {
                hideDialogue();
            }
        }
    } else if (game.interactableNearby) {
        game.currentNPC = game.interactableNearby;
        const dialogue = game.currentNPC.getNextDialogue();
        showDialogue(game.currentNPC.name, dialogue);
    }
}

// Toggle crafting menu
function toggleCrafting() {
    game.craftingOpen = !game.craftingOpen;
    if (!game.craftingOpen) {
        // Return items to inventory if closing
        for (let i = 0; i < game.craftingSlots.length; i++) {
            if (game.craftingSlots[i]) {
                game.player.addItem(game.craftingSlots[i]);
                  game.craftingSlots[i] = null;
            }
        }
        game.craftingResult = null;
    }
    console.log(`Crafting ${game.craftingOpen ? 'opened' : 'closed'}`);
}

// Mouse handlers
function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    game.mouseX = e.clientX - rect.left;
    game.mouseY = e.clientY - rect.top;
}

function handleMouseDown(e) {
    if (!game.craftingOpen) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check hotbar slots
    const hotbarSlot = getHotbarSlotAt(mouseX, mouseY);
    if (hotbarSlot !== -1 && game.player.inventory[hotbarSlot]) {
        game.draggedItem = {...game.player.inventory[hotbarSlot]};
        game.draggedFromSlot = {type: 'inventory', index: hotbarSlot};
        game.player.inventory[hotbarSlot] = null;
        return;
    }

    // Check crafting slots
    const craftSlot = getCraftingSlotAt(mouseX, mouseY);
    if (craftSlot !== -1 && game.craftingSlots[craftSlot]) {
        game.draggedItem = game.craftingSlots[craftSlot];
          game.draggedFromSlot = {type: 'crafting', index: craftSlot};
        game.craftingSlots[craftSlot] = null;
        checkRecipe();
    }
}

function handleMouseUp(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check if clicking craft button
    if (game.craftingOpen && game.craftingResult && isCraftButtonClicked(mouseX, mouseY)) {
        craftItem();
        return;
    }

    if (!game.draggedItem) return;

    // Try to place in crafting slot
    const craftSlot = getCraftingSlotAt(mouseX, mouseY);
    if (craftSlot !== -1 && !game.craftingSlots[craftSlot]) {
        game.craftingSlots[craftSlot] = game.draggedItem;
        checkRecipe();
        game.draggedItem = null;
        game.draggedFromSlot = null;
        return;
    }

    // Try to place back in hotbar
    const hotbarSlot = getHotbarSlotAt(mouseX, mouseY);
    if (hotbarSlot !== -1) {
        const existing = game.player.inventory[hotbarSlot];
        game.player.inventory[hotbarSlot] = game.draggedItem;
        if (existing && game.draggedFromSlot) {
            // Swap
            if (game.draggedFromSlot.type === 'inventory') {
                game.player.inventory[game.draggedFromSlot.index] = existing;
            }
        }
        game.draggedItem = null;
        game.draggedFromSlot = null;
        return;
    }

    // Return to original slot if not placed
    if (game.draggedFromSlot) {
        if (game.draggedFromSlot.type === 'inventory') {
            game.player.inventory[game.draggedFromSlot.index] = game.draggedItem;
        } else {
            game.craftingSlots[game.draggedFromSlot.index] = game.draggedItem;
        }
    }
    game.draggedItem = null;
    game.draggedFromSlot = null;
}

// Check if craft button was clicked
function isCraftButtonClicked(mx, my) {
    const width = 500;
    const x = (canvas.width - width) / 2;
    const y = (canvas.height - 350) / 2;
    const slotSize = 60;
    const slotY = y + 80;

    const btnX = x + 360;
    const btnY = slotY + slotSize + 10;
    const btnW = slotSize;
    const btnH = 30;

    return mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH;
}

// Craft the item!
function craftItem() {
    if (!game.craftingResult) return;

    const resultItem = {...items[game.craftingResult], id: game.craftingResult};

    if (game.player.addItem(resultItem)) {
        console.log(`Crafted ${resultItem.name}!`);
        // Clear crafting slots
        game.craftingSlots = [null, null];
          game.craftingResult = null;
    }
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

    // bounds checking
    const maxX = canvas.width - game.player.width;
    const maxY = canvas.height - game.player.height;
    game.player.x = Math.max(0, Math.min(maxX, game.player.x));
      game.player.y = Math.max(0, Math.min(maxY, game.player.y));

    // check for nearby NPCs
    game.interactableNearby = null;
    for (const npc of game.npcs) {
        if (npc.canInteract(game.player)) {
            game.interactableNearby = npc;
            break;
        }
    }

    updateUI();
}

// Update UI elements - now drawn on canvas
function updateUI() {
    // UI is now drawn directly on canvas in drawUI()
}

// Draw everything
function draw() {
    // background - darker, more muted
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

    // NPCs
    for (const npc of game.npcs) {
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
}

// Draw all UI elements in one place
function drawUI() {
    // Only show hotbar
    drawInventoryUI();

    // Show crafting menu if open
    if (game.craftingOpen) {
        drawCraftingUI();
    }

    // Draw dragged item following cursor
    if (game.draggedItem) {
        ctx.font = '35px Arial';
        ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
        ctx.fillText(game.draggedItem.icon, game.mouseX, game.mouseY);
    }

    // Small controls hint bottom right
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(canvas.width - 180, canvas.height - 30, 170, 25);
    ctx.fillStyle = '#ccc';
    ctx.font = '11px monospace';
      ctx.textAlign = 'left';
    ctx.fillText('WASD-Move | E-Talk | C-Craft', canvas.width - 175, canvas.height - 12);
}

// Draw player character
function drawPlayer(ctx, player) {
    if (sprites.loaded && sprites.player) {
        ctx.save();

        // glow when dashing
        if (player.isDashing) {
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 15;
        }

        ctx.drawImage(sprites.player, player.x, player.y, player.width, player.height);

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

// Draw inventory hotbar (Minecraft style - CLEANER!)
function drawInventoryUI() {
    const slotSize = 45;
    const spacing = 3;
    const startX = (canvas.width - (slotSize + spacing) * 9) / 2;
    const startY = canvas.height - slotSize - 15;

    for (let i = 0; i < 9; i++) {
        const x = startX + i * (slotSize + spacing);
        const y = startY;

        // slot background
        ctx.fillStyle = 'rgba(30, 30, 30, 0.8)';
        ctx.fillRect(x, y, slotSize, slotSize);

        // selected slot highlight
        if (i === game.player.selectedSlot) {
            ctx.strokeStyle = '#ffcc00';
            ctx.lineWidth = 2;
              ctx.strokeRect(x - 1, y - 1, slotSize + 2, slotSize + 2);
        }

        // draw item in slot
        const item = game.player.inventory[i];
        if (item) {
            ctx.font = '28px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(item.icon, x + slotSize / 2, y + slotSize / 2);
        }
    }
}

// Draw crafting UI - DRAG AND DROP!
function drawCraftingUI() {
    const width = 500;
    const height = 350;
    const x = (canvas.width - width) / 2;
    const y = (canvas.height - height) / 2;

    // background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
    ctx.fillRect(x, y, width, height);

    // title
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Crafting Table', x + width / 2, y + 30);

    // Draw crafting slots (2 ingredient slots + arrow + result)
    const slotSize = 60;
    const slotY = y + 80;

    // Slot 1
    drawCraftingSlot(x + 80, slotY, slotSize, 0);

    // Plus sign
    ctx.fillStyle = '#fff';
    ctx.font = '30px monospace';
      ctx.textAlign = 'center';
    ctx.fillText('+', x + 180, slotY + 40);

    // Slot 2
    drawCraftingSlot(x + 220, slotY, slotSize, 1);

    // Arrow
    ctx.fillText('→', x + 320, slotY + 40);

    // Result slot
    if (game.craftingResult) {
        ctx.fillStyle = 'rgba(50, 150, 50, 0.3)';
        ctx.fillRect(x + 360, slotY, slotSize, slotSize);
        ctx.strokeStyle = '#4f4';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 360, slotY, slotSize, slotSize);

        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(items[game.craftingResult].icon, x + 360 + slotSize/2, slotY + slotSize/2);

        // Craft button
        ctx.fillStyle = '#4f4';
        ctx.fillRect(x + 360, slotY + slotSize + 10, slotSize, 30);
        ctx.fillStyle = '#000';
        ctx.font = '14px monospace';
        ctx.fillText('CRAFT', x + 360 + slotSize/2, slotY + slotSize + 27);
    }

    // Recipe book
    ctx.fillStyle = '#888';
    ctx.font = '14px monospace';
      ctx.textAlign = 'left';
    ctx.fillText('Recipe Book:', x + 20, y + 200);

    let offsetY = 220;
    for (const recipe of recipes) {
        ctx.fillStyle = '#aaa';
        ctx.font = '12px monospace';
        const ing = recipe.ingredients.map(id => items[id].icon).join(' + ');
        const result = items[recipe.result].icon;
        ctx.fillText(`${ing} = ${result} ${items[recipe.result].name}`, x + 20, y + offsetY);
        offsetY += 20;
    }

    // Instructions
    ctx.fillStyle = '#666';
    ctx.font = '11px monospace';
      ctx.textAlign = 'center';
    ctx.fillText('Drag items from hotbar to crafting slots', x + width/2, y + height - 30);
    ctx.fillText('Press C to close', x + width/2, y + height - 15);
}

// Draw a single crafting slot
function drawCraftingSlot(x, y, size, index) {
    ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, size, size);

    const item = game.craftingSlots[index];
    if (item) {
        ctx.font = '40px Arial';
          ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.icon, x + size/2, y + size/2);
    }
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

// Get which crafting slot is at mouse position
function getCraftingSlotAt(mx, my) {
    if (!game.craftingOpen) return -1;

    const width = 500;
    const x = (canvas.width - width) / 2;
    const y = (canvas.height - 350) / 2;
    const slotSize = 60;
    const slotY = y + 80;

    const slots = [
        {x: x + 80, y: slotY},
        {x: x + 220, y: slotY}
    ];

    for (let i = 0; i < slots.length; i++) {
        if (mx >= slots[i].x && mx <= slots[i].x + slotSize &&
            my >= slots[i].y && my <= slots[i].y + slotSize) {
            return i;
        }
    }
    return -1;
}

// Check if current ingredients match a recipe
function checkRecipe() {
    game.craftingResult = null;

    if (!game.craftingSlots[0] || !game.craftingSlots[1]) return;

    const ing1 = game.craftingSlots[0].id;
    const ing2 = game.craftingSlots[1].id;

    for (const recipe of recipes) {
        const recipeIngs = recipe.ingredients;
        if ((recipeIngs[0] === ing1 && recipeIngs[1] === ing2) ||
            (recipeIngs[0] === ing2 && recipeIngs[1] === ing1)) {
            game.craftingResult = recipe.result;
            console.log('Recipe matched!', items[recipe.result].name);
            return;
        }
    }
}

// Start the game when page loads
window.addEventListener('load', init);

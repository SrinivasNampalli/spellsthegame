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
    sprites.player = new Image();
    sprites.player.src = 'maincharacter.png';
    sprites.player.onload = () => {
        spritesLoaded++;
        checkSpritesLoaded();
    };

    sprites.mentor = new Image();
    sprites.mentor.src = 'mentor.png';
    sprites.mentor.onload = () => {
        spritesLoaded++;
        checkSpritesLoaded();
    };

    sprites.potionAssistant = new Image();
    sprites.potionAssistant.src = 'potionassisant.png';  // keeping original filename
    sprites.potionAssistant.onload = () => {
        spritesLoaded++;
        checkSpritesLoaded();
    };
}

function checkSpritesLoaded() {
    if (spritesLoaded >= totalSprites) {
        sprites.loaded = true;
        console.log('All sprites loaded successfully!');
    }
}

// Game state
const game = {
    lastTime: 0,
    player: null,
    npcs: [],
    interactableNearby: null,
    dialogueActive: false,
    currentDialogueIndex: 0,
    currentNPC: null
};

// Keyboard state
const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    space: false,
    e: false
};

// NPC class
class NPC {
    constructor(x, y, name, dialogues, color = '#00ff00', spriteKey = null) {
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 48;  // taller for sprite proportions
        this.name = name;
        this.dialogues = dialogues;
        this.color = color;
        this.dialogueIndex = 0;
        this.interactionRange = 60;
        this.spriteKey = spriteKey;  // reference to sprite in sprites object
    }

    draw(ctx) {
        // Try to draw sprite first, fallback to colored rectangle
        if (this.spriteKey && sprites.loaded && sprites[this.spriteKey]) {
            // Draw the actual sprite image
            ctx.drawImage(sprites[this.spriteKey], this.x, this.y, this.width, this.height);
        } else {
            // Fallback: Draw NPC as simple colored rectangle
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);

            // Draw simple face
            ctx.fillStyle = '#000';
            ctx.fillRect(this.x + 8, this.y + 10, 6, 6); // left eye
            ctx.fillRect(this.x + 18, this.y + 10, 6, 6); // right eye
            ctx.fillRect(this.x + 10, this.y + 22, 12, 3); // mouth
        }

        // Draw name tag
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(this.x - 10, this.y - 20, this.width + 20, 16);
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
    // Load sprites first!
    loadSprites();

    game.player = new Player(canvas.width / 2, canvas.height / 2);

    // Create NPCs with sprite references
    game.npcs.push(new NPC(200, 150, 'Elder Mage', [
        "Welcome, young apprentice! I am the Elder Mage of this realm.",
        "You must master the elements to succeed in your quest.",
        "Fire, Water, Earth, and Air - these are your tools.",
        "Combine them wisely, and great power shall be yours!"
    ], '#8844ff', 'mentor'));  // using mentor sprite

    game.npcs.push(new NPC(600, 400, 'Potion Master', [
        "Greetings, traveler! Care to browse my wares?",
        "I sell potions, wands, and spell ingredients.",
        "Come back when you have some gold!",
        "Every adventurer needs good equipment."
    ], '#44ff44', 'potionAssistant'));  // using potion assistant sprite

    game.npcs.push(new NPC(400, 100, 'Mysterious Stranger', [
        "The shadows whisper secrets...",
        "Dark magic is not always evil, young one.",
        "Sometimes the greatest power comes from balance.",
        "Seek the ancient temple in the Volcanic Peaks..."
    ], '#ff4444'));  // no sprite for this one yet - will use colored rect

    // Set up keyboard listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Start game loop
    requestAnimationFrame(gameLoop);
}

// Keyboard handlers
function handleKeyDown(e) {
    const key = e.key.toLowerCase();
    if (key in keys) {
        if (key === 'e' && !keys.e) {
            handleInteraction();
        }
        if (key === ' ' && !keys.space) {
            handleDash();
        }
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

// Handle dash
function handleDash() {
    if (game.dialogueActive) return;

    let dirX = 0;
    let dirY = 0;

    if (keys.w) dirY -= 1;
    if (keys.s) dirY += 1;
    if (keys.a) dirX -= 1;
    if (keys.d) dirX += 1;

    if (dirX !== 0 || dirY !== 0) {
        game.player.dash(dirX, dirY);
    }
}

// Handle interaction with NPCs
function handleInteraction() {
    if (game.dialogueActive) {
        // Continue dialogue
        if (game.currentNPC) {
            const nextDialogue = game.currentNPC.getNextDialogue();
            showDialogue(game.currentNPC.name, nextDialogue);
            if (game.currentNPC.dialogueIndex === 0) {
                // Looped back to start, close dialogue
                hideDialogue();
            }
        }
    } else if (game.interactableNearby) {
        // Start dialogue
        game.currentNPC = game.interactableNearby;
        const dialogue = game.currentNPC.getNextDialogue();
        showDialogue(game.currentNPC.name, dialogue);
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
        // Don't update player movement during dialogue
        return;
    }

    // Update player velocity based on input
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
        moveX *= 0.707;
        moveY *= 0.707;
    }

    game.player.setVelocity(moveX, moveY);
    game.player.update(deltaTime);

    // Keep player in bounds
    game.player.x = Math.max(0, Math.min(canvas.width - game.player.width, game.player.x));
    game.player.y = Math.max(0, Math.min(canvas.height - game.player.height, game.player.y));

    // Check for nearby interactables
    game.interactableNearby = null;
    for (const npc of game.npcs) {
        if (npc.canInteract(game.player)) {
            game.interactableNearby = npc;
            break;
        }
    }

    // Update UI
    updateUI();
}

// Update UI elements
function updateUI() {
    const player = game.player;

    // Health bar
    const healthPercent = (player.health / player.maxHealth) * 100;
    document.getElementById('health-fill').style.width = healthPercent + '%';
    document.getElementById('health-text').textContent = `${Math.ceil(player.health)}/${player.maxHealth}`;

    // Mana bar
    const manaPercent = (player.mana / player.maxMana) * 100;
    document.getElementById('mana-fill').style.width = manaPercent + '%';
    document.getElementById('mana-text').textContent = `${Math.ceil(player.mana)}/${player.maxMana}`;

    // Level and XP
    document.getElementById('level').textContent = player.level;
    document.getElementById('xp').textContent = `${player.experience}/${player.experienceToNextLevel}`;
}

// Draw everything
function draw() {
    // Clear canvas
    ctx.fillStyle = '#2d4a2e'; // Grass-like background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw simple ground tiles
    ctx.fillStyle = '#3a5c3c';
    for (let x = 0; x < canvas.width; x += 32) {
        for (let y = 0; y < canvas.height; y += 32) {
            if ((x / 32 + y / 32) % 2 === 0) {
                ctx.fillRect(x, y, 32, 32);
            }
        }
    }

    // Draw NPCs
    for (const npc of game.npcs) {
        npc.draw(ctx);

        // Draw interaction indicator
        if (game.interactableNearby === npc && !game.dialogueActive) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Press E', npc.x + npc.width / 2, npc.y - 25);
        }
    }

    // Draw player
    drawPlayer(ctx, game.player);
}

// Draw player character
function drawPlayer(ctx, player) {
    // Draw sprite if available, otherwise fallback to rectangles
    if (sprites.loaded && sprites.player) {
        // Save context for potential transformations
        ctx.save();

        // Apply a glow effect when dashing
        if (player.isDashing) {
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 15;
        }

        // Draw the player sprite
        ctx.drawImage(sprites.player, player.x, player.y, player.width, player.height);

        ctx.restore();
    } else {
        // Fallback: Player color (changes when dashing)
        const playerColor = player.isDashing ? '#00ffff' : '#4488ff';

        // Main body
        ctx.fillStyle = playerColor;
        ctx.fillRect(player.x, player.y, player.width, player.height);

        // Draw simple face based on facing direction
        ctx.fillStyle = '#000';

        if (player.facing === 'down' || player.facing === 'up') {
            // Eyes
            ctx.fillRect(player.x + 8, player.y + 10, 6, 6);
            ctx.fillRect(player.x + 18, player.y + 10, 6, 6);
        } else if (player.facing === 'left') {
            // Looking left
            ctx.fillRect(player.x + 6, player.y + 12, 8, 8);
        } else if (player.facing === 'right') {
            // Looking right
            ctx.fillRect(player.x + 18, player.y + 12, 8, 8);
        }
    }

    // Draw invulnerability effect
    if (player.isInvulnerable) {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(player.x - 2, player.y - 2, player.width + 4, player.height + 4);
    }

    // Draw dash cooldown indicator
    if (!player.canDash) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(player.x, player.y - 5, player.width, 3);
        const cooldownProgress = (Date.now() - player.lastDashTime) / player.dashCooldown;
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(player.x, player.y - 5, player.width * cooldownProgress, 3);
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

// Start the game when page loads
window.addEventListener('load', init);

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
        this.height = 48;
        this.name = name;
        this.dialogues = dialogues;
        this.color = color;
        this.dialogueIndex = 0;
        this.interactionRange = 60;
        this.spriteKey = spriteKey;
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

        // name tag
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
    loadSprites();

    game.player = new Player(canvas.width / 2, canvas.height / 2);

    // Create NPCs
    game.npcs.push(new NPC(200, 150, 'Elder Mage', [
        "Welcome, young apprentice! I am the Elder Mage of this realm.",
        "You must master the elements to succeed in your quest.",
        "Fire, Water, Earth, and Air - these are your tools.",
        "Combine them wisely, and great power shall be yours!"
    ], '#8844ff', 'mentor'));

    game.npcs.push(new NPC(600, 400, 'Potion Master', [
        "Greetings, traveler! Care to browse my wares?",
        "I sell potions, wands, and spell ingredients.",
        "Come back when you have some gold!",
        "Every adventurer needs good equipment."
    ], '#44ff44', 'potionAssistant'));

    game.npcs.push(new NPC(400, 100, 'Mysterious Stranger', [
        "The shadows whisper secrets...",
        "Dark magic is not always evil, young one.",
        "Sometimes the greatest power comes from balance.",
        "Seek the ancient temple in the Volcanic Peaks..."
    ], '#ff4444'));

    // keyboard stuff
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

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

    // only dash if moving
    if (dirX !== 0 || dirY !== 0) {
        game.player.dash(dirX, dirY);
    }
}

// Handle interaction with NPCs
function handleInteraction() {
    if (game.dialogueActive) {
        if (game.currentNPC) {
            const nextDialogue = game.currentNPC.getNextDialogue();
            showDialogue(game.currentNPC.name, nextDialogue);
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

// Update UI elements
function updateUI() {
    const player = game.player;

    // Health bar
    const healthPercent = (player.health / player.maxHealth) * 100;
    const healthFill = document.getElementById('health-fill');
    const healthText = document.getElementById('health-text');
    healthFill.style.width = healthPercent + '%';
      healthText.textContent = `${Math.ceil(player.health)}/${player.maxHealth}`;

    // Mana bar
    const manaPercent = (player.mana / player.maxMana) * 100;
    const manaFill = document.getElementById('mana-fill');
      const manaText = document.getElementById('mana-text');
    manaFill.style.width = manaPercent + '%';
    manaText.textContent = `${Math.ceil(player.mana)}/${player.maxMana}`;

    // Level and XP
    document.getElementById('level').textContent = player.level;
    document.getElementById('xp').textContent = `${player.experience}/${player.experienceToNextLevel}`;
}

// Draw everything
function draw() {
    // background
    ctx.fillStyle = '#2d4a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ground tiles
    ctx.fillStyle = '#3a5c3c';
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

    // dash cooldown bar
    if (!player.canDash) {
        const barY = player.y - 5;
        const barWidth = player.width;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(player.x, barY, barWidth, 3);
        const cooldownProgress = (Date.now() - player.lastDashTime) / player.dashCooldown;
          const progressWidth = barWidth * cooldownProgress;
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(player.x, barY, progressWidth, 3);
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

// Player.js - Core player character class for Spells the Adventure

class Player {
    constructor(x, y) {
        // Position and movement
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 32;
        this.speed = 200; // pixels per second
        this.velocityX = 0;
        this.velocityY = 0;

        // Dash/dodge mechanics
        this.dashSpeed = 400;
        this.dashDuration = 200; // milliseconds
        this.dashCooldown = 1000;
        this.isDashing = false;
        this.dashTimer = 0;
        this.lastDashTime = 0;

        // Stats
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.maxMana = 100;
        this.mana = this.maxMana;
        this.manaRegen = 10; // per second

        // Level and experience
        this.level = 1;
        this.experience = 0;
        this.experienceToNextLevel = 100;

        // Combat
        this.damage = 10;
        this.defense = 5;
        this.isInvulnerable = false;
        this.invulnerabilityDuration = 1000;
        this.invulnerabilityTimer = 0;

        // Spell system
        this.equippedSpells = [null, null, null, null]; // 4 spell slots
        this.spellCooldowns = [0, 0, 0, 0];
        this.unlockedElements = ['fire', 'water', 'earth', 'air', 'light', 'dark'];

        // Equipment
        this.equipment = {
            wand: null,
            robe: null,
            amulet: null
        };

        // Inventory
        this.inventory = [];
        this.gold = 0;

        // Animation
        this.facing = 'down'; // down, up, left, right
        this.isMoving = false;
        this.animationFrame = 0;
        this.animationTimer = 0;
        this.animationSpeed = 100; // milliseconds per frame

        // Status effects
        this.statusEffects = [];

        // Interaction
        this.interactionRange = 50;
    }
}
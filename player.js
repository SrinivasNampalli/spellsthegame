// Player.js - Core player character class for Spells the Adventure

class Player {
    constructor(x, y) {
        // Position and movement
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 48;  // match sprite height
        this.speed = 200; // pixels per second
        this.velocityX = 0;
        this.velocityY = 0;

        // Dash/dodge mechanics
        this.dashSpeed = 450;
        this.dashDuration = 180; // milliseconds
        this.dashCooldown = 800;
        this.isDashing = false;
        this.canDash = true;
        this.dashTimer = 0;
        this.lastDashTime = 0;
        this.dashDirection = { x: 0, y: 0 };

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
        this.unlockedElements = ['fire', 'water', 'earth', 'air'];
        this.spellComboMultiplier = 1.0;
        this.lastSpellCast = null;
        this.comboTimer = 0;

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

    // TODO: Implement update method for player state
    update(deltaTime) {
        const dt = deltaTime / 1000; // Convert to seconds

        // Update dash timer
        if (this.isDashing) {
            this.dashTimer += deltaTime;
            if (this.dashTimer >= this.dashDuration) {
                this.isDashing = false;
                this.dashTimer = 0;
            }
            // Apply dash velocity
            this.x += this.dashDirection.x * this.dashSpeed * dt;
                this.y += this.dashDirection.y * this.dashSpeed * dt;  // weird indent but it works lol
        } else {
            // Normal movement
              this.x += this.velocityX * dt;
            this.y += this.velocityY * dt;
        }

        // Update dash cooldown
        if (!this.canDash && Date.now() - this.lastDashTime >= this.dashCooldown) {
            this.canDash = true;
        }

        // Mana regeneration
        if (this.mana < this.maxMana) {
            this.mana = Math.min(this.maxMana, this.mana + this.manaRegen * dt);
        }

        // Update invulnerability timer
        if (this.isInvulnerable) {
            this.invulnerabilityTimer += deltaTime;
            if (this.invulnerabilityTimer >= this.invulnerabilityDuration) {
                this.isInvulnerable = false;
                this.invulnerabilityTimer = 0;
            }
        }

        // Update spell cooldowns
        for (let i = 0; i < this.spellCooldowns.length; i++) {
            if (this.spellCooldowns[i] > 0) {
                this.spellCooldowns[i] -= deltaTime;
            }
        }

        // Update combo timer
        if (this.comboTimer > 0) {
            this.comboTimer -= deltaTime;
            if (this.comboTimer <= 0) {
                this.spellComboMultiplier = 1.0;
                this.lastSpellCast = null;
            }
        }

        // TODO: Update status effects
        // TODO: Update animation state
    }

    // Dash ability - needs collision detection
    dash(directionX, directionY) {
        if (!this.canDash || this.isDashing) return false;

        // Normalize direction
        const magnitude = Math.sqrt(directionX * directionX + directionY * directionY);
        if (magnitude === 0) return false;

        this.dashDirection.x = directionX / magnitude;
        this.dashDirection.y = directionY / magnitude;

        this.isDashing = true;
        this.canDash = false;
        this.lastDashTime = Date.now();

        return true;
    }

    // Cast spell from equipped slot
    castSpell(slotIndex) {
        if (slotIndex < 0 || slotIndex >= this.equippedSpells.length) {
            return null;
        }

        const spell = this.equippedSpells[slotIndex];
        if (!spell) return null;

        // Check cooldown
        if (this.spellCooldowns[slotIndex] > 0) {
            console.log(`Spell on cooldown: ${this.spellCooldowns[slotIndex]}ms remaining`);
            return null;
        }

        // TODO: Check mana cost
        // if (this.mana < spell.manaCost) {
        //     return null;
        // }

        // Apply combo multiplier logic
        if (this.lastSpellCast && this.lastSpellCast !== spell.element) {
            this.spellComboMultiplier = Math.min(2.0, this.spellComboMultiplier + 0.25);
        }

        this.lastSpellCast = spell.element;
        this.comboTimer = 3000; // 3 second window for combos

        // TODO: Deduct mana
        // this.mana -= spell.manaCost;

        // Set cooldown
        // this.spellCooldowns[slotIndex] = spell.cooldown;

        // TODO: Return spell projectile/effect
        return null;
    }

    // Take damage
    takeDamage(amount) {
        if (this.isInvulnerable) return false;

        const actualDamage = Math.max(1, amount - this.defense);
        this.health -= actualDamage;

        if (this.health <= 0) {
            this.health = 0;
            this.onDeath();
            return true;
        }

        this.isInvulnerable = true;
        this.invulnerabilityTimer = 0;
        return false;
    }

    // Heal player
    heal(amount) {
        const oldHealth = this.health;
        this.health = Math.min(this.maxHealth, this.health + amount);
        return this.health - oldHealth;
    }

    // Add experience
    addExperience(xp) {
        this.experience += xp;

        // Check for level up
        while (this.experience >= this.experienceToNextLevel) {
            this.levelUp();
        }
    }

    // Level up
    levelUp() {
        this.level++;
        this.experience -= this.experienceToNextLevel;
        this.experienceToNextLevel = Math.floor(this.experienceToNextLevel * 1.5);

        // Increase stats
        this.maxHealth += 10;
        this.health = this.maxHealth;
        this.maxMana += 10;
        this.mana = this.maxMana;
        this.damage += 2;
        this.defense += 1;

        console.log(`Level up! Now level ${this.level}`);
        // TODO: Trigger level up UI/effects
    }

    // Movement methods
    setVelocity(x, y) {
        this.velocityX = x * this.speed;
        this.velocityY = y * this.speed;

        // Update facing direction
        // note: might wanna make this smoother later? idk feels kinda choppy
        if (x > 0) this.facing = 'right';
        else if (x < 0) this.facing = 'left';
        else if (y > 0) this.facing = 'down';
        else if (y < 0) this.facing = 'up';

        this.isMoving = (x !== 0 || y !== 0);
    }

    // Death handler
    onDeath() {
        console.log('Player died!');
        // TODO: Implement death logic
        // - Drop items?
        // - Respawn at checkpoint?
        // - Game over screen?
    }

    // Equip spell to slot
    equipSpell(spell, slotIndex) {
        if (slotIndex >= 0 && slotIndex < this.equippedSpells.length) {
            this.equippedSpells[slotIndex] = spell;
            return true;
        }
        return false;
    }

    // TODO: Draw method for rendering
    // draw(ctx) { }
}
// Player.js - Core player character class for Spells the Adventure

export class Player {
    constructor(x, y) {
        // Position and movement
        this.x = x;
        this.y = y;
        this.width = 48;  // Increased from 32
        this.height = 72;  // Increased from 48 (1.5x larger)
        this.speed = 250; // pixels per second (slightly faster for larger size)
        this.velocityX = 0;
        this.velocityY = 0;

        // Dash/dodge mechanics - DISABLED for now (buggy collision detection)
        // TODO: fix dash mechanics and re-enable
        // this.dashSpeed = 450;
        // this.dashDuration = 180;
        // this.dashCooldown = 800;
        this.isDashing = false;
        // this.canDash = true;
        // this.dashTimer = 0;
        // this.lastDashTime = 0;
        // this.dashDirection = { x: 0, y: 0 };

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
        this.equippedSpells = [null, null, null, null];
        this.spellCooldowns = [0, 0, 0, 0];

        // Equipment
        this.equipment = {
            wand: null,
            robe: null,
            amulet: null
        };

        // Inventory - hotbar style (9 slots)
        this.inventory = new Array(9).fill(null);
        this.selectedSlot = 0;
        this.gold = 0;

        // Animation
        this.facing = 'down';
        this.isMoving = false;
        this.animTime = 0;

        // Interaction
        this.interactionRange = 50;
    }

    update(deltaTime) {
        const dt = deltaTime / 1000;

        // Apply movement with smooth interpolation
        this.x += this.velocityX * dt;
        this.y += this.velocityY * dt;

        // Update animation state
        this.animTime += dt * (this.isMoving ? 1 : 0.5);

        // Passive mana regeneration
        if (this.mana < this.maxMana) {
            this.mana = Math.min(this.maxMana, this.mana + this.manaRegen * dt);
        }

        // Damage immunity frames
        if (this.isInvulnerable) {
            this.invulnerabilityTimer += deltaTime;
            if (this.invulnerabilityTimer >= this.invulnerabilityDuration) {
                this.isInvulnerable = false;
                this.invulnerabilityTimer = 0;
            }
        }

        // Active spell cooldown tracking
        for (let i = 0; i < this.spellCooldowns.length; i++) {
            if (this.spellCooldowns[i] > 0) {
                this.spellCooldowns[i] = Math.max(0, this.spellCooldowns[i] - deltaTime);
            }
        }
    }

    // Dash ability - COMMENTED OUT (needs fixing)
    // dash(directionX, directionY) {
    //     if (!this.canDash || this.isDashing) return false;

    //     const magnitude = Math.sqrt(directionX * directionX + directionY * directionY);
    //     if (magnitude === 0) return false;

    //     this.dashDirection.x = directionX / magnitude;
    //     this.dashDirection.y = directionY / magnitude;

    //     this.isDashing = true;
    //     this.canDash = false;
    //     this.lastDashTime = Date.now();

    //     return true;
    // }

    // Cast spell from equipped slot
    castSpell(slotIndex) {
        if (slotIndex < 0 || slotIndex >= this.equippedSpells.length) {
            return null;
        }

        const spell = this.equippedSpells[slotIndex];
        if (!spell) return null;

        if (this.spellCooldowns[slotIndex] > 0) {
            return null;
        }

        // TODO: actually cast the spell lol
        return null;
    }

    // Process incoming damage with defense calculation
    takeDamage(amount) {
        if (this.isInvulnerable) return false;

        const actualDamage = Math.max(1, Math.floor(amount - this.defense));
        this.health = Math.max(0, this.health - actualDamage);

        if (this.health <= 0) {
            this.onDeath();
            return true;
        }

        // Trigger immunity frames
        this.isInvulnerable = true;
        this.invulnerabilityTimer = 0;
        return false;
    }

    // Restore health with overflow protection
    heal(amount) {
        const oldHealth = this.health;
        this.health = Math.min(this.maxHealth, this.health + Math.floor(amount));
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
        const gain = { hp: 10, mana: 10, damage: 2, defense: 1 };

        this.level++;
        this.experience -= this.experienceToNextLevel;
        this.experienceToNextLevel = Math.floor(this.experienceToNextLevel * 1.5);

        // Increase stats
        this.maxHealth += gain.hp;
        this.health = this.maxHealth;
          this.maxMana += gain.mana;
        this.mana = this.maxMana;
        this.damage += gain.damage;
        this.defense += gain.defense;

        console.log(`Level up! Now level ${this.level}`);
        try {
            if (typeof window !== 'undefined' && window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('player-level-up', { detail: { level: this.level, gain } }));
            }
        } catch (_) {
            // ignore
        }
    }

    // Movement methods
    setVelocity(x, y) {
        this.velocityX = x * this.speed;
          this.velocityY = y * this.speed;

        // Update facing direction
        // note: might wanna make this smoother later? idk feels kinda choppy
        const ax = Math.abs(x);
        const ay = Math.abs(y);
        if (ay >= ax) {
            if (y > 0) this.facing = 'down';
            else if (y < 0) this.facing = 'up';
            else if (x > 0) this.facing = 'right';
            else if (x < 0) this.facing = 'left';
        } else {
            if (x > 0) this.facing = 'right';
            else if (x < 0) this.facing = 'left';
            else if (y > 0) this.facing = 'down';
            else if (y < 0) this.facing = 'up';
        }

        this.isMoving = (x !== 0 || y !== 0);
    }

    // Death handler
    onDeath() {
        console.log('Player died!');
        // TODO: death screen, respawn, etc
    }

    // Equip spell to slot
    equipSpell(spell, slotIndex) {
        if (slotIndex >= 0 && slotIndex < this.equippedSpells.length) {
            this.equippedSpells[slotIndex] = spell;
            return true;
        }
        return false;
    }

    // Add item to inventory (with stacking support)
    addItem(item) {
        const maxStack = item.maxStack || 1;
        const itemCount = item.count || 1;

        // First, try to stack with existing items
        if (maxStack > 1) {
            for (let i = 0; i < this.inventory.length; i++) {
                const slotItem = this.inventory[i];
                if (slotItem && slotItem.id === item.id) {
                    const currentCount = slotItem.count || 1;
                    const spaceLeft = maxStack - currentCount;

                    if (spaceLeft > 0) {
                        const amountToAdd = Math.min(spaceLeft, itemCount);
                        slotItem.count = currentCount + amountToAdd;

                        if (amountToAdd >= itemCount) {
                            console.log(`Stacked ${item.name} (now ${slotItem.count})`);
                            return true;
                        } else {
                            // Partially stacked, continue with remaining
                            item.count = itemCount - amountToAdd;
                        }
                    }
                }
            }
        }

        // If not fully stacked, find an empty slot
        for (let i = 0; i < this.inventory.length; i++) {
            if (this.inventory[i] === null) {
                this.inventory[i] = {...item, count: item.count || 1};
                console.log(`Added ${item.name} to inventory slot ${i}`);
                return true;
            }
        }

        console.log('Inventory full!');
        return false;
    }

    // Remove item from slot
    removeItem(slotIndex) {
        if (slotIndex >= 0 && slotIndex < this.inventory.length) {
            const item = this.inventory[slotIndex];
            this.inventory[slotIndex] = null;
              return item;
        }
        return null;
    }
}

// Optional global for debugging in console
try {
    window.Player = Player;
} catch (_) {
    // ignore
}

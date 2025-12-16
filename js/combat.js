import { canvas, game } from './context.js';
import { clamp } from './utils.js';
import { spawnParticle } from './particles.js';
import { saveGameState } from './persistence.js';
import { sprites, drawSprite } from './assets.js';
import { items } from './data.js';
import { showToast } from './ui.js';

export function addScreenShake(ms, strength) {
  game.shakeMs = Math.max(game.shakeMs, ms);
  game.shakeStrength = Math.max(game.shakeStrength, strength);
}

export function updateScreenShake(deltaTime) {
  if (game.shakeMs <= 0 || game.shakeStrength <= 0) {
    game.shakeMs = Math.max(0, game.shakeMs || 0);
    game.shakeStrength = Math.max(0, game.shakeStrength || 0);
    game.shakeX = 0;
    game.shakeY = 0;
    return;
  }

  game.shakeMs = Math.max(0, game.shakeMs - deltaTime);
  if (game.shakeMs <= 0) {
    game.shakeStrength = 0;
    game.shakeX = 0;
    game.shakeY = 0;
    return;
  }

  game.shakeX = (Math.random() - 0.5) * game.shakeStrength;
  game.shakeY = (Math.random() - 0.5) * game.shakeStrength;
}

export function getShakeOffset() {
  return { x: game.shakeX || 0, y: game.shakeY || 0 };
}

function dropLoot(enemy) {
  const loot = enemy?.loot;
  if (!Array.isArray(loot) || loot.length === 0) return;

  for (const drop of loot) {
    if (!drop?.id) continue;

    const def = items[drop.id];
    if (!def) continue;

    const chance = typeof drop.chance === 'number' ? drop.chance : 1;
    if (Math.random() > chance) continue;

    const count = Math.max(1, drop.count ?? 1);
    game.droppedItems.push({
      x: enemy.x + enemy.width / 2 - 10 + (Math.random() - 0.5) * 10,
      y: enemy.y + enemy.height / 2 - 10 + (Math.random() - 0.5) * 10,
      width: 20,
      height: 20,
      item: { ...def, id: drop.id, count },
    });
  }
}

export function spawnDamageNumber(x, y, text, color = '#fff') {
  game.damageNumbers.push({
    x,
    y,
    text: String(text),
    color,
    vy: -35,
    lifeMs: 900,
    maxLifeMs: 900,
  });
}

export function updateDamageNumbers(deltaTime) {
  const dt = deltaTime / 1000;

  for (let i = game.damageNumbers.length - 1; i >= 0; i--) {
    const n = game.damageNumbers[i];
    n.lifeMs -= deltaTime;

    if (n.lifeMs <= 0) {
      game.damageNumbers.splice(i, 1);
      continue;
    }

    n.y += n.vy * dt;
    n.vy -= 20 * dt;
  }
}

export function drawDamageNumbers(ctx) {
  for (const n of game.damageNumbers) {
    const a = Math.max(0, Math.min(1, n.lifeMs / n.maxLifeMs));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.lineWidth = 4;
    ctx.strokeText(n.text, n.x, n.y);
    ctx.fillStyle = n.color;
    ctx.fillText(n.text, n.x, n.y);
    ctx.restore();
  }
}

export class Enemy {
  constructor(x, y, biome = 'mysticalLibrary') {
    this.x = x;
    this.y = y;
    this.width = 42;
    this.height = 42;
    this.biome = biome;
    this.anchor = null;

    this.maxHealth = 60;
    this.health = this.maxHealth;
    this.speed = 95;

    this.vx = 0;
    this.vy = 0;
    this.wanderTimerMs = 0;
    this.wanderTargetMs = 900 + Math.random() * 900;

    this.attackCooldownMs = 700 + Math.random() * 500;
    this.attackTimerMs = 0;

    this.isDead = false;
  }

  takeDamage(amount) {
    if (this.isDead) return;
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) this.isDead = true;
  }

  update(deltaTime) {
    if (this.isDead) return;

    this.wanderTimerMs += deltaTime;
    if (this.wanderTimerMs >= this.wanderTargetMs) {
      this.wanderTimerMs = 0;
      this.wanderTargetMs = 800 + Math.random() * 900;
      const angle = Math.random() * Math.PI * 2;
      this.vx = Math.cos(angle) * this.speed;
      this.vy = Math.sin(angle) * this.speed;
    }

    const dt = deltaTime / 1000;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const margin = 25;
    this.x = clamp(this.x, margin, canvas.width - this.width - margin);
    this.y = clamp(this.y, margin, canvas.height - this.height - margin);

    // Shoot arcane bolts at player
    this.attackTimerMs += deltaTime;
    if (this.attackTimerMs >= this.attackCooldownMs) {
      this.attackTimerMs = 0;
      this.attackCooldownMs = 950 + Math.random() * 650;
      this.shootAtPlayer();
    }
  }

  shootAtPlayer() {
    if ((this.biome || 'home') !== game.currentBiome) return;
    if (game.player.health <= 0) return;

    const px = game.player.x + game.player.width / 2;
    const py = game.player.y + game.player.height / 2;
    const sx = this.x + this.width / 2;
    const sy = this.y + this.height / 2;
    const dx = px - sx;
    const dy = py - sy;
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const nx = dx / dist;
    const ny = dy / dist;
    const spread = (Math.random() - 0.5) * 0.16;
    const cos = Math.cos(spread);
    const sin = Math.sin(spread);
    const rx = nx * cos - ny * sin;
    const ry = nx * sin + ny * cos;

    const speed = 260;
    game.projectiles.push({
      type: 'enemy_bolt',
      owner: 'enemy',
      damage: 12,
      x: sx,
      y: sy,
      vx: rx * speed,
      vy: ry * speed,
      age: 0,
      lifetime: 3200,
      size: 12,
      color: '#a67cff',
      icon: '💜',
    });

    spawnParticle({ x: sx, y: sy, vx: (Math.random() - 0.5) * 40, vy: -50, size: 3, color: '#a67cff', lifeMs: 450 });
  }

  draw(ctx) {
    if (this.isDead) return;

    ctx.save();
    ctx.shadowColor = 'rgba(170, 110, 255, 0.7)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = 'rgba(140, 90, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#0b0020';
    ctx.beginPath();
    ctx.arc(this.x + this.width / 2 + 6, this.y + this.height / 2 - 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Health bar
    const barW = 52;
    const barH = 6;
    const bx = this.x + this.width / 2 - barW / 2;
    const by = this.y - 10;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx, by, barW, barH);
    const hp01 = this.maxHealth > 0 ? this.health / this.maxHealth : 0;
    ctx.fillStyle = hp01 < 0.3 ? '#ff4444' : '#44ff44';
    ctx.fillRect(bx, by, barW * hp01, barH);
    ctx.restore();
  }
}

// Training Droid - follows player, low HP, for tutorial
export class TrainingDroid extends Enemy {
  constructor(x, y) {
    super(x, y, 'mysticalLibrary');
    this.maxHealth = 30;
    this.health = this.maxHealth;
    this.speed = 70;
    this.width = 36;
    this.height = 36;
    this.followRange = 9999; // Always follows
    this.attackCooldownMs = 1800;
  }

  update(deltaTime) {
    if (this.isDead) return;

    // Follow player
    const px = game.player.x + game.player.width / 2;
    const py = game.player.y + game.player.height / 2;
    const dx = px - (this.x + this.width / 2);
    const dy = py - (this.y + this.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 50) {
      this.vx = (dx / dist) * this.speed;
      this.vy = (dy / dist) * this.speed;
    } else {
      this.vx *= 0.9;
      this.vy *= 0.9;
    }

    const dt = deltaTime / 1000;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const margin = 25;
    this.x = clamp(this.x, margin, canvas.width - this.width - margin);
    this.y = clamp(this.y, margin, canvas.height - this.height - margin);

    // Attack player
    this.attackTimerMs += deltaTime;
    if (this.attackTimerMs >= this.attackCooldownMs && dist < 300) {
      this.attackTimerMs = 0;
      this.shootAtPlayer();
    }
  }

  draw(ctx) {
    if (this.isDead) return;

    // Draw as red robot
    ctx.save();
    ctx.shadowColor = 'rgba(255, 80, 80, 0.7)';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Robot eye
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(this.x + this.width / 2 - 4, this.y + this.height / 3, 8, 8);
    ctx.restore();

    // Health bar
    const barW = 40;
    const barH = 5;
    const bx = this.x + this.width / 2 - barW / 2;
    const by = this.y - 8;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx, by, barW, barH);
    const hp01 = this.health / this.maxHealth;
    ctx.fillStyle = hp01 < 0.3 ? '#ff4444' : '#44ff44';
    ctx.fillRect(bx, by, barW * hp01, barH);
  }
}

// Water minion - basic ranged foe for Water Queen Realm
// Water Queen Boss - Advanced water-based attacks
export class WaterQueen extends Enemy {
  constructor(x, y) {
    super(x, y, 'waterQueenRealm');
    this.maxHealth = 500;
    this.health = this.maxHealth;
    this.speed = 60;
    this.width = 80;
    this.height = 80;
    this.isBoss = true;
    this.attackCooldownMs = 2500;

    // Attack pattern tracking
    this.tsunamiCooldown = 0;
    this.orbCooldown = 0;
    this.whirlpoolCooldown = 0;
    this.currentAttack = 0;

    // Tsunami wave data
    this.tsunamiActive = false;
    this.tsunamiX = 0;
    this.tsunamiDirection = 1;
    this.tsunamiSpeed = 200;
    this.tsunamiGapY = 0; // Y position of safe gap
    this.tsunamiGapHeight = 120; // Height of safe gap

    // Whirlpool traps
    this.whirlpools = [];

    // Voice line tracking
    this.voiceLines = {
      75: { text: '💧 Water Queen: "You dare challenge me? The ocean will consume you!"', triggered: false },
      50: { text: '💧 Water Queen: "Impossible! You\'re stronger than I thought..."', triggered: false },
      25: { text: '💧 Water Queen: "No... this cannot be! I am the TIDE ITSELF!"', triggered: false }
    };

    this.loot = [
      { id: 'water_crown', count: 1, chance: 1.0 },
      { id: 'water_core', count: 3, chance: 1.0 },
    ];
  }

  update(deltaTime) {
    super.update(deltaTime);

    // Check voice line triggers based on health percentage
    const healthPercent = (this.health / this.maxHealth) * 100;
    for (const [threshold, voiceLine] of Object.entries(this.voiceLines)) {
      if (!voiceLine.triggered && healthPercent <= parseFloat(threshold)) {
        showToast(voiceLine.text, 3000);
        voiceLine.triggered = true;
      }
    }

    // Update cooldowns
    this.tsunamiCooldown = Math.max(0, this.tsunamiCooldown - deltaTime);
    this.orbCooldown = Math.max(0, this.orbCooldown - deltaTime);
    this.whirlpoolCooldown = Math.max(0, this.whirlpoolCooldown - deltaTime);

    // Update tsunami wave
    if (this.tsunamiActive) {
      this.tsunamiX += this.tsunamiDirection * this.tsunamiSpeed * (deltaTime / 1000);

      // Check if tsunami hit player (but not in the safe gap)
      const playerCenterX = game.player.x + game.player.width / 2;
      const playerCenterY = game.player.y + game.player.height / 2;

      // Check if player is in the gap zone (safe)
      const inGap = playerCenterY >= this.tsunamiGapY &&
                    playerCenterY <= this.tsunamiGapY + this.tsunamiGapHeight;

      if (Math.abs(this.tsunamiX - playerCenterX) < 60 && !inGap) {
        // Knockback player
        const knockbackForce = 300;
        game.player.x += this.tsunamiDirection * knockbackForce * (deltaTime / 1000);
        game.player.takeDamage(15);
        addScreenShake(200, 8);
      }

      // Deactivate if off screen
      if (this.tsunamiX < -100 || this.tsunamiX > canvas.width + 100) {
        this.tsunamiActive = false;
      }
    }

    // Update whirlpools
    this.whirlpools = this.whirlpools.filter(pool => {
      pool.lifetime -= deltaTime;

      // Check player collision with whirlpool
      const dx = (game.player.x + game.player.width / 2) - pool.x;
      const dy = (game.player.y + game.player.height / 2) - pool.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < pool.radius && !pool.triggered) {
        // Player stepped in whirlpool!
        pool.triggered = true;
        game.player.mana = 0; // Drain all mana
        game.player.takeDamage(game.player.maxHealth * 0.5); // 50% HP damage
        addScreenShake(500, 15);

        // Spawn dramatic particles
        for (let i = 0; i < 20; i++) {
          const angle = (i / 20) * Math.PI * 2;
          spawnParticle({
            x: pool.x,
            y: pool.y,
            vx: Math.cos(angle) * 150,
            vy: Math.sin(angle) * 150,
            size: 8,
            color: '#0088ff',
            lifeMs: 800
          });
        }
      }

      return pool.lifetime > 0;
    });
  }

  shootAtPlayer() {
    if ((this.biome || 'home') !== game.currentBiome) return;
    if (game.player.health <= 0) return;

    // Cycle through attack patterns
    const attackType = this.currentAttack % 3;
    this.currentAttack++;

    if (attackType === 0 && this.tsunamiCooldown <= 0) {
      this.useTsunamiAttack();
    } else if (attackType === 1 && this.orbCooldown <= 0) {
      this.useWaterOrbBarrage();
    } else if (attackType === 2 && this.whirlpoolCooldown <= 0) {
      this.spawnWhirlpools();
    } else {
      // Fallback to basic attack
      this.useWaterOrbBarrage();
    }
  }

  useTsunamiAttack() {
    this.tsunamiCooldown = 8000; // 8 second cooldown
    this.tsunamiActive = true;

    // Alternate direction
    this.tsunamiDirection = Math.random() < 0.5 ? 1 : -1;
    this.tsunamiX = this.tsunamiDirection > 0 ? -50 : canvas.width + 50;

    // Random safe gap position (player must dodge to this Y zone)
    this.tsunamiGapY = Math.random() * (canvas.height - this.tsunamiGapHeight);

    addScreenShake(300, 5);
  }

  useWaterOrbBarrage() {
    this.orbCooldown = 5000; // 5 second cooldown

    // Spawn 6 bouncing water orbs (increased from 3)
    for (let i = 0; i < 6; i++) {
      const sx = this.x + this.width / 2;
      const sy = this.y + this.height / 2;

      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const speed = 200;

      game.projectiles.push({
        type: 'water_orb',
        owner: 'enemy',
        damage: 5,
        x: sx,
        y: sy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        age: 0,
        lifetime: 8000,
        size: 20,
        color: '#00aaff',
        icon: '💧',
        bounces: 0,
        maxBounces: 5
      });
    }
  }

  spawnWhirlpools() {
    this.whirlpoolCooldown = 10000; // 10 second cooldown

    // Spawn 2-3 whirlpools at random positions
    const count = 2 + Math.floor(Math.random() * 2);

    for (let i = 0; i < count; i++) {
      this.whirlpools.push({
        x: Math.random() * (canvas.width - 200) + 100,
        y: Math.random() * (canvas.height - 200) + 100,
        radius: 50,
        lifetime: 6000,
        triggered: false
      });
    }
  }

  draw(ctx) {
    if (this.isDead) return;

    // Draw whirlpools first (behind everything)
    this.whirlpools.forEach(pool => {
      ctx.save();

      // Pulsing animation
      const pulse = 1 + Math.sin(Date.now() / 200) * 0.1;
      const radius = pool.radius * pulse;

      // Swirl effect
      const rotation = (Date.now() / 50) % 360;
      ctx.translate(pool.x, pool.y);
      ctx.rotate((rotation * Math.PI) / 180);

      // Draw whirlpool using image if available
      if (sprites.waterwhole) {
        ctx.drawImage(sprites.waterwhole, -radius, -radius, radius * 2, radius * 2);
      } else {
        // Fallback spiral
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        gradient.addColorStop(0, 'rgba(0, 50, 150, 0.8)');
        gradient.addColorStop(0.5, 'rgba(0, 100, 200, 0.5)');
        gradient.addColorStop(1, 'rgba(0, 136, 255, 0.2)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // Warning text
      if (!pool.triggered) {
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ DANGER', pool.x, pool.y - radius - 10);
      }
    });

    // Draw tsunami wave with safe gap
    if (this.tsunamiActive) {
      ctx.save();
      ctx.globalAlpha = 0.9;

      const waveWidth = 120;

      if (sprites.tsunami) {
        // Draw top part of tsunami (above gap)
        const topHeight = this.tsunamiGapY;
        if (topHeight > 0) {
          ctx.drawImage(
            sprites.tsunami,
            0, 0, sprites.tsunami.width, topHeight / canvas.height * sprites.tsunami.height,
            this.tsunamiX - waveWidth / 2, 0, waveWidth, topHeight
          );
        }

        // Draw bottom part of tsunami (below gap)
        const bottomY = this.tsunamiGapY + this.tsunamiGapHeight;
        const bottomHeight = canvas.height - bottomY;
        if (bottomHeight > 0) {
          ctx.drawImage(
            sprites.tsunami,
            0, bottomY / canvas.height * sprites.tsunami.height,
            sprites.tsunami.width, bottomHeight / canvas.height * sprites.tsunami.height,
            this.tsunamiX - waveWidth / 2, bottomY, waveWidth, bottomHeight
          );
        }

        // Draw arrow indicator pointing to safe gap
        ctx.globalAlpha = 0.8 + Math.sin(Date.now() / 200) * 0.2;
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 32px monospace';
        ctx.textAlign = 'center';
        const arrowY = this.tsunamiGapY + this.tsunamiGapHeight / 2;
        ctx.fillText('→', 50, arrowY);
        ctx.fillText('←', canvas.width - 50, arrowY);

        // Safe zone text
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('SAFE', canvas.width / 2, arrowY);
      }

      ctx.restore();
    }

    // Draw boss (Water Queen sprite or fallback)
    ctx.save();
    if (sprites.waterQueen) {
      drawSprite(ctx, sprites.waterQueen, this.x, this.y, this.width, this.height, 'waterQueen');
    } else {
      // Fallback visual
      ctx.shadowColor = 'rgba(0, 170, 255, 0.8)';
      ctx.shadowBlur = 25;
      ctx.fillStyle = 'rgba(0, 150, 255, 0.95)';
      ctx.beginPath();
      ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width * 0.45, 0, Math.PI * 2);
      ctx.fill();

      // Crown
      ctx.fillStyle = '#ffdd00';
      ctx.font = '24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('👑', this.x + this.width / 2, this.y + 15);
    }
    ctx.restore();

    // Boss health bar (larger)
    const barW = 120;
    const barH = 10;
    const bx = this.x + this.width / 2 - barW / 2;
    const by = this.y - 20;

    ctx.fillStyle = 'rgba(40, 40, 40, 0.8)';
    ctx.fillRect(bx, by, barW, barH);

    const ratio = Math.max(0, this.health / this.maxHealth);
    ctx.fillStyle = '#00aaff';
    ctx.fillRect(bx, by, barW * ratio, barH);

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, barW, barH);

    // Boss name
    ctx.fillStyle = '#ffdd00';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('💧 WATER QUEEN 💧', this.x + this.width / 2, by - 8);
  }
}

export class WaterMinion extends Enemy {
  constructor(x, y) {
    super(x, y, 'waterQueenRealm');
    this.maxHealth = 45;
    this.health = this.maxHealth;
    this.speed = 85;
    this.width = 40;
    this.height = 40;
    this.attackCooldownMs = 1150 + Math.random() * 550;

    // Loot used for Water Queen quest
    this.loot = [
      { id: 'water_core', count: 1, chance: 0.55 },
      { id: 'water_drop', count: 1, chance: 0.4 },
    ];
  }

  shootAtPlayer() {
    if ((this.biome || 'home') !== game.currentBiome) return;
    if (game.player.health <= 0) return;

    const px = game.player.x + game.player.width / 2;
    const py = game.player.y + game.player.height / 2;
    const sx = this.x + this.width / 2;
    const sy = this.y + this.height / 2;
    const dx = px - sx;
    const dy = py - sy;
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const nx = dx / dist;
    const ny = dy / dist;
    const spread = (Math.random() - 0.5) * 0.22;
    const cos = Math.cos(spread);
    const sin = Math.sin(spread);
    const rx = nx * cos - ny * sin;
    const ry = nx * sin + ny * cos;

    const speed = 240;
    game.projectiles.push({
      type: 'water_bolt',
      owner: 'enemy',
      damage: 10,
      x: sx,
      y: sy,
      vx: rx * speed,
      vy: ry * speed,
      age: 0,
      lifetime: 3600,
      size: 12,
      color: '#66ccff',
      icon: '💧',
    });

    spawnParticle({ x: sx, y: sy, vx: (Math.random() - 0.5) * 40, vy: -50, size: 3, color: '#66ccff', lifeMs: 520 });
  }

  draw(ctx) {
    if (this.isDead) return;

    ctx.save();
    ctx.shadowColor = 'rgba(120, 220, 255, 0.75)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = 'rgba(90, 180, 255, 0.95)';
    ctx.beginPath();
    ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(240, 250, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(this.x + this.width / 2 - 6, this.y + this.height / 2 - 8, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Health bar
    const barW = 46;
    const barH = 6;
    const bx = this.x + this.width / 2 - barW / 2;
    const by = this.y - 10;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx, by, barW, barH);
    const hp01 = this.maxHealth > 0 ? this.health / this.maxHealth : 0;
    ctx.fillStyle = hp01 < 0.3 ? '#ff4444' : '#44ffdd';
    ctx.fillRect(bx, by, barW * hp01, barH);
    ctx.restore();
  }
}

export function spawnTrainingDroids() {
  // Spawn 2 training droids in Mystical Library
  const droid1 = new TrainingDroid(canvas.width * 0.3, canvas.height * 0.6);
  const droid2 = new TrainingDroid(canvas.width * 0.7, canvas.height * 0.6);
  game.enemies.push(droid1, droid2);
  game.trialActive = true;
  console.log('Training droids spawned! Defeat them to proceed.');
}

export function spawnWaterQueen() {
  // Transform the Water Queen NPC into the boss
  const npc = game.npcs.find(n => n.name === 'Water Queen');
  if (!npc) {
    console.error('Water Queen NPC not found!');
    return;
  }

  // Hide the NPC and spawn boss at same location
  npc.hidden = true;

  const queen = new WaterQueen(npc.x, npc.y);
  queen.biome = 'waterQueenRealm';
  game.enemies.push(queen);
  game.waterQueenBossActive = true;
  console.log('💧 Water Queen boss spawned!');
}

export function spawnWaterMinions() {
  // Spawn 3 water minions after Water Queen interaction
  const m1 = new WaterMinion(0, 0);
  m1.anchor = { x: 0.35, y: 0.62 };
  const m2 = new WaterMinion(0, 0);
  m2.anchor = { x: 0.62, y: 0.52 };
  const m3 = new WaterMinion(0, 0);
  m3.anchor = { x: 0.78, y: 0.72 };
  game.enemies.push(m1, m2, m3);
  layoutEnemiesForBiome('waterRealm');
  console.log('Water minions spawned!');
}

export function createEnemies() {
  game.enemies = [];
  // Enemies now spawn via NPC interactions instead of immediately
}

export function layoutEnemiesForBiome(biomeKey) {
  const enemies = game.enemies.filter((e) => (e.biome || 'home') === biomeKey);
  if (!enemies.length) return;
  const margin = 40;
  for (const e of enemies) {
    const a = e.anchor;
    if (!a) continue;
    e.x = clamp(a.x * canvas.width - e.width / 2, margin, canvas.width - e.width - margin);
    e.y = clamp(a.y * canvas.height - e.height / 2, margin, canvas.height - e.height - margin);
  }
}

export function updateEnemies(deltaTime) {
  for (const e of game.enemies) {
    if ((e.biome || 'home') !== game.currentBiome) continue;
    e.update(deltaTime);
  }

  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const e = game.enemies[i];
    if (!e.isDead) continue;
    if ((e.biome || 'home') !== game.currentBiome) continue;
    dropLoot(e);
    spawnParticle({ x: e.x + e.width / 2, y: e.y + e.height / 2, vx: (Math.random() - 0.5) * 70, vy: -80, size: 4, color: '#a67cff', lifeMs: 800 });
    game.enemies.splice(i, 1);
    game.player.addExperience(35);
    saveGameState();
  }

  // Check if Training Droid trial is complete
  if (game.trialActive) {
    const remainingDroids = game.enemies.filter((e) => e instanceof TrainingDroid && (e.biome || 'home') === game.currentBiome);
    if (remainingDroids.length === 0) {
      game.trialActive = false;
      game.trialCompleted = true;
      game.libraryActivitiesUnlocked = true;
      game.flags.libraryTrialComplete = true;
      game.flags.waterUnlocked = true;
      console.log('🎉 Trial complete! The Archive Keeper has more to teach you...');
      saveGameState();
    }
  }
}

export function updateProjectiles(deltaTime) {
  const dt = deltaTime / 1000;
  for (let i = game.projectiles.length - 1; i >= 0; i--) {
    const proj = game.projectiles[i];
    proj.age = (proj.age || 0) + deltaTime;
    if (proj.age >= (proj.lifetime || 2000)) {
      game.projectiles.splice(i, 1);
      continue;
    }

    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;

    // Bouncing water orbs
    if (proj.type === 'water_orb' && proj.bounces !== undefined) {
      const margin = 20;

      // Bounce off walls
      if (proj.x < margin || proj.x > canvas.width - margin) {
        proj.vx *= -0.9; // Reverse and dampen
        proj.x = Math.max(margin, Math.min(canvas.width - margin, proj.x));
        proj.bounces++;
        spawnParticle({ x: proj.x, y: proj.y, vx: (Math.random() - 0.5) * 60, vy: -40, size: 5, color: '#00aaff', lifeMs: 400 });
      }

      if (proj.y < margin || proj.y > canvas.height - margin) {
        proj.vy *= -0.9;
        proj.y = Math.max(margin, Math.min(canvas.height - margin, proj.y));
        proj.bounces++;
        spawnParticle({ x: proj.x, y: proj.y, vx: (Math.random() - 0.5) * 60, vy: -40, size: 5, color: '#00aaff', lifeMs: 400 });
      }

      // Remove after too many bounces
      if (proj.bounces > (proj.maxBounces || 5)) {
        game.projectiles.splice(i, 1);
        continue;
      }
    }

    // Enemy projectile collision with player
    if (proj.owner === 'enemy' && game.player.health > 0) {
      const px = game.player.x + game.player.width / 2;
      const py = game.player.y + game.player.height / 2;
      const dx = px - proj.x;
      const dy = py - proj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitRadius = (proj.size || 10) * 0.6;
      if (dist < hitRadius + 18) {
        const damage = proj.damage || 8;
        game.player.takeDamage(damage);
        spawnDamageNumber(px, py - 22, `-${damage}`, '#ff6666');
        addScreenShake(120, 7);
        spawnParticle({ x: proj.x, y: proj.y, vx: (Math.random() - 0.5) * 80, vy: -80, size: 4, color: proj.color || '#a67cff', lifeMs: 650 });
        game.projectiles.splice(i, 1);
        saveGameState();
        continue;
      }
    }

    // Player projectile collision with enemies
    if (proj.owner === 'player') {
      for (const enemy of game.enemies) {
        if (enemy.isDead) continue;
        if ((enemy.biome || 'home') !== game.currentBiome) continue;

        const ex = enemy.x + enemy.width / 2;
        const ey = enemy.y + enemy.height / 2;
        const dx = ex - proj.x;
        const dy = ey - proj.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const hitRadius = (proj.size || 10) * 0.6 + enemy.width * 0.4;

        if (dist < hitRadius) {
          const damage = proj.damage || 10;
          enemy.takeDamage(damage);
          spawnDamageNumber(ex, ey - 22, `-${damage}`, '#ffff66');
          addScreenShake(80, 4);
          spawnParticle({ x: proj.x, y: proj.y, vx: (Math.random() - 0.5) * 80, vy: -80, size: 4, color: proj.color || '#ff6600', lifeMs: 650 });
          game.projectiles.splice(i, 1);
          saveGameState();
          break; // Stop checking other enemies after hit
        }
      }
    }

    if (proj.x < -50 || proj.x > canvas.width + 50 || proj.y < -50 || proj.y > canvas.height + 50) {
      game.projectiles.splice(i, 1);
    }
  }
}

export function drawProjectiles(ctx) {
  for (const proj of game.projectiles) {
    const alpha = Math.max(0.5, 1 - (proj.age || 0) / (proj.lifetime || 2000));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = proj.color || '#ffffff';
    ctx.shadowBlur = 15;

    // Draw sprite if available
    if (proj.sprite && sprites[proj.sprite]) {
      ctx.imageSmoothingEnabled = false;
      const size = (proj.size || 16) * 2;
      ctx.drawImage(sprites[proj.sprite], proj.x - size/2, proj.y - size/2, size, size);
    } else if (proj.icon) {
      ctx.font = `${(proj.size || 12) * 1.5}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(proj.icon, proj.x, proj.y);
    } else {
      ctx.fillStyle = proj.color || '#ffffff';
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, (proj.size || 12) * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

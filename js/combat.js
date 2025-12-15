import { canvas, game } from './context.js';
import { clamp } from './utils.js';
import { spawnParticle } from './particles.js';
import { saveGameState } from './persistence.js';
import { sprites } from './assets.js';

export function addScreenShake(ms, strength) {
  game.shakeMs = Math.max(game.shakeMs, ms);
  game.shakeStrength = Math.max(game.shakeStrength, strength);
}

export function updateScreenShake(deltaTime) {
  if (game.shakeMs <= 0) return;
  game.shakeMs = Math.max(0, game.shakeMs - deltaTime);
  if (game.shakeMs <= 0) game.shakeStrength = 0;
}

export function getShakeOffset() {
  if (game.shakeMs <= 0 || game.shakeStrength <= 0) return { x: 0, y: 0 };
  return {
    x: (Math.random() - 0.5) * game.shakeStrength,
    y: (Math.random() - 0.5) * game.shakeStrength,
  };
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
  for (let i = game.damageNumbers.length - 1; i >= 0; i--) {
    const n = game.damageNumbers[i];
    n.lifeMs -= deltaTime;
    if (n.lifeMs <= 0) {
      game.damageNumbers.splice(i, 1);
      continue;
    }
    const dt = deltaTime / 1000;
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

export function createEnemies() {
  game.enemies = [];

  // First enemy: Mystical Library (Elder Mage realm)
  const wisp = new Enemy(0, 0, 'mysticalLibrary');
  wisp.anchor = { x: 0.7, y: 0.68 };
  game.enemies.push(wisp);
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
    spawnParticle({ x: e.x + e.width / 2, y: e.y + e.height / 2, vx: (Math.random() - 0.5) * 70, vy: -80, size: 4, color: '#a67cff', lifeMs: 800 });
    game.enemies.splice(i, 1);
    game.player.addExperience(35);
    saveGameState();
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


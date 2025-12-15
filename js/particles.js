import { game } from './context.js';

export function spawnParticle(p) {
  game.particles.push({
    x: p.x,
    y: p.y,
    vx: p.vx ?? 0,
    vy: p.vy ?? 0,
    size: p.size ?? 3,
    color: p.color ?? '#ffffff',
    lifeMs: p.lifeMs ?? 350,
    maxLifeMs: p.lifeMs ?? 350,
  });
}

export function updateParticles(deltaTime) {
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

export function drawParticles(ctx) {
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


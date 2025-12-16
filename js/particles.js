import { game } from './context.js';

// VFX particle emission system
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
    rotation: p.rotation ?? 0,
    rotationSpeed: p.rotationSpeed ?? 0,
  });
}

export function updateParticles(deltaTime) {
  const dt = deltaTime / 1000;

  for (let i = game.particles.length - 1; i >= 0; i--) {
    const p = game.particles[i];
    p.lifeMs -= deltaTime;

    if (p.lifeMs <= 0) {
      game.particles.splice(i, 1);
      continue;
    }

    // Physics simulation
    p.vy += 20 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Optional rotation
    if (p.rotationSpeed) {
      p.rotation += p.rotationSpeed * dt;
    }
  }
}

export function drawParticles(ctx) {
  for (const p of game.particles) {
    const a = Math.max(0, Math.min(1, p.lifeMs / p.maxLifeMs));

    ctx.save();
    ctx.globalAlpha = a * 0.85;
    ctx.fillStyle = p.color;

    if (p.rotation !== 0) {
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}


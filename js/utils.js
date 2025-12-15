export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function relaxEntitySpacing(entities, minDistance, iterations = 10) {
  if (entities.length <= 1) return;
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const a = entities[i];
        const b = entities[j];
        const ax = a.x + a.width / 2;
        const ay = a.y + a.height / 2;
        const bx = b.x + b.width / 2;
        const by = b.y + b.height / 2;
        let dx = ax - bx;
        let dy = ay - by;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) {
          dx = (Math.random() - 0.5) * 0.01;
          dy = (Math.random() - 0.5) * 0.01;
          dist = Math.sqrt(dx * dx + dy * dy);
        }
        if (dist < minDistance) {
          const push = (minDistance - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          a.x += nx * push;
          a.y += ny * push;
          b.x -= nx * push;
          b.y -= ny * push;
        }
      }
    }
  }
}


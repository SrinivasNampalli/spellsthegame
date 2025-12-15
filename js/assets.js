import { ctx } from './context.js';

export const sprites = {
  player: null,
  elderMage: null,
  blacksmith: null,
  mysteriousDude: null,
  waterQueen: null,
  homeBackground: null,
  magmaKingdom: null,
  mysticalLibrary: null,
  glitchedVoid: null,
  waterQueenBiome: null,
  fireSpell: null,
  loaded: false,
};

let spritesLoaded = 0;
const totalSprites = 5; // Player + 4 NPCs

// Trim/crop big portraits so characters don't look "smushed"
// Trim values are percentages of the source image edges.
export const spriteMeta = {
  player: { trim: { l: 0.12, t: 0.06, r: 0.12, b: 0.04 }, shadow: true },
  elderMage: { trim: { l: 0.1, t: 0.06, r: 0.1, b: 0.06 }, shadow: true },
  blacksmith: { trim: { l: 0.1, t: 0.06, r: 0.1, b: 0.06 }, shadow: true },
  mysteriousDude: { trim: { l: 0.1, t: 0.06, r: 0.1, b: 0.06 }, shadow: true },
  waterQueen: { trim: { l: 0.1, t: 0.06, r: 0.1, b: 0.06 }, shadow: true },
};

export function drawSprite(ctx2d, img, dx, dy, dw, dh, metaKey, opts = {}) {
  if (!img) return;

  const meta = spriteMeta[metaKey] || {};
  const trim = meta.trim || null;
  const alpha = opts.alpha ?? 1;

  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;

  if (trim) {
    const l = Math.max(0, Math.min(0.49, trim.l ?? 0));
    const t = Math.max(0, Math.min(0.49, trim.t ?? 0));
    const r = Math.max(0, Math.min(0.49, trim.r ?? 0));
    const b = Math.max(0, Math.min(0.49, trim.b ?? 0));
    sx = Math.floor(img.width * l);
    sy = Math.floor(img.height * t);
    sw = Math.max(1, Math.floor(img.width * (1 - l - r)));
    sh = Math.max(1, Math.floor(img.height * (1 - t - b)));
  }

  ctx2d.save();
  ctx2d.globalAlpha = alpha;

  if (opts.shadow ?? meta.shadow) {
    ctx2d.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx2d.shadowBlur = 0;
    ctx2d.shadowOffsetX = 2;
    ctx2d.shadowOffsetY = 3;
  }

  ctx2d.imageSmoothingEnabled = false;
  ctx2d.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  ctx2d.restore();
}

function checkSpritesLoaded() {
  if (spritesLoaded >= totalSprites) {
    sprites.loaded = true;
    // eslint-disable-next-line no-console
    console.log('All sprites loaded!');
  }
}

export function loadSprites() {
  spritesLoaded = 0;
  sprites.loaded = false;

  // Player + NPCs (blocking for loaded=true)
  const loadBlocking = [
    ['player', 'images/maincharacter.png'],
    ['elderMage', 'images/mageelder.png'],
    ['blacksmith', 'images/blacksmith.png'],
    ['mysteriousDude', 'images/mysteriousdude.png'],
    ['waterQueen', 'images/waterqueen.png'],
  ];

  for (const [key, src] of loadBlocking) {
    sprites[key] = new Image();
    sprites[key].src = src;
    sprites[key].onload = () => {
      spritesLoaded++;
      checkSpritesLoaded();
    };
  }

  // Backgrounds and other sprites (non-blocking)
  const loadBg = [
    ['homeBackground', 'images/homeforgame.png'],
    ['magmaKingdom', 'images/magmakingdom.png'],
    ['mysticalLibrary', 'images/mysticallibarrayrrecrop.png'],
    ['glitchedVoid', 'images/glitchedvoidmysterious.png'],
    ['waterQueenBiome', 'images/waterqueenbiome.png'],
    ['fireSpell', 'images/firespell.png'],
  ];

  for (const [key, src] of loadBg) {
    sprites[key] = new Image();
    sprites[key].src = src;
  }
}

// Ensure smoothing stays off (some browsers toggle it)
export function enforcePixelArt() {
  ctx.imageSmoothingEnabled = false;
}


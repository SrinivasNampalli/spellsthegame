// game.js (entrypoint) - keeps the core loop and delegates to modules in /js

import { canvas, ctx, game, keys, dom } from './js/context.js';
import { clamp, lerp } from './js/utils.js';
import { Player } from './player.js';
import { loadSprites, sprites, drawSprite, enforcePixelArt } from './js/assets.js';
import { items, biomes, recipes, initRecipes } from './js/data.js';
import { saveGameState, loadGameState } from './js/persistence.js';
import { createNPCs, layoutNPCsForBiome } from './js/npcs.js';
import {
  createResourceNodes,
  layoutNodesForBiome,
  updateResourceNodes,
  canInteractWithNode,
  drawResourceNodes,
} from './js/resources.js';
import { spawnParticle, updateParticles, drawParticles } from './js/particles.js';
import {
  createEnemies,
  layoutEnemiesForBiome,
  updateEnemies,
  updateProjectiles,
  drawProjectiles,
  updateDamageNumbers,
  drawDamageNumbers,
  updateScreenShake,
  getShakeOffset,
} from './js/combat.js';
import { drawAimAssist } from './js/spells.js';
import { bindInput, updateEquippedWeapon } from './js/input.js';
import { drawUI, bindLevelUpUI, updateDialogueTyping } from './js/ui.js';
import { createLibraryStations, hideMinigame } from './js/libraryActivities.js';
import {
  resizeCanvas,
  bindResize,
  bindBackButton,
  updateBackButtonVisibility,
  updateTransition,
  drawBackground,
  drawTransitionScreen,
  setOnBiomeChanged,
} from './js/world.js';

function layoutForBiome() {
  layoutNPCsForBiome(game.currentBiome);
  layoutNodesForBiome(game.currentBiome);
  layoutEnemiesForBiome(game.currentBiome);
}

function init() {
  resizeCanvas();
  bindResize(layoutForBiome);
  bindBackButton();

  loadSprites();
  initRecipes(recipes);
  bindLevelUpUI();

  // Spawn player
  game.player = new Player(canvas.width / 2, canvas.height / 2);

  // Content
  createNPCs();
  createResourceNodes();
  createEnemies();

  // Library activity stations
  const libraryStations = createLibraryStations();
  libraryStations.forEach(station => game.npcs.push(station));

  // Load save after content exists
  loadGameState(canvas);

  // Layout & UI
  layoutForBiome();
  updateBackButtonVisibility();
  updateEquippedWeapon();
  game.ui.healthShown = game.player.health;
  game.ui.manaShown = game.player.mana;
  game.ui.xpShown = game.player.experienceToNextLevel > 0 ? clamp(game.player.experience / game.player.experienceToNextLevel, 0, 1) : 0;

  // Biome change hook (from transitions)
  setOnBiomeChanged(() => {
    layoutForBiome();
    saveGameState();
  });

  // Input
  bindInput();

  // Mini-game close button
  if (dom.minigameClose) {
    dom.minigameClose.addEventListener('click', hideMinigame);
  }

  // Autosave on refresh/navigation
  window.addEventListener('beforeunload', () => saveGameState());

  requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
  enforcePixelArt();
  updateScreenShake(deltaTime);
  if (game.ui.levelFlashMs > 0) game.ui.levelFlashMs = Math.max(0, game.ui.levelFlashMs - deltaTime);

  // Update dialogue typing animation
  updateDialogueTyping(deltaTime);

  // Transitioning blocks gameplay updates
  if (updateTransition(deltaTime)) return;

  if (game.dialogueActive) return;

  // Death state: keep some VFX running
  if (game.player.health <= 0) {
    updateProjectiles(deltaTime);
    updateParticles(deltaTime);
    updateDamageNumbers(deltaTime);
    return;
  }

  // Movement input
  let moveX = 0;
  let moveY = 0;
  if (keys.w) moveY -= 1;
  if (keys.s) moveY += 1;
  if (keys.a) moveX -= 1;
  if (keys.d) moveX += 1;
  if (moveX !== 0 && moveY !== 0) {
    moveX *= 0.707;
    moveY *= 0.707;
  }

  game.player.setVelocity(moveX, moveY);
  game.player.update(deltaTime);

  // Run dust particles for movement feel
  game.playerStepTimerMs += deltaTime;
  if (game.player.isMoving && game.playerStepTimerMs > 90) {
    game.playerStepTimerMs = 0;
    const footX = game.player.x + game.player.width / 2 + (Math.random() - 0.5) * 10;
    const footY = game.player.y + game.player.height - 4 + (Math.random() - 0.5) * 4;
    const dustColorByBiome = {
      home: '#d2b48c',
      magmaKingdom: '#ff8844',
      mysticalLibrary: '#cc99ff',
      glitchedVoid: '#ff3355',
      waterQueenRealm: '#66ccff',
    };
    spawnParticle({
      x: footX,
      y: footY,
      vx: (Math.random() - 0.5) * 30,
      vy: -40 - Math.random() * 20,
      size: 2 + Math.random() * 2,
      color: dustColorByBiome[game.currentBiome] || '#d2b48c',
      lifeMs: 280 + Math.random() * 220,
    });
  }

  // Clamp player within canvas
  game.player.x = clamp(game.player.x, 0, canvas.width - game.player.width);
  game.player.y = clamp(game.player.y, 0, canvas.height - game.player.height);

  // Nearby NPCs
  game.interactableNearby = null;
  for (const npc of game.npcs) {
    if (npc.biome && npc.biome !== game.currentBiome) continue;
    if (npc.canInteract(game.player)) {
      game.interactableNearby = npc;
      break;
    }
  }

  // Nearby resource nodes
  game.interactableNodeNearby = null;
  for (const node of game.resourceNodes) {
    if ((node.biome || 'home') !== game.currentBiome) continue;
    if (!node.active) continue;
    if (canInteractWithNode(node, game.player)) {
      game.interactableNodeNearby = node;
      break;
    }
  }

  // Pick up dropped items
  for (let i = game.droppedItems.length - 1; i >= 0; i--) {
    const droppedItem = game.droppedItems[i];
    const dx = game.player.x - droppedItem.x;
    const dy = game.player.y - droppedItem.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 40) {
      if (game.player.addItem(droppedItem.item)) {
        game.droppedItems.splice(i, 1);
        saveGameState();
      }
    }
  }

  updateResourceNodes(deltaTime);
  updateEnemies(deltaTime);
  updateProjectiles(deltaTime);
  updateParticles(deltaTime);
  updateDamageNumbers(deltaTime);

  // Smooth UI bars
  const smooth = 1 - Math.pow(0.001, deltaTime / 1000);
  game.ui.healthShown = lerp(game.ui.healthShown, game.player.health, smooth);
  game.ui.manaShown = lerp(game.ui.manaShown, game.player.mana, smooth);
  const xp01 = game.player.experienceToNextLevel > 0 ? game.player.experience / game.player.experienceToNextLevel : 0;
  game.ui.xpShown = lerp(game.ui.xpShown, clamp(xp01, 0, 1), smooth);

  // Autosave (covers refresh/crashes)
  game._saveTimerMs += deltaTime;
  if (game._saveTimerMs > 1200) {
    game._saveTimerMs = 0;
    saveGameState();
  }
}

function drawDroppedItems() {
  for (const droppedItem of game.droppedItems) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(droppedItem.x, droppedItem.y, droppedItem.width, droppedItem.height);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(droppedItem.x, droppedItem.y, droppedItem.width, droppedItem.height);

    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(droppedItem.item.icon || '❓', droppedItem.x + droppedItem.width / 2, droppedItem.y + droppedItem.height / 2);
  }
}

function drawNPCs() {
  for (const npc of game.npcs) {
    if (npc.biome && npc.biome !== game.currentBiome) continue;
    npc.draw(ctx);
    if (game.interactableNearby === npc && !game.dialogueActive) {
      const promptX = npc.x + npc.width / 2;
      const promptY = npc.y - 25;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Press E', promptX, promptY);
    }
  }
}

function drawNodePrompt() {
  if (game.interactableNodeNearby && !game.dialogueActive && !game.interactableNearby) {
    const n = game.interactableNodeNearby;
    const promptX = n.x + n.width / 2;
    const promptY = n.y - 10;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Press E', promptX, promptY);
  }
}

function drawPlayer() {
  const player = game.player;

  if (sprites.loaded && sprites.player) {
    const speed01 = Math.min(1, Math.sqrt(player.velocityX * player.velocityX + player.velocityY * player.velocityY) / (player.speed || 1));
    const running = player.isMoving && speed01 > 0.1;
    const t = player.animTime || 0;

    const facingUp = player.facing === 'up';
    const facingDown = player.facing === 'down';
    const facingSide = player.facing === 'left' || player.facing === 'right';

    const idleBreath = Math.sin(t * 2.2);
    const bob = Math.sin(t * (running ? 14 : 2.2)) * (running ? 3.2 : 1.6) + (running ? 0 : idleBreath * 0.6);
    const sway = Math.sin(t * (running ? 14 : 2.2) + Math.PI / 2) * (running ? 0.03 : 0.012);
    const lean = clamp(player.velocityX / (player.speed || 1), -1, 1) * (running ? 0.1 : 0.02);
    const flipX = player.facing === 'left' ? -1 : 1;

    // Shadow
    const shadowW = player.width * 0.55 * (running ? 0.95 : 1);
    const shadowH = player.height * 0.12 * (running ? 0.9 : 1);
    const shadowX = player.x + player.width / 2;
    const shadowY = player.y + player.height - 4;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(shadowX, shadowY, shadowW / 2, shadowH / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const cx = player.x + player.width / 2;
    const cy = player.y + player.height / 2;
    ctx.save();
    ctx.translate(cx, cy + bob * 0.25);
    ctx.scale(flipX, 1);

    const dirTilt = facingSide ? lean + sway : sway * 0.6;
    ctx.rotate(dirTilt);

    const idleScaleY = running ? 1 : 1 + idleBreath * 0.018;
    const idleScaleX = running ? 1 : 1 - idleBreath * 0.01;
    const dirScaleY = facingUp ? 0.98 : 1;
    const dirScaleX = facingUp ? 0.98 : 1;
    ctx.scale(idleScaleX * dirScaleX, idleScaleY * dirScaleY);

    drawSprite(ctx, sprites.player, -player.width / 2, -player.height / 2 + bob * 0.15, player.width, player.height, 'player');

    // Lighting overlay to imply front/back
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    if (facingUp) ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    else if (facingDown) ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    else ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
    ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
    ctx.restore();

    ctx.restore();
  } else {
    ctx.fillStyle = '#4488ff';
    ctx.fillRect(player.x, player.y, player.width, player.height);
  }

  // Draw equipped weapon
  if (game.equippedWeapon) {
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let weaponX = player.x + player.width / 2;
    let weaponY = player.y + player.height / 2;
    if (player.facing === 'right') weaponX += 20;
    else if (player.facing === 'left') weaponX -= 20;
    else if (player.facing === 'down') weaponY += 25;
    else if (player.facing === 'up') weaponY -= 15;

    ctx.fillText(game.equippedWeapon.icon, weaponX, weaponY);
  }
}

function draw() {
  const shake = getShakeOffset();
  ctx.save();
  ctx.translate(shake.x, shake.y);

  drawBackground(ctx);
  drawDroppedItems();
  drawParticles(ctx);

  // Enemies then projectiles (so bolts can pass over)
  for (const e of game.enemies) {
    if ((e.biome || 'home') !== game.currentBiome) continue;
    e.draw(ctx);
  }
  drawProjectiles(ctx);

  drawResourceNodes(ctx);
  drawNodePrompt();
  drawNPCs();

  drawAimAssist(ctx, game.mouseX - (shake.x || 0), game.mouseY - (shake.y || 0));
  drawPlayer();
  drawDamageNumbers(ctx);

  ctx.restore();

  drawUI();

  if (game.transitioning) drawTransitionScreen(ctx);
}

function gameLoop(timestamp) {
  const deltaTime = timestamp - game.lastTime;
  game.lastTime = timestamp;

  update(deltaTime);
  draw();

  requestAnimationFrame(gameLoop);
}

window.addEventListener('load', init);

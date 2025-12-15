import { canvas, game, keys } from './context.js';
import { items } from './data.js';
import { saveGameState } from './persistence.js';
import { showDialogue, hideDialogue } from './ui.js';
import { startTransition, returnHome } from './world.js';
import { tryCompleteQuest } from './npcs.js';
import { gatherNode } from './resources.js';
import {
  toggleCrafting,
  toggleGuide,
  handleMouseDown,
  handleMouseUp,
  handleMouseMove,
  handleDoubleClick,
  handleMouseWheel,
} from './crafting.js';

export function updateEquippedWeapon() {
  const selectedItem = game.player.inventory[game.player.selectedSlot];
  if (selectedItem && selectedItem.type === 'weapon') game.equippedWeapon = selectedItem;
  else game.equippedWeapon = null;
}

export function useSelectedItem() {
  if (game.dialogueActive || game.transitioning) return;
  const slot = game.player.selectedSlot;
  const item = game.player.inventory[slot];
  if (!item) return;

  // Handle spell casting
  if (item.type === 'spell') {
    castSpell(item);
    return;
  }

  // Handle consumables
  if (item.type !== 'consumable') return;

  if (item.heal) game.player.heal(item.heal);
  if (item.mana) {
    game.player.mana = Math.min(game.player.maxMana, game.player.mana + item.mana);
  }

  item.count = (item.count || 1) - 1;
  if (item.count <= 0) game.player.inventory[slot] = null;
  saveGameState();
}

function castSpell(spell) {
  // Check mana cost
  const manaCost = spell.manaCost || 0;
  if (game.player.mana < manaCost) {
    console.log('Not enough mana!');
    return;
  }

  // Consume mana
  game.player.mana -= manaCost;

  // Determine direction based on last movement or default to right
  let dirX = 1;
  let dirY = 0;
  if (keys.w) { dirY = -1; dirX = 0; }
  else if (keys.s) { dirY = 1; dirX = 0; }
  else if (keys.a) { dirX = -1; dirY = 0; }
  else if (keys.d) { dirX = 1; dirY = 0; }

  // Create projectile
  const projectile = {
    x: game.player.x + game.player.width / 2,
    y: game.player.y + game.player.height / 2,
    vx: dirX * 300, // pixels per second
    vy: dirY * 300,
    damage: spell.damage || 10,
    size: 16,
    color: spell.color || '#ff6600',
    icon: spell.icon,
    sprite: spell.sprite,
    lifetime: 2000, // 2 seconds
    age: 0,
    type: spell.id || 'fire_spell',
    owner: 'player' // Mark as player projectile
  };

  game.projectiles.push(projectile);
  console.log('Cast spell:', spell.name);
  saveGameState();
}

export function dropItem() {
  const slot = game.player.selectedSlot;
  const item = game.player.inventory[slot];
  if (!item) return;
  game.droppedItems.push({
    x: game.player.x + game.player.width / 2 - 10,
    y: game.player.y + game.player.height + 5,
    width: 20,
    height: 20,
    item: { ...item },
  });
  game.player.inventory[slot] = null;
  saveGameState();
}

export function tryRespawn() {
  if (game.player.health > 0) return;
  game.player.health = game.player.maxHealth;
  game.player.mana = game.player.maxMana;
  game.player.x = canvas.width / 2;
  game.player.y = canvas.height / 2;
  game.projectiles = [];
  game.damageNumbers = [];
  game.shakeMs = 0;
  game.shakeStrength = 0;
  saveGameState();
}

export function handleInteraction() {
  if (game.dialogueActive) {
    if (!game.currentNPC) return;
    const questTurnIn = tryCompleteQuest(game.currentNPC);
    const nextDialogue = questTurnIn || game.currentNPC.getNextDialogue();
    showDialogue(game.currentNPC.name, nextDialogue);

    // Give item gift
    if (game.currentNPC.itemGift && !game.currentNPC.hasGivenItem) {
      if (Array.isArray(game.currentNPC.itemGift)) {
        let allAdded = true;
        for (const gift of game.currentNPC.itemGift) {
          const def = items[gift.id];
          if (!def) continue;
          for (let i = 0; i < (gift.count ?? 1); i++) {
            if (!game.player.addItem({ ...def, id: gift.id, count: 1 })) {
              allAdded = false;
              break;
            }
          }
        }
        if (allAdded) {
          game.currentNPC.hasGivenItem = true;
          saveGameState();
        }
      } else {
        const def = items[game.currentNPC.itemGift];
        if (def && game.player.addItem({ ...def, id: game.currentNPC.itemGift, count: 1 })) {
          game.currentNPC.hasGivenItem = true;
          saveGameState();
        }
      }
    }

    // Teleport if dialogue looped back
    if (game.currentNPC.dialogueIndex === 0) {
      if (game.currentNPC.teleportTo) startTransition(game.currentNPC.teleportTo);
      hideDialogue();
    }
    return;
  }

  if (game.interactableNearby) {
    game.currentNPC = game.interactableNearby;
    const questTurnIn = tryCompleteQuest(game.currentNPC);
    const dialogue = questTurnIn || game.currentNPC.getNextDialogue();
    showDialogue(game.currentNPC.name, dialogue);
    return;
  }

  if (game.interactableNodeNearby) {
    gatherNode(game.interactableNodeNearby);
  }
}

export function bindInput() {
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('mousemove', (e) => {
    handleMouseMove(e);
  });
  canvas.addEventListener('dblclick', handleDoubleClick);
  canvas.addEventListener('wheel', handleMouseWheel, { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

function handleKeyDown(e) {
  const key = e.key.toLowerCase();
  if (!(key in keys)) return;

  if (key === 'e' && !keys.e) handleInteraction();
  if (key === 'c' && !keys.c) toggleCrafting();
  if (key === 'g' && !keys.g) toggleGuide();
  if (key === 'q' && !keys.q) dropItem();
  if (key === 'h' && !keys.h) returnHome();
  if (key === 'f' && !keys.f) useSelectedItem();
  if (key === 'r' && !keys.r) tryRespawn();

  if (key >= '1' && key <= '9') {
    const slotNum = parseInt(key, 10) - 1;
    game.player.selectedSlot = slotNum;
    updateEquippedWeapon();
  }

  keys[key] = true;
  e.preventDefault();
}

function handleKeyUp(e) {
  const key = e.key.toLowerCase();
  if (!(key in keys)) return;
  keys[key] = false;
  e.preventDefault();
}


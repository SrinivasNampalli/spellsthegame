import { canvas, game, keys, dom } from './context.js';
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
import { castSelectedSpellAt } from './spells.js';
import { spawnTrainingDroids, spawnWaterMinions } from './combat.js';
import { handleRunicInput, handleMemoryInput } from './libraryActivities.js';

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
    castSelectedSpellAt(game.mouseX - (game.shakeX || 0), game.mouseY - (game.shakeY || 0));
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

    // If typing is not complete, skip to end
    if (!game.dialogueTypingComplete) {
      game.dialogueTypingIndex = game.dialogueFullText.length;
      game.dialogueVisibleText = game.dialogueFullText;
      game.dialogueTypingComplete = true;
      if (dom.dialogueTextEl) dom.dialogueTextEl.textContent = game.dialogueFullText;
      return;
    }

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
      // Archive Keeper spawns Training Droids when dialogue completes
      if (game.currentNPC.name === 'Archive Keeper' && !game.trialActive) {
        spawnTrainingDroids();
      }

      // Water Queen spawns minions on first interaction complete
      if (game.currentNPC.name === 'Water Queen' && !game.currentNPC._minionsSpawned) {
        spawnWaterMinions();
        game.currentNPC._minionsSpawned = true;
      }

      if (game.currentNPC.teleportTo) startTransition(game.currentNPC.teleportTo);
      hideDialogue();
    }
    return;
  }

  if (game.interactableNearby) {
    game.currentNPC = game.interactableNearby;

    // Trigger onFirstMeet callback if it exists and hasn't been called
    if (game.currentNPC.onFirstMeet && !game.currentNPC._firstMeetTriggered) {
      game.currentNPC.onFirstMeet();
      game.currentNPC._firstMeetTriggered = true;
    }

    // Use custom dialogue handler if available
    if (game.currentNPC.customDialogueHandler) {
      game.currentNPC.customDialogueHandler();
      return;
    }

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

  // Casting spells uses left-click when not in a UI modal.
  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (game.craftingOpen || game.guideOpen) return;
    if (game.dialogueActive || game.transitioning) return;
    const didCast = castSelectedSpellAt(game.mouseX - (game.shakeX || 0), game.mouseY - (game.shakeY || 0));
    if (didCast) e.preventDefault();
  });

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

  // Handle mini-game inputs
  if (key >= '1' && key <= '9') {
    const keyNumber = parseInt(key, 10);

    // Runic puzzle input
    if (game.runicPuzzleInputMode) {
      if (handleRunicInput(keyNumber)) {
        e.preventDefault();
        return;
      }
    }

    // Memory game input
    if (game.memoryGameInputMode) {
      if (handleMemoryInput(keyNumber)) {
        e.preventDefault();
        return;
      }
    }
  }

  // Handle dialogue choice selection with number keys
  if (game.dialogueActive && game.dialogueHasChoices && game.dialogueTypingComplete) {
    if (key >= '1' && key <= '9') {
      const choiceIndex = parseInt(key, 10) - 1;
      if (choiceIndex < game.dialogueChoices.length) {
        const choice = game.dialogueChoices[choiceIndex];
        // Trigger choice callback from UI
        const choiceEl = dom.dialogueChoicesEl?.children[choiceIndex];
        if (choiceEl) choiceEl.click();
        e.preventDefault();
        return;
      }
    }
  }

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

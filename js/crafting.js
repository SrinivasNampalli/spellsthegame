import { canvas, ctx, game } from './context.js';
import { items, recipes } from './data.js';
import { clamp } from './utils.js';
import { saveGameState } from './persistence.js';

function getCraftingUILayout() {
  const width = 650;
  const height = 450;
  const x = (canvas.width - width) / 2;
  const y = (canvas.height - height) / 2;

  const grid = {
    slotSize: 55,
    spacing: 4,
    startX: x + 40,
    startY: y + 70,
  };

  const result = {
    size: 70,
    x: grid.startX + 3 * grid.slotSize + 3 * grid.spacing + 100,
    y: grid.startY + grid.slotSize - 5,
  };

  const button = { x: x + width - 150, y: y + height - 105, w: 120, h: 40 };
  const buttonAll = { x: x + width - 150, y: y + height - 60, w: 120, h: 40 };

  return { width, height, x, y, grid, result, button, buttonAll };
}

function getHotbarSlotAt(mx, my) {
  const slotSize = 45;
  const spacing = 3;
  const startX = (canvas.width - (slotSize + spacing) * 9) / 2;
  const startY = canvas.height - slotSize - 15;

  for (let i = 0; i < 9; i++) {
    const x = startX + i * (slotSize + spacing);
    const y = startY;
    if (mx >= x && mx <= x + slotSize && my >= y && my <= y + slotSize) return i;
  }
  return -1;
}

export function getCraftingSlotAt(mx, my) {
  if (!game.craftingOpen) return null;
  const ui = getCraftingUILayout();
  const { slotSize, startX, startY, spacing } = ui.grid;

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const slotX = startX + col * (slotSize + spacing);
      const slotY = startY + row * (slotSize + spacing);
      if (mx >= slotX && mx <= slotX + slotSize && my >= slotY && my <= slotY + slotSize) {
        return { row, col };
      }
    }
  }
  return null;
}

function isCraftButtonClicked(mx, my) {
  const ui = getCraftingUILayout();
  const { x, y, w, h } = ui.button;
  return mx >= x && mx <= x + w && my >= y && my <= y + h;
}

function isCraftAllButtonClicked(mx, my) {
  const ui = getCraftingUILayout();
  const { x, y, w, h } = ui.buttonAll;
  return mx >= x && mx <= x + w && my >= y && my <= y + h;
}

function getStackLimit(itemId) {
  return items[itemId]?.maxStack || 1;
}

function normalizeStack(item) {
  if (!item) return null;
  const count = item.count ?? 1;
  return { ...item, count };
}

function getSlotItem(slotRef) {
  if (slotRef.type === 'inventory') return game.player.inventory[slotRef.index];
  return game.craftingSlots[slotRef.row][slotRef.col];
}

function setSlotItem(slotRef, item) {
  if (slotRef.type === 'inventory') {
    game.player.inventory[slotRef.index] = item;
    return;
  }
  game.craftingSlots[slotRef.row][slotRef.col] = item;
}

function canStackTogether(a, b) {
  if (!a || !b) return false;
  if (a.id !== b.id) return false;
  return getStackLimit(a.id) > 1;
}

function pickUpFromSlot(slotRef, button) {
  const slotItemRaw = normalizeStack(getSlotItem(slotRef));
  if (!slotItemRaw) return false;

  const takeHalf = button === 2 && (slotItemRaw.count || 1) > 1;
  if (takeHalf) {
    const takeCount = Math.ceil(slotItemRaw.count / 2);
    const remaining = slotItemRaw.count - takeCount;
    setSlotItem(slotRef, remaining > 0 ? { ...slotItemRaw, count: remaining } : null);
    game.draggedItem = { ...slotItemRaw, count: takeCount };
  } else {
    setSlotItem(slotRef, null);
    game.draggedItem = { ...slotItemRaw };
  }

  game.draggedFromSlot = { ...slotRef };
  return true;
}

function placeIntoSlot(slotRef, button) {
  const cursorRaw = normalizeStack(game.draggedItem);
  if (!cursorRaw) return false;

  const existingRaw = normalizeStack(getSlotItem(slotRef));
  const cursor = cursorRaw;
  const existing = existingRaw;
  const maxStack = getStackLimit(cursor.id);

  // Right click: place 1
  if (button === 2) {
    if (!existing) {
      setSlotItem(slotRef, { ...cursor, count: 1 });
      cursor.count -= 1;
      game.draggedItem = cursor.count > 0 ? cursor : null;
      game.draggedFromSlot = null;
      return true;
    }

    if (canStackTogether(existing, cursor) && (existing.count || 1) < maxStack) {
      existing.count = (existing.count || 1) + 1;
      setSlotItem(slotRef, existing);
      cursor.count -= 1;
      game.draggedItem = cursor.count > 0 ? cursor : null;
      game.draggedFromSlot = null;
      return true;
    }

    return false;
  }

  // Left click: place whole stack / merge / swap.
  if (!existing) {
    setSlotItem(slotRef, cursor);
    game.draggedItem = null;
    game.draggedFromSlot = null;
    return true;
  }

  if (canStackTogether(existing, cursor) && (existing.count || 1) < maxStack) {
    const space = maxStack - (existing.count || 1);
    const moved = Math.min(space, cursor.count || 1);
    existing.count = (existing.count || 1) + moved;
    cursor.count = (cursor.count || 1) - moved;
    setSlotItem(slotRef, existing);
    game.draggedItem = cursor.count > 0 ? cursor : null;
    game.draggedFromSlot = null;
    return true;
  }

  setSlotItem(slotRef, cursor);
  game.draggedItem = existing;
  game.draggedFromSlot = null;
  return true;
}

function returnDraggedToOrigin() {
  if (!game.draggedItem || !game.draggedFromSlot) return;

  const originItem = getSlotItem(game.draggedFromSlot);
  if (!originItem) {
    setSlotItem(game.draggedFromSlot, game.draggedItem);
    game.draggedItem = null;
    game.draggedFromSlot = null;
    return;
  }

  // Try inventory
  const cursor = normalizeStack(game.draggedItem);
  if (game.player.addItem(cursor)) {
    game.draggedItem = null;
    game.draggedFromSlot = null;
    return;
  }

  setSlotItem(game.draggedFromSlot, cursor);
  game.draggedItem = originItem;
  game.draggedFromSlot = null;
}

function canFitInInventory(itemId, count) {
  const maxStack = getStackLimit(itemId);
  if (maxStack <= 1) {
    const emptySlots = game.player.inventory.filter((s) => s === null).length;
    return emptySlots >= count;
  }

  let space = 0;
  for (const slot of game.player.inventory) {
    if (!slot) continue;
    if (slot.id !== itemId) continue;
    const slotCount = slot.count || 1;
    space += Math.max(0, maxStack - slotCount);
  }

  const emptySlots = game.player.inventory.filter((s) => s === null).length;
  space += emptySlots * maxStack;
  return space >= count;
}

export function checkRecipe() {
  game.craftingResult = null;
  game.craftingResultCount = 1;
  game.craftingMatchedRecipe = null;
  game.craftingConsumeSlots = null;
  game.craftingMaxPossible = 0;

  const gridItems = {};
  const gridSlotsByItem = {};
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const item = game.craftingSlots[row][col];
      if (!item) continue;
      const itemCount = item.count || 1;
      gridItems[item.id] = (gridItems[item.id] || 0) + itemCount;
      if (!gridSlotsByItem[item.id]) gridSlotsByItem[item.id] = [];
      gridSlotsByItem[item.id].push({ row, col, count: itemCount });
    }
  }

  let best = null; // { recipe, score, consumeSlots, maxCrafts }
  for (const recipe of recipes) {
    const needed = recipe.ingredients;
    let matches = true;

    for (const [itemId, count] of Object.entries(needed)) {
      if ((gridItems[itemId] || 0) < count) {
        matches = false;
        break;
      }
    }

    if (matches) {
      for (const itemId of Object.keys(gridItems)) {
        if (!(itemId in needed)) {
          matches = false;
          break;
        }
      }
    }

    if (!matches) continue;

    let maxCrafts = Infinity;
    for (const [itemId, neededCount] of Object.entries(needed)) {
      const available = gridItems[itemId] || 0;
      maxCrafts = Math.min(maxCrafts, Math.floor(available / neededCount));
    }

    const consumeSlots = [];
    for (const [itemId, neededCount] of Object.entries(needed)) {
      const slots = gridSlotsByItem[itemId] || [];
      let remaining = neededCount;
      for (const slot of slots) {
        if (remaining <= 0) break;
        const takeFromSlot = Math.min(remaining, slot.count);
        for (let i = 0; i < takeFromSlot; i++) consumeSlots.push({ row: slot.row, col: slot.col });
        remaining -= takeFromSlot;
      }
    }

    // Prefer recipes with more total required items (sticks beats planks if you put 2 wood)
    const requiredTotal = Object.values(needed).reduce((sum, n) => sum + n, 0);
    const requiredTypes = Object.keys(needed).length;
    const score = requiredTotal * 10000 + requiredTypes * 100;
    if (!best || score > best.score) best = { recipe, score, consumeSlots, maxCrafts };
  }

  if (!best) return;
  game.craftingResult = best.recipe.result;
  game.craftingResultCount = best.recipe.count || 1;
  game.craftingMatchedRecipe = best.recipe;
  game.craftingConsumeSlots = best.consumeSlots;
  game.craftingMaxPossible = best.maxCrafts;
}

export function craftItem() {
  if (!game.craftingResult || !game.craftingMatchedRecipe || !game.craftingConsumeSlots) return;
  const resultId = game.craftingResult;
  const resultCount = game.craftingResultCount || 1;
  if (!canFitInInventory(resultId, resultCount)) return;

  for (const slot of game.craftingConsumeSlots) {
    const slotItem = game.craftingSlots[slot.row][slot.col];
    if (!slotItem) continue;
    const nextCount = (slotItem.count || 1) - 1;
    if (nextCount <= 0) game.craftingSlots[slot.row][slot.col] = null;
    else slotItem.count = nextCount;
  }

  game.player.addItem({ ...items[resultId], id: resultId, count: resultCount });
  checkRecipe();
  saveGameState();
}

export function craftAllItems() {
  if (!game.craftingResult || game.craftingMaxPossible <= 0) return;
  const times = game.craftingMaxPossible;
  for (let i = 0; i < times; i++) {
    if (!game.craftingResult) break;
    craftItem();
  }
}

export function toggleCrafting() {
  game.craftingOpen = !game.craftingOpen;
  if (!game.craftingOpen) {
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        if (!game.craftingSlots[row][col]) continue;
        game.player.addItem(game.craftingSlots[row][col]);
        game.craftingSlots[row][col] = null;
      }
    }
    if (game.draggedItem) {
      game.player.addItem(game.draggedItem);
      game.draggedItem = null;
      game.draggedFromSlot = null;
    }

    game.splitPlaceMode = false;
    game.craftingResult = null;
    game.craftingResultCount = 1;
    game.craftingMatchedRecipe = null;
  }
}

export function toggleGuide() {
  game.guideOpen = !game.guideOpen;
  if (game.guideOpen) game.guideScroll = 0;
}

export function handleMouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  game.mouseX = e.clientX - rect.left;
  game.mouseY = e.clientY - rect.top;
}

export function handleMouseWheel(e) {
  if (!game.guideOpen) return;
  e.preventDefault();
  const delta = Math.sign(e.deltaY);
  game.guideScroll = Math.max(0, game.guideScroll + delta);
}

export function handleDoubleClick(e) {
  if (!game.craftingOpen) return;
  if (game.draggedItem) return;
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const craftSlot = getCraftingSlotAt(mouseX, mouseY);
  if (craftSlot !== null && game.craftingSlots[craftSlot.row][craftSlot.col]) {
    if (pickUpFromSlot({ type: 'crafting', row: craftSlot.row, col: craftSlot.col }, 2)) {
      game.splitPlaceMode = true;
      checkRecipe();
    }
    return;
  }

  const hotbarSlot = getHotbarSlotAt(mouseX, mouseY);
  if (hotbarSlot !== -1 && game.player.inventory[hotbarSlot]) {
    const item = game.player.inventory[hotbarSlot];
    if ((item.count || 1) > 1) {
      if (pickUpFromSlot({ type: 'inventory', index: hotbarSlot }, 2)) {
        game.splitPlaceMode = true;
      }
    }
  }
}

export function handleMouseDown(e) {
  if (!game.craftingOpen && !game.guideOpen) return;
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const button = e.button ?? 0;
  game.dragButton = button;

  if (game.draggedItem) return;

  const craftSlot = getCraftingSlotAt(mouseX, mouseY);
  if (craftSlot !== null && game.craftingSlots[craftSlot.row][craftSlot.col]) {
    pickUpFromSlot({ type: 'crafting', row: craftSlot.row, col: craftSlot.col }, button);
    checkRecipe();
    return;
  }

  const hotbarSlot = getHotbarSlotAt(mouseX, mouseY);
  if (hotbarSlot !== -1 && game.player.inventory[hotbarSlot]) {
    game.splitPlaceMode = false;
    pickUpFromSlot({ type: 'inventory', index: hotbarSlot }, button);
    return;
  }
}

export function handleMouseUp(e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const button = e.button ?? game.dragButton ?? 0;

  if (game.craftingOpen && game.craftingResult && isCraftButtonClicked(mouseX, mouseY)) {
    craftItem();
    return;
  }
  if (game.craftingOpen && game.craftingResult && isCraftAllButtonClicked(mouseX, mouseY)) {
    craftAllItems();
    return;
  }

  if (!game.draggedItem) return;

  const craftSlot = getCraftingSlotAt(mouseX, mouseY);
  if (craftSlot !== null) {
    const effectiveButton = game.craftingOpen && game.splitPlaceMode && button === 0 ? 2 : button;
    const changed = placeIntoSlot({ type: 'crafting', row: craftSlot.row, col: craftSlot.col }, effectiveButton);
    if (changed) checkRecipe();
    if (!game.draggedItem) game.splitPlaceMode = false;
    return;
  }

  const hotbarSlot = getHotbarSlotAt(mouseX, mouseY);
  if (hotbarSlot !== -1) {
    placeIntoSlot({ type: 'inventory', index: hotbarSlot }, button);
    game.splitPlaceMode = false;
    return;
  }

  // Clicked empty space: return to origin when possible
  if (game.draggedFromSlot) {
    returnDraggedToOrigin();
    if (!game.draggedItem) game.splitPlaceMode = false;
  }
}

function drawCraftingSlot(x, y, size, row, col) {
  ctx.fillStyle = 'rgba(40, 40, 40, 0.95)';
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
  ctx.strokeStyle = '#777';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, size, size);

  const item = game.craftingSlots[row][col];
  if (!item) return;
  ctx.font = '38px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillText(item.icon || '❓', x + size / 2, y + size / 2);

  if (item.count && item.count > 1) {
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.5;
    ctx.strokeText(item.count.toString(), x + size - 10, y + size - 6);
    ctx.fillText(item.count.toString(), x + size - 10, y + size - 6);
  }
}

function drawCraftingHints(x, y, width, height) {
  const hintX = x + 20;
  const hintY = y + 250;
  const hintWidth = width - 40;

  ctx.fillStyle = 'rgba(50, 40, 30, 0.6)';
  ctx.fillRect(hintX, hintY, hintWidth, 140);
  ctx.strokeStyle = '#5a4a3a';
  ctx.lineWidth = 2;
  ctx.strokeRect(hintX, hintY, hintWidth, 140);

  ctx.fillStyle = '#ffa500';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Crafting Help', hintX + 10, hintY + 20);

  const gridCounts = {};
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const it = game.craftingSlots[row][col];
      if (!it) continue;
      gridCounts[it.id] = (gridCounts[it.id] || 0) + (it.count || 1);
    }
  }
  const gridNonEmpty = Object.keys(gridCounts).length > 0;

  ctx.fillStyle = '#ddd';
  ctx.font = '12px monospace';
  let offsetY = hintY + 40;

  if (game.craftingResult && game.craftingMatchedRecipe) {
    const resultName = items[game.craftingResult]?.name || game.craftingResult;
    const resultCount = game.craftingResultCount || 1;
    ctx.fillStyle = '#4f4';
    ctx.fillText(`Matched: ${resultName} x${resultCount}`, hintX + 10, offsetY);
    offsetY += 18;
    ctx.fillStyle = '#ddd';
    ctx.fillText('Ingredients (for 1 craft):', hintX + 10, offsetY);
    offsetY += 16;

    for (const [itemId, needed] of Object.entries(game.craftingMatchedRecipe.ingredients || {})) {
      const label = items[itemId]?.name || itemId;
      const have = gridCounts[itemId] || 0;
      ctx.fillStyle = have >= needed ? '#cfc' : '#fbb';
      ctx.fillText(`  - ${label}: ${have}/${needed}`, hintX + 15, offsetY);
      offsetY += 14;
      if (offsetY > hintY + 130) break;
    }
    return;
  }

  if (gridNonEmpty) {
    ctx.fillStyle = '#ddd';
    ctx.fillText('Grid:', hintX + 10, offsetY);
    offsetY += 16;
    for (const [id, cnt] of Object.entries(gridCounts).slice(0, 4)) {
      const label = items[id]?.name || id;
      ctx.fillStyle = '#ccc';
      ctx.fillText(`  - ${label} x${cnt}`, hintX + 15, offsetY);
      offsetY += 14;
    }
    offsetY += 6;
    ctx.fillStyle = '#ffcc66';
    ctx.fillText('No recipe matched yet.', hintX + 10, offsetY);
    offsetY += 16;
    ctx.fillStyle = '#bbb';
    ctx.fillText('Try these starters:', hintX + 10, offsetY);
    offsetY += 14;
    ctx.fillText('  - Sticks: 2x Wood', hintX + 15, offsetY);
    offsetY += 14;
    ctx.fillText('  - Planks: 1x Wood', hintX + 15, offsetY);
    return;
  }

  ctx.fillStyle = '#ddd';
  ctx.fillText('Starter recipes:', hintX + 10, offsetY);
  offsetY += 16;
  ctx.fillStyle = '#ccc';
  ctx.fillText('  - Sticks: 2x Wood', hintX + 15, offsetY);
  offsetY += 14;
  ctx.fillText('  - Planks: 1x Wood', hintX + 15, offsetY);
  offsetY += 14;
  ctx.fillText('  - Torch: 1x Coal + 1x Stick', hintX + 15, offsetY);
  offsetY += 14;
  ctx.fillStyle = '#aaa';
  ctx.fillText('Need Wood? Gather from the Tree in Village Hub (Press E).', hintX + 10, offsetY);
}

export function drawCraftingUI() {
  const ui = getCraftingUILayout();
  const { width, height, x, y } = ui;

  const gradient = ctx.createLinearGradient(x, y, x, y + height);
  gradient.addColorStop(0, 'rgba(40, 30, 20, 0.98)');
  gradient.addColorStop(1, 'rgba(25, 20, 15, 0.98)');
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);

  ctx.strokeStyle = '#5a4a3a';
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, width, height);
  ctx.strokeStyle = '#3a2a1a';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 2, y + 2, width - 4, height - 4);

  ctx.fillStyle = 'rgba(60, 45, 30, 0.8)';
  ctx.fillRect(x, y, width, 50);
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 26px Arial';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 4;
  ctx.fillText('Crafting Table', x + width / 2, y + 33);
  ctx.shadowBlur = 0;

  const { slotSize, startX, startY, spacing } = ui.grid;
  ctx.fillStyle = 'rgba(80, 60, 40, 0.4)';
  ctx.fillRect(startX - 10, startY - 10, 3 * slotSize + 2 * spacing + 20, 3 * slotSize + 2 * spacing + 20);

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const slotX = startX + col * (slotSize + spacing);
      const slotY = startY + row * (slotSize + spacing);
      drawCraftingSlot(slotX, slotY, slotSize, row, col);
    }
  }

  ctx.fillStyle = '#ffa500';
  ctx.font = '50px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ff8800';
  ctx.shadowBlur = 10;
  ctx.fillText('➜', startX + 3 * slotSize + 3 * spacing + 50, startY + slotSize + spacing);
  ctx.shadowBlur = 0;

  const resultX = ui.result.x;
  const resultY = ui.result.y;
  const resultSize = ui.result.size;

  if (game.craftingResult) {
    ctx.shadowColor = '#44ff44';
    ctx.shadowBlur = 20;
    ctx.fillStyle = 'rgba(50, 200, 50, 0.3)';
    ctx.fillRect(resultX, resultY, resultSize, resultSize);
    ctx.strokeStyle = '#4f4';
    ctx.lineWidth = 3;
    ctx.strokeRect(resultX, resultY, resultSize, resultSize);
    ctx.shadowBlur = 0;

    ctx.font = '50px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(items[game.craftingResult].icon, resultX + resultSize / 2, resultY + resultSize / 2);

    const count = game.craftingResultCount || 1;
    if (count > 1) {
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(`x${count}`, resultX + resultSize - 12, resultY + resultSize - 8);
      ctx.fillText(`x${count}`, resultX + resultSize - 12, resultY + resultSize - 8);
    }

    ctx.fillStyle = '#4f4';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(items[game.craftingResult].name, resultX + resultSize / 2, resultY + resultSize + 20);

    if (game.craftingMaxPossible > 1) {
      ctx.fillStyle = '#ffcc00';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`(Max: ${game.craftingMaxPossible}x)`, resultX + resultSize / 2, resultY + resultSize + 35);
    }

    const btnX = ui.button.x;
    const btnY = ui.button.y;
    ctx.fillStyle = '#44ff44';
    ctx.fillRect(btnX, btnY, 120, 40);
    ctx.strokeStyle = '#2a2';
    ctx.lineWidth = 3;
    ctx.strokeRect(btnX, btnY, 120, 40);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('CRAFT', btnX + 60, btnY + 26);

    if (game.craftingMaxPossible > 1) {
      const btnAllX = ui.buttonAll.x;
      const btnAllY = ui.buttonAll.y;
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(btnAllX, btnAllY, 120, 40);
      ctx.strokeStyle = '#c80';
      ctx.lineWidth = 3;
      ctx.strokeRect(btnAllX, btnAllY, 120, 40);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('CRAFT ALL', btnAllX + 60, btnAllY + 20);
      ctx.font = 'bold 11px Arial';
      ctx.fillText(`(${game.craftingMaxPossible}x)`, btnAllX + 60, btnAllY + 34);
    }
  } else {
    ctx.fillStyle = 'rgba(60, 60, 60, 0.5)';
    ctx.fillRect(resultX, resultY, resultSize, resultSize);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.strokeRect(resultX, resultY, resultSize, resultSize);
    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('?', resultX + resultSize / 2, resultY + resultSize / 2);
  }

  drawCraftingHints(x, y, width, height);

  ctx.fillStyle = '#bbb';
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Drag items into the 3x3 grid, then click CRAFT', x + width / 2, y + height - 20);
  ctx.fillStyle = '#999';
  ctx.font = '10px monospace';
  ctx.fillText('C to close | Right-click places 1 | Double-click splits | G recipe guide', x + width / 2, y + height - 8);
}

export function drawGuideUI() {
  const width = 520;
  const height = 420;
  const x = (canvas.width - width) / 2;
  const y = (canvas.height - height) / 2;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);

  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Recipe Guide', x + width / 2, y + 28);

  const all = recipes.slice();
  all.sort((a, b) => (a.result > b.result ? 1 : -1));

  ctx.textAlign = 'left';
  ctx.font = '12px monospace';
  let rowY = y + 50;
  const startIndex = Math.max(0, game.guideScroll);
  const visibleLines = 22;
  const slice = all.slice(startIndex, startIndex + visibleLines);

  for (const r of slice) {
    const item = items[r.result];
    const name = item?.name || r.result;
    const icon = item?.icon || '❓';
    const ing = Object.entries(r.ingredients)
      .map(([id, n]) => `${n}x ${(items[id]?.name || id)}`)
      .join(', ');
    ctx.fillStyle = '#ddd';
    ctx.fillText(`${icon} ${name}  <=  ${ing}`, x + 18, rowY);
    rowY += 16;
  }

  ctx.fillStyle = '#999';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Mouse wheel to scroll | G to close', x + width / 2, y + height - 12);
  ctx.restore();
}


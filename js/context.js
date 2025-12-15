export const canvas = document.getElementById('gameCanvas');
export const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

export const dom = {
  backButtonEl: document.getElementById('back-button'),
  toastEl: document.getElementById('toast'),
  dialogueBox: document.getElementById('dialogue-box'),
  npcNameEl: document.getElementById('npc-name'),
  dialogueTextEl: document.getElementById('dialogue-text'),
  dialogueChoicesEl: document.getElementById('dialogue-choices'),
  dialogueContinueEl: document.getElementById('dialogue-continue'),
  dialogueBlipAudio: document.getElementById('dialogue-blip'),
  dialogueChoiceAudio: document.getElementById('dialogue-choice'),
};

export const game = {
  lastTime: 0,

  player: null,
  currentBiome: 'home',

  // Progress flags (persisted)
  flags: {
    libraryTrialComplete: false,
    waterUnlocked: false,
  },

  // NPCs
  npcs: [],
  interactableNearby: null,
  dialogueActive: false,
  currentNPC: null,

  // Dialogue typing animation
  dialogueFullText: '',
  dialogueVisibleText: '',
  dialogueTypingIndex: 0,
  dialogueTypingSpeed: 40, // characters per second
  dialogueTypingTimer: 0,
  dialogueTypingComplete: false,
  dialogueHasChoices: false,
  dialogueChoices: [],
  dialogueLastBlipTime: 0,

  // Transitions
  transitioning: false,
  transitionAlpha: 0,
  transitionTarget: null,
  transitionMessages: [],
  transitionMessageIndex: 0,
  transitionTimer: 0,

  // Crafting/Guide
  craftingOpen: false,
  craftingUnlocked: false, // Unlocked by Elder Mage
  guideOpen: false,
  guideScroll: 0,
  discoveredRecipes: new Set(),

  // Inventory drag
  mouseX: 0,
  mouseY: 0,
  draggedItem: null,
  draggedFromSlot: null,
  dragButton: 0,
  splitPlaceMode: false,

  // Crafting slots
  craftingSlots: [
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ],
  craftingResult: null,
  craftingResultCount: 1,
  craftingMatchedRecipe: null,
  craftingConsumeSlots: null,
  craftingMaxPossible: 0,

  // World interactions
  droppedItems: [],
  resourceNodes: [],
  interactableNodeNearby: null,

  // Combat
  enemies: [],
  projectiles: [],
  damageNumbers: [],
  shakeMs: 0,
  shakeStrength: 0,
  shakeX: 0,
  shakeY: 0,
  trialActive: false, // Training Droid trial
  trialCompleted: false, // Trial completed successfully

  // Library activities
  libraryActivitiesUnlocked: false,
  alchemyStationActive: false,
  runicPuzzleActive: false,
  tomeMemoryActive: false,

  // Mini-game states
  runicPuzzle: null,
  runicPuzzleInputMode: false,
  memoryGame: null,
  memoryGameInputMode: false,

  // Particles
  particles: [],
  playerStepTimerMs: 0,

  // Equipment
  equippedWeapon: null,

  // UI animation state
  ui: {
    healthShown: 100,
    manaShown: 100,
    xpShown: 0,
    levelFlashMs: 0,
  },

  // Save timer
  _saveTimerMs: 0,
  lastDiscoveryCheckMs: 0,
};

export const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  e: false,
  f: false,
  r: false,
  c: false,
  g: false,
  q: false,
  h: false,
  1: false,
  2: false,
  3: false,
  4: false,
  5: false,
  6: false,
  7: false,
  8: false,
  9: false,
};

import { canvas, ctx, game, dom } from './context.js';
import { items } from './data.js';
import { showDialogue } from './ui.js';
import { saveGameState } from './persistence.js';
import { spawnParticle } from './particles.js';

// Interactive Station NPCs
export function createLibraryStations() {
  const stations = [];

  // ⚗️ Alchemy Crucible Station
  const alchemyCrucible = {
    x: 0,
    y: 0,
    width: 60,
    height: 60,
    name: 'Alchemy Crucible',
    biome: 'mysticalLibrary',
    anchor: { x: 0.25, y: 0.65 },
    color: '#ff6600',
    interactionRange: 90,

    canInteract(player) {
      if (!game.alchemyStationActive) return false;
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < this.interactionRange;
    },

    draw(ctx) {
      if (!game.libraryActivitiesUnlocked) return;

      // Glowing crucible
      const centerX = this.x + this.width / 2;
      const centerY = this.y + this.height / 2;

      ctx.save();
      // Outer glow
      const gradient = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, 40);
      gradient.addColorStop(0, 'rgba(255, 120, 20, 0.8)');
      gradient.addColorStop(0.5, 'rgba(255, 80, 0, 0.4)');
      gradient.addColorStop(1, 'rgba(255, 60, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(this.x - 20, this.y - 20, this.width + 40, this.height + 40);

      // Crucible body
      ctx.fillStyle = game.alchemyStationActive ? '#ff8833' : '#666666';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 25, 0, Math.PI * 2);
      ctx.fill();

      // Inner potion
      if (game.alchemyStationActive) {
        const bubbleTime = Date.now() / 200;
        ctx.fillStyle = `rgba(255, 200, 100, ${0.7 + Math.sin(bubbleTime) * 0.3})`;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 18, 0, Math.PI * 2);
        ctx.fill();
      }

      // Label
      ctx.fillStyle = '#ffcc00';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚗️ Alchemy', centerX, this.y - 10);
      ctx.restore();
    },

    interact() {
      if (!game.alchemyStationActive) {
        showDialogue('Alchemy Crucible', 'The crucible is dormant. Speak with the Archive Keeper to unlock it.');
        return;
      }

      startAlchemyMinigame();
    }
  };

  // 🔮 Runic Altar Station
  const runicAltar = {
    x: 0,
    y: 0,
    width: 60,
    height: 60,
    name: 'Runic Altar',
    biome: 'mysticalLibrary',
    anchor: { x: 0.5, y: 0.72 },
    color: '#8844ff',
    interactionRange: 90,

    canInteract(player) {
      if (!game.runicPuzzleActive) return false;
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < this.interactionRange;
    },

    draw(ctx) {
      if (!game.libraryActivitiesUnlocked) return;

      const centerX = this.x + this.width / 2;
      const centerY = this.y + this.height / 2;

      ctx.save();
      // Magical circle
      const time = Date.now() / 1000;
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + time * 0.5;
        const radius = 30;
        const px = centerX + Math.cos(angle) * radius;
        const py = centerY + Math.sin(angle) * radius;

        const runeGradient = ctx.createRadialGradient(px, py, 2, px, py, 8);
        runeGradient.addColorStop(0, game.runicPuzzleActive ? '#aa66ff' : '#555555');
        runeGradient.addColorStop(1, 'rgba(170, 102, 255, 0)');
        ctx.fillStyle = runeGradient;
        ctx.beginPath();
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Center crystal
      ctx.fillStyle = game.runicPuzzleActive ? '#cc88ff' : '#888888';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 15, 0, Math.PI * 2);
      ctx.fill();

      // Label
      ctx.fillStyle = '#ffcc00';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🔮 Runes', centerX, this.y - 10);
      ctx.restore();
    },

    interact() {
      if (!game.runicPuzzleActive) {
        showDialogue('Runic Altar', 'The altar\'s runes are dormant. Speak with the Archive Keeper to awaken them.');
        return;
      }

      startRunicPuzzle();
    }
  };

  // 📚 Memory Tome Station
  const memoryTome = {
    x: 0,
    y: 0,
    width: 60,
    height: 60,
    name: 'Memory Tome',
    biome: 'mysticalLibrary',
    anchor: { x: 0.75, y: 0.65 },
    color: '#44aaff',
    interactionRange: 90,

    canInteract(player) {
      if (!game.tomeMemoryActive) return false;
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < this.interactionRange;
    },

    draw(ctx) {
      if (!game.libraryActivitiesUnlocked) return;

      const centerX = this.x + this.width / 2;
      const centerY = this.y + this.height / 2;

      ctx.save();
      // Book glow
      const pulseTime = Date.now() / 1500;
      const glow = 0.5 + Math.sin(pulseTime) * 0.3;

      ctx.shadowColor = game.tomeMemoryActive ? `rgba(100, 200, 255, ${glow})` : 'rgba(100, 100, 100, 0.3)';
      ctx.shadowBlur = 20;

      // Book
      ctx.fillStyle = game.tomeMemoryActive ? '#6699ff' : '#777777';
      ctx.fillRect(centerX - 20, centerY - 15, 40, 30);

      // Pages
      ctx.fillStyle = game.tomeMemoryActive ? '#ffffff' : '#cccccc';
      ctx.fillRect(centerX - 18, centerY - 13, 36, 26);

      // Runes on pages
      if (game.tomeMemoryActive) {
        ctx.fillStyle = '#4488ff';
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('?', centerX, centerY + 5);
      }

      // Label
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffcc00';
      ctx.font = '12px monospace';
      ctx.fillText('📚 Tome', centerX, this.y - 10);
      ctx.restore();
    },

    interact() {
      if (!game.tomeMemoryActive) {
        showDialogue('Memory Tome', 'The tome is sealed. Speak with the Archive Keeper to unlock it.');
        return;
      }

      startMemoryGame();
    }
  };

  stations.push(alchemyCrucible, runicAltar, memoryTome);
  return stations;
}

// Alchemy Minigame - Combine items
function startAlchemyMinigame() {
  const recipes = [
    { ingredients: ['wood', 'wood'], result: 'charcoal', resultCount: 2, desc: 'Burning wood creates charcoal' },
    { ingredients: ['berry', 'berry', 'berry'], result: 'potion_health', resultCount: 1, desc: 'Berries form healing essence' },
    { ingredients: ['mana_crystal', 'water_core'], result: 'potion_mana', resultCount: 2, desc: 'Crystals + water = mana' },
    { ingredients: ['fire_spell', 'iron'], result: 'enchanted_iron', resultCount: 1, desc: 'Fire-infused iron' },
  ];

  showDialogue('Alchemy Crucible',
    'Place items from your inventory into the crucible. Discover powerful combinations!\n\n💡 Try: 2 Wood → Charcoal\n💡 Try: 3 Berries → Health Potion',
    [
      {
        text: 'Open Crafting Table (C)',
        callback: () => {
          game.craftingOpen = true;
        }
      },
      {
        text: 'Tell me about alchemy',
        nextDialogue: 'Alchemy is the art of transformation. Combine materials in your crafting grid to discover new items. Not all combinations work - experiment!'
      }
    ]
  );
}

// Runic Puzzle - Pattern matching
function startRunicPuzzle() {
  if (!game.runicPuzzle) {
    game.runicPuzzle = {
      pattern: [],
      playerInput: [],
      difficulty: 1,
      score: 0
    };
  }

  // Generate random pattern
  const runes = ['🔥', '💧', '🌿', '⚡', '🌙', '☀️'];
  const patternLength = 3 + game.runicPuzzle.difficulty;
  game.runicPuzzle.pattern = [];
  for (let i = 0; i < patternLength; i++) {
    game.runicPuzzle.pattern.push(runes[Math.floor(Math.random() * runes.length)]);
  }
  game.runicPuzzle.playerInput = [];

  showDialogue('Runic Altar',
    `Remember this pattern:\n\n${game.runicPuzzle.pattern.join(' ')}\n\n(Memorize it!)`,
    [
      {
        text: 'I\'ve memorized it!',
        nextDialogue: `Now recreate the pattern! What was the sequence?\n\nUse your keyboard:\n1 = 🔥  2 = 💧  3 = 🌿\n4 = ⚡  5 = 🌙  6 = ☀️\n\n(Type the numbers to match the pattern)`,
        callback: () => {
          game.runicPuzzleInputMode = true;
        }
      },
      {
        text: 'Show me again',
        callback: () => startRunicPuzzle()
      }
    ]
  );
}

// Memory Game - Remember symbols
function startMemoryGame() {
  if (!game.memoryGame) {
    game.memoryGame = {
      sequence: [],
      playerIndex: 0,
      round: 1,
      score: 0
    };
  }

  const symbols = ['🗡️', '🛡️', '💎', '🔑', '📜', '⭐', '🌟', '💫'];
  const sequenceLength = 3 + Math.floor(game.memoryGame.round / 2);

  game.memoryGame.sequence = [];
  for (let i = 0; i < sequenceLength; i++) {
    game.memoryGame.sequence.push(symbols[Math.floor(Math.random() * symbols.length)]);
  }
  game.memoryGame.playerIndex = 0;

  showDialogue('Memory Tome',
    `📖 Round ${game.memoryGame.round}\n\nThe tome reveals ancient symbols:\n\n${game.memoryGame.sequence.join('  ')}\n\nRemember them...`,
    [
      {
        text: 'I remember! Test me.',
        nextDialogue: 'Recall the sequence. Press the numbers:\n1=🗡️ 2=🛡️ 3=💎 4=🔑\n5=📜 6=⭐ 7=🌟 8=💫',
        callback: () => {
          game.memoryGameInputMode = true;
        }
      },
      {
        text: 'Show me again',
        callback: () => startMemoryGame()
      }
    ]
  );
}

// Handle runic puzzle input
export function handleRunicInput(keyNumber) {
  if (!game.runicPuzzleInputMode || !game.runicPuzzle) return false;

  const runes = ['🔥', '💧', '🌿', '⚡', '🌙', '☀️'];
  const runeIndex = keyNumber - 1;

  if (runeIndex < 0 || runeIndex >= runes.length) return false;

  game.runicPuzzle.playerInput.push(runes[runeIndex]);

  // Check if complete
  if (game.runicPuzzle.playerInput.length >= game.runicPuzzle.pattern.length) {
    const correct = game.runicPuzzle.pattern.every((rune, i) => rune === game.runicPuzzle.playerInput[i]);

    game.runicPuzzleInputMode = false;

    if (correct) {
      game.runicPuzzle.score += 10 * game.runicPuzzle.difficulty;
      game.runicPuzzle.difficulty++;

      showDialogue('Runic Altar',
        `✨ CORRECT! The runes align!\n\nScore: ${game.runicPuzzle.score}\nDifficulty: ${game.runicPuzzle.difficulty}`,
        [
          {
            text: 'Continue to next level',
            callback: () => startRunicPuzzle()
          },
          {
            text: 'Claim rewards and exit',
            callback: () => {
              giveRunicRewards();
            }
          }
        ]
      );
    } else {
      showDialogue('Runic Altar',
        `❌ INCORRECT!\n\nYour pattern: ${game.runicPuzzle.playerInput.join(' ')}\nCorrect: ${game.runicPuzzle.pattern.join(' ')}\n\nThe magic collapses...`,
        [
          {
            text: 'Try again from the start',
            callback: () => {
              game.runicPuzzle.difficulty = 1;
              startRunicPuzzle();
            }
          }
        ]
      );
    }
  }

  return true;
}

// Handle memory game input
export function handleMemoryInput(keyNumber) {
  if (!game.memoryGameInputMode || !game.memoryGame) return false;

  const symbols = ['🗡️', '🛡️', '💎', '🔑', '📜', '⭐', '🌟', '💫'];
  const symbolIndex = keyNumber - 1;

  if (symbolIndex < 0 || symbolIndex >= symbols.length) return false;

  const correctSymbol = game.memoryGame.sequence[game.memoryGame.playerIndex];
  const chosenSymbol = symbols[symbolIndex];

  if (chosenSymbol === correctSymbol) {
    game.memoryGame.playerIndex++;

    // Check if sequence complete
    if (game.memoryGame.playerIndex >= game.memoryGame.sequence.length) {
      game.memoryGame.score += game.memoryGame.round * 5;
      game.memoryGame.round++;
      game.memoryGameInputMode = false;

      showDialogue('Memory Tome',
        `✅ PERFECT! The tome glows with approval!\n\nScore: ${game.memoryGame.score}\nRound: ${game.memoryGame.round}`,
        [
          {
            text: 'Continue to next round',
            callback: () => startMemoryGame()
          },
          {
            text: 'Claim knowledge and exit',
            callback: () => giveMemoryRewards()
          }
        ]
      );
    }
  } else {
    game.memoryGameInputMode = false;

    showDialogue('Memory Tome',
      `❌ WRONG! You chose ${chosenSymbol}, but it was ${correctSymbol}\n\nThe tome slams shut...`,
      [
        {
          text: 'Try again from Round 1',
          callback: () => {
            game.memoryGame.round = 1;
            startMemoryGame();
          }
        }
      ]
    );
  }

  return true;
}

function giveRunicRewards() {
  const level = game.runicPuzzle.difficulty - 1;
  showDialogue('Runic Altar', `The altar rewards your mastery!\n\n+${level * 50} XP\n+1 Mana Crystal`);

  game.player.addExperience(level * 50);

  if (items.mana_crystal) {
    game.player.addItem({ ...items.mana_crystal, id: 'mana_crystal', count: 1 });
  }

  game.runicPuzzle = null;
  saveGameState();
}

function giveMemoryRewards() {
  const round = game.memoryGame.round - 1;
  showDialogue('Memory Tome', `The tome shares its wisdom!\n\n+${round * 40} XP\n+1 Ancient Page`);

  game.player.addExperience(round * 40);

  if (items.ancient_page) {
    game.player.addItem({ ...items.ancient_page, id: 'ancient_page', count: 1 });
  }

  game.memoryGame = null;
  saveGameState();
}

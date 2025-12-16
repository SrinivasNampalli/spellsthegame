import { canvas, ctx, game, dom } from './context.js';
import { items } from './data.js';
import { showDialogue, hideDialogue } from './ui.js';
import { saveGameState } from './persistence.js';
import { spawnParticle } from './particles.js';

// Show mini-game overlay
export function showMinigame(title, content) {
  game.minigameActive = true;
  dom.minigameOverlay.classList.remove('hidden');
  dom.minigameTitle.textContent = title;
  dom.minigameContent.innerHTML = content;
}

// Hide mini-game overlay
export function hideMinigame() {
  game.minigameActive = false;
  dom.minigameOverlay.classList.add('hidden');
  dom.minigameContent.innerHTML = '';
  dom.minigameControls.innerHTML = '';
  game.runicPuzzleInputMode = false;
  game.memoryGameInputMode = false;
}

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

      startAlchemyGame();
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

// ⚗️ ALCHEMY GAME - Interactive Learning & Discovery
function startAlchemyGame() {
  if (!game.alchemyGame) {
    game.alchemyGame = {
      discovered: [],
      experimentsRun: 0
    };
  }

  const discoveries = game.alchemyGame.discovered.length;

  showDialogue('Alchemy Crucible',
    `🧪 INTERACTIVE ALCHEMY LAB\n\nExperiments Completed: ${game.alchemyGame.experimentsRun}\nDiscoveries: ${discoveries}/5\n\nCombine ingredients to discover new recipes!\nEach discovery reveals secrets about the world...`,
    [
      {
        text: 'What can I discover?',
        nextDialogue: 'Try different combinations:\n🪵+🪵 = ? (Energy)\n🍓+🍓+🍓 = ? (Healing)\n💎+💧 = ? (Power)\n🔥+⚙️ = ? (Enhancement)\n\nEach discovery unlocks lore about the MYSTERIOUS STRANGER...',
        nextChoices: [
          {
            text: 'Open Crafting (C) to experiment',
            callback: () => {
              game.craftingOpen = true;
              game.alchemyMode = true;
            }
          }
        ]
      },
      {
        text: 'Tell me what you know',
        nextDialogue: discoveries === 0 ?
          'The crucible remains silent. Make discoveries to unlock its secrets...' :
          `The crucible whispers... "${getAlchemyLore(discoveries)}"`
      }
    ]
  );
}

function getAlchemyLore(count) {
  const lore = [
    'The Mysterious Stranger... I sense darkness in that name.',
    'Ancient texts speak of a betrayer who sought forbidden knowledge.',
    'The Stranger was once a keeper here... before the corruption.',
    'They stole something from this library. Something powerful.',
    'The void calls to them. They seek to merge realms... to become something MORE.'
  ];
  return lore[Math.min(count - 1, lore.length - 1)];
}

// 🔮 RUNIC ALTAR - 2 Level Spell Crafting
function startRunicPuzzle() {
  if (!game.runicPuzzle) {
    game.runicPuzzle = {
      level: 1,
      runesCollected: [],
      targetSpell: null,
      attempts: 3
    };
  }

  const level = game.runicPuzzle.level;

  if (level === 1) {
    // Level 1: Craft ICE SPELL
    const content = `
      <div style="text-align: center;">
        <h3 style="color: #88ddff;">❄️ LEVEL 1: Craft the ICE SPELL</h3>
        <p>The altar reveals the formula:</p>
        <div style="font-size: 32px; margin: 20px 0;">💧 + 🌙 + 💧 = ❄️</div>
        <p style="color: #aaa; margin-top: 20px;">Click runes to weave the spell:</p>
        <div class="rune-grid">
          <button class="rune-button" data-rune="🔥" data-index="1">🔥<div class="rune-button-key">1</div></button>
          <button class="rune-button" data-rune="💧" data-index="2">💧<div class="rune-button-key">2</div></button>
          <button class="rune-button" data-rune="🌿" data-index="3">🌿<div class="rune-button-key">3</div></button>
          <button class="rune-button" data-rune="⚡" data-index="4">⚡<div class="rune-button-key">4</div></button>
          <button class="rune-button" data-rune="🌙" data-index="5">🌙<div class="rune-button-key">5</div></button>
          <button class="rune-button" data-rune="☀️" data-index="6">☀️<div class="rune-button-key">6</div></button>
        </div>
        <p id="rune-progress" style="font-size: 24px; margin-top: 20px; color: #ffcc00;">Sequence: <span id="rune-sequence"></span></p>
        <p style="color: #888; font-size: 14px; margin-top: 10px;">Ice Spell: Freezes enemies for 2s, 20 damage</p>
      </div>
    `;

    showMinigame('🔮 Runic Altar - Level 1', content);
    game.runicPuzzle.targetSpell = ['💧', '🌙', '💧'];
    game.runicPuzzle.spellName = 'Ice Spell';
    game.runicPuzzle.runesCollected = [];
    game.runicPuzzleInputMode = true;

    // Add click handlers to rune buttons
    setTimeout(() => {
      document.querySelectorAll('.rune-button').forEach(btn => {
        btn.addEventListener('click', () => {
          const index = parseInt(btn.dataset.index);
          handleRunicInput(index);
        });
      });
    }, 0);

  } else if (level === 2) {
    // Level 2: Craft LIGHTNING STORM
    const content = `
      <div style="text-align: center;">
        <h3 style="color: #ffdd44;">⚡ LEVEL 2: LIGHTNING STORM</h3>
        <p>A complex weave awaits:</p>
        <div style="font-size: 28px; margin: 20px 0;">⚡ + ☀️ + ⚡ + 🌙 = ⚡🌩️</div>
        <p style="color: #ff8844;">Attempts remaining: ${game.runicPuzzle.attempts}</p>
        <div class="rune-grid">
          <button class="rune-button" data-rune="🔥" data-index="1">🔥<div class="rune-button-key">1</div></button>
          <button class="rune-button" data-rune="💧" data-index="2">💧<div class="rune-button-key">2</div></button>
          <button class="rune-button" data-rune="🌿" data-index="3">🌿<div class="rune-button-key">3</div></button>
          <button class="rune-button" data-rune="⚡" data-index="4">⚡<div class="rune-button-key">4</div></button>
          <button class="rune-button" data-rune="🌙" data-index="5">🌙<div class="rune-button-key">5</div></button>
          <button class="rune-button" data-rune="☀️" data-index="6">☀️<div class="rune-button-key">6</div></button>
        </div>
        <p id="rune-progress" style="font-size: 24px; margin-top: 20px; color: #ffcc00;">Sequence: <span id="rune-sequence"></span></p>
      </div>
    `;

    showMinigame('🔮 Runic Altar - Level 2', content);
    game.runicPuzzle.targetSpell = ['⚡', '☀️', '⚡', '🌙'];
    game.runicPuzzle.spellName = 'Lightning Storm';
    game.runicPuzzle.runesCollected = [];
    game.runicPuzzleInputMode = true;

    setTimeout(() => {
      document.querySelectorAll('.rune-button').forEach(btn => {
        btn.addEventListener('click', () => {
          const index = parseInt(btn.dataset.index);
          handleRunicInput(index);
        });
      });
    }, 0);

  } else {
    // Mastery complete
    const content = `
      <div style="text-align: center;">
        <h2 style="color: #ffdd00;">✨ SPELL MASTERY ACHIEVED! ✨</h2>
        <p style="font-size: 18px; margin: 30px 0;">You've mastered the runic arts:</p>
        <div style="font-size: 20px; color: #88ddff; margin: 10px 0;">❄️ Ice Spell (Freeze enemies)</div>
        <div style="font-size: 20px; color: #ffdd44; margin: 10px 0;">⚡ Lightning Storm (Chain damage)</div>
        <p style="color: #aaa; margin-top: 30px;">The altar recognizes your power.</p>
      </div>
    `;
    showMinigame('🔮 Runic Altar - Complete', content);
  }
}

// 📚 MEMORY TOME - Intelligence Puzzle with Lore
function startMemoryGame() {
  if (!game.memoryGame) {
    game.memoryGame = {
      phase: 1,
      lorePagesRead: 0
    };
  }

  if (game.memoryGame.phase === 1) {
    // Phase 1: Simple memory test
    const content = `
      <div style="text-align: center;">
        <h3 style="color: #88aaff;">📖 PHASE 1: PROVE YOUR MIND</h3>
        <p style="margin: 20px 0;">The tome tests your intelligence...</p>
        <p style="color: #ffcc00; margin: 30px 0;">Remember this sequence:</p>
        <div style="font-size: 48px; margin: 30px 0;">🗡️ 💎 🛡️</div>
        <p style="color: #aaa; margin-top: 30px;">Click the symbols to recall the sequence:</p>
        <div class="rune-grid" style="max-width: 500px; margin: 20px auto;">
          <button class="rune-button" data-symbol="🗡️" data-index="1">🗡️<div class="rune-button-key">1</div></button>
          <button class="rune-button" data-symbol="🛡️" data-index="2">🛡️<div class="rune-button-key">2</div></button>
          <button class="rune-button" data-symbol="💎" data-index="3">💎<div class="rune-button-key">3</div></button>
          <button class="rune-button" data-symbol="🔑" data-index="4">🔑<div class="rune-button-key">4</div></button>
          <button class="rune-button" data-symbol="📜" data-index="5">📜<div class="rune-button-key">5</div></button>
          <button class="rune-button" data-symbol="⭐" data-index="6">⭐<div class="rune-button-key">6</div></button>
          <button class="rune-button" data-symbol="🌟" data-index="7">🌟<div class="rune-button-key">7</div></button>
          <button class="rune-button" data-symbol="💫" data-index="8">💫<div class="rune-button-key">8</div></button>
        </div>
        <p id="memory-progress" style="font-size: 24px; margin-top: 20px; color: #ffcc00;">Your answer: <span id="memory-sequence"></span></p>
      </div>
    `;

    showMinigame('📚 Memory Tome - Phase 1', content);
    game.memoryGame.targetSequence = ['🗡️', '💎', '🛡️'];
    game.memoryGame.playerSequence = [];
    game.memoryGameInputMode = true;

    setTimeout(() => {
      document.querySelectorAll('.rune-button').forEach(btn => {
        btn.addEventListener('click', () => {
          const index = parseInt(btn.dataset.index);
          handleMemoryInput(index);
        });
      });
    }, 0);
  } else if (game.memoryGame.phase === 2) {
    // Phase 2: Unlock lore
    showDialogue('Memory Tome',
      '✅ PHASE 1 COMPLETE!\n\nThe tome opens... revealing FORBIDDEN LORE about the MYSTERIOUS STRANGER:',
      [
        {
          text: 'Read the first page',
          callback: () => { game.memoryGame.lorePagesRead = 1; },
          nextDialogue: '"Before the darkness, there was a scholar. Brilliant. Ambitious. They sought the Eternal Archive, a source of infinite knowledge. The Archive Keeper warned them... but ambition devoured wisdom."'
        }
      ]
    );
  } else if (game.memoryGame.phase === 3) {
    showDialogue('Memory Tome',
      'Continue reading?',
      [
        {
          text: 'Turn the page',
          callback: () => { game.memoryGame.lorePagesRead = 2; },
          nextDialogue: '"The scholar found it. The Eternal Archive. But knowledge without restraint is poison. They saw everything... past, present, futures that SHOULD NOT BE. The scholar\'s mind shattered. The Stranger was born."'
        }
      ]
    );
  } else if (game.memoryGame.phase === 4) {
    showDialogue('Memory Tome',
      'The final page glows ominously...',
      [
        {
          text: 'Read the truth',
          callback: () => {
            game.memoryGame.lorePagesRead = 3;
            game.memoryGame.complete = true;
          },
          nextDialogue: '"Now the Stranger seeks to MERGE all realities. To become the Archive itself. Omniscient. Omnipresent. Eternal. Only those who master the elements can stop what is coming... The convergence is NEAR."'
        }
      ]
    );
  } else {
    showDialogue('Memory Tome',
      '📖 LORE COMPLETE\n\nYou now know the Stranger\'s origin:\n\n- Former scholar\n- Found forbidden knowledge\n- Mind corrupted\n- Seeks to merge all realities\n\nThis knowledge may save us all...',
      [
        {
          text: 'Close the tome',
          callback: () => {
            giveMemoryRewards();
          }
        }
      ]
    );
  }
}

// Handle runic input
export function handleRunicInput(keyNumber) {
  if (!game.runicPuzzleInputMode || !game.runicPuzzle) return false;

  const runes = ['🔥', '💧', '🌿', '⚡', '🌙', '☀️'];
  const runeIndex = keyNumber - 1;

  if (runeIndex < 0 || runeIndex >= runes.length) return false;

  const selectedRune = runes[runeIndex];
  game.runicPuzzle.runesCollected.push(selectedRune);

  // Update visual sequence
  const sequenceEl = document.getElementById('rune-sequence');
  if (sequenceEl) {
    sequenceEl.textContent = game.runicPuzzle.runesCollected.join(' ');
  }

  // Check if complete
  if (game.runicPuzzle.runesCollected.length >= game.runicPuzzle.targetSpell.length) {
    const correct = game.runicPuzzle.targetSpell.every((rune, i) =>
      rune === game.runicPuzzle.runesCollected[i]
    );

    game.runicPuzzleInputMode = false;

    if (correct) {
      // Success!
      game.runicPuzzle.level++;

      const successContent = `
        <div style="text-align: center;">
          <h2 style="color: #44ff88;">✨ SUCCESS!</h2>
          <p style="font-size: 20px; margin: 20px 0;">${game.runicPuzzle.spellName} learned!</p>
          <p style="color: #ffcc00; font-size: 18px;">Your sequence: ${game.runicPuzzle.runesCollected.join(' ')}</p>
          <p style="color: #aaa; margin-top: 20px;">The spell is now yours to wield!</p>
        </div>
      `;

      showMinigame('🔮 Success!', successContent);

      // Add continue button
      setTimeout(() => {
        const btn = document.createElement('button');
        btn.className = 'minigame-button';
        btn.textContent = game.runicPuzzle.level <= 2 ? 'Continue to Next Level' : 'Claim Mastery';
        btn.addEventListener('click', () => {
          if (game.runicPuzzle.level <= 2) {
            startRunicPuzzle();
          } else {
            giveRunicRewards();
            hideMinigame();
          }
        });
        dom.minigameControls.appendChild(btn);
      }, 0);

    } else {
      // Failed
      game.runicPuzzle.attempts--;

      if (game.runicPuzzle.attempts > 0) {
        const failContent = `
          <div style="text-align: center;">
            <h2 style="color: #ff4444;">❌ INCORRECT!</h2>
            <p style="margin: 20px 0;">Your weave: ${game.runicPuzzle.runesCollected.join(' ')}</p>
            <p>Target: ${game.runicPuzzle.targetSpell.join(' ')}</p>
            <p style="color: #ff8844; margin-top: 20px; font-size: 18px;">Attempts left: ${game.runicPuzzle.attempts}</p>
          </div>
        `;

        showMinigame('🔮 Try Again', failContent);

        setTimeout(() => {
          const btn = document.createElement('button');
          btn.className = 'minigame-button';
          btn.textContent = 'Try Again';
          btn.addEventListener('click', () => {
            game.runicPuzzle.runesCollected = [];
            game.runicPuzzleInputMode = true;
            startRunicPuzzle();
          });
          dom.minigameControls.appendChild(btn);
        }, 0);

      } else {
        const collapseContent = `
          <div style="text-align: center;">
            <h2 style="color: #ff2222;">💥 SPELL COLLAPSED!</h2>
            <p style="margin: 20px 0;">The magic backfires! You must start over.</p>
          </div>
        `;

        showMinigame('🔮 Failed', collapseContent);

        setTimeout(() => {
          const btn = document.createElement('button');
          btn.className = 'minigame-button';
          btn.textContent = 'Restart from Level 1';
          btn.addEventListener('click', () => {
            game.runicPuzzle.level = 1;
            game.runicPuzzle.attempts = 3;
            startRunicPuzzle();
          });
          dom.minigameControls.appendChild(btn);
        }, 0);
      }
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

  game.memoryGame.playerSequence.push(symbols[symbolIndex]);

  // Update visual sequence
  const sequenceEl = document.getElementById('memory-sequence');
  if (sequenceEl) {
    sequenceEl.textContent = game.memoryGame.playerSequence.join(' ');
  }

  // Check if complete
  if (game.memoryGame.playerSequence.length >= game.memoryGame.targetSequence.length) {
    const correct = game.memoryGame.targetSequence.every((sym, i) =>
      sym === game.memoryGame.playerSequence[i]
    );

    game.memoryGameInputMode = false;

    if (correct) {
      game.memoryGame.phase++;
      hideMinigame();
      showDialogue('Memory Tome',
        '✅ CORRECT! Your mind is sharp.\n\nThe tome begins to open...',
        [
          {
            text: 'See what it reveals',
            callback: () => startMemoryGame()
          }
        ]
      );
    } else {
      const failContent = `
        <div style="text-align: center;">
          <h2 style="color: #ff4444;">❌ WRONG!</h2>
          <p style="margin: 20px 0;">Your answer: ${game.memoryGame.playerSequence.join(' ')}</p>
          <p>Correct answer: ${game.memoryGame.targetSequence.join(' ')}</p>
          <p style="color: #aaa; margin-top: 20px;">The tome slams shut. Your mind needs training.</p>
        </div>
      `;

      showMinigame('📚 Failed', failContent);

      setTimeout(() => {
        const btn = document.createElement('button');
        btn.className = 'minigame-button';
        btn.textContent = 'Try Again';
        btn.addEventListener('click', () => {
          startMemoryGame();
        });
        dom.minigameControls.appendChild(btn);
      }, 0);
    }
  }

  return true;
}

function giveRunicRewards() {
  const content = `
    <div style="text-align: center;">
      <h2 style="color: #ffdd00;">🎁 SPELL MASTERY REWARDS</h2>
      <div style="margin: 30px 0; font-size: 18px;">
        <div style="color: #88ddff; margin: 15px 0;">❄️ Ice Spell added to inventory</div>
        <div style="color: #ffdd44; margin: 15px 0;">⚡ Lightning Storm added to inventory</div>
        <div style="color: #44ff88; margin: 15px 0;">+200 XP</div>
      </div>
      <p style="color: #aaa;">You are now a master of the runic arts!</p>
    </div>
  `;

  showMinigame('🔮 Rewards!', content);

  game.player.addExperience(200);

  // Add spells to inventory (you'll need to define these items in data.js)
  if (items.ice_spell) {
    game.player.addItem({ ...items.ice_spell, id: 'ice_spell', count: 1 });
  }
  if (items.lightning_spell) {
    game.player.addItem({ ...items.lightning_spell, id: 'lightning_spell', count: 1 });
  }

  game.runicPuzzle = null;
  saveGameState();

  setTimeout(() => {
    const btn = document.createElement('button');
    btn.className = 'minigame-button';
    btn.textContent = 'Close (M)';
    btn.addEventListener('click', hideMinigame);
    dom.minigameControls.appendChild(btn);
  }, 0);
}

function giveMemoryRewards() {
  const pages = game.memoryGame.lorePagesRead || 0;

  const content = `
    <div style="text-align: center;">
      <h2 style="color: #ffdd00;">📚 KNOWLEDGE ACQUIRED!</h2>
      <div style="margin: 30px 0; font-size: 18px;">
        <div style="color: #44ff88; margin: 15px 0;">+${pages * 100} XP (Lore bonus)</div>
        <div style="color: #88aaff; margin: 15px 0;">+3 Ancient Pages</div>
      </div>
      <p style="color: #aaa; margin-top: 20px;">You now understand the Mysterious Stranger's origin and goal.</p>
      <p style="color: #ff8844;">Use this knowledge wisely...</p>
    </div>
  `;

  showMinigame('📚 Rewards!', content);

  game.player.addExperience(pages * 100);

  if (items.ancient_page) {
    game.player.addItem({ ...items.ancient_page, id: 'ancient_page', count: 3 });
  }

  game.memoryGame = null;
  saveGameState();

  setTimeout(() => {
    const btn = document.createElement('button');
    btn.className = 'minigame-button';
    btn.textContent = 'Close (M)';
    btn.addEventListener('click', hideMinigame);
    dom.minigameControls.appendChild(btn);
  }, 0);
}

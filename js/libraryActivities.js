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

      // Temporary simple version - just give lore and rewards
      showDialogue('Memory Tome',
        'The tome opens, revealing ancient knowledge about the Mysterious Stranger...\n\n"Before the darkness, there was a scholar who sought forbidden knowledge. The Archive corrupted their mind. Now they seek to merge all realities."\n\n+300 XP gained!',
        [{
          text: 'Close tome',
          callback: () => {
            game.player.addExperience(300);
            if (items.ancient_page) {
              game.player.addItem({ ...items.ancient_page, id: 'ancient_page', count: 3 });
            }
            game.memoryGame = { complete: true };
          }
        }]
      );
    }
  };

  stations.push(alchemyCrucible, runicAltar, memoryTome);
  return stations;
}

// ⚗️ ALCHEMY GAME - Element Reaction Puzzle
function startAlchemyGame() {
  if (!game.alchemyGame) {
    game.alchemyGame = {
      level: 1,
      reactionsDiscovered: 0,
      currentGrid: [],
      score: 0
    };
  }

  const level = game.alchemyGame.level;

  // Define reaction rules
  const reactions = {
    '🔥+💧': { result: '💨', name: 'Steam', points: 10 },
    '💧+🌿': { result: '🌱', name: 'Growth', points: 15 },
    '🔥+🌿': { result: '💨', name: 'Smoke', points: 10 },
    '⚡+💧': { result: '⚡', name: 'Electrify', points: 20 },
    '🌙+💎': { result: '✨', name: 'Magic', points: 25 },
    '☀️+🔥': { result: '💥', name: 'Explosion', points: 30 }
  };

  if (level > 3) {
    // Mastery achieved
    const content = `
      <div class="pixel-panel">
        <div class="pixel-title">⚗️ ALCHEMY MASTERY!</div>
        <div class="pixel-text">You've discovered the secrets of elemental reactions!</div>
        <div style="margin: 20px 0; padding: 15px; background: rgba(255, 102, 0, 0.1); border: 2px solid #ff6600;">
          <div class="pixel-text" style="color: #ff8844;">📜 LORE REVEALED</div>
          <div class="pixel-text" style="color: #ffaa66; font-size: 12px; margin-top: 10px;">"${getAlchemyLore(3)}"</div>
        </div>
        <div class="pixel-text" style="color: #44ff88;">+300 XP • Master Alchemist</div>
      </div>
    `;
    showMinigame('⚗️ Alchemy Complete', content);
    game.player.addExperience(300);
    return;
  }

  // Puzzle-based alchemy: Match 3 style element reactions
  const gridSize = level === 1 ? 4 : level === 2 ? 5 : 6;
  const elements = ['🔥', '💧', '🌿', '⚡', '🌙', '☀️'];
  const targetReactions = level === 1 ? 3 : level === 2 ? 5 : 8;

  // Generate random grid
  const grid = [];
  for (let i = 0; i < gridSize * gridSize; i++) {
    grid.push(elements[Math.floor(Math.random() * elements.length)]);
  }

  const content = `
    <div class="pixel-panel">
      <div class="pixel-header">
        <div class="pixel-badge">Level ${level}/3</div>
        <div class="pixel-title">⚗️ ELEMENT REACTIONS</div>
        <div class="pixel-badge">Goal: ${targetReactions}</div>
      </div>

      <div class="pixel-text" style="margin: 15px 0;">
        Click adjacent elements to combine them!
      </div>

      <div style="background: #1a1a2e; padding: 15px; border: 3px solid #ff6600; margin: 20px auto; max-width: ${gridSize * 60}px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <div class="pixel-text" style="color: #ffcc00;">Reactions: <span id="reaction-count">0</span>/${targetReactions}</div>
          <div class="pixel-text" style="color: #44ff88;">Score: <span id="alchemy-score">0</span></div>
        </div>

        <div id="alchemy-grid" style="display: grid; grid-template-columns: repeat(${gridSize}, 1fr); gap: 4px; background: #0a0a15; padding: 8px; border: 2px solid #333;">
          ${grid.map((elem, idx) => `
            <button class="alchemy-cell pixel-button" data-index="${idx}" data-element="${elem}" style="font-size: 28px; padding: 8px; aspect-ratio: 1; background: #2a2a3e; border: 2px solid #444; cursor: pointer;">
              ${elem}
            </button>
          `).join('')}
        </div>

        <div id="reaction-feedback" class="pixel-text" style="margin-top: 10px; min-height: 30px; color: #ffaa66;"></div>
      </div>

      <div class="pixel-text" style="color: #888; font-size: 11px;">
        Valid combos: 🔥+💧=Steam • 💧+🌿=Growth • ⚡+💧=Shock • 🌙+💎=Magic • ☀️+🔥=Explosion
      </div>
    </div>
  `;

  showMinigame('⚗️ Alchemy Crucible - Level ' + level, content);

  game.alchemyGame.currentGrid = grid;
  game.alchemyGame.gridSize = gridSize;
  game.alchemyGame.reactions = reactions;
  game.alchemyGame.targetReactions = targetReactions;
  game.alchemyGame.reactionsCount = 0;
  game.alchemyGame.selectedCell = null;

  setTimeout(() => {
    document.querySelectorAll('.alchemy-cell').forEach(btn => {
      btn.addEventListener('click', () => {
        handleAlchemyClick(parseInt(btn.dataset.index));
      });
    });
  }, 0);
}

function handleAlchemyClick(index) {
  const selected = game.alchemyGame.selectedCell;

  if (selected === null) {
    // First selection
    game.alchemyGame.selectedCell = index;
    const cell = document.querySelector(`.alchemy-cell[data-index="${index}"]`);
    if (cell) cell.classList.add('selected');
  } else {
    // Second selection - check if adjacent
    const size = game.alchemyGame.gridSize;
    const row1 = Math.floor(selected / size);
    const col1 = selected % size;
    const row2 = Math.floor(index / size);
    const col2 = index % size;

    const isAdjacent = (Math.abs(row1 - row2) === 1 && col1 === col2) ||
                       (Math.abs(col1 - col2) === 1 && row1 === row2);

    if (isAdjacent && selected !== index) {
      // Try reaction
      const elem1 = game.alchemyGame.currentGrid[selected];
      const elem2 = game.alchemyGame.currentGrid[index];
      const combo1 = `${elem1}+${elem2}`;
      const combo2 = `${elem2}+${elem1}`;
      const reaction = game.alchemyGame.reactions[combo1] || game.alchemyGame.reactions[combo2];

      if (reaction) {
        // Valid reaction!
        const cell1 = document.querySelector(`.alchemy-cell[data-index="${selected}"]`);
        const cell2 = document.querySelector(`.alchemy-cell[data-index="${index}"]`);

        cell1.classList.add('reacting');
        cell2.classList.add('reacting');

        setTimeout(() => {
          // Update grid
          game.alchemyGame.currentGrid[selected] = reaction.result;
          game.alchemyGame.currentGrid[index] = reaction.result;
          cell1.textContent = reaction.result;
          cell2.textContent = reaction.result;
          cell1.dataset.element = reaction.result;
          cell2.dataset.element = reaction.result;

          cell1.classList.remove('reacting', 'selected');
          cell2.classList.remove('reacting');

          // Update score
          game.alchemyGame.score += reaction.points;
          game.alchemyGame.reactionsCount++;

          const scoreEl = document.getElementById('alchemy-score');
          const countEl = document.getElementById('reaction-count');
          const feedbackEl = document.getElementById('reaction-feedback');

          if (scoreEl) scoreEl.textContent = game.alchemyGame.score;
          if (countEl) countEl.textContent = game.alchemyGame.reactionsCount;
          if (feedbackEl) {
            feedbackEl.textContent = `✨ ${reaction.name}! +${reaction.points} pts`;
            feedbackEl.style.color = '#44ff88';
          }

          // Check if level complete
          if (game.alchemyGame.reactionsCount >= game.alchemyGame.targetReactions) {
            setTimeout(() => {
              game.alchemyGame.level++;
              showAlchemySuccess();
            }, 1000);
          }
        }, 500);
      } else {
        // Invalid combo
        const feedbackEl = document.getElementById('reaction-feedback');
        if (feedbackEl) {
          feedbackEl.textContent = `❌ No reaction between ${elem1} and ${elem2}`;
          feedbackEl.style.color = '#ff4444';
        }

        document.querySelector(`.alchemy-cell[data-index="${selected}"]`).classList.remove('selected');
      }
    } else {
      // Not adjacent or same cell - reselect
      document.querySelectorAll('.alchemy-cell').forEach(c => c.classList.remove('selected'));
      const cell = document.querySelector(`.alchemy-cell[data-index="${index}"]`);
      if (cell) cell.classList.add('selected');
      game.alchemyGame.selectedCell = index;
      return;
    }

    game.alchemyGame.selectedCell = null;
  }
}

function showAlchemySuccess() {
  const content = `
    <div class="pixel-panel">
      <div class="pixel-title">✨ LEVEL COMPLETE!</div>
      <div style="font-size: 48px; margin: 20px 0;">⚗️</div>
      <div class="pixel-text" style="color: #44ff88; font-size: 16px; margin: 10px 0;">
        Final Score: ${game.alchemyGame.score}
      </div>
      <div class="pixel-text" style="color: #ffcc00; margin: 10px 0;">
        +${game.alchemyGame.score} XP
      </div>
    </div>
  `;

  showMinigame('⚗️ Success!', content);
  game.player.addExperience(game.alchemyGame.score);

  setTimeout(() => {
    const btn = document.createElement('button');
    btn.className = 'minigame-button pixel-button';
    btn.textContent = game.alchemyGame.level <= 3 ? 'Next Level' : 'Complete';
    btn.addEventListener('click', () => {
      startAlchemyGame();
    });
    dom.minigameControls.innerHTML = '';
    dom.minigameControls.appendChild(btn);
  }, 0);
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

// 🔮 RUNIC ALTAR - Speed Pattern Matching (4 Levels)
function startRunicPuzzle() {
  if (!game.runicPuzzle) {
    game.runicPuzzle = {
      level: 1,
      runesCollected: [],
      targetSpell: null,
      attempts: 3,
      startTime: 0,
      timeLimit: 0
    };
  }

  const level = game.runicPuzzle.level;

  // Define all 4 levels with increasing difficulty
  const levels = [
    { name: 'Ice Spell', pattern: ['💧', '🌙', '💧'], memorize: 5, timeLimit: 10, difficulty: 'EASY', color: '#88ddff', emoji: '❄️' },
    { name: 'Fire Blast', pattern: ['🔥', '☀️', '🔥', '☀️'], memorize: 4, timeLimit: 8, difficulty: 'MEDIUM', color: '#ff6600', emoji: '🔥' },
    { name: 'Lightning Storm', pattern: ['⚡', '☀️', '⚡', '🌙', '⚡'], memorize: 3, timeLimit: 7, difficulty: 'HARD', color: '#ffdd44', emoji: '⚡' },
    { name: 'Cosmic Void', pattern: ['🌙', '💎', '⚡', '☀️', '🌙', '💧'], memorize: 2, timeLimit: 6, difficulty: 'EXTREME', color: '#aa44ff', emoji: '🌌' }
  ];

  const levelData = levels[level - 1];

  if (level <= 4 && levelData) {
    // Levels 1-4: Progressive difficulty
    const underscores = levelData.pattern.map(() => '___').join(' ');

    const content = `
      <div style="text-align: center;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div style="background: rgba(255, 255, 255, 0.1); padding: 8px 16px; border-radius: 8px; font-size: 13px;">
            <span style="color: #aaa;">Level:</span> <span style="color: #ffcc00; font-weight: bold;">${level}/4</span>
          </div>
          <div style="background: ${levelData.difficulty === 'EASY' ? 'rgba(68, 255, 136, 0.2)' : levelData.difficulty === 'MEDIUM' ? 'rgba(255, 187, 68, 0.2)' : levelData.difficulty === 'HARD' ? 'rgba(255, 136, 68, 0.2)' : 'rgba(255, 68, 68, 0.2)'}; padding: 8px 16px; border-radius: 8px; border: 2px solid ${levelData.difficulty === 'EASY' ? '#44ff88' : levelData.difficulty === 'MEDIUM' ? '#ffbb44' : levelData.difficulty === 'HARD' ? '#ff8844' : '#ff4444'};">
            <span style="color: #fff; font-weight: bold; font-size: 13px;">${levelData.difficulty}</span>
          </div>
        </div>

        <h3 style="color: ${levelData.color}; text-shadow: 0 0 20px ${levelData.color};">${levelData.emoji} ${levelData.name.toUpperCase()}</h3>

        <div id="pattern-display" style="font-size: 42px; margin: 25px 0; padding: 25px; background: linear-gradient(135deg, ${levelData.color}22, ${levelData.color}11); border-radius: 12px; border: 3px solid ${levelData.color}66;">
          <div id="pattern-runes" style="letter-spacing: 12px;">${levelData.pattern.join(' ')}</div>
          <div id="pattern-timer" style="font-size: 18px; color: #ffcc00; margin-top: 15px;">Memorize in: <span id="timer-count">${levelData.memorize}</span>s</div>
        </div>

        <div id="weaving-area" style="opacity: 0.3; pointer-events: none;">
          <div style="background: rgba(0, 0, 0, 0.4); padding: 15px; border-radius: 10px; margin-bottom: 20px;">
            <p style="color: #ff4444; font-size: 16px; font-weight: bold; margin-bottom: 5px;">⏱️ TIME LIMIT: <span id="countdown-timer">${levelData.timeLimit}</span>s</p>
            <div style="background: rgba(255, 68, 68, 0.2); height: 8px; border-radius: 4px; overflow: hidden;">
              <div id="timer-bar" style="background: linear-gradient(90deg, #44ff88, #ffbb44, #ff4444); height: 100%; width: 100%; transition: width 0.1s linear;"></div>
            </div>
          </div>

          <p style="color: #aaa; margin: 15px 0; font-size: 14px;">Recreate the pattern as fast as you can!</p>

          <div class="rune-grid" style="margin: 25px auto; max-width: 400px;">
            <button class="rune-button rune-selectable" data-rune="🔥" data-index="1">🔥<div class="rune-button-key">1</div></button>
            <button class="rune-button rune-selectable" data-rune="💧" data-index="2">💧<div class="rune-button-key">2</div></button>
            <button class="rune-button rune-selectable" data-rune="🌿" data-index="3">🌿<div class="rune-button-key">3</div></button>
            <button class="rune-button rune-selectable" data-rune="⚡" data-index="4">⚡<div class="rune-button-key">4</div></button>
            <button class="rune-button rune-selectable" data-rune="🌙" data-index="5">🌙<div class="rune-button-key">5</div></button>
            <button class="rune-button rune-selectable" data-rune="☀️" data-index="6">☀️<div class="rune-button-key">6</div></button>
            <button class="rune-button rune-selectable" data-rune="💎" data-index="7">💎<div class="rune-button-key">7</div></button>
          </div>

          <div id="rune-progress" style="margin-top: 25px;">
            <p style="color: #888; font-size: 14px;">Your weave:</p>
            <div id="rune-sequence" style="font-size: 32px; min-height: 50px; color: #ffcc00; letter-spacing: 10px; margin-top: 10px;">${underscores}</div>
          </div>
        </div>
      </div>
    `;

    showMinigame(`🔮 Runic Altar - Level ${level}`, content);
    game.runicPuzzle.targetSpell = levelData.pattern;
    game.runicPuzzle.spellName = levelData.name;
    game.runicPuzzle.runesCollected = [];
    game.runicPuzzle.timeLimit = levelData.timeLimit;
    game.runicPuzzleInputMode = false;

    // Memorization countdown
    let memorizeCountdown = levelData.memorize;
    const memorizeInterval = setInterval(() => {
      memorizeCountdown--;
      const timerEl = document.getElementById('timer-count');
      if (timerEl) {
        timerEl.textContent = memorizeCountdown;
        if (memorizeCountdown <= 1) timerEl.style.color = '#ff4444';
      }

      if (memorizeCountdown <= 0) {
        clearInterval(memorizeInterval);

        // Hide pattern and enable weaving
        const patternDisplay = document.getElementById('pattern-display');
        const weavingArea = document.getElementById('weaving-area');
        if (patternDisplay) {
          patternDisplay.style.opacity = '0';
          patternDisplay.style.transition = 'opacity 0.5s';
          setTimeout(() => patternDisplay.style.display = 'none', 500);
        }
        if (weavingArea) {
          weavingArea.style.opacity = '1';
          weavingArea.style.pointerEvents = 'all';
          weavingArea.style.transition = 'opacity 0.5s';
        }

        game.runicPuzzleInputMode = true;
        game.runicPuzzle.startTime = Date.now();

        // Start weaving countdown
        startRunicTimer(levelData.timeLimit);
      }
    }, 1000);

    setTimeout(() => {
      document.querySelectorAll('.rune-selectable').forEach(btn => {
        btn.addEventListener('click', () => {
          if (!game.runicPuzzleInputMode) return;
          const index = parseInt(btn.dataset.index);
          btn.style.transform = 'scale(1.2) rotate(5deg)';
          setTimeout(() => btn.style.transform = '', 200);
          handleRunicInput(index);
        });
      });
    }, 0);

  } else {
    // Mastery complete - all 4 levels done
    const allSpells = [
      { emoji: '❄️', name: 'Ice Spell', color: '#88ddff' },
      { emoji: '🔥', name: 'Fire Blast', color: '#ff6600' },
      { emoji: '⚡', name: 'Lightning Storm', color: '#ffdd44' },
      { emoji: '🌌', name: 'Cosmic Void', color: '#aa44ff' }
    ];

    const content = `
      <div style="text-align: center;">
        <div style="animation: pulse 2s infinite;">
          <h2 style="color: #ffdd00; font-size: 32px; text-shadow: 0 0 30px rgba(255, 221, 0, 0.8);">✨ RUNIC MASTERY ACHIEVED! ✨</h2>
        </div>
        <p style="font-size: 18px; margin: 30px 0; color: #aaa;">You've conquered all 4 levels!</p>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; max-width: 500px; margin: 30px auto;">
          ${allSpells.map(s => `
            <div style="padding: 20px; background: linear-gradient(135deg, ${s.color}22, ${s.color}11); border-radius: 12px; border: 2px solid ${s.color};">
              <div style="font-size: 40px; margin-bottom: 10px;">${s.emoji}</div>
              <div style="font-size: 14px; color: ${s.color}; font-weight: bold;">${s.name}</div>
            </div>
          `).join('')}
        </div>

        <p style="color: #44ff88; margin-top: 30px; font-size: 18px;">You are a Rune Master!</p>
      </div>
    `;
    showMinigame('🔮 Runic Altar - Complete', content);
  }
}

// Timer for runic puzzle
function startRunicTimer(seconds) {
  let timeLeft = seconds;
  const timerInterval = setInterval(() => {
    timeLeft -= 0.1;

    const countdownEl = document.getElementById('countdown-timer');
    const timerBar = document.getElementById('timer-bar');

    if (countdownEl) {
      countdownEl.textContent = Math.ceil(timeLeft);
      if (timeLeft <= 3) countdownEl.style.color = '#ff4444';
    }

    if (timerBar) {
      const percent = (timeLeft / seconds) * 100;
      timerBar.style.width = percent + '%';
    }

    if (timeLeft <= 0 || !game.runicPuzzleInputMode) {
      clearInterval(timerInterval);

      if (timeLeft <= 0 && game.runicPuzzleInputMode) {
        // Time ran out!
        game.runicPuzzleInputMode = false;
        const content = `
          <div style="text-align: center;">
            <h2 style="color: #ff4444;">⏱️ TIME'S UP!</h2>
            <div style="font-size: 60px; margin: 30px 0;">⏰</div>
            <p style="color: #aaa; margin: 20px 0;">The pattern fades from your mind...</p>
            <p style="color: #ff8844;">You must be faster!</p>
          </div>
        `;

        showMinigame('🔮 Failed', content);

        setTimeout(() => {
          const btn = document.createElement('button');
          btn.className = 'minigame-button';
          btn.textContent = 'Try Again';
          btn.addEventListener('click', () => {
            game.runicPuzzle.runesCollected = [];
            startRunicPuzzle();
          });
          dom.minigameControls.innerHTML = '';
          dom.minigameControls.appendChild(btn);
        }, 0);
      }
    }
  }, 100);

  // Store interval ID so we can clear it
  game.runicPuzzle.timerInterval = timerInterval;
}

// 📚 MEMORY TOME - Ancient Cipher Decryption Puzzle
function startMemoryGame() {
  if (!game.memoryGame) {
    game.memoryGame = {
      phase: 1,
      lorePagesRead: 0,
      symbolsDecoded: 0
    };
  }

  if (game.memoryGame.phase === 1) {
    // Phase 1: Decipher ancient symbols to translate the message
    const cipherMap = {
      'α': 'T', 'β': 'H', 'γ': 'E', 'δ': 'S', 'ε': 'T', 'ζ': 'R', 'η': 'A', 'θ': 'N',
      'ι': 'G', 'κ': 'E', 'λ': 'R', 'μ': 'I', 'ν': 'S', 'ξ': 'C', 'ο': 'O', 'π': 'M',
      'ρ': 'I', 'σ': 'N', 'τ': 'G'
    };

    const encryptedMessage = "βγ ν ε ζ η θ ι γ ζ";  // THE STRANGER
    const symbols = Object.keys(cipherMap);
    const shuffled = [...symbols].sort(() => Math.random() - 0.5).slice(0, 6);

    const content = `
      <div style="text-align: center;">
        <h3 style="color: #88aaff; text-shadow: 0 0 20px rgba(136, 170, 255, 0.8);">📖 MEMORY TRIAL: ANCIENT SYMBOLS</h3>
        <p style="margin: 15px 0; font-size: 16px; color: #aaa;">The tome reveals 8 sacred symbols. Memorize their ORDER!</p>

        <div id="card-display" style="margin: 30px auto; max-width: 700px;">
          <div style="background: rgba(255, 204, 0, 0.1); padding: 12px; border-radius: 8px; margin-bottom: 20px; border: 2px solid rgba(255, 204, 0, 0.3);">
            <p style="color: #ffcc00; font-size: 16px; font-weight: bold; margin-bottom: 5px;">⚠️ MEMORIZE IN: <span id="flip-timer" style="font-size: 20px;">2</span>s</p>
            <p style="color: #ff8844; font-size: 13px;">They will disappear!</p>
          </div>

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; max-width: 600px; margin: 0 auto;">
            ${sequence.map((sym, idx) => `
              <div class="memory-card" data-symbol="${sym}" data-position="${idx + 1}" style="font-size: 42px; padding: 20px; background: linear-gradient(135deg, rgba(136, 170, 255, 0.3), rgba(100, 140, 255, 0.3)); border: 3px solid rgba(136, 170, 255, 0.6); border-radius: 12px; transition: all 0.3s; position: relative;">
                <div style="position: absolute; top: 5px; left: 8px; font-size: 12px; color: #ffcc00; font-weight: bold;">${idx + 1}</div>
                ${sym}
              </div>
            `).join('')}
          </div>
        </div>

        <div id="answer-area" style="opacity: 0; pointer-events: none; margin-top: 30px;">
          <p style="color: #ffcc00; margin-bottom: 15px; font-size: 16px; font-weight: bold;">Click symbols in the CORRECT ORDER (1→8):</p>

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; max-width: 600px; margin: 20px auto;">
            ${allSymbols.map((sym, idx) => `
              <button class="memory-answer-btn" data-symbol="${sym}" data-index="${idx + 1}" style="font-size: 36px; padding: 18px; background: rgba(100, 50, 200, 0.2); border: 2px solid rgba(136, 170, 255, 0.5); border-radius: 10px; cursor: pointer; transition: all 0.2s;">${sym}</button>
            `).join('')}
          </div>

          <div id="memory-progress" style="margin-top: 25px;">
            <p style="color: #888; font-size: 14px;">Your sequence (<span id="progress-count">0</span>/8):</p>
            <div id="memory-sequence" style="font-size: 32px; min-height: 50px; color: #44ff88; letter-spacing: 8px; margin-top: 10px;"></div>
          </div>
        </div>

        <p style="color: #6688ff; font-size: 13px; margin-top: 25px; font-style: italic;">The tome tests your memory...</p>
      </div>
    `;

    showMinigame('📚 Memory Tome - Trial', content);
    game.memoryGame.targetSequence = sequence;
    game.memoryGame.playerSequence = [];
    game.memoryGameInputMode = false;

    // Flip timer - only 2 seconds!
    let flipCountdown = 2;
    const flipTimer = setInterval(() => {
      flipCountdown--;
      const timerEl = document.getElementById('flip-timer');
      if (timerEl) {
        timerEl.textContent = flipCountdown;
        timerEl.style.color = flipCountdown === 0 ? '#ff4444' : '#ffcc00';
      }

      if (flipCountdown <= 0) {
        clearInterval(flipTimer);

        // Flip all cards with staggered animation
        const cards = document.querySelectorAll('.memory-card');
        cards.forEach((card, idx) => {
          setTimeout(() => {
            card.style.transform = 'rotateY(180deg)';
            card.style.opacity = '0.2';
            setTimeout(() => {
              card.innerHTML = '<div style="font-size: 48px; color: #666;">?</div>';
              card.style.transform = 'rotateY(360deg)';
            }, 150);
          }, idx * 80);
        });

        // Enable answer area
        setTimeout(() => {
          const answerArea = document.getElementById('answer-area');
          if (answerArea) {
            answerArea.style.opacity = '1';
            answerArea.style.pointerEvents = 'all';
            answerArea.style.transition = 'opacity 0.5s';
          }
          game.memoryGameInputMode = true;
        }, 1000);
      }
    }, 1000);

    setTimeout(() => {
      document.querySelectorAll('.memory-answer-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (!game.memoryGameInputMode) return;
          const index = parseInt(btn.dataset.index);
          btn.style.transform = 'scale(0.9)';
          btn.style.opacity = '0.5';
          btn.style.pointerEvents = 'none'; // Disable after click
          setTimeout(() => {
            btn.style.transform = 'scale(1)';
          }, 150);
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

  const runes = ['🔥', '💧', '🌿', '⚡', '🌙', '☀️', '💎'];
  const runeIndex = keyNumber - 1;

  if (runeIndex < 0 || runeIndex >= runes.length) return false;

  const selectedRune = runes[runeIndex];
  game.runicPuzzle.runesCollected.push(selectedRune);

  // Update visual sequence
  const sequenceEl = document.getElementById('rune-sequence');
  if (sequenceEl) {
    const targetLength = game.runicPuzzle.targetSpell.length;
    const display = [];
    for (let i = 0; i < targetLength; i++) {
      display.push(game.runicPuzzle.runesCollected[i] || '___');
    }
    sequenceEl.textContent = display.join(' ');
  }

  // Check if complete
  if (game.runicPuzzle.runesCollected.length >= game.runicPuzzle.targetSpell.length) {
    const correct = game.runicPuzzle.targetSpell.every((rune, i) =>
      rune === game.runicPuzzle.runesCollected[i]
    );

    game.runicPuzzleInputMode = false;

    // Stop the timer
    if (game.runicPuzzle.timerInterval) {
      clearInterval(game.runicPuzzle.timerInterval);
    }

    // Calculate time taken
    const timeTaken = ((Date.now() - game.runicPuzzle.startTime) / 1000).toFixed(2);

    if (correct) {
      // Success!
      game.runicPuzzle.level++;

      const successContent = `
        <div style="text-align: center;">
          <h2 style="color: #44ff88; font-size: 32px;">✨ PERFECT WEAVE! ✨</h2>
          <div style="font-size: 60px; margin: 30px 0; animation: bounce 1s ease-in-out;">🔮</div>
          <p style="font-size: 20px; margin: 20px 0; color: #ffcc00; font-weight: bold;">${game.runicPuzzle.spellName} Mastered!</p>
          <div style="background: rgba(68, 255, 136, 0.1); padding: 15px; border-radius: 10px; margin: 20px auto; max-width: 400px;">
            <p style="color: #44ff88; font-size: 18px; margin-bottom: 5px;">⏱️ Time: ${timeTaken}s</p>
            <p style="color: #ffcc00; font-size: 16px;">Pattern: ${game.runicPuzzle.runesCollected.join(' ')}</p>
          </div>
          <p style="color: #aaa; margin-top: 20px;">+150 XP • Spell Unlocked!</p>
        </div>
      `;

      showMinigame('🔮 Success!', successContent);
      game.player.addExperience(150);

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

  const symbols = ['🗡️', '💎', '🛡️', '🔑', '📜', '⭐', '🌟', '💫'];
  const symbolIndex = keyNumber - 1;

  if (symbolIndex < 0 || symbolIndex >= symbols.length) return false;

  game.memoryGame.playerSequence.push(symbols[symbolIndex]);

  // Update visual sequence
  const sequenceEl = document.getElementById('memory-sequence');
  const progressEl = document.getElementById('progress-count');

  if (sequenceEl) {
    sequenceEl.textContent = game.memoryGame.playerSequence.join(' ');
  }

  if (progressEl) {
    progressEl.textContent = game.memoryGame.playerSequence.length;
    if (game.memoryGame.playerSequence.length === game.memoryGame.targetSequence.length) {
      progressEl.style.color = '#44ff88';
    }
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

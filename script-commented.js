/**
 * ========================================
 * GOBBLET GOBBLERS TIC TAC TOE - GAME LOGIC
 * ========================================
 * 
 * Game Mechanics: Stacking Tic Tac Toe (Gobblet Gobblers variant)
 * Players can place pieces on empty cells or stack on top of smaller pieces
 * 3 piece sizes: small < medium < large (larger pieces "gobble" smaller ones)
 * 
 * Features:
 * - Single Player vs AI Bot (4 difficulty levels)
 * - Two Player mode
 * - Minimax algorithm with alpha-beta pruning for Super Hard difficulty
 * - Query parameter based game state management
 */

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: DOM ELEMENT REFERENCES
// ═══════════════════════════════════════════════════════════════════════════
// Retrieve all HTML elements that will be updated during gameplay

const boardEl = document.getElementById("board");              // 3x3 game board container
const statusEl = document.getElementById("status");            // Game status message display
const resetBtn = document.getElementById("reset");             // Reset/New Game button
const currentPlayerEl = document.getElementById("current-player"); // Current player display (X or O)
const pieceBtns = document.querySelectorAll(".piece-btn");    // Piece size selection buttons (small/medium/large)

// Remaining piece count displays for current player
const smallLeftEl = document.getElementById("small-left");     // Count of small pieces left
const mediumLeftEl = document.getElementById("medium-left");   // Count of medium pieces left
const largeLeftEl = document.getElementById("large-left");     // Count of large pieces left

// Optional: Game mode and difficulty selection dropdowns (if present in HTML)
const modeSelect = document.getElementById("mode");            // Dropdown: single player vs two player
const difficultySelect = document.getElementById("difficulty"); // Dropdown: AI difficulty level


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: GAME STATE VARIABLES
// ═══════════════════════════════════════════════════════════════════════════
// Core game state that changes throughout gameplay

let mode = "2p";             // Game mode: "1p" (vs bot) or "2p" (two players)
let difficulty = "easy";     // AI difficulty: "easy", "medium", "hard", or "super"
let currentPlayer = "X";     // Current turn: "X" or "O"
let selectedSize = null;     // User's selected piece size from buttons (null or "small"/"medium"/"large")
let selectedFrom = null;     // Source cell index for piece movement (null or 0-8)

// Read URL query parameters set by menu/difficulty pages
// Example: ?mode=1p&difficulty=hard&player=P2
const params = new URLSearchParams(window.location.search);
const qMode = params.get('mode');          // Game mode from menu page
const qDiff = params.get('difficulty');    // AI difficulty from difficulty selection page
const qPlayer = params.get('player');      // Starting player (P1=X, P2=O)

// Override default values with query parameters if they exist
if (qMode) mode = qMode;
if (qDiff) difficulty = qDiff;
if (qPlayer) currentPlayer = (qPlayer === 'P2' ? 'O' : 'X');

/**
 * GAME BOARD STRUCTURE
 * Array of 9 cells (indices 0-8 for grid positions)
 * Each cell is an array (stack) that can hold multiple pieces
 * 
 * Example: board[0] = [
 *   { player: "X", size: "small" },    // Bottom piece
 *   { player: "O", size: "medium" }    // Top piece (the visible one)
 * ]
 * 
 * Only the TOP piece of each stack is visible and affects win conditions
 * Larger pieces automatically "cover" smaller ones below them
 */
let board = Array(9).fill(null).map(() => []);

/**
 * PIECES REMAINING INVENTORY
 * Each player starts with 6 pieces: 2 small + 2 medium + 2 large
 * This tracks how many pieces each player has left to place
 * (Moving existing pieces doesn't affect this count)
 */
let piecesLeft = {
  X: { small: 2, medium: 2, large: 2 },
  O: { small: 2, medium: 2, large: 2 }
};


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: UTILITY FUNCTIONS - UI STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * CANCEL ALL SELECTIONS
 * Resets UI to initial state: clears piece size button highlight and cell selection
 * Called when: user clicks same cell twice, or needs to start fresh selection
 */
function cancelSelectAll() {
  selectedSize = null;                     // Clear piece size selection
  selectedFrom = null;                     // Clear source cell selection
  pieceBtns.forEach(b => b.classList.remove("selected")); // Remove CSS highlight from all buttons
  clearSelectedFrom();                     // Remove visual highlight from board cells
  statusEl.textContent = `ตาของผู้เล่น ${currentPlayer}`; // Update status message
}

// Setup event listeners for optional mode/difficulty dropdowns
// These allow dynamic game configuration if dropdowns exist in HTML
modeSelect && modeSelect.addEventListener("change", e => mode = e.target.value);
difficultySelect && difficultySelect.addEventListener("change", e => difficulty = e.target.value);


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: BOARD INITIALIZATION & RENDERING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * CREATE INITIAL BOARD
 * Generates 9 div.cell elements in a 3x3 grid
 * Attaches click event listeners to each cell
 * Called once at page load and after each reset
 */
function createBoard() {
  boardEl.innerHTML = "";  // Clear any existing cells
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement("div");
    cell.classList.add("cell");
    cell.dataset.index = i;  // Store cell index as data attribute
    cell.addEventListener("click", () => handleCellClick(i)); // Attach click handler
    boardEl.appendChild(cell);
  }
}

/**
 * RENDER/UPDATE BOARD DISPLAY
 * Redraws all 9 cells based on current board state
 * Shows only the TOP piece in each stack (visually)
 * Called after every move to update UI
 */
function renderBoard() {
  document.querySelectorAll(".cell").forEach((cell, i) => {
    cell.innerHTML = "";  // Clear old content
    const stack = board[i];
    if (stack.length) {
      const top = stack[stack.length - 1];  // Get top piece only
      const piece = document.createElement("div");
      piece.classList.add("piece", top.player, top.size);  // Add CSS classes for styling
      cell.appendChild(piece);
    }
  });

  // Restore visual highlighting if a cell is still selected
  clearSelectedFrom();
  if (selectedFrom !== null) highlightSelectedFrom(selectedFrom);
}

/**
 * HIGHLIGHT SELECTED CELL
 * Visually shows which cell has been selected for moving
 * Uses CSS class "selected-from" for styling
 */
function highlightSelectedFrom(i) {
  clearSelectedFrom();
  document.querySelectorAll(".cell")[i].classList.add("selected-from");
}

/**
 * CLEAR CELL HIGHLIGHTS
 * Removes visual highlighting from all cells
 */
function clearSelectedFrom() {
  document.querySelectorAll(".cell").forEach(c => c.classList.remove("selected-from"));
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: MAIN GAME LOGIC - CELL CLICK HANDLER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * HANDLE CELL CLICK - MAIN GAME LOGIC
 * 
 * Three possible actions:
 * 1. PLACE piece from inventory: Click a cell after selecting size button
 * 2. MOVE piece: Click own piece, then click destination cell
 * 3. CANCEL: Click selected cell again to deselect
 * 
 * This is the core handler that processes all user input
 */
function handleCellClick(index) {

  // If clicking the same cell again → cancel selection
  if (selectedFrom === index) return cancelSelectAll();

  // Get the TOP piece in this cell's stack (only visible piece)
  const top = board[index][board[index].length - 1];

  // If top piece belongs to current player → player wants to MOVE it
  if (top && top.player === currentPlayer) {
    selectedFrom = index;
    selectedSize = null; // Cancel any piece size selection
    pieceBtns.forEach(b => b.classList.remove("selected"));
    highlightSelectedFrom(index); // Visual feedback: highlight this cell
    statusEl.textContent = `เลือกจุดปลายทาง`;  // Prompt: select destination
    return;
  }

  // If currently in MOVE mode (selectedFrom is set) → process destination click
  if (selectedFrom !== null) {
    const movingPiece = board[selectedFrom][board[selectedFrom].length - 1];
    if (!movingPiece) return;
    
    // Check if move is legal (destination must accept the piece size)
    if (!canPlace(index, currentPlayer, movingPiece.size, true)) return;

    // Execute the move
    board[selectedFrom].pop();              // Remove from source
    board[index].push(movingPiece);         // Add to destination
    clearSelectedFrom();
    selectedFrom = null;
    renderBoard();

    // Check for win condition
    if (checkWinner()) return endGame(`${currentPlayer} ชนะ!`);

    // Switch to other player
    switchTurn();
    
    // If single player and it's bot's turn → delay then execute bot move
    if (mode === "1p" && currentPlayer === "O") setTimeout(botMove, 600);
    return;
  }

  // PLACE mode: if player has selected a piece size, place it here
  if (selectedSize) {
    // Validate placement
    if (!canPlace(index, currentPlayer, selectedSize, false)) return;
    
    // Execute placement
    board[index].push({ player: currentPlayer, size: selectedSize });
    piecesLeft[currentPlayer][selectedSize]--;  // Decrement inventory
    renderBoard();

    // Check for win
    if (checkWinner()) return endGame(`${currentPlayer} ชนะ!`);
    
    // Switch player
    switchTurn();
    if (mode === "1p" && currentPlayer === "O") setTimeout(botMove, 600);
    return;
  }

  // No selection made yet → prompt user
  statusEl.textContent = `เลือกขนาดหมาก หรือแตะหมากของคุณเพื่อย้าย`;
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6: MOVE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * CAN PLACE CHECK
 * Validates whether a piece can be placed at a destination cell
 * 
 * Rules:
 * - New piece must be larger than current top piece (or cell empty)
 * - If placing from inventory: must have pieces left
 * - If moving: piece can go anywhere with larger top piece
 */
function canPlace(index, player, size, isMove = false) {
  const sizeOrder = ["small", "medium", "large"];  // Size hierarchy
  const newVal = sizeOrder.indexOf(size);
  const stack = board[index];
  const top = stack[stack.length - 1];
  const topVal = top ? sizeOrder.indexOf(top.size) : -1;

  // New piece must be larger than existing top piece
  if (newVal <= topVal) return false;
  
  // If placing from inventory (not moving) → must have pieces left
  if (!isMove && piecesLeft[player][size] <= 0) return false;
  
  return true;
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7: TURN & GAME STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SWITCH TURN
 * Toggles current player and updates UI displays
 * Called after each successful move
 */
function switchTurn() {
  currentPlayer = currentPlayer === "X" ? "O" : "X";
  currentPlayerEl.textContent = currentPlayer;
  cancelSelectAll();  // Reset UI selections for new player
  updatePieceCounts();  // Update piece count display
}

/**
 * CHECK WINNER
 * Examines all 8 win lines (3 horizontal + 3 vertical + 2 diagonal)
 * Returns true if current player has 3 in a row with their top pieces
 */
function checkWinner() {
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],  // Horizontal
    [0,3,6],[1,4,7],[2,5,8],  // Vertical
    [0,4,8],[2,4,6]            // Diagonal
  ];
  
  for (let [a,b,c] of wins) {
    const A = board[a][board[a].length - 1];  // Top piece
    const B = board[b][board[b].length - 1];
    const C = board[c][board[c].length - 1];
    
    // Check if all three positions have pieces and belong to same player
    if (A && B && C && A.player === B.player && B.player === C.player) return true;
  }
  return false;
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 8: WIN/END GAME HANDLING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SHOW WIN POPUP
 * Creates and displays an overlay with win message and action buttons
 * Buttons: Restart (new game) and Home (return to menu)
 */
function showWinPopup(text) {
  const overlay = document.createElement("div");
  overlay.id = "win-overlay";
  overlay.innerHTML = `
    <div class="win-modal">
      <div class="win-text">${text}</div>
      <div class="win-actions">
        <button id="win-restart">🔄 เริ่มใหม่</button>
        <button id="win-home">🏠 กลับหน้าหลัก</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  // Setup restart button
  const restartBtn = document.getElementById('win-restart');
  restartBtn && restartBtn.addEventListener('click', () => {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 300);  // Fade out animation
    if (typeof resetBtn !== 'undefined' && resetBtn) resetBtn.click();
  });

  // Setup home button
  const homeBtn = document.getElementById('win-home');
  homeBtn && homeBtn.addEventListener('click', () => {
    window.location.href = 'งาน.html';  // Navigate to menu
  });
}

/**
 * END GAME
 * Finalizes game state when win condition met
 * Disables further clicks and shows win popup
 */
function endGame(msg) {
  statusEl.textContent = `🎉 ${msg}`;
  showWinPopup(msg);
  // Disable further moves by preventing cell clicks
  document.querySelectorAll(".cell").forEach(c => c.style.pointerEvents = "none");
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 9: UI UPDATE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * UPDATE PIECE COUNTS
 * Displays remaining pieces for current player
 * Called after each move and player switch
 */
function updatePieceCounts() {
  smallLeftEl.textContent = piecesLeft[currentPlayer].small;
  mediumLeftEl.textContent = piecesLeft[currentPlayer].medium;
  largeLeftEl.textContent = piecesLeft[currentPlayer].large;
}

/**
 * UPDATE GAME INFO
 * Displays game mode, difficulty, and starting player in header
 * Called at game initialization
 */
function updateGameInfo(){
  const infoEl = document.getElementById('game-info');
  if (!infoEl) return;
  const modeText = mode === '1p' ? 'เล่นกับบอท' : 'เล่น 2 คน';
  const diffText = mode === '1p' ? ` | ระดับ: ${difficulty}` : '';
  infoEl.textContent = `โหมด: ${modeText}${diffText} | เริ่ม: ${currentPlayer}`;
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 10: BOT AI - MOVE GENERATION & VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GENERATE ALL MOVES
 * Creates a list of all legal moves for a player
 * Includes:
 * - All placements from inventory (if pieces remain)
 * - All possible moves of existing pieces on board
 * 
 * Returns array of move objects: { type, index, size } or { type, from, to, size }
 */
function generateAllMoves(player) {
  const sizeOrder = ["small","medium","large"];
  const moves = [];

  // Type 1: PLACE new pieces from inventory
  for (let s of sizeOrder) {
    if (piecesLeft[player][s] > 0) {  // Only if pieces remain
      for (let i = 0; i < 9; i++)
        if (canPlace(i, player, s)) moves.push({ type:"place", index:i, size:s });
    }
  }

  // Type 2: MOVE existing pieces on board
  for (let from = 0; from < 9; from++) {
    const stack = board[from];
    if (!stack.length) continue;  // Skip empty cells
    const top = stack[stack.length - 1];
    if (top.player !== player) continue;  // Skip opponent's pieces
    
    // Try moving this piece to all other cells
    for (let to = 0; to < 9; to++)
      if (to !== from && canPlace(to, player, top.size, true))
        moves.push({ type:"move", from, to, size: top.size });
  }

  return moves;
}

/**
 * APPLY MOVE
 * Executes a move on the board and updates visual display
 * Used by both: player moves and AI bot moves
 * Also used during minimax simulation
 */
function applyMove(m, player) {
  if (m.type === "place") {
    board[m.index].push({ player, size: m.size });
    piecesLeft[player][m.size]--;  // Reduce inventory
  } else {
    // type === "move"
    const mv = board[m.from].pop();
    board[m.to].push(mv);
  }
  renderBoard();
}

/**
 * UNDO MOVE
 * Reverses a move (used during minimax AI calculation)
 * Crucial for tree search algorithms
 */
function undoMoveGeneric(m, player) {
  if (m.type === "place") {
    board[m.index].pop();
    piecesLeft[player][m.size]++;  // Restore inventory
  } else {
    // type === "move"
    const mv = board[m.to].pop();
    board[m.from].push(mv);
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 11: BOT AI - MINIMAX ALGORITHM
// ═══════════════════════════════════════════════════════════════════════════

/**
 * DETECT WINNER (for minimax)
 * Similar to checkWinner but used during AI calculation
 * Returns player ("X" or "O") or null
 */
function detectWinnerPlayer() {
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  for (let [a,b,c] of wins) {
    const A = board[a][board[a].length - 1];
    const B = board[b][board[b].length - 1];
    const C = board[c][board[c].length - 1];
    if (A && B && C && A.player === B.player && B.player === C.player) return A.player;
  }
  return null;
}

/**
 * MINIMAX WITH ALPHA-BETA PRUNING
 * Advanced AI algorithm that:
 * - Evaluates multiple future moves ahead (depth limit)
 * - Uses alpha-beta pruning to skip unnecessary branches
 * - Scores positions: bot win (+100), bot loss (-100), neutral (0)
 * 
 * Depth limit set to 4 for performance balance
 * Higher depth = slower but stronger AI
 */
function minimax(depth, isMax, bot, human, alpha, beta, limit) {
  const winner = detectWinnerPlayer();
  
  // Terminal state: someone won or reached depth limit
  if (winner === bot) return 100 - depth;      // Bot wins (prefer faster wins)
  if (winner === human) return -100 + depth;   // Human wins (prefer slower losses)
  if (depth >= limit) return 0;                // Depth reached: neutral

  const player = isMax ? bot : human;
  const moves = generateAllMoves(player);
  if (!moves.length) return 0;  // No moves possible (shouldn't happen)

  let bestScore = isMax ? -Infinity : Infinity;

  // Try each possible move
  for (let m of moves) {
    applyMove(m, player);
    const score = minimax(depth+1, !isMax, bot, human, alpha, beta, limit);
    undoMoveGeneric(m, player);

    // Update best score and alpha/beta
    if (isMax) {
      bestScore = Math.max(bestScore, score);
      alpha = Math.max(alpha, score);
    } else {
      bestScore = Math.min(bestScore, score);
      beta = Math.min(beta, score);
    }

    // Alpha-beta pruning: cut search if no improvement possible
    if (beta <= alpha) break;
  }
  return bestScore;
}

/**
 * MINIMAX BEST MOVE
 * Finds the best move for bot using minimax evaluation
 * Used for "Super Hard" difficulty
 */
function minimaxBestMove(bot) {
  const opponent = bot === "O" ? "X" : "O";
  let bestScore = -Infinity, bestMove = null;
  const moves = generateAllMoves(bot);
  const depthLimit = 4;  // Look ahead 4 moves

  // Evaluate each possible move
  for (let m of moves) {
    applyMove(m, bot);
    let score = minimax(1, false, bot, opponent, -Infinity, Infinity, depthLimit);
    undoMoveGeneric(m, bot);
    if (score > bestScore) {
      bestScore = score;
      bestMove = m;
    }
  }
  return bestMove;
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 12: BOT AI - HEURISTIC STRATEGIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * FIND WINNING MOVE
 * Searches for immediate winning move for bot
 * Used by Easy, Medium, and Hard difficulties
 */
function findWinningMoveGeneric(player) {
  const moves = generateAllMoves(player);
  for (let m of moves) {
    applyMove(m, player);
    const win = checkWinner();
    undoMoveGeneric(m, player);
    if (win) return m;  // Found winning move!
  }
  return null;
}

/**
 * FIND BLOCKING MOVE
 * Searches for move that blocks opponent's immediate win
 * Used by Medium and Hard difficulties
 */
function findBlockingMoveGeneric(bot) {
  const opponent = bot === "O" ? "X" : "O";
  const oppWin = findWinningMoveGeneric(opponent);
  if (!oppWin) return null;  // Opponent has no immediate win threat

  // Find a move that prevents opponent's winning move
  const moves = generateAllMoves(bot);
  for (let m of moves) {
    applyMove(m, bot);
    const stillWin = findWinningMoveGeneric(opponent);
    undoMoveGeneric(m, bot);
    if (!stillWin) return m;  // This move blocks the threat!
  }
  return null;
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 13: BOT AI - MAIN DECISION LOGIC
// ═══════════════════════════════════════════════════════════════════════════

/**
 * BOT MOVE
 * Main function called when it's bot's turn
 * Selects move based on current difficulty setting
 * 
 * Difficulty levels:
 * - Easy: Random move
 * - Medium: Win if possible, block if necessary, else random
 * - Hard: Same as medium (for variety, could enhance)
 * - Super: Minimax evaluation (optimal play with depth limit)
 */
function botMove() {
  const bot = "O";
  const moves = generateAllMoves(bot);
  if (!moves.length) return endGame("เสมอ!");  // No moves = draw

  // Choose move based on difficulty
  const move =
    difficulty === "easy"   ? moves[Math.floor(Math.random()*moves.length)] :
    difficulty === "medium" ? findWinningMoveGeneric(bot) || findBlockingMoveGeneric(bot) || moves[Math.floor(Math.random()*moves.length)] :
    difficulty === "hard"   ? findWinningMoveGeneric(bot) || findBlockingMoveGeneric(bot) || moves[Math.floor(Math.random()*moves.length)] :
    /* super */             minimaxBestMove(bot) || moves[Math.floor(Math.random()*moves.length)];

  // Execute the chosen move
  applyMove(move, bot);
  if (checkWinner()) return endGame(`🤖 บอท (${difficulty}) ชนะ!`);
  switchTurn();
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 14: PIECE SIZE SELECTION UI
// ═══════════════════════════════════════════════════════════════════════════

/**
 * PIECE BUTTON CLICK HANDLERS
 * When player clicks a size button (small/medium/large):
 * - Highlight the button
 * - Store selected size
 * - Clear any existing piece movement selection
 * - Prompt user to click a cell
 */
pieceBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    // If clicking same button again → cancel selection
    if (selectedSize === btn.dataset.size) return cancelSelectAll();
    
    // Highlight this button, deselect others
    pieceBtns.forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    
    // Store selection and clear move mode
    selectedSize = btn.dataset.size;
    selectedFrom = null;
    clearSelectedFrom();
    statusEl.textContent = `เลือกช่องที่จะวางหมากขนาด ${selectedSize}`;
  });
});


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 15: RESET BUTTON
// ═══════════════════════════════════════════════════════════════════════════

/**
 * RESET GAME
 * Clears board and piece inventory, starts new game
 * Called when player clicks reset button
 */
resetBtn.addEventListener("click", () => {
  // Reset game state
  currentPlayer = "X";
  cancelSelectAll();
  board = Array(9).fill(null).map(() => []);
  piecesLeft = { X:{small:2,medium:2,large:2}, O:{small:2,medium:2,large:2} };
  
  // Rebuild board UI
  createBoard();
  renderBoard();
  
  // Update all displays
  currentPlayerEl.textContent = "X";
  updatePieceCounts();
  statusEl.textContent = "ผู้เล่น X เริ่มก่อน";
});


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 16: GAME INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * STARTUP
 * Initialize game when page loads
 * Called once at page initialization
 */
createBoard();           // Create 9 cells
renderBoard();           // Draw initial empty board
updatePieceCounts();     // Display piece counts for first player
currentPlayerEl.textContent = currentPlayer;  // Show who's starting
statusEl.textContent = `ตาของผู้เล่น ${currentPlayer}`;  // Welcome message
updateGameInfo();        // Display mode/difficulty info in header

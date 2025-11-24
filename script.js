/**
 * ========================================
 * เกม GOBBLET GOBBLERS TIC TAC TOE - ลอจิกเกม
 * ========================================
 * 
 * ระบบเกม: หมากฮอสต์ต้อนซ้อน (วางแบบ stack ได้)
 * โหมด: 1 คน vs บอท หรือ 2 คน vs 2 คน
 * ระดับบอท: ง่าย (สุ่ม) → ปานกลาง (หาชนะ/ป้องกัน) → ยาก → ยากสุด (Minimax)
 * 
 * โครงสร้าง: DOM → สถานะ → ตั้งกระดาน → จัดการ UI → ลอจิกเกม → ตรวจสอบ → 
 *           วาดรูป → เปลี่ยนตา → บอทเดิน → AI → เริ่มต้นเกม
 */

// ═══════════════════════════════════════════════════════════════════════════
// ส่วนที่ 1: DOM ELEMENTS & อ้างอิง UI
// ═══════════════════════════════════════════════════════════════════════════

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const resetBtn = document.getElementById("reset");
const currentPlayerEl = document.getElementById("current-player");
const pieceBtns = document.querySelectorAll(".piece-btn");
const smallLeftEl = document.getElementById("small-left");
const mediumLeftEl = document.getElementById("medium-left");
const largeLeftEl = document.getElementById("large-left");
const modeSelect = document.getElementById("mode");
const difficultySelect = document.getElementById("difficulty");


// ═══════════════════════════════════════════════════════════════════════════
// ส่วนที่ 2: ตัวแปรสถานะเกม
// ═══════════════════════════════════════════════════════════════════════════

let mode = "2p";
let difficulty = "easy";
let currentPlayer = "X";
let selectedSize = null;
let selectedFrom = null;

const params = new URLSearchParams(window.location.search);
if (params.get('mode')) mode = params.get('mode');
if (params.get('difficulty')) difficulty = params.get('difficulty');
if (params.get('player')) currentPlayer = (params.get('player') === 'P2' ? 'O' : 'X');

let board = Array(9).fill(null).map(() => []);
let piecesLeft = {
  X: { small: 2, medium: 2, large: 2 },
  O: { small: 2, medium: 2, large: 2 }
};


// ═══════════════════════════════════════════════════════════════════════════
// ส่วนที่ 3: ตั้งกระดาน & วาดรูป
// ═══════════════════════════════════════════════════════════════════════════

function createBoard() {
  boardEl.innerHTML = "";
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement("div");
    cell.classList.add("cell");
    cell.dataset.index = i;
    cell.addEventListener("click", () => handleCellClick(i));
    boardEl.appendChild(cell);
  }
}

function renderBoard() {
  document.querySelectorAll(".cell").forEach((cell, i) => {
    cell.innerHTML = "";
    const stack = board[i];
    if (stack.length) {
      const top = stack[stack.length - 1];
      const piece = document.createElement("div");
      piece.classList.add("piece", top.player, top.size);
      cell.appendChild(piece);
    }
  });
  clearSelectedFrom();
  if (selectedFrom !== null) highlightSelectedFrom(selectedFrom);
}

function highlightSelectedFrom(i) {
  clearSelectedFrom();
  document.querySelectorAll(".cell")[i].classList.add("selected-from");
}

function clearSelectedFrom() {
  document.querySelectorAll(".cell").forEach(c => c.classList.remove("selected-from"));
}


// ═══════════════════════════════════════════════════════════════════════════
// ส่วนที่ 4: สถานะ UI & เลือกหมาก
// ═══════════════════════════════════════════════════════════════════════════

function cancelSelectAll() {
  selectedSize = null;
  selectedFrom = null;
  pieceBtns.forEach(b => b.classList.remove("selected"));
  clearSelectedFrom();
  statusEl.textContent = `ตาของผู้เล่น ${currentPlayer}`;
}

pieceBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    if (selectedSize === btn.dataset.size) return cancelSelectAll();
    pieceBtns.forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedSize = btn.dataset.size;
    selectedFrom = null;
    clearSelectedFrom();
    statusEl.textContent = `เลือกช่องที่จะวางหมากขนาด ${selectedSize}`;
  });
});

modeSelect && modeSelect.addEventListener("change", e => mode = e.target.value);
difficultySelect && difficultySelect.addEventListener("change", e => difficulty = e.target.value);


// ═══════════════════════════════════════════════════════════════════════════
// ส่วนที่ 5: ฟังก์ชันอัปเดต UI
// ═══════════════════════════════════════════════════════════════════════════

function updatePieceCounts() {
  smallLeftEl.textContent = piecesLeft[currentPlayer].small;
  mediumLeftEl.textContent = piecesLeft[currentPlayer].medium;
  largeLeftEl.textContent = piecesLeft[currentPlayer].large;
}

function updateGameInfo(){
  const infoEl = document.getElementById('game-info');
  if (!infoEl) return;
  const modeText = mode === '1p' ? 'เล่นกับบอท' : 'เล่น 2 คน';
  const diffText = mode === '1p' ? ` | ระดับ: ${difficulty}` : '';
  infoEl.textContent = `โหมด: ${modeText}${diffText} | เริ่ม: ${currentPlayer}`;
}


// ═══════════════════════════════════════════════════════════════════════════
// ส่วนที่ 6: ตรวจสอบท่า & กฎ
// ═══════════════════════════════════════════════════════════════════════════

function canPlace(index, player, size, isMove = false) {
  const sizeOrder = ["small", "medium", "large"];
  const newVal = sizeOrder.indexOf(size);
  const stack = board[index];
  const top = stack[stack.length - 1];
  const topVal = top ? sizeOrder.indexOf(top.size) : -1;
  if (newVal <= topVal) return false;
  if (!isMove && piecesLeft[player][size] <= 0) return false;
  return true;
}

function checkWinner() {
  const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (let [a,b,c] of wins) {
    const A = board[a][board[a].length - 1];
    const B = board[b][board[b].length - 1];
    const C = board[c][board[c].length - 1];
    if (A && B && C && A.player === B.player && B.player === C.player) return true;
  }
  return false;
}


// ═══════════════════════════════════════════════════════════════════════════
// ส่วนที่ 7: ลอจิกเกมหลัก - จัดการคลิกช่อง
// ═══════════════════════════════════════════════════════════════════════════

function handleCellClick(index) {
  if (selectedFrom === index) return cancelSelectAll();
  
  const top = board[index][board[index].length - 1];
  
  if (top && top.player === currentPlayer) {
    selectedFrom = index;
    selectedSize = null;
    pieceBtns.forEach(b => b.classList.remove("selected"));
    highlightSelectedFrom(index);
    statusEl.textContent = `เลือกจุดปลายทาง`;
    return;
  }
  
  if (selectedFrom !== null) {
    const movingPiece = board[selectedFrom][board[selectedFrom].length - 1];
    if (!movingPiece) return;
    if (!canPlace(index, currentPlayer, movingPiece.size, true)) return;
    
    board[selectedFrom].pop();
    board[index].push(movingPiece);
    clearSelectedFrom();
    selectedFrom = null;
    renderBoard();
    
    if (checkWinner()) return endGame(`${currentPlayer} ชนะ!`);
    switchTurn();
    if (mode === "1p" && currentPlayer === "O") setTimeout(botMove, 600);
    return;
  }
  
  if (selectedSize) {
    if (!canPlace(index, currentPlayer, selectedSize, false)) return;
    board[index].push({ player: currentPlayer, size: selectedSize });
    piecesLeft[currentPlayer][selectedSize]--;
    renderBoard();
    
    if (checkWinner()) return endGame(`${currentPlayer} ชนะ!`);
    switchTurn();
    if (mode === "1p" && currentPlayer === "O") setTimeout(botMove, 600);
    return;
  }
  
  statusEl.textContent = `เลือกขนาดหมาก หรือแตะหมากของคุณเพื่อย้าย`;
}


// ═══════════════════════════════════════════════════════════════════════════
// ส่วนที่ 8: เปลี่ยนตา & จัดการสถานะเกม
// ═══════════════════════════════════════════════════════════════════════════

function switchTurn() {
  currentPlayer = currentPlayer === "X" ? "O" : "X";
  currentPlayerEl.textContent = currentPlayer;
  cancelSelectAll();
  updatePieceCounts();
}

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
  
  document.getElementById('win-restart')?.addEventListener('click', () => {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 300);
    resetBtn?.click();
  });
  
  document.getElementById('win-home')?.addEventListener('click', () => {
    window.location.href = 'งาน.html';
  });
}

function endGame(msg) {
  statusEl.textContent = `🎉 ${msg}`;
  showWinPopup(msg);
  document.querySelectorAll(".cell").forEach(c => c.style.pointerEvents = "none");
}


// ═══════════════════════════════════════════════════════════════════════════
// ส่วนที่ 9: AI บอท - สร้างท่า & ทำท่า
// ═══════════════════════════════════════════════════════════════════════════

function generateAllMoves(player) {
  const sizeOrder = ["small","medium","large"];
  const moves = [];
  
  for (let s of sizeOrder) {
    if (piecesLeft[player][s] > 0) {
      for (let i = 0; i < 9; i++)
        if (canPlace(i, player, s)) moves.push({ type:"place", index:i, size:s });
    }
  }
  
  for (let from = 0; from < 9; from++) {
    const stack = board[from];
    if (!stack.length) continue;
    const top = stack[stack.length - 1];
    if (top.player !== player) continue;
    for (let to = 0; to < 9; to++)
      if (to !== from && canPlace(to, player, top.size, true))
        moves.push({ type:"move", from, to, size: top.size });
  }
  
  return moves;
}

function applyMove(m, player) {
  if (m.type === "place") {
    board[m.index].push({ player, size: m.size });
    piecesLeft[player][m.size]--;
  } else {
    const mv = board[m.from].pop();
    board[m.to].push(mv);
  }
  renderBoard();
}

function undoMoveGeneric(m, player) {
  if (m.type === "place") {
    board[m.index].pop();
    piecesLeft[player][m.size]++;
  } else {
    const mv = board[m.to].pop();
    board[m.from].push(mv);
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// ส่วนที่ 10: AI บอท - กลยุทธ์ & ตรวจชนะ
// ═══════════════════════════════════════════════════════════════════════════

function detectWinnerPlayer() {
  const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (let [a,b,c] of wins) {
    const A = board[a][board[a].length - 1];
    const B = board[b][board[b].length - 1];
    const C = board[c][board[c].length - 1];
    if (A && B && C && A.player === B.player && B.player === C.player) return A.player;
  }
  return null;
}

function findWinningMoveGeneric(player) {
  const moves = generateAllMoves(player);
  for (let m of moves) {
    applyMove(m, player);
    const win = checkWinner();
    undoMoveGeneric(m, player);
    if (win) return m;
  }
  return null;
}

function findBlockingMoveGeneric(bot) {
  const opponent = bot === "O" ? "X" : "O";
  const oppWin = findWinningMoveGeneric(opponent);
  if (!oppWin) return null;
  
  const moves = generateAllMoves(bot);
  for (let m of moves) {
    applyMove(m, bot);
    const stillWin = findWinningMoveGeneric(opponent);
    undoMoveGeneric(m, bot);
    if (!stillWin) return m;
  }
  return null;
}


// ═══════════════════════════════════════════════════════════════════════════
// ส่วนที่ 11: AI บอท - ขั้นตอน Minimax
// ═══════════════════════════════════════════════════════════════════════════

function minimax(depth, isMax, bot, human, alpha, beta, limit) {
  const winner = detectWinnerPlayer();
  if (winner === bot) return 100 - depth;
  if (winner === human) return -100 + depth;
  if (depth >= limit) return 0;
  
  const player = isMax ? bot : human;
  const moves = generateAllMoves(player);
  if (!moves.length) return 0;
  
  let bestScore = isMax ? -Infinity : Infinity;
  
  for (let m of moves) {
    applyMove(m, player);
    const score = minimax(depth+1, !isMax, bot, human, alpha, beta, limit);
    undoMoveGeneric(m, player);
    
    if (isMax) {
      bestScore = Math.max(bestScore, score);
      alpha = Math.max(alpha, score);
    } else {
      bestScore = Math.min(bestScore, score);
      beta = Math.min(beta, score);
    }
    
    if (beta <= alpha) break;
  }
  return bestScore;
}

function minimaxBestMove(bot) {
  const opponent = bot === "O" ? "X" : "O";
  let bestScore = -Infinity, bestMove = null;
  const moves = generateAllMoves(bot);
  const depthLimit = 4;
  
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
// ส่วนที่ 12: AI บอท - ลอจิกตัดสินใจหลัก
// ═══════════════════════════════════════════════════════════════════════════

function botMove() {
  const bot = "O";
  const moves = generateAllMoves(bot);
  if (!moves.length) return endGame("เสมอ!");
  
  const move =
    difficulty === "easy"   ? moves[Math.floor(Math.random()*moves.length)] :
    difficulty === "medium" ? findWinningMoveGeneric(bot) || findBlockingMoveGeneric(bot) || moves[Math.floor(Math.random()*moves.length)] :
    difficulty === "hard"   ? findWinningMoveGeneric(bot) || findBlockingMoveGeneric(bot) || moves[Math.floor(Math.random()*moves.length)] :
    minimaxBestMove(bot) || moves[Math.floor(Math.random()*moves.length)];
  
  applyMove(move, bot);
  if (checkWinner()) return endGame(`🤖 บอท (${difficulty}) ชนะ!`);
  switchTurn();
}


// ═══════════════════════════════════════════════════════════════════════════
// ส่วนที่ 13: ปุ่มรีเซ็ต & เริ่มต้นเกม
// ═══════════════════════════════════════════════════════════════════════════

resetBtn.addEventListener("click", () => {
  currentPlayer = "X";
  cancelSelectAll();
  board = Array(9).fill(null).map(() => []);
  piecesLeft = { X:{small:2,medium:2,large:2}, O:{small:2,medium:2,large:2} };
  createBoard();
  renderBoard();
  currentPlayerEl.textContent = "X";
  updatePieceCounts();
  statusEl.textContent = "ผู้เล่น X เริ่มก่อน";
});

// Initialize game on page load
createBoard();
renderBoard();
updatePieceCounts();
currentPlayerEl.textContent = currentPlayer;
statusEl.textContent = `ตาของผู้เล่น ${currentPlayer}`;
updateGameInfo();

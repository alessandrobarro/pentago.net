/*
---------------------------------------
           www.pentago.net
---------------------------------------

info.pentagogame@gmail.com
*/

/*----------------------------------------------Modules----------------------------------------------*/
import Board from './game-board.js';

/*----------------------------------------Game init settings-----------------------------------------*/
var HOST = location.origin.replace(/^http/, 'ws')
const IP = 'localhost';
console.log('[DATA] Host: ', HOST);
var el;
const playername = localStorage.getItem("nickname");
const diff = localStorage.getItem("diff");
console.log('[DATA] Player name: ', playername);
const gType = localStorage.getItem("gType");
console.log('[DATA] Game type (0: public, 1: private): ', gType);
const gKey = localStorage.getItem("gKey");
console.log("[DATA] Game R-Key: ", gKey);


/*------------------------------------------Helper functions-----------------------------------------*/
function truncate(str, length) {
  /* Truncates the player name */
  if (str.length > length) {
    return str.slice(0, length) + '...';
  } else return str;
}

async function captureGameBoard(scene, x, y, width, height) {
  /* Takes the screenshot of the game with html2canvas implicitly imported */
  return new Promise((resolve) => {
    scene.game.renderer.snapshot((image) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      context.drawImage(image, x, y, width, height, 0, 0, width, height);
      resolve(canvas.toDataURL('image/png'));
    });
  });
}

/*------------------------------------------Minimax agent-----------------------------------------*/

function minimax(board, depth, isMaximizingPlayer, alpha, beta) {
  if (depth === 0 || board.check_winner() !== '-1') {
      return {score: evaluateBoard(board)};
  }

  if (isMaximizingPlayer) {
      let maxEval = -Infinity;
      let bestMove;
      for (let move of getAllPossibleMoves(board, 'AI')) {
          makeMove(board, move);
          let eva = minimax(board, depth - 1, false, alpha, beta).score;
          undoMove(board, move);
          if (eva > maxEval) {
              maxEval = eva;
              bestMove = move;
          }
          alpha = Math.max(alpha, eva);
          if (beta <= alpha) break;
      }
      return {score: maxEval, move: bestMove};
  } else {
      let minEval = Infinity;
      let bestMove;
      for (let move of getAllPossibleMoves(board, 'Human')) {
          makeMove(board, move);
          let eva = minimax(board, depth - 1, true, alpha, beta).score;
          undoMove(board, move);
          if (eva < minEval) {
              minEval = eva;
              bestMove = move;
          }
          beta = Math.min(beta, eva);
          if (beta <= alpha) break;
      }
      return {score: minEval, move: bestMove};
  }
}

function chooseRandomMove(board) {
  let moves = [];
  let size = 6;

  for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
          if (board.config[i][j] === '-1') {
              for (let q = 1; q <= 4; q++) {
                  [1, -1].forEach(alpha => {
                      moves.push({i, j, q, alpha});
                  });
              }
          }
      }
  }

  if (moves.length > 0) {
      return moves[Math.floor(Math.random() * moves.length)];
  } else {
      return null;
  }
}

function getAllPossibleMoves(board, player) {
  let moves = [];
  for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
          if (board.config[i][j] === '-1') {
              for (let q = 1; q <= 4; q++) {
                  for (let alpha of [1, -1]) {
                      moves.push({i, j, q, alpha, player});
                  }
              }
          }
      }
  }
  return moves;
}

function makeMove(board, move) {
  board.config[move.i][move.j] = move.player;
  board.rotate(move.q, move.alpha);
}

function undoMove(board, move) {
  board.rotate(move.q, -move.alpha);
  board.config[move.i][move.j] = '-1';
}

function evaluateBoard(board) {
  let score = 0;

  const winner = board.check_winner();
  if (winner === '1') {
      return 1000;
  } else if (winner === '0') {
      return -1000;
  }

  function countOpenLines(board, player) {
    let count = 0;
    let size = 6;
    let lines = [];

    // Check rows and columns
    for (let i = 0; i < size; i++) {
        let row = [];
        let col = [];
        for (let j = 0; j < size; j++) {
            row.push(board.config[i][j]);
            col.push(board.config[j][i]);
        }
        lines.push(row);
        lines.push(col);
    }

    let diag1 = [];
    let diag2 = [];
    for (let i = 0; i < size; i++) {
        diag1.push(board.config[i][i]);
        diag2.push(board.config[i][size - 1 - i]);
    }
    lines.push(diag1);
    lines.push(diag2);

    function isOpenLine(line, player) { // checks if a line is open to a player
        let hasPlayer = line.includes(player);
        let hasOpponent = line.includes(player === '1' ? '0' : '1');
        let hasEmpty = line.includes('-1');
        return hasPlayer && !hasOpponent && hasEmpty;
    }

    lines.forEach(line => { // counts the open lines
        if (isOpenLine(line, player)) {
            count++;
        }
    });

    return count;
  }


  // Calculate scores for potential lines for AI and Human
  let aiOpenLines = countOpenLines(board, '1'); // Assuming '1' denotes AI
  let humanOpenLines = countOpenLines(board, '0'); // Assuming '0' denotes the player

  score += aiOpenLines * 10;  // Adjust weighting as needed
  score -= humanOpenLines * 10;

  // Optionally add center control weighting
  // Assuming center squares are more strategically valuable
  let centerPieces = [board.config[2][2], board.config[2][3], board.config[3][2], board.config[3][3]];
  centerPieces.forEach(piece => {
      if (piece === '1') score += 5;  // Small bonus for AI controlling center
      if (piece === '0') score -= 5;  // Small penalty for Player controlling center
  });

  return score;
}

function chooseAIMove(board, difficulty) {
  switch (difficulty) {
      case 'easy':
          return chooseRandomMove(board);
      case 'medium':
          return minimax(board, 3, true, -Infinity, Infinity).move;
      case 'hard':
          return minimax(board, 4, true, -Infinity, Infinity).move;
      case 'expert':
          return minimax(board, 5, true, -Infinity, Infinity).move;
      case 'god':
          return minimax(board, 6, true, -Infinity, Infinity).move;
  }
}

/*-----------------------------------------Main game class----------------------------------------*/
class GameScene extends Phaser.Scene {
  constructor() {
    super("gameScene");
    this.ready = true;
    this.gameStateUpdated = false;
    this.game_state_received = false;
    this.timersStarted = false;
    this.currentTurn = '0';
    this.color = '0';
    this.timerRunning = false;
    this.lastTick = null;
    this.playerTimer = 600;
    this.redraw_window = this.redraw_window.bind(this);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const partInSeconds = Math.floor(seconds % 60);
    return `${minutes}:${partInSeconds.toString().padStart(2, '0')}`;
  }

  updateTimer() {
    if (this.timerRunning && this.currentTurn === '0') {
        const now = Date.now();
        const delta = (now - this.lastTick) / 1000;
        this.playerTimer -= delta;

        if (this.playerTimer <= 0) {
            this.playerTimer = 0;
            this.timerRunning = false;
            captureGameBoard(this, offset_x - 284* 1.406, offset_y - 284* 1.406, 580* 1.406, 580* 1.406).then(gameBoardScreenshot => {
              sessionStorage.setItem('gameBoardScreenshot', gameBoardScreenshot);
            setTimeout(() => {
              window.location.href = 'pentago-lose.html';
            }, 500);})
        }

        this.lastTick = now;
        this.updateDisplayedTimers();
    } else {
        // Log this to see if updateTimer gets called when it shouldn't
        this.lastTick = Date.now(); // Reset lastTick to prevent future time jumps
    }
  }

  startPlayerTimer() {
    this.timerRunning = true;
    this.lastTick = Date.now();
  }

  pausePlayerTimer() {
    this.timerRunning = false;
    this.lastTick = Date.now();
  }

  updateDisplayedTimers() {
    const formattedTime = this.formatTime(this.playerTimer);
    this.timerText1.setText(`${formattedTime}`);
  }

  getQuadrantIndex(x, y) {
    const centerX = this.cameras.main.width / 2 + 150 * 1.406;
    const centerY = this.cameras.main.height / 2;

    const relativeX = x - centerX;
    const relativeY = y - centerY;

    if (relativeX < 0 && relativeY < 0) {
        return 1;
    } else if (relativeX > 0 && relativeY > 0) {
        return 4;
    } else if (relativeX < 0 && relativeY > 0) {
        return 3;
    } else if (relativeX > 0 && relativeY < 0) {
        return 2;
    }

    return -1;
  }

  calculateRotationAngle(pointer) {
    const quadrantCenter = this.getQuadrantCenter(this.draggingQuadrant.index);
    const initialAngle = Math.atan2(this.draggingQuadrant.initialY - quadrantCenter[1], this.draggingQuadrant.initialX - quadrantCenter[0]);
    const currentAngle = Math.atan2(pointer.y - quadrantCenter[1], pointer.x - quadrantCenter[0]);
    const rotationAngle = Phaser.Math.RadToDeg(currentAngle - initialAngle);
    return rotationAngle;
  }
 
  getQuadrantCenter(index) {
    const [topLeft, bottomRight] = this.quadrants[index - 1];
    const centerX = (topLeft[0] + bottomRight[0]) / 2;
    const centerY = (topLeft[1] + bottomRight[1]) / 2;
    return [centerX, centerY];
  }
  
  getMarblesInQuadrant(index) {
    return this.marbles.filter(([, , , quadrant]) => quadrant === index);
  }

  rotateQuadrantVisual(index, angle) {
    const quadrant = this.quadrants_drawings[index - 1];
    const rotation = Phaser.Math.DegToRad(angle);
    quadrant.rotation = rotation;
  }

  rotateMarblesVisual(marbles, angle) {
    const rotation = Phaser.Math.DegToRad(angle);
    marbles.forEach(([image, position, player, quadrant]) => {
      const quadrantCenter = this.getQuadrantCenter(quadrant); // Use the quadrant variable instead of this.q
      const rotatedPosition = this.rotatePoint(position, quadrantCenter, rotation);
      image.x = rotatedPosition[0];
      image.y = rotatedPosition[1];
    });  
  }
  
  rotatePoint(point, center, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = point[0] - center[0];
    const dy = point[1] - center[1];
    return [
      cos * dx - sin * dy + center[0],
      sin * dx + cos * dy + center[1]
    ];
  }
   
  revertRotation() {
    const quadrant = this.quadrants_drawings[this.draggingQuadrant.index - 1];
    const marb = this.getMarblesInQuadrant(this.draggingQuadrant.index)
    quadrant.rotation = 0;
    marb.forEach(marble => {
      const [image, position, player, quadrant] = marble;
      image.x = position[0];
      image.y = position[1];
    });
  }
    
  redraw_window() {
    let scene = this;
    scene.cameras.main.setBackgroundColor('#191818');
    const offset_x = this.cameras.main.width / 2 + 150* 1.406;
    const offset_y = this.cameras.main.height / 2;

    const textStyle3 = {
      fontFamily: 'Arial',
      fontSize: 22,
      color: '#FFFFFF'
    };

    if (this.bo.turn === '0') {
      scene.time_label = this.add.image(320* 1.406, 170* 1.406, 'white_label')
    }
    else if (this.bo.turn === '1') {
      scene.time_label = this.add.image(320* 1.406, 170* 1.406, 'black_label')
    }

    if (!this.has_placed && this.bo.turn === this.color && this.ready) {
      scene.add.image(850* 1.406, 70* 1.406, 'message');
      const has_placed_text = scene.add.text(705* 1.406, 60* 1.406, 'Click on the board to place a marble', textStyle3);
    }
    else if (this.has_placed && !this.has_selected_q && this.bo.turn === this.color && this.ready) {
      scene.add.image(850* 1.406, 70* 1.406, 'message');
      const has_placed_text = scene.add.text(650* 1.406, 60* 1.406, 'Click on the board to select a quadrant and rotate it', textStyle3);
    }
    else if (!this.has_placed && this.bo.turn !== this.color || !this.ready) {
      scene.add.image(850* 1.406, 70* 1.406, 'message');
      const has_placed_text = scene.add.text(766* 1.406, 60* 1.406, 'Waiting for player', textStyle3);
    }
  }

  draw_marble() {
    /* Draw new marbles on the board */
    const offset_x = this.cameras.main.width / 2 + 150* 1.406;
    const offset_y = this.cameras.main.height / 2;
  
    for (let l = 0; l < 6; l++) {
      for (let m = 0; m < 6; m++) {
        let x = (l === 1 || l === 4) ? offset_x - 236* 1.406 - 0.15* 1.406 + 94.6* 1.406 * m : offset_x - 236* 1.406 + 94.6* 1.406 * m;
        let y = offset_y - 236* 1.406 + 94.6* 1.406 * l;
        let marbleType = '';
        if (this.bo.config[l][m] === '0') {
          marbleType = 'p1';
        }
        else if(this.bo.config[l][m] === '1') {
          marbleType = 'p2';
        }
        if (this.bo.config[l][m] !== '-1') {
          let quadrant;
          if (x < offset_x && y < offset_y) {
            quadrant = 1;  // Top-left
          } else if (x >= offset_x && y < offset_y) {
            quadrant = 2;  // Top-right
          } else if (x < offset_x && y >= offset_y) {
            quadrant = 3;  // Bottom-left
          } else {
            quadrant = 4;  // Bottom-right
          }
  
          // Check if the marble already exists
          const marbleExists = this.marbles.some(marble => 
            marble[1][0] === x && marble[1][1] === y && marble[2] === this.bo.config[l][m]
          );
  
          // Add the marble only if it does not exist
          if (!marbleExists) {
            this.marbles.push([this.add.image(x, y, marbleType), [x, y], this.bo.config[l][m], quadrant]);
          }
        }
      }
    }
  }

  clear_marble() {
    /* Clears the mismatching marbles' drawings from the board */
    const offset_x = this.cameras.main.width / 2 + 150* 1.406;
    const offset_y = this.cameras.main.height / 2;
  
    this.marbles = this.marbles.filter(([marbleImage, coords, player, quadrant]) => {
      for (let l = 0; l < 6; l++) {
        for (let m = 0; m < 6; m++) {
          const coord = (l === 1 || l === 4) ?
            [offset_x - 236 * 1.406- 0.15 * 1.406+ 94.6 * 1.406* m, offset_y - 236* 1.406 + 94.6* 1.406 * l] :
            [offset_x - 236* 1.406 + 94.6* 1.406 * m, offset_y - 236* 1.406 + 94.6* 1.406 * l];
          
          if (coords[0] === coord[0] && coords[1] === coord[1]) {
            if (this.bo.config[l][m] === '-1') {
              // Destroy the marble if it's on a '-1' tile
              marbleImage.destroy();
              //console.log('Destroyed: ', marbleImage);
              return false; // Remove the marble from the array
            } else if (player != this.bo.config[l][m]) {
              // Destroy the marble if it doesn't match the tile configuration
              marbleImage.destroy();
              //console.log('Destroyed: ', marbleImage);
              return false; // Remove the marble from the array
            }
          }
        }
      }
      return true; // Keep the marble in the array
    });
  }

  generateAIMove() {
    let move = {
        i: 0,
        j: 0,
        q: 0,
        alpha: 0
    };

    let emptyPositions = [];
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
            if (this.bo.config[i][j] === '-1') {
                emptyPositions.push({ i, j });
            }
        }
    }

    if (emptyPositions.length > 0) {
        let position = emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
        move.i = position.i;
        move.j = position.j;
    }

    move.q = Math.floor(Math.random() * 4) + 1;
    move.alpha = Math.random() > 0.5 ? 1 : -1;

    return move;
  }
  
  async performAIMove() {
    this.isAITurn = true;
    this.lastTick = Date.now();
    this.pausePlayerTimer();

    this.bo.turn = '1';
    this.ready = false;
    this.redraw_window();
    await this.delay(500);

    let move = chooseAIMove(this.bo, diff);
    console.log(move)
    this.bo.config[move.i][move.j] = '1';
    this.draw_marble();
    this.redraw_window();
    await this.delay(1000);

    this.bo.rotate(move.q, move.alpha);
    this.draw_marble();
    this.clear_marble();
    this.redraw_window();
    await this.delay(500);

    this.bo.turn = '0';
    this.ready = true;
    this.redraw_window();

    this.lastTick = Date.now();
    this.startPlayerTimer();
    this.isAITurn = false;
    this.resetFlagsForNextTurn();
  }

  resetFlagsForNextTurn() {
    this.has_placed = false;
    this.has_selected_q = false;
    this.first_move = true;
    this.alpha = 0;
    this.q = null;
    this.draggingQuadrant = null;
    this.has_rotated = false;
    this.clear_marble();
    this.draw_marble();
  }
  
  preload(){
    /* Loads the game assets */
    this.load.spritesheet(
      "title",
      "data/assets/img/title_game.png",
      {
        frameWidth: 137* 1.406,
        frameHeight: 40* 1.406
      }
    );
    
    this.load.spritesheet(
      "time_label",
      "data/assets/img/time_label.png",
      {
        frameWidth: 200* 1.406,
        frameHeight: 95* 1.406
      }
    );

    this.load.spritesheet(
      "key_label",
      "data/assets/img/key_label.png",
      {
        frameWidth: 320* 1.406,
        frameHeight: 40* 1.406
      }
    );

    this.load.spritesheet(
      "white_label",
      "data/assets/img/white_label.png",
      {
        frameWidth: 200* 1.406,
        frameHeight: 30* 1.406
      }
    );

    this.load.spritesheet(
      "black_label",
      "data/assets/img/black_label.png",
      {
        frameWidth: 200* 1.406,
        frameHeight: 30* 1.406
      }
    );

    this.load.spritesheet(
      "timer",
      "data/assets/img/timer.png",
      {
        frameWidth: 72.4* 1.406,
        frameHeight: 72* 1.406,
      }
    );

    this.load.spritesheet(
      "message",
      "data/assets/img/message_label.png",
      {
        frameWidth: 450* 1.406,
        frameHeight: 30* 1.406,
      }
    );

    this.load.spritesheet(
      "p1",
      "data/assets/img/p1.png",
      {
        frameWidth: 47* 1.406,
        frameHeight: 47* 1.406
      }
    );

    this.load.spritesheet(
      "p2",
      "data/assets/img/p2.png",
      {
        frameWidth: 47* 1.406,
        frameHeight: 47* 1.406
      }
    );

    this.load.spritesheet(
      "quarter_board",
      "data/assets/img/quarter_board.png",
      {
        frameWidth: 395,
        frameHeight: 395
      }
    );

    this.load.spritesheet(
      "white_square",
      "data/assets/img/white_square.png",
      {
        frameWidth: 80* 1.406,
        frameHeight: 80* 1.406
      }
    );

    this.load.spritesheet(
      "pass_on",
      "data/assets/img/pass_on.png",
      {
        frameWidth: 203* 1.406,
        frameHeight: 123* 1.406
      }
    )

    this.load.spritesheet(
      "ra_on",
      "data/assets/img/ra_on.png",
      {
        frameWidth: 84* 1.406,
        frameHeight: 84* 1.406
      }
    )

    this.load.spritesheet(
      "rc_on",
      "data/assets/img/rc_on.png",
      {
        frameWidth: 84* 1.406,
        frameHeight: 84* 1.406
      }
    )

    this.load.spritesheet(
      "widget",
      "data/assets/img/widget_label.png",
      {
        frameWidth: 432* 1.406,
        frameHeight: 260* 1.406
      }
    )

    this.load.spritesheet(
      "control",
      "data/assets/img/control_label.png",
      {
        frameWidth: 275* 1.406,
        frameHeight: 315* 1.406
      }
    )

    this.load.spritesheet(
      "moon",
      "data/assets/img/moon.png",
      {
        frameWidth: 21* 1.406,
        frameHeight: 30* 1.406
      }
    )

    this.load.spritesheet(
      "select_1",
      "data/assets/img/select_1.png",
      {
        frameWidth: 295* 1.406,
        frameHeight: 295* 1.406
      }
    )

    this.load.spritesheet(
      "select_2",
      "data/assets/img/select_2.png",
      {
        frameWidth: 295* 1.406,
        frameHeight: 295* 1.406
      }
    )

    this.load.spritesheet(
      "select_3",
      "data/assets/img/select_3.png",
      {
        frameWidth: 295* 1.406,
        frameHeight: 295* 1.406
      }
    )

    this.load.spritesheet(
      "select_4",
      "data/assets/img/select_4.png",
      {
        frameWidth: 295* 1.406,
        frameHeight: 295* 1.406
      }
    )

    this.load.spritesheet(
      "names",
      "data/assets/img/names.png",
      {
        frameWidth: 280* 1.406,
        frameHeight: 80* 1.406,
      }
    )
             
    this.load.audio(
       "marble_placement",
       "data/assets/audio/marble_placement_sfx.mp3"
    );
    
    this.load.audio(
       "quarter_rotation",
       "data/assets/audio/quarter_rotation_sfx.mp3"
    );
  }

  create() {
    const offset_x = this.cameras.main.width / 2 + 150* 1.406;
    const offset_y = this.cameras.main.height / 2;
    const dx = offset_x - 283* 1.406;
    const dy = offset_y - 283* 1.406;

    const marble_placement_sfx = this.sound.add('marble_placement');
    const quarter_rotation_sfx = this.sound.add('quarter_rotation');

    this.updateCounter = 0;
    this.cameras.main.setBounds(0, 0, 1920, 1080);
    this.count = 0;
    this.marbles = [];
    

    this.has_placed = false;
    this.has_selected_q = false;
    this.first_move = true;
    this.alpha = 0;

    this.bo = new Board(566* 1.406, 566* 1.406);
    this.bo.turn = '0';
    this.bo.p1Name = playername;

    if (diff === 'easy') {
      this.bo.p2Name = 'Benvenuto'
    } else if (diff === 'medium') {
      this.bo.p2Name = 'Decimo'
    } else if (diff === 'hard'){
      this.bo.p2Name = 'Fortunato'
    } else if (diff === 'god') {
      this.bo.p2Name = 'Pentagod'
    }

    this.name = 'player';
    this.running = true;
    this.serial_key = '';
    this.handlersSet = false;

    this.copykeyBtn = new Phaser.Geom.Rectangle(270* 1.406, 530* 1.406, 250* 1.406, 20* 1.406);
    this.q1Btn = new Phaser.Geom.Rectangle(offset_x - 142* 1.406 + 0.75, offset_y - 142* 1.406 + 0.75, 284* 1.406, 284* 1.406);
    this.q2Btn = new Phaser.Geom.Rectangle(offset_x + 142* 1.406 + 0.75, offset_y + 142* 1.406 + 0.75, 284* 1.406, 284* 1.406);
    this.q3Btn = new Phaser.Geom.Rectangle(offset_x - 142* 1.406 + 0.75, offset_y + 142* 1.406 + 0.75, 284* 1.406, 284* 1.406);
    this.q4Btn = new Phaser.Geom.Rectangle(offset_x + 142* 1.406 + 0.75, offset_y - 142* 1.406 + 0.75, 284* 1.406, 284* 1.406);
    this.p1Text = this.add.text(1080* 1.406, 330* 1.406, '', { fontFamily: 'Arial', fontSize: 30, color: '#000000' });
    this.p2Text = this.add.text(1105* 1.406, 130* 1.406, '', { fontFamily: 'Arial', fontSize: 30, color: '#FFFFFF' });
    this.statusText = this.add.text(this.cameras.main.width / 2, 740* 1.406, '', { fontFamily: 'Arial', fontSize: 30, color: '#FFFFFF' }).setOrigin(0.5, 0);
    this.waitingText = this.add.text(this.cameras.main.width / 2, 140* 1.406, '', { fontFamily: 'Arial', fontSize: 50, color: '#FFFFFF' }).setOrigin(0.5, 0);
    this.move = '';
    this.string_color = '';
    this.moon = null;
    this.hover_1 = null;
    this.hover_2 = null;
    this.hover_3 = null;
    this.hover_4 = null;
    this.p1 = null;
    this.p2 = null;
    this.winner = null;

    this.time_label = this.add.image(420* 1.406, 170* 1.406, 'time_label');
    this.timerText1 = this.add.text(400* 1.406, 155* 1.406, '', { fontFamily: 'Arial', fontSize: "40px", color: "#FFFFFF" });
    this.timerText2 = this.add.text(400* 1.406, 155* 1.406, '', { fontFamily: 'Arial', fontSize: "40px", color: "#FFFFFF" });
    this.add.image(395* 1.406, 610* 1.406, 'names');
    this.add.text(270* 1.406, 577* 1.406, truncate(this.bo.p1Name, 11), {fontFamily: 'Arial', fontSize: 30, color: '#000000'});
    this.add.text(270* 1.406, 617* 1.406, truncate(this.bo.p2Name, 11), {fontFamily: 'Arial', fontSize: 30, color: '#FFFFFF'});

    this.white_square = this.add.image(offset_x, offset_y, 'white_square');

    this.q1 = this.add.image(offset_x - 200 + 0.75, offset_y - 200 + 0.75, 'quarter_board'); // TOP-LEFT
    this.q2 = this.add.image(offset_x + 200 + 0.75, offset_y - 200 + 0.75, 'quarter_board'); // TOP-RIGHT
    this.q3 = this.add.image(offset_x - 200 + 0.75, offset_y + 200 + 0.75, 'quarter_board'); // BOTTOM-LEFT
    this.q4 = this.add.image(offset_x + 200 + 0.75, offset_y + 200 + 0.75, 'quarter_board'); // BOTTOM-RIGHT

    const q1_coords = [[offset_x - 284* 1.406, offset_y - 284* 1.406],[offset_x, offset_y]];
    const q2_coords = [[offset_x + 284* 1.406, offset_y - 284* 1.406],[offset_x, offset_y]];
    const q3_coords = [[offset_x - 284* 1.406, offset_y + 284* 1.406],[offset_x, offset_y]];
    const q4_coords = [[offset_x + 284* 1.406, offset_y + 284* 1.406],[offset_x, offset_y]];

    this.quadrants = [q1_coords, q2_coords, q3_coords, q4_coords];
    this.quadrants_drawings = [this.q1, this.q2, this.q3, this.q4];

    this.draggingQuadrant = null;
    this.isDragging = false;

    this.quadrants_drawings.forEach((quadrantImage, index) => {
      quadrantImage.setInteractive({ draggable: true });
      quadrantImage.setOrigin(0.5, 0.5);
    
      quadrantImage.on('pointerdown', (pointer) => {
        if (this.has_placed && !this.has_rotated) {
            this.isDragging = true;
            this.draggingQuadrant = {index: this.getQuadrantIndex(pointer.x, pointer.y), initialX: pointer.x, initialY: pointer.y};
        }
      });
    
      quadrantImage.on('pointermove', (pointer) => {
        if (this.isDragging && this.draggingQuadrant) {
          let angle = this.calculateRotationAngle(pointer);
          angle = Phaser.Math.Clamp(angle, -90, 90);
          this.rotateQuadrantVisual(this.draggingQuadrant.index, angle);
          this.rotateMarblesVisual(this.getMarblesInQuadrant(this.draggingQuadrant.index), angle);
        }
      });
    
      quadrantImage.on('pointerup', (pointer) => {
        if (this.isDragging && this.draggingQuadrant) {
          this.isDragging = false;
          let angle = this.calculateRotationAngle(pointer);
          const clockwise = angle > 0;
          this.alpha = clockwise ? -1 : 1; // 1 CW
          const angleThreshold = 45; // Threshold in degrees
          if (Math.abs(angle) >= angleThreshold) {
            quarter_rotation_sfx.play();
            this.bo.rotate(this.draggingQuadrant.index, this.alpha)
            this.revertRotation();

            this.has_rotated = true;

            this.winner = this.bo.check_winner();
                if (this.winner !== '-1') {
                console.log('GAMEEND')
                captureGameBoard(this, offset_x - 284* 1.406, offset_y - 284* 1.406, 580* 1.406, 580* 1.406).then(gameBoardScreenshot => {
                sessionStorage.setItem('gameBoardScreenshot', gameBoardScreenshot);
                if (this.winner === '0') {
                setTimeout(() => {
                  window.location.href = 'pentago-win.html';
                }, 500);
                } else {
                setTimeout(() => {
                  window.location.href = 'pentago-lose.html';
                }, 500);
              }
            })
            }
            
          } else {
            this.revertRotation();
          }
          this.draggingQuadrant = null;
        }
      });
    });

    this.input.on('pointerup', (pointer) => {
      if (this.isAITurn) {
          console.log('AI is processing. No interaction allowed.');
          return;
      }

      const pos = { x: pointer.x, y: pointer.y };
      if (pos.x >= offset_x - 284* 1.406 && pos.x <= offset_x + 284* 1.406 && pos.y >= offset_y - 284* 1.406 && pos.y <= offset_y + 284* 1.406) {
          marble_placement_sfx.play();
          console.log("[GAME] this.bo.config: ", this.bo.config);
          if (!this.has_placed) {
              const [i, j] = this.bo.handle_click(pos, this.color, dx, dy);
              if (this.bo.config[j][i] === '-1') {
                  this.startPlayerTimer();
                  this.bo.config[j][i] = '0';
                  this.has_placed = true;
                  this.draw_marble();
              } else {
                  console.log('[GAME] Warning! invalid placement, please select a free cell');
              }
          }

          if (this.has_placed && this.has_rotated && this.alpha !== 0){
              this.performAIMove();
          }         
      }
    });
  }
    
  update() {
    if (this.ready) {
      this.updateTimer();
      const p1_time = this.bo.time1;
      const p2_time = this.bo.time2;
      this.redraw_window(this, this.bo, p1_time, p2_time, this.color, this.ready, this.p1Text, this.p2Text, this.statusText, this.has_placed, this.has_selected_q, this.alpha, this.log_text);
    }
  
    this.updateCounter++;
    if (this.updateCounter % 60 === 0) {
      this.redraw_window(this, this.bo, this.bo.time1, this.bo.time2, this.color, this.ready, this.p1Text, this.p2Text, this.statusText, this.has_placed, this.has_selected_q, this.alpha, this.log_text);
    }
  }    
}

/*---------------------------------------Web embedding setup---------------------------------------*/
const config = {
  width: 1920,
  height: 1080,
  backgroundColor: "#262323",
  parent: "gameContainer",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    antialias: true,
    pixelArt: false
  },
  scene: [GameScene],
};

const game = new Phaser.Game(config);

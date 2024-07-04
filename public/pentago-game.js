/*
---------------------------------------
           www.pentago.net
---------------------------------------

https://github.com/basedryo/pentago.net
*/

/*----------------------------------------------Modules----------------------------------------------*/
import Board from './game-board.js';

/*----------------------------------------Game init settings-----------------------------------------*/
var HOST = location.origin.replace(/^http/, 'ws')
const IP = 'localhost';
console.log('[DATA] Host: ', HOST);
var el;
const playername = localStorage.getItem("nickname");
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

function matricesEqual(matrix1, matrix2) {
  /* Calculates the equality of two given matrices */
  if (matrix1.length !== matrix2.length || matrix1[0].length !== matrix2[0].length) {
    return false; // Matrices are not the same size
  }
  for (let i = 0; i < matrix1.length; i++) {
    for (let j = 0; j < matrix1[0].length; j++) {
      if (matrix1[i][j] !== matrix2[i][j]) {
        return false; // Element mismatch
      }
    }
  }
  return true; // Matrices are equal
}

/*-----------------------------------------Main Game class----------------------------------------*/
class GameScene extends Phaser.Scene {
  constructor() {
    super("gameScene");
    this.ready = false;
    this.gameStateUpdated = false;
    this.game_state_received = false;
    this.timersStarted = false;
    
  }

  formatTime(seconds) {
    /* Run a real time timer */
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  updateDisplayedTimers(timers, color) {
    /* Update the displayer timers */
    let timerValue1 = timers[0] < 0 ? 0 : timers[0];
    let timerValue2 = timers[1] < 0 ? 0 : timers[1];
    const formattedTime1 = this.formatTime(timerValue1);
    const formattedTime2 = this.formatTime(timerValue2);
    if (color === '0') {
      this.timerText1.setText(`${formattedTime1}`);
    }
    else if (color === '1'){
      this.timerText2.setText(`${formattedTime2}`);
    }
  }

  getQuadrantIndex(x, y) {
    const centerX = this.cameras.main.width / 2 + 150;
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
    
  redraw_window(scene, bo, p1, p2, color, ready, p1Text, p2Text, statusText, has_placed, has_selected_q, alpha, log) {
    scene.cameras.main.setBackgroundColor('#201f1f');
    const offset_x = this.cameras.main.width / 2 + 150;
    const offset_y = this.cameras.main.height / 2;

    /* GUI */
    const textStyle = {
      fontFamily: 'Arial',
      fontSize: 30,
      color: '#FFFFFF'
    };

    const textStyle2 = {
      fontFamily: 'Arial',
      fontSize: 50,
      color: '#FFFFFF'
    };

    const textStyle3 = {
      fontFamily: 'Arial',
      fontSize: 18,
      color: '#FFFFFF'
    };

    const textStyle4 = {
      fontFamily: 'Arial',
      fontSize: 23,
      color: '#FFFFFF'
    };

    const textStyle5 = {
      fontFamily: 'Arial',
      fontSize: 20,
      color: '#FFFFFF'
    };

    if (bo.turn === '0') {
      scene.time_label = this.add.image(308, 170, 'white_label')
    }
    else if (bo.turn === '1') {
      scene.time_label = this.add.image(308, 170, 'black_label')
    }

    if (!has_placed && bo.turn === color && ready) {
      scene.add.image(850, 70, 'message');
      const has_placed_text = scene.add.text(705, 60, 'Click on the board to place a marble', textStyle3);
    }
    else if (has_placed && !has_selected_q && bo.turn === color && ready) {
      scene.add.image(850, 70, 'message');
      const has_placed_text = scene.add.text(650, 60, 'Click on the board to select a quadrant and rotate it', textStyle3);
    }
    else if (!has_placed && bo.turn !== color || !ready) {
      scene.add.image(850, 70, 'message');
      const has_placed_text = scene.add.text(766, 60, 'Waiting for player', textStyle3);
    }
  }

  draw_marble() {
    /* Draw new marbles on the board */
    const offset_x = this.cameras.main.width / 2 + 150;
    const offset_y = this.cameras.main.height / 2;
  
    for (let l = 0; l < 6; l++) {
      for (let m = 0; m < 6; m++) {
        let x = (l === 1 || l === 4) ? offset_x - 236 - 0.15 + 94.6 * m : offset_x - 236 + 94.6 * m;
        let y = offset_y - 236 + 94.6 * l;
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
    const offset_x = this.cameras.main.width / 2 + 150;
    const offset_y = this.cameras.main.height / 2;
  
    this.marbles = this.marbles.filter(([marbleImage, coords, player, quadrant]) => {
      for (let l = 0; l < 6; l++) {
        for (let m = 0; m < 6; m++) {
          const coord = (l === 1 || l === 4) ?
            [offset_x - 236 - 0.15 + 94.6 * m, offset_y - 236 + 94.6 * l] :
            [offset_x - 236 + 94.6 * m, offset_y - 236 + 94.6 * l];
          
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
  
  connect() {
    /* Implement client-side connection and data handling */
    const offset_x = this.cameras.main.width / 2 + 150;
    const offset_y = this.cameras.main.height / 2 - 40;
    const initialConnectionMessage = {
      type: 'initialConnection',
      playerName: playername,
      gType: gType,
      gKey: gKey,
    };
    let flag = 0;
    let count = 0;
    this.socket = new WebSocket('ws://localhost:443');
    this.socket.addEventListener('open', (event) => {
      this.socket.send(JSON.stringify(initialConnectionMessage));
      console.log('Connected to the server');
    });

    this.socket.addEventListener('close', (event) => {
      console.log('Disconnected from the server');
    });

    this.socket.addEventListener('error', (event) => {
      console.log('Error:', event);
    });

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
    
      // If both players are ready, start the timers
      if (data.type === 'gameState') {
        if (data.ready && !this.timersStarted) {
          this.timersStarted = true;
          if (data.type === 'updateTimers') {
            const timers = data.timers;
            this.updateDisplayedTimers(timers, this.color);
          }
        }
      }

      const textStyle4 = {
        fontFamily: 'Arial',
        fontSize: 23,
        color: '#FFFFFF'
      };

      if (data.type === 'gameState' && flag <= 1) { //looping problem [NEEDS CHECK]
        let serial = 'Room number #';
        if (data.key !== undefined) {
          serial += data.key;
        } else {
          serial += '';
        }
        if (count < 1){
          this.add.text(270, 530, serial, textStyle4);
          count++;
        }
        if (data.ready && data.p1Name !== '' && data.p2Name !== '') {
          this.add.text(270, 577, truncate(this.bo.p1Name, 11), {fontFamily: 'Arial', fontSize: 23, color: '#000000'});
          this.add.text(270, 617, truncate(this.bo.p2Name, 11), {fontFamily: 'Arial', fontSize: 23, color: '#FFFFFF'});
          serial = '';
          flag++;
        }
      }
  
      // Handles the data if the game ends and takes the screenshot of the current game-board
      if (data.type === 'end') {
        captureGameBoard(this, offset_x - 284, offset_y - 244, 580, 580).then(gameBoardScreenshot => {
          sessionStorage.setItem('gameBoardScreenshot', gameBoardScreenshot);
      
          if (data.result === 'win') {
            setTimeout(() => {
              window.location.href = 'pentago-win.html';
            }, 500); // Delay
          } else if (data.result === 'lose') {
            setTimeout(() => {
              window.location.href = 'pentago-lose.html';
            }, 500);
          } else if (data.result === 'tie') {
            setTimeout(() => {
              window.location.href = 'pentago-tie.html';
            }, 500);
          }
        });
      }

      if (data.type === 'error') {
        alert('Invalid room number, you are being redirected to the homepage...');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 500);
      }

    //console.log('[DEBUG] Data received from server:', data);
  
    // Updates the client game-state
    if (data.type === 'gameState') {
      this.game_state_received = true;
      this.gameStateUpdated = true;
      this.bo.timers = data.timers;
      this.bo.ready = data.ready
      this.bo.turn = data.turn;
      this.bo.time1 = data.time1;
      this.bo.time2 = data.time2;
      this.bo.p1Name = data.p1Name;
      this.bo.p2Name = data.p2Name;
      this.color = data.color;
      this.key = data.key;
      this.move_log = data.log;
  
      if (data.ready !== undefined) { // Check if the ready status is available in the gameState message
        this.ready = data.ready;
      }

      if (matricesEqual(this.bo.config, data.board)) {
        console.log('[GAME] Board configuration did not change. Not clearing marbles.');
      } else {
        console.log('[GAME] Board configuration changed. Clearing marbles.');
        this.bo.config = data.board;
        this.draw_marble();
      }      

      this.needRedraw = true;
      }
    };

    console.log('Socket connection:', this.socket);
  }    
  
  preload(){
    /* Loads the game assets */
    this.load.spritesheet(
      "title",
      "data/assets/img/title_game.png",
      {
        frameWidth: 137,
        frameHeight: 40
      }
    );
    
    this.load.spritesheet(
      "time_label",
      "data/assets/img/time_label.png",
      {
        frameWidth: 200,
        frameHeight: 95
      }
    );

    this.load.spritesheet(
      "key_label",
      "data/assets/img/key_label.png",
      {
        frameWidth: 320,
        frameHeight: 40
      }
    );

    this.load.spritesheet(
      "white_label",
      "data/assets/img/white_label.png",
      {
        frameWidth: 200,
        frameHeight: 30
      }
    );

    this.load.spritesheet(
      "black_label",
      "data/assets/img/black_label.png",
      {
        frameWidth: 200,
        frameHeight: 30
      }
    );

    this.load.spritesheet(
      "timer",
      "data/assets/img/timer.png",
      {
        frameWidth: 72.4,
        frameHeight: 72,
      }
    );

    this.load.spritesheet(
      "message",
      "data/assets/img/message_label.png",
      {
        frameWidth: 450,
        frameHeight: 30,
      }
    );

    this.load.spritesheet(
      "p1",
      "data/assets/img/p1.png",
      {
        frameWidth: 47,
        frameHeight: 47
      }
    );

    this.load.spritesheet(
      "p2",
      "data/assets/img/p2.png",
      {
        frameWidth: 47,
        frameHeight: 47
      }
    );

    this.load.spritesheet(
      "quarter_board",
      "data/assets/img/quarter_board.png",
      {
        frameWidth: 281,
        frameHeight: 281
      }
    );

    this.load.spritesheet(
      "white_square",
      "data/assets/img/white_square.png",
      {
        frameWidth: 80,
        frameHeight: 80
      }
    );

    this.load.spritesheet(
      "pass_on",
      "data/assets/img/pass_on.png",
      {
        frameWidth: 203,
        frameHeight: 123
      }
    )

    this.load.spritesheet(
      "ra_on",
      "data/assets/img/ra_on.png",
      {
        frameWidth: 84,
        frameHeight: 84
      }
    )

    this.load.spritesheet(
      "rc_on",
      "data/assets/img/rc_on.png",
      {
        frameWidth: 84,
        frameHeight: 84
      }
    )

    this.load.spritesheet(
      "widget",
      "data/assets/img/widget_label.png",
      {
        frameWidth: 432,
        frameHeight: 260
      }
    )

    this.load.spritesheet(
      "control",
      "data/assets/img/control_label.png",
      {
        frameWidth: 275,
        frameHeight: 315
      }
    )

    this.load.spritesheet(
      "moon",
      "data/assets/img/moon.png",
      {
        frameWidth: 21,
        frameHeight: 30
      }
    )

    this.load.spritesheet(
      "select_1",
      "data/assets/img/select_1.png",
      {
        frameWidth: 295,
        frameHeight: 295
      }
    )

    this.load.spritesheet(
      "select_2",
      "data/assets/img/select_2.png",
      {
        frameWidth: 295,
        frameHeight: 295
      }
    )

    this.load.spritesheet(
      "select_3",
      "data/assets/img/select_3.png",
      {
        frameWidth: 295,
        frameHeight: 295
      }
    )

    this.load.spritesheet(
      "select_4",
      "data/assets/img/select_4.png",
      {
        frameWidth: 295,
        frameHeight: 295
      }
    )

    this.load.spritesheet(
      "names",
      "data/assets/img/names.png",
      {
        frameWidth: 280,
        frameHeight: 80,
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
    /* Inits variables, defines animations, sounds, displays assets, handles clicks */
    const offset_x = this.cameras.main.width / 2 + 150;
    const offset_y = this.cameras.main.height / 2;
    const dx = offset_x - 283;
    const dy = offset_y - 283;

    const marble_placement_sfx = this.sound.add('marble_placement');
    const quarter_rotation_sfx = this.sound.add('quarter_rotation');

    this.updateCounter = 0;
    this.cameras.main.setBounds(0, 0, 1366, 768);
    this.count = 0;
    this.marbles = [];
    this.has_placed = false;
    this.has_selected_q = false;
    this.has_rotated = false;
    this.first_move = true;
    this.alpha = 0;
    this.bo = new Board(566, 566);
    this.name = 'player';
    this.running = true;
    this.serial_key = '';
    this.handlersSet = false;
    this.connect();

    this.copykeyBtn = new Phaser.Geom.Rectangle(270, 530, 250, 20);
    this.q1Btn = new Phaser.Geom.Rectangle(offset_x - 142 + 0.75, offset_y - 142 + 0.75, 284, 284);
    this.q2Btn = new Phaser.Geom.Rectangle(offset_x + 142 + 0.75, offset_y + 142 + 0.75, 284, 284);
    this.q3Btn = new Phaser.Geom.Rectangle(offset_x - 142 + 0.75, offset_y + 142 + 0.75, 284, 284);
    this.q4Btn = new Phaser.Geom.Rectangle(offset_x + 142 + 0.75, offset_y - 142 + 0.75, 284, 284);
    this.p1Text = this.add.text(1080, 330, '', { fontFamily: 'Arial', fontSize: 30, color: '#000000' });
    this.p2Text = this.add.text(1105, 130, '', { fontFamily: 'Arial', fontSize: 30, color: '#FFFFFF' });
    this.statusText = this.add.text(this.cameras.main.width / 2, 740, '', { fontFamily: 'Arial', fontSize: 30, color: '#FFFFFF' }).setOrigin(0.5, 0);
    this.waitingText = this.add.text(this.cameras.main.width / 2, 140, '', { fontFamily: 'Arial', fontSize: 50, color: '#FFFFFF' }).setOrigin(0.5, 0);
    this.move = '';
    this.string_color = '';
    this.moon = null;
    this.hover_1 = null;
    this.hover_2 = null;
    this.hover_3 = null;
    this.hover_4 = null;
    this.p1 = null;
    this.p2 = null;

    // GUI initialization
    this.time_label = this.add.image(400, 170, 'time_label');
    this.timerText1 = this.add.text(375, 155, '', { fontFamily: 'Arial', fontSize: "30px", color: "#FFFFFF" });
    this.timerText2 = this.add.text(375, 155, '', { fontFamily: 'Arial', fontSize: "30px", color: "#FFFFFF" });
    this.add.image(395, 610, 'names');

    // Board blitting
    this.white_square = this.add.image(offset_x, offset_y, 'white_square');

    this.q1 = this.add.image(offset_x - 142 + 0.75, offset_y - 142 + 0.75, 'quarter_board'); // TOP-LEFT
    this.q2 = this.add.image(offset_x + 142 + 0.75, offset_y - 142 + 0.75, 'quarter_board'); // TOP-RIGHT
    this.q3 = this.add.image(offset_x - 142 + 0.75, offset_y + 142 + 0.75, 'quarter_board'); // BOTTOM-LEFT
    this.q4 = this.add.image(offset_x + 142 + 0.75, offset_y + 142 + 0.75, 'quarter_board'); // BOTTOM-RIGHT

    const q1_coords = [[offset_x - 284, offset_y - 284],[offset_x, offset_y]];
    const q2_coords = [[offset_x + 284, offset_y - 284],[offset_x, offset_y]];
    const q3_coords = [[offset_x - 284, offset_y + 284],[offset_x, offset_y]];
    const q4_coords = [[offset_x + 284, offset_y + 284],[offset_x, offset_y]];

    this.quadrants = [q1_coords, q2_coords, q3_coords, q4_coords];
    this.quadrants_drawings = [this.q1, this.q2, this.q3, this.q4];

    this.draggingQuadrant = null;
    this.isDragging = false;

    // Making the quadrant images interactive and enabling drag-and-drop
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
            this.socket.send(JSON.stringify({ type: 'quarter', q: this.draggingQuadrant.index, alpha: this.alpha}));
            this.bo.rotate(this.draggingQuadrant.index, this.alpha)
            this.revertRotation();
            this.has_rotated = true;
          } else {
            this.revertRotation();
          }
          this.draggingQuadrant = null;
        }
      });
    });

    // pointerup
    this.input.on('pointerup', (pointer) => {
      if (this.game_state_received && this.color !== 's' && this.bo.ready) {
        if (this.color === this.bo.turn) {
          const pos = { x: pointer.x, y: pointer.y };
          if (pos.x >= offset_x - 284 && pos.x <= offset_x + 284 && pos.y >= offset_y - 284 && pos.y <= offset_y + 284) {
            marble_placement_sfx.play();
            console.log("[GAME] this.bo.config: ", this.bo.config);
            if (!this.has_placed) {
              const [i, j] = this.bo.handle_click(pos, this.color, dx, dy);
              if (this.bo.config[j][i] === '-1') {
                this.socket.send(JSON.stringify({ type: 'select', i, j, color: this.color }));
                console.log('[GAME] Data sent to server (select):', { type: 'select', i, j, color: this.color });
                this.has_placed = true;
              } else {
                console.log('[GAME] Warning! invalid placement, please select a free cell');
                this.has_placed = false;
              }
            }
          if (this.has_placed && this.has_rotated && this.alpha !== 0){
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
          }
        }
      }

      if (Phaser.Geom.Rectangle.Contains(this.copykeyBtn, pointer.x, pointer.y)) {
        console.log('[GAME] Game key copied to the clipboard');
        const tempInput = document.createElement("input");
        tempInput.value = this.key;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
        this.cp_warning = this.add.text(310, 500, ' Copied to the clipboard! ', { fontFamily: 'Arial', fontSize: "15px", color: "#FFFFFF"});
        var cp_delay = 1000;
        this.time.delayedCall(cp_delay, function() {
            this.cp_warning.destroy();
        }, [], this);
      }
    });
  }
    
  update() {
    /* Loops the attributes of various game objects per game logic */
    console.log(this.width);
    if (this.gameStateUpdated) {
      this.gameStateUpdated = false;
      console.log('[GAME] Game state is updated');
      this.clear_marble();
      this.redraw_window(this, this.bo, this.bo.time1, this.bo.time2, this.color, this.ready, this.p1Text, this.p2Text, this.statusText, this.has_placed, this.has_selected_q, this.alpha, this.log_text);
      this.updateDisplayedTimers(this.bo.timers, this.color);
    }
  
    if (this.needRedraw) {
      this.needRedraw = false;
      this.waitingText.visible = !this.ready;
      
      if (this.ready) {
        const p1_time = this.bo.time1;
        const p2_time = this.bo.time2;
        this.redraw_window(this, this.bo, p1_time, p2_time, this.color, this.ready, this.p1Text, this.p2Text, this.statusText, this.has_placed, this.has_selected_q, this.alpha, this.log_text);
      }
    }
  
    this.updateCounter++;
    if (this.updateCounter % 60 === 0) {
      this.redraw_window(this, this.bo, this.bo.time1, this.bo.time2, this.color, this.ready, this.p1Text, this.p2Text, this.statusText, this.has_placed, this.has_selected_q, this.alpha, this.log_text);
    }
  }    
}

/*---------------------------------------Web embedding setup---------------------------------------*/
const config = {
  width: 1366,
  height: 768,
  backgroundColor: "#262323",
  parent: "gameContainer",
  scale: {
    // Fit to window
    mode: Phaser.Scale.FIT,
    // Center vertically and horizontally
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    antialias: true, // Enable anti-aliasing
    pixelArt: false // Set to false to avoid pixelated graphics
  },
  scene: [GameScene],
};

const game = new Phaser.Game(config);

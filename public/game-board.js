/*
Pentago.net
*/

class Box {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.abs_x = x * width; //+ 400;
    this.abs_y = y * height; // + 101;
    this.abs_pos = { x: this.abs_x, y: this.abs_y };
    this.pos = { x, y };
    this.color = 0xC8C8C8; // Equivalent to (200, 200, 200) in RGB
    this.occupied = null;
    this.coord = this.getCoord();
    // this.rectangle = new Phaser.Geom.Rectangle(this.abs_x, this.abs_y, this.width, this.height);
  }

  getCoord() {
    const columns = "abcdef";
    return columns[this.x] + (this.y + 1);
  }
  
    /*
    draw(scene) {
      const graphics = scene.add.graphics({ lineStyle: { width: 1, color: this.color } });
      graphics.strokeRectShape(this.rectangle);
      if (this.occupied !== null) {
        const centering_rect = this.occupied.img.getBounds();
        centering_rect.centerX = this.rectangle.centerX;
        centering_rect.centerY = this.rectangle.centerY;
        this.occupied.img.setPosition(centering_rect.x, centering_rect.y);
      }
    }
    */
}
  
class Board {
    constructor(width, height) {
        this.size = { width: 568, height: 568 };
        //this.abs_x = abs_x; // or the correct x-coordinate of the board's top-left corner
        //this.abs_y = ; // or the correct y-coordinate of the board's top-left corner
        this.width = width;
        this.height = height;
        this.tile_width = width / 6;
        this.tile_height = height / 6;
  
        this.selected_box = null;
        this.selected_quarter = null;
        this.key = '';
        this.p1Name = "";
        this.p2Name = "";
        this.turn = '0';
        this.winner = '-1';
        this.p1Went = false;
        this.p2Went = false;
        this.pWinner = null;
  
        this.ready = false;
  
        this.placement = [{ x: null, y: null }, { x: null, y: null }];
        this.last = null;
        this.last_quarter = null;
  
        this.config = [
            ['-1','-1','-1','-1','-1','-1'],
            ['-1','-1','-1','-1','-1','-1'],
            ['-1','-1','-1','-1','-1','-1'],
            ['-1','-1','-1','-1','-1','-1'],
            ['-1','-1','-1','-1','-1','-1'],
            ['-1','-1','-1','-1','-1','-1']
        ];
  
        this.storedTime1 = 0;
        this.storedTime2 = 0;

        this.start_user = '0'
  
        this.boxes = this.generate_boxes();
  
        this.quarter_1 = { x: 425, y: 126 };
        this.quarter_2 = { x: 708, y: 126 };
        this.quarter_3 = { x: 425, y: 409 };
        this.quarter_4 = { x: 708, y: 409 };

        this.clients = [];
        this.log = [];

        this.timers = {
          '0': 10 * 60,
          '1': 10 * 60,
        };
    }
  
    generate_boxes() {
        let output = [];
        for (let y = 0; y < 6; y++) {
            for (let x = 0; x < 6; x++) {
                output.push(new Box(x, y, this.tile_width, this.tile_height));
            }
        }
        return output;
    }
  
    get_player_placement(player) {
      return this.placement[parseInt(player)];
    }
  
    get_box_from_pos(player, pos) {
      if (pos.x < 0 || pos.x >= 6 || pos.y < 0 || pos.y >= 6) {
        return null;
      }
    
      for (let box of this.boxes) {
        if (box.x === pos.x && box.y === pos.y) {
          // Prevent overwriting an occupied box
          if (box.occupied === null || box.occupied.player !== player) {
            if (player === 0) {
              this.placement[0] = pos;
              this.p1Went = true;
            } else {
              this.placement[1] = pos;
              this.p2Went = true;
            }
            return box;
          } else {
            return null;
          }
        }
      }
    }     
  
    get_quarter_from_pos(pos) {
      const x = Math.floor((pos.x - 400));
      const y = Math.floor((pos.y - 100));
      let quarter;
      if (x >= 0 && x <= 284 && y >= 0 && y <= 284) {
          quarter = 1;
      } else if (x >= 284 && x <= 568 && y >= 0 && y <= 284) {
          quarter = 2;
      } else if (x >= 0 && x <= 284 && y >= 284 && y <= 568) {
          quarter = 3;
      } else if (x >= 284 && x <= 568 && y >= 284 && y <= 568) {
          quarter = 4;
      }
      return quarter;
    }
  
    handle_click(pos, player) {
      const x = Math.floor((pos.x - 400) / this.tile_width);
      const y = Math.floor((pos.y - 100) / this.tile_height);
      
      const clicked_box = this.get_box_from_pos(player, { x, y });
    
      // Check if the position is empty or occupied by the current player's marble before making a move
      if (clicked_box && (clicked_box.occupied === null || clicked_box.occupied.player === player)) {
        if (this.selected_box === null) {
          if (clicked_box !== null && clicked_box.occupied !== null) {
            this.selected_box = clicked_box.occupied;
          }
        } else if (clicked_box !== null && this.selected_box.move(this, clicked_box)) {
          this.turn = this.turn === 'b' ? 'w' : 'b';
        } else if (clicked_box !== null && clicked_box.occupied !== null) {
          if (clicked_box.occupied.color === this.turn) {
            this.selected_box = clicked_box.occupied;
          }
        }
      }

      return [x, y];
    }
    
  
    move(i, j, player) {
      this.config[i][j] = String(player);
    }
  
    rotate(q, a) {
      let submatrix;
      let rotationPerformed = false;
    
      if (q === 1) {
        submatrix = this.config.slice(0, 3).map(row => row.slice(0, 3));
      } else if (q === 2) {
        submatrix = this.config.slice(0, 3).map(row => row.slice(3));
      } else if (q === 3) {
        submatrix = this.config.slice(3).map(row => row.slice(0, 3));
      } else if (q === 4) {
        submatrix = this.config.slice(3).map(row => row.slice(3));
      } else {
        throw new Error("Invalid submatrix identifier q");
      }
    
      if (a !== 0) {
        rotationPerformed = true;
        if (a === 1) { // Rotate 90 degrees clockwise
          submatrix = submatrix[0].map((_, i) => submatrix.map(row => row[i])).reverse();
        } else if (a === -1) { // Rotate 90 degrees counterclockwise
          submatrix = submatrix.reverse()[0].map((_, i) => submatrix.map(row => row[i]));
        }
    
        if (q === 1) {
          for (let i = 0; i < 3; i++) {
            this.config[i].splice(0, 3, ...submatrix[i]);
          }
        } else if (q === 2) {
          for (let i = 0; i < 3; i++) {
            this.config[i].splice(3, 3, ...submatrix[i]);
          }
        } else if (q === 3) {
          for (let i = 0; i < 3; i++) {
            this.config[i + 3].splice(0, 3, ...submatrix[i]);
          }
        } else if (q === 4) {
          for (let i = 0; i < 3; i++) {
            this.config[i + 3].splice(3, 3, ...submatrix[i]);
          }
        }
      }
    
      return rotationPerformed;
    }    
    
    /*
    draw_marble() {
      for (let l = 0; l < 6; l++) {
          for (let m = 0; m < 6; m++) {
            if (this.config[l][m] === '0') {
              scene.add.image(425 + 94 * m, 126 + 94 * l, 'p1');
            } else if (this.config[l][m] === '1') {
              scene.add.image(425 + 94 * m, 126 + 94 * l, 'p2');
            }
          }
      }
    }
    */
  
    get_player_placement(player) {
      return this.placement[parseInt(player)];
    }
  
    check_winner() {
      let count = 0;
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) {
          if (this.config[i][j] === '-1') {
              continue; // empty cell, no winner possible
          }
          if (this.config[i][j] !== '-1') {
              count += 1;
          }
          // check row
          if (j <= 1 && this.config[i][j] === this.config[i][j + 1] && this.config[i][j] === this.config[i][j + 2] && this.config[i][j] === this.config[i][j + 3] && this.config[i][j] === this.config[i][j + 4]) {
            let p = this.config[i][j];
            return p;
          }
          // check column
          if (i <= 1 && this.config[i][j] === this.config[i + 1][j] && this.config[i][j] === this.config[i + 2][j] && this.config[i][j] === this.config[i + 3][j] && this.config[i][j] === this.config[i + 4][j]) {
            let p = this.config[i][j];
            return p;
          }
          // check diagonal
          if (i <= 1 && j <= 1 && this.config[i][j] === this.config[i + 1][j + 1] && this.config[i][j] === this.config[i + 2][j + 2] && this.config[i][j] === this.config[i + 3][j + 3] && this.config[i][j] === this.config[i + 4][j + 4]) {
            let p = this.config[i][j];
            return p;
          }
          if (i <= 1 && j >= 4 && this.config[i][j] === this.config[i + 1][j - 1] && this.config[i][j] === this.config[i + 2][j - 2] && this.config[i][j] === this.config[i + 3][j - 3] && this.config[i][j] === this.config[i + 4][j - 4]) {
            let p = this.config[i][j];
            return p;
          }
          if (count === 36) {
            let p = '2';
            return p;
          }
        }
      }
  
      let p = '-1';
      return p;
    }

    static fromJSON(json) {
        const board = new Board(json.width, json.height);
        Object.assign(board, json);
        return board;
    }
}

export default Board;

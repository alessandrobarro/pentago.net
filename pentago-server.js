/*
---------------------------------------
           www.pentago.net
---------------------------------------

https://github.com/basedryo/pentago.net
*/

import Board from './public/game-board.js';
import { createRequire } from 'module';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PORT = process.env.PORT || 5000;
const IP = 'pentago.herokuapp.com/';
const URL = 'wss://' + IP + ':' + '443';
const express = require('express');
const app = express()
const http_server = require('http').createServer(app);
const WebSocket = require('ws');
const server = new WebSocket.Server({ server: http_server });

// Web-socket server setup
app.use(express.static('public'));
app.get('/', (req, res) => { res.sendFile(__dirname + '/index.html'); });
http_server.listen(PORT, () => console.log('[START] Listening...'));
console.log('[START] Waiting for a connection');
const games = {};
const loopbackKey = '000000';
let connections = 0;

function generateSerialKey(){
  let characters = "0123456789abcdef"
  let random_game_key = ""
  for(let i = 0; i < 6; i++){
      random_game_key += characters[Math.floor(Math.random() * 16)]
  }

  return random_game_key;
}

function readSpectatorIds() {
  //pass
}

function isGameKeyValid(gameKey) {
  for (const game in games) {
    if (games[game].key === gameKey && !games[game].ready) {
      return true;
    }
  }
  return false;
}


async function handleClientMessage(socket, gType, requestedKey, name) {
  let gameId = -1;
  const playerName = name;
  const INDEX = fs.readFileSync('./public/index.html', 'utf-8'); 

  if (!requestedKey) {
    requestedKey = 'PUBLIC';
  }

  // Finds an existing game with an open slot or create a new one
  let foundGame = false;
  for (const game in games) {
    if (!games[game].ready) {
      if (!games[game].private && gType === '0' && requestedKey === 'PUBLIC') {
        gameId = game;
        foundGame = true;
        break;
      } else if (games[game].private && gType === '1' && requestedKey === games[game].key) {
        gameId = game;
        foundGame = true;
        break;
      }
    }
  }

  // Creates a new game if no existing game found
  if (!foundGame) {
    if (gType === '0' || (gType === '1' && requestedKey === loopbackKey)) {
      gameId = Object.keys(games).length;
      games[gameId] = new Board(); // Initializes a game
      games[gameId].sockets = {}; // Initializes sockets property
      games[gameId].clients = []; // Initializes clients property
      games[gameId].colors = {}; // Initializes colors property
      games[gameId].colors['0'] = '0'; // Assigns color '0' to player '0'
      games[gameId].colors['1'] = '1'; // Assigns color '1' to player '1'
      games[gameId].timers = { '0': 600, '1': 600 }; // Initializes timers
      games[gameId].key = generateSerialKey();
      games[gameId].private = gType === '1' ? true : false;
    } else {
      socket.send(JSON.stringify({ type: 'error', message: 'Invalid game type or requested key' }));
      console.log("[ERROR]" + playerName + "joined an inexistent room, redirecting to index.html...");
      return;
    }
  }

  // Assigns the client to the game
  const bo = games[gameId];
  let currentId;
  if (bo.clients.length === 0) {
    currentId = '0';
    bo.clients.push('0');
    bo.sockets[currentId] = socket;
    bo.colors = { '0': '0' };
    console.log("[DATA] Game S-key: ", bo.key);
  } else {
    currentId = '1';
    bo.clients.push('1');
    bo.sockets[currentId] = socket;
    bo.colors['1'] = '1';
    bo.ready = true;
    bo.startTime = Date.now();
    console.log('[DATA] Starting time: ', bo.startTime);
  }

  if (bo.ready && !bo.updateTimersInterval) {
    bo.updateTimersInterval = setInterval(() => {
      updateTimers(gameId);
      sendGameState(gameId);
    }, 1000);
  }

  if (currentId === '0') {
    bo.p1Name = playerName;
  } else if (currentId === '1') {
    bo.p2Name = playerName;
  }

  console.log(`[DATA] Game ID: ${gameId}`);
  console.log('[DATA] Game type (0: public, 1: private): ', gType);
  console.log('[DATA] Game R-key: ',requestedKey);
  console.log('[DATA] Player name: ', name);
  console.log('---------------------------------------------------------------------------');

  function sendGameState(gameId, skipTimers = false) {
    const bo = games[gameId];
    if (!bo) return;
    if (!skipTimers) {
      for (const clientId of bo.clients) {
        const clientSocket = bo.sockets[clientId];
        clientSocket.send(JSON.stringify({ type: 'updateTimers', timers: bo.timers }));
      }
    }
    for (const clientId of bo.clients) {
      const clientSocket = bo.sockets[clientId];
      clientSocket.send(JSON.stringify({ type: 'updateTimers', timers: bo.timers }));
      if (!clientSocket) {
        //console.log(`No socket found for clientId: ${clientId}`);
        continue;
      }
      const gameState = JSON.stringify(getBoData(bo, clientId));
      //console.log(`Sending gameState to clientId: ${clientId}:`, gameState);
      clientSocket.send(gameState);
    }
    if (bo.winner !== '-1') {
      const winHTML = fs.readFileSync('./public/pentago-win.html', 'utf-8');
      const loseHTML = fs.readFileSync('./public/pentago-lose.html', 'utf-8');
      const tieHTML = fs.readFileSync('./public/pentago-tie.html', 'utf-8'); 
      if (bo.winner === '0' || bo.winner === '1') {
        bo.sockets['0'].send(JSON.stringify({ type: 'end', result: bo.winner === '0' ? 'win' : 'lose', html: bo.winner === '0' ? winHTML : loseHTML }));
        bo.sockets['1'].send(JSON.stringify({ type: 'end', result: bo.winner === '1' ? 'win' : 'lose', html: bo.winner === '1' ? winHTML : loseHTML }));
      } else {
        bo.sockets['0'].send(JSON.stringify({ type: 'end', result: bo.winner === '2' ? 'tie' : 'tie', html: bo.winner === '2' ? tieHTML : tieHTML}));
        bo.sockets['1'].send(JSON.stringify({ type: 'end', result: bo.winner === '2' ? 'tie' : 'tie', html: bo.winner === '2' ? tieHTML : tieHTML}));
      }
      delete games[gameId];
    }
  }
  
  if (currentId === '1') {
    sendGameState(gameId);
    sendReadyMessage();
  } else {
    sendReadyMessage();
  }

  // Initializes bo.connections for the first client or add the second client to the existing array
  if (!bo.clients) {
    bo.clients = [currentId];
  } else {
    bo.clients.push(currentId);
  }

  function updateTimers(gameId) {
    const bo = games[gameId];
    if (!bo || !bo.ready) return;
    const elapsedTime = 1;
    const currentPlayer = bo.turn;
    const otherPlayer = currentPlayer === '0' ? '1' : '0';
    if (bo.timers[currentPlayer] > 0) {
      bo.timers[currentPlayer] = Math.max(bo.timers[currentPlayer] - elapsedTime, 0); // Prevent negative values
    } else {
      bo.winner = otherPlayer;
    }
    bo.startTime = Date.now();
  }

  // Extracts the necessary data from the board object
  function getBoData(bo, clientId) {
    //console.log(clientId)
    return {
      timers: bo.timers,
      key: bo.key,
      type: 'gameState',
      board: bo.config,
      color: bo.colors[clientId],
      last: bo.last,
      turn: bo.turn,
      ready: bo.ready,
      winner: bo.winner,
      startUser: bo.startUser,
      time1: bo.time1,
      time2: bo.time2,
      p1Name: bo.p1Name,
      p2Name: bo.p2Name,
      log: bo.log
    };
  }
  
  socket.send(JSON.stringify(getBoData(bo, currentId)));
  connections++;

  function sendReadyMessage() {
    const readyMessage = JSON.stringify({ type: 'ready' });
    for (const clientId of bo.clients) {
      const clientSocket = bo.sockets[clientId];
      clientSocket.send(readyMessage);
    }
  }

  socket.on('message', async (data) => {
    if (!(gameId in games)) {
      return;
    }
    try {
      const msg = data.toString();
      //console.log('data is being received: ', msg);
      if (!msg) {
        return;
      } else {
        const parsedMsg = JSON.parse(msg);
        if (parsedMsg.type === 'gameBoardScreenshot') {
          const screenshot = parsedMsg.screenshot;
          bo.sockets['0'].send(JSON.stringify({ type: 'gameBoardScreenshot', screenshot }));
          bo.sockets['1'].send(JSON.stringify({ type: 'gameBoardScreenshot', screenshot }));
        }
        if (parsedMsg.type === 'select') {
          const { i: row, j: col, color } = parsedMsg;
          if (bo.config[col][row] === '-1') {
              bo.move(parseInt(col), parseInt(row), color)
              bo.last = { row: parseInt(col), col: parseInt(row) };
          }
          for (let l = 0; l < 6; l++) {
            for (let m = 0; m < 6; m++) {
              if (bo.config[l][m] === '0') {
                let coord_str_i = (l + 1).toString();
                let coord_str_j = (m + 1).toString();
                bo.log.push('w' + coord_str_i + coord_str_j);
              } else if (bo.config[l][m] === '1') {
                let coord_str_i = (l + 1).toString();
                let coord_str_j = (m + 1).toString();
                bo.log.push('b' + coord_str_i + coord_str_j);
              }
            }
          }
          const winner = bo.check_winner();
          if (winner !== null) {
              bo.winner = winner;
          }
        // Sends the updated game state to both clients
        sendGameState(gameId, true);
        bo.sockets['0'].send(JSON.stringify({ type: 'select', i: row, j: col, color }));
        bo.sockets['1'].send(JSON.stringify({ type: 'select', i: row, j: col, color }));
        // Handles "quarter" command
        } else if (parsedMsg.type === 'quarter') {
          const { q: quarter, alpha: alpha } = parsedMsg;
          let log_size = bo.log.length;
          if (alpha === '1') {
            for (let i = 0; i < log_size; i++) {
              let truncated_log = bo.log[i].substring(1);
              if (truncated_log[0] === '1' && truncated_log[1] === '1') {
                bo.log[i][2] = '3';
              }
              else if (truncated_log[0] === '1' && truncated_log[1] === '3') {
                bo.log[i][1] = '3';
              }
              else if (truncated_log[0] === '3' && truncated_log[1] === '3') {
                bo.log[i][2] = '1';
              }
              else if (truncated_log[0] === '3' && truncated_log[1] === '1') {
                bo.log[i][1] = '1';
              }
              else if (truncated_log[0] === '1' && truncated_log[1] === '2') {
                bo.log[i][1] = '2';
                bo.log[i][2] = '3';
              }
              else if (truncated_log[0] === '2' && truncated_log[1] === '3') {
                bo.log[i][1] = '3';
                bo.log[i][2] = '2';
              }
              else if (truncated_log[0] === '3' && truncated_log[1] === '2') {
                bo.log[i][1] = '2';
                bo.log[i][2] = '1';
              }
              else if (truncated_log[0] === '2' && truncated_log[1] === '1') {
                bo.log[i][1] = '1';
                bo.log[i][2] = '2';
              }
              else if (truncated_log[0] === '2' && truncated_log[1] === '2') {
                bo.log[i][1] = '2';
                bo.log[i][2] = '2';
              }
            }
          } else if (alpha === '-1') {
            for (let i = 0; i < log_size; i++) {
              let truncated_log = bo.log[i].substring(1);
              if (truncated_log[0] === '1' && truncated_log[1] === '1') {
                bo.log[i][1] = '3';
              }
              else if (truncated_log[0] === '1' && truncated_log[1] === '3') {
                bo.log[i][2] = '1';
              }
              else if (truncated_log[0] === '3' && truncated_log[1] === '3') {
                bo.log[i][2] = '1';
              }
              else if (truncated_log[0] === '3' && truncated_log[1] === '1') {
                bo.log[i][2] = '3';
              }
              else if (truncated_log[0] === '1' && truncated_log[1] === '2') {
                bo.log[i][1] = '2';
                bo.log[i][2] = '1';
              }
              else if (truncated_log[0] === '2' && truncated_log[1] === '3') {
                bo.log[i][1] = '1';
                bo.log[i][2] = '2';
              }
              else if (truncated_log[0] === '3' && truncated_log[1] === '2') {
                bo.log[i][1] = '2';
                bo.log[i][2] = '3';
              }
              else if (truncated_log[0] === '2' && truncated_log[1] === '1') {
                bo.log[i][1] = '3';
                bo.log[i][2] = '2';
              }
              else if (truncated_log[0] === '2' && truncated_log[1] === '2') {
                bo.log[i][1] = '2';
                bo.log[i][2] = '2';
              }
            }
          }
          if (bo.rotate(quarter, parseInt(alpha))) {
            bo.turn = bo.turn === '0' ? '1' : '0';
          }
          const winner = bo.check_winner();
          if (winner !== null) {
            bo.winner = winner;
          }
        // Handles other commands
        } else if (parsedMsg.type === 'winner') {
          bo.winner = parsedMsg.winner;
          //console.log(`[GAME] Player ${parsedMsg.winner} won in game ${gameId}`);
        } else if (parsedMsg.type === 'tie') {
          bo.winner = '2';
          //console.log(`[GAME] Tie in game ${gameId}`);
        } else {
          console.error(`[ERROR] Invalid command: ${msg}`);
        }
      }
      if (bo.ready) {
        const elapsedTime = 1;
        if (bo.turn === '0') {
          bo.timers['0'] = Math.max(bo.timers['0'] - elapsedTime, 0);
        } else {
          bo.timers['1'] = Math.max(bo.timers['1'] - elapsedTime, 0);
        }
        sendGameState(gameId, true);
      }
    } catch (error) {
      console.error(error);
    }
  });

  socket.on('close', () => {
    console.log(`[DATA] Player ${currentId} disconnected`);
    if (bo.winner !== '-1') return;
    if (bo.clients.length !== 2) {
      bo.winner = currentId === '0' ? '1' : '0';
      sendGameState(gameId);
    }
    console.log(`[DATA] Game ${gameId} ended`);
    clearInterval(bo.updateTimersInterval);
    delete games[gameId];
    connections = connections - 2;
  });
}

server.on('connection', (socket, req) => {
  const clientIP = req.socket.remoteAddress;
  console.log('---------------------------------------------------------------------------');
  console.log('[CONNECTION] New connection from:', clientIP);
  console.log('[CONNECTION] Number of Connections:', connections + 1);
  console.log('[CONNECTION] Number of Games:', Object.keys(games).length);

  socket.on('message', (data) => {
    const message = JSON.parse(data);
    switch (message.type) {
      case 'initialConnection':
        handleClientMessage(socket, message.gType, message.gKey, message.playerName);
        break;
    }
  });
});

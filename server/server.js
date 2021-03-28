const io = require('socket.io')();
const {makeId} = require('./utils');
const {createGameState, shoot, gameLoop, getUpdatedVelocity, initGame, focusTileCheck, upgradeCheck, shopCheck} = require('./game');
const {FRAME_RATE, BOARD_HEIGHT, BOARD_WIDTH, TILE_GAP, TILE_SIZE, BULLET_RADIUS, PLAYER_RADIUS, FONT,} = require('./constants');

const state = {};
const clientRooms = {};

io.on('connection', client => {
	
	client.on('keyChange', handleKeyChange);
	client.on('newGame', handleNewGame);
	client.on('joinGame', handleJoinGame);
	client.on('mouseMove', handleMouseMove);
	client.on('canvasChange', handleCanvasChange);
	client.on('mouseDown', handleMouseDown);
	client.on('mouseUp', handleMouseUp);
	client.on('gameEnded', handleGameEnd);
	
	function handleGameEnd(byebye) {
		clientRooms[client.id] = byebye;
	}
	
	function handleJoinGame(gameCode) {
		const room = io.sockets.adapter.rooms[gameCode];
		
		let allUsers;
		if(room){allUsers = room.sockets;}
		
		let numClients = 0;
		if(allUsers){numClients = Object.keys(allUsers).length;}
		
		if(numClients === 0) {
			client.emit('unknownGame');
			return;
		} else if(numClients > 1) { 
			client.emit('tooManyPlayers');
			return;
		}
		
		clientRooms[client.id] = gameCode;
		client.join(gameCode);
		client.number = 2;
		client.emit('init', 2);
		
		startGameInterval(gameCode);
	}
	
	function handleNewGame() {
		let roomName = makeId(5);
		clientRooms[client.id] = roomName;
		client.emit('gameCode', roomName);
		
		state[roomName] = initGame(roomName);
		
		client.join(roomName);
		client.number = 1;
		client.emit('init', 1);
	}
	
	function handleKeyChange(keys) {
		const roomName = clientRooms[client.id];
		if(!roomName){return;}
		if(!state[roomName]){return;}
		const vel = getUpdatedVelocity(keys, state[roomName].players[client.number-1]);
		if(vel){state[roomName].players[client.number-1].vel = vel;}
		const newTile = focusTileCheck(keys, state[roomName].players[client.number-1], roomName);
		if(newTile){state[roomName].board[newTile.column][newTile.row] = newTile;};
		const deadKey = shopCheck(keys, state[roomName].players[client.number-1], roomName);
		if(deadKey) {client.emit('keyDead', deadKey);}
		const result = upgradeCheck(keys, state[roomName].players[client.number-1], roomName);
		if(result === false) {client.emit('stopUpgrading', result);}
		else if(result) {client.emit('renderUpgrade', result);}
	}
	
	function handleMouseMove(mouse) {
		const roomName = clientRooms[client.id];
		if(!roomName){return;}
		if(!state[roomName]){return;}
		state[roomName].players[client.number-1].mousePos = mouse;
	}
	
	function handleCanvasChange(canvas) {
		const roomName = clientRooms[client.id];
		if(!roomName){return;}
		if(!state[roomName]){return;}
		state[roomName].players[client.number-1].canvas = canvas;
	}
	
	function handleMouseDown(e) {
		const roomName = clientRooms[client.id];
		if(!roomName){return;}
		if(!state[roomName]){return;}
		var p = state[roomName].players[client.number-1];
		if(p.shootDelay >= FRAME_RATE*.5){
			shoot(p, state[roomName].bullets);
			p.shootDelay = 0;
		}
	}
	
	function handleMouseUp(e) {
		const roomName = clientRooms[client.id];
		if(!roomName){return;}
		if(!state[roomName]){return;}
		var p = state[roomName].players[client.number-1];
		p.shooting = false;
	}
	
});

function startGameInterval(roomName) {
	const intervalId = setInterval(() => {
		if(Object.keys(io.sockets.in(roomName).connected).length <= 1){
			state[roomName] = null;
			clearInterval(intervalId);
		}
		const winner = gameLoop(state[roomName], roomName);
		
		if(!winner){
			emitGameState(roomName, state[roomName]);
		} else {
			emitGameOver(roomName, winner);
			state[roomName] = null;
			clearInterval(intervalId);
		}
	}, 1000/FRAME_RATE);
}

function emitGameState(roomName, st) {
	io.sockets.in(roomName).emit('gameState', JSON.stringify(st));
}

function emitGameOver(roomName, winner) {
	io.sockets.in(roomName).emit('gameOver', JSON.stringify({winner}));
}

//io.listen(process.env.PORT || 3000);
io.listen(3000);
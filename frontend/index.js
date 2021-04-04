
const BOARD_WIDTH = 60;
const BOARD_HEIGHT = 50;
const FRAME_RATE = 30;
const TILE_SIZE = 75;
const TILE_GAP = 5;
const BULLET_RADIUS = 5;
const PLAYER_RADIUS = 11.5;
const font = "Tahoma";

const socket = io('https://frozen-bastion-63637.herokuapp.com/');
//const socket = io('http://localhost:3000')

var gameState = {};
var rn = '';

socket.on('init', handleInit);
socket.on('allGood', handleAllGood);
socket.on('gameState', handleGameState);
socket.on('gameOver', handleGameOver);
socket.on('gameCode', handleGameCode);
socket.on('unknownGame', handleUnknownGame);
socket.on('tooManyPlayers', handleTooManyPlayers);
socket.on('keyDead', handleKeyDead);
socket.on('renderUpgrade', handleRenderUpgrade);
socket.on('stopUpgrading', handleStopUpgrading);
socket.on('usernames', handleUsernames);

const gameScreen = document.getElementById('gameScreen');
const initialScreen = document.getElementById('initialScreen');
const newGameBtn = document.getElementById('newGameButton');
const joinGameBtn = document.getElementById('joinGameButton');
const gameCodeInput = document.getElementById('gameCodeInput');
const gameCodeDisplay = document.getElementById('gameCodeDisplay');
const preGame = document.getElementById('preGame');
const connectedPlayers = document.getElementById('connectedPlayers');
const startGameBtn = document.getElementById('startGameButton');
const username = document.getElementById('username');
const errorBox = document.getElementById('errorBox');

newGameBtn.addEventListener('click', newGame);
joinGameBtn.addEventListener('click', joinGame);
startGameBtn.addEventListener('click', startGame);

if(!localStorage.getItem('username')){
	localStorage.setItem('username', makeUsername());
}

username.value = localStorage.getItem('username');

function newGame() {
  socket.emit('newGame');
	playerNumber = 1;
  init();
}

function joinGame() {
	const code = gameCodeInput.value;
	localStorage.setItem('username', username.value);
	socket.emit('joinGame', code);
}

function handleAllGood(data) {
	init();
	rn = data;
	gameCodeDisplay.innerHTML = "Your game code is: " + rn;
	connectedPlayers.innerHTML = "Connected players: " + localStorage.getItem('username');
}

function handleUsernames(data) {
	data = JSON.parse(data);
	var text = "Connected players: ";
	for(p of data.s){
		if(p.username){
			text += p.username + ", ";
		}
	}
	connectedPlayers.innerHTML = text;
}

function startGame() {
	socket.emit('startGame', rn);
}

let canvas, ctx;
let playerNumber;
let clientPlayer;
let gameActive = false;
var mouseMoved = false;
var keys = [];
let camera = { x: 0, y: 0 };
var mousePos;
var localPlayers = [];
var upgradeData;
var upgrading = false;

function init() {
	//hide initial screen and show game screen
	initialScreen.style.display = "none";
	gameScreen.style.display = "block";
	preGame.style.display = "block";
	console.log(playerNumber);
	if(playerNumber != 1){
		startGameBtn.style.display = "none";
	} else {
		startGameBtn.style.display = "block";
	}
	
	canvas = document.getElementById('drawingArea');
	ctx = canvas.getContext('2d');
	
	resizeCanvas();
	drawBackground();
	
	window.addEventListener('keydown', keydown);
	window.addEventListener('keyup', keyup);
	window.addEventListener('mousemove', function (e) {
		getMousePosition(canvas, e);
		mouseMoved = true;
		socket.emit('mouseMove', mousePos);
	});
	window.addEventListener('mousedown', function (e) {
		socket.emit('mouseDown', e);
	});
	window.addEventListener('mouseup', function (e) {
		socket.emit('mouseUp', e);
	});
	
	gameActive = true;
}

function drawBackground() {
	ctx.fillStyle = "white";  
	ctx.fillRect(camera.x, camera.y, canvas.width, canvas.height);
}

function keydown(e) {
	keys = (keys || []);
  keys[e.keyCode] = (e.type == "keydown");
	//socket.emit('keyChange', keys);
}
function keyup(e) {
	keys[e.keyCode] = (e.type == "keydown");
	socket.emit('keyChange', keys);
}

setInterval(checkKeys, 1000/FRAME_RATE);
function checkKeys() {
	for(key of keys){
		if(key === true){
			socket.emit('keyChange', keys);
			return;
		}
	}
}

function handleKeyDead(keyCode) {
	keyCode = parseInt(keyCode);
	keys[keyCode] = false;
}

function handleRenderUpgrade(data) {
	upgradeData = data;
	upgrading = true;
}

function handleStopUpgrading(data) {
	upgradeData = {};
	upgrading = false;
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
	socket.emit('canvasChange', {height: canvas.height, width: canvas.width});
};

window.onresize = resizeCanvas;

function renderGame(state) {
	
	if(state.changes){
	if(state.changes.length != 0) {
		for(t of state.changes){
			console.log('changes');
			gameState.board[t.column][t.row] = t;
		}
	}
	}
	
	localPlayers = state.players;
	
	preGame.style.display = "none"; 
	camera.x = state.players[playerNumber-1].x - canvas.width/2;
  camera.y = state.players[playerNumber-1].y - canvas.height/2;
  ctx.setTransform(1, 0, 0, 1, -1 * camera.x, -1 * camera.y);
	
	drawBackground();
	renderTiles(state);
	
	for(player of state.players){
		renderPlayer(player);
		if(player.health < 10 && !player.hidden) {
			renderHealthBar(player);
		}
	}
	
	if(upgrading) {
		renderUpgrade(upgradeData);
	}
	
	for(let i = 0; i<state.bullets.length; i++){
    bullet = state.bullets[i];
    if(bullet == undefined){
      break;
    }
    renderBullet(bullet);
  }
	
	if(state.players[playerNumber-1].dead) {
		if(state.players[playerNumber-1].gameOver){
			renderGameOver(state.players[playerNumber-1]);
		} else {
			renderDeathMessage(state.players[playerNumber-1]);
		}
	}
	
	renderMenu(state.players[playerNumber-1]);
	if(state.players[playerNumber-1].renderingShop) {
		renderShop(state.players[playerNumber-1]);
	}
	renderSideMenu(state.players[playerNumber-1]);
	renderMap(state)
}

function renderPlayer(player) {
	if(player.hidden){return;}
	
	ctx.fillStyle = player.color;
  ctx.strokeStyle = "white";
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(player.x, player.y, PLAYER_RADIUS, 0, 2 * Math.PI);
  ctx.stroke(); 
  ctx.fill();
	
	ctx.fillStyle = "white";
	ctx.font = "15px " + font;
	ctx.fillText(player.username, player.x, player.y-PLAYER_RADIUS/2-22.5);
	
	renderArrow(player.arrowData);
}

function renderTiles(state) {
	
	let x1 = state.players[playerNumber-1].x-canvas.width/2-100;
	let x2 = state.players[playerNumber-1].x+canvas.width/2+100;
	let y1 = state.players[playerNumber-1].y-canvas.height/2-100;
	let y2 = state.players[playerNumber-1].y+canvas.height/2+100;
	
	for(let i = 0; i < BOARD_WIDTH; i++) {
    for (let j = 0; j < BOARD_HEIGHT; j++) {
      var tile = state.board[i][j];
			if(tile.topX > x1 && tile.topX < x2 && tile.topY > y1 && tile.topY < y2){
				renderTile(tile, tile.topX, tile.topY, tile.color, tile.text , tile.textSize);
			}
    } 
  }
	
	var focus = focusTile(state);
  if(focus != undefined){
    renderTile(focus, focus.topX, focus.topY, focus.color, focus.text, focus.textSize, true);
  }
}

function renderTile(tile, x, y, fill, text, textSize, localTile) {
  ctx.fillStyle = fill;
  ctx.save();
  ctx.translate(x,y);
  ctx.strokeStyle = "lightGreen";
  ctx.lineWidth = 10;
  if(localTile){
    ctx.strokeRect(0,0,TILE_SIZE, TILE_SIZE);
  }
  ctx.fillRect(0,0 , TILE_SIZE, TILE_SIZE);
  ctx.restore();
  //Draw coordinates
  ctx.fillStyle = "white";
  ctx.font = textSize +" "+font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x+TILE_SIZE/2, y+TILE_SIZE/2);
}

function handleInit(number) {
	playerNumber = number;
	socket.emit('username', {n: number, u: localStorage.getItem('username')});
}

function handleGameState(state) {
	if(!gameActive){return;}
	state = JSON.parse(state);
	
	if(Object.keys(gameState).length == 0){gameState = state;}
	else {
		gameState.players = state.players;
		gameState.bullets = state.bullets;
		gameState.changes = state.changes;
	}
	
	clientPlayer = state.players[playerNumber-1];
	requestAnimationFrame(() => renderGame(gameState));
}

function handleGameOver(winner) {
	if(!gameActive){return;}
	winner = JSON.parse(winner);
	if(winner.winner.id == clientPlayer.id) {
		console.log("winning message rendered");
		//alert("you win");
		renderWinnerMessage(clientPlayer);
	} else {
		//alert("You lose");
	}
	gameActive = false;
	socket.emit('gameEnded', null);
}

function handleGameCode(code) {
	gameCodeDisplay.innerHTML = "Your game code is: " + code;
	localStorage.setItem('username', username.value);
	connectedPlayers.innerHTML = "Connected players: " + localStorage.getItem('username');
	rn = code;
}

function handleUnknownGame() {
	reset();
	//alert("Unknown game code");
	errorBox.innerHTML = "* Unknown Game Code *";
}

function handleTooManyPlayers() {
	reset();
	//alert("This game is already in progress");
	errorBox.innerHTML = "* This Game is Already in Progress *";
}

function reset() {
	playerNumber = null;
	gameCodeInput.value = "";
	gameCodeDisplay.innerText = "";
	connectedPlayers.innerText = "";
	initialScreen.style.display = "block";
	gameScreen.style.display = "none"
}

function getMousePosition(canvas, event) { 
  let rect = canvas.getBoundingClientRect(); 
  mousePos = {x: event.clientX - rect.left, y: event.clientY - rect.top};
} 

function renderArrow(data) {
	ctx.save();
  ctx.translate(data.px, data.py);
  ctx.rotate(data.ang);
  ctx.translate(0, -data.radius);
  //Actual Arrow
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.moveTo(-15,5);
  ctx.lineTo(0, -10);
  ctx.lineTo(15, 5);
  //ctx.arcTo(0, -10, -15, 5, 1);
  ctx.fill();
  ctx.translate(0, data.radius);
  ctx.rotate(-data.ang);
  ctx.restore();
}

function focusTile(state) {
  for(var y=0; y < BOARD_HEIGHT; y++){
    for(var x=0; x < BOARD_WIDTH; x++){
      var tile = state.board[x][y]
			var ad = state.players[playerNumber-1].arrowData;
      if((ad.arrowX-tile.topX <= 75)&&(ad.arrowY-tile.topY <= 75)){
         return tile;
      }
    }
  }
}

function renderMenu(player) {
  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.fillStyle = player.color;
  ctx.strokeStyle = "white";
  ctx.lineWidth = 5;
  ctx.strokeRect(10, 10, 310, 60);
  ctx.fillRect(10, 10, 310, 60);
  
  ctx.fillStyle = "white";
  ctx.font = "30px " + font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Gold: " + Math.trunc(player.gold), 85, 40);
  ctx.fillText("Stone: " + Math.trunc(player.stone), 235, 40);
  ctx.restore();
}

function renderShop(player) {
	var tile = player.focus;
	var owner = playerById(tile.owner);
	
  ctx.save();
  ctx.translate(tile.topX+TILE_SIZE+TILE_GAP+10, tile.topY-10);
  ctx.strokeStyle = "white"
  ctx.fillStyle = owner.color;
  ctx.lineWidth = 7.5;
  ctx.strokeRect(0, 0, 150, 115);
  ctx.fillRect(0, 0, 150, 115);
  ctx.font = "18px " + font;
  ctx.fillStyle = "white";
  ctx.fillText("UPGRADES", 75, 20);
  var {width} = ctx.measureText("UPGRADES");
  ctx.fillRect(75-width/2, 27.5, width, 2);
  ctx.textAlign = "left";
  ctx.font = "15px " + font;

  if(player.speedLevel != 9){
    ctx.fillStyle = "white";
    ctx.textAlign = "left";
    ctx.fillText("1: SPEED " + (player.speedLevel+1), 10, 50);
    ctx.fillStyle = "gold";
    ctx.textAlign = "end";
    ctx.fillText((player.speedLevel+1)*10 + " G", 140, 50);
  } else {
    ctx.fillStyle = "white";
    ctx.textAlign = "left";
    ctx.fillText("1: SPEED " + (player.speedLevel), 10, 50);
    ctx.fillStyle = "gold";
    ctx.textAlign = "end";
    ctx.fillText((player.speedLevel)*10 + " G", 140, 50);
    ctx.fillStyle = "white";
    ctx.fillRect(8, 48, 134, 2);
  }

  if(player.forceLevel != 9){
    ctx.fillStyle = "white";
    ctx.textAlign = "left";
    ctx.fillText("2: FORCE " + (player.forceLevel+1), 10, 75);
    ctx.fillStyle = "gold";
    ctx.textAlign = "end";
    ctx.fillText((player.forceLevel+1)*10 + " G", 140, 75);
  } else {
    ctx.fillStyle = "white";
    ctx.textAlign = "left";
    ctx.fillText("2: FORCE " + (player.forceLevel), 10, 75);
    ctx.fillStyle = "gold";
    ctx.textAlign = "end";
    ctx.fillText((player.forceLevel)*10 + " G", 140, 75);
    ctx.fillStyle = "white";
    ctx.fillRect(8, 73, 134, 2);
  }

  ctx.fillStyle = "white";
  ctx.textAlign = "left";
  ctx.fillText("3: REGEN", 10, 100);

  ctx.fillStyle = "gold";
  ctx.textAlign = "end";
  ctx.fillText("150 G", 140, 100);
  ctx.textAlign = "center";

  if(player.purchasedRegen){
    ctx.fillStyle = "white";
    ctx.fillRect(8, 98, 134, 2);
  }
  ctx.restore();
}

function playerById(id) {
	for(p of localPlayers) {
		if(id == p.id){return p;}
	}
}

function renderSideMenu(player) {
  ctx.save();
  ctx.translate(camera.x + 10, camera.y + 80);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = player.color;
  ctx.fillRect(0, 0, 250, 100);
  ctx.globalAlpha = .9;
  ctx.fillStyle = "white";
  ctx.font = "25px " + font;
  ctx.textAlign = "left";
  ctx.fillText("SPEED: ", 15, 35);
  ctx.fillText("FORCE: ", 15, 75);
  
  ctx.strokeStyle = "white";
  ctx.lineWidth = 5;
  ctx.strokeRect(110, 22.5, 125, 25);
  ctx.strokeRect(110, 60, 125, 25);

  ctx.fillRect(110, 22.5, player.speedLevel/9*125, 25);
  ctx.fillRect(110, 60, player.forceLevel/9*125, 25);
  ctx.font = "15px " + font;
  ctx.textAlign = "center";
  if(player.speedLevel>5){
    ctx.fillStyle = player.color;
    ctx.fillText("Lvl " + player.speedLevel, 172.5, 35);
  }
  else if(player.speedLevel>3){
    ctx.fillStyle = player.color;
    ctx.fillText("Lvl   ", 172.5, 35);
    ctx.fillStyle = "white";
    ctx.fillText("     " + player.speedLevel, 172.5, 35);
  }
  else {
    ctx.fillStyle = "white";
    ctx.fillText("Lvl " + player.speedLevel, 172.5, 35);
  }
  if(player.forceLevel>5){
    ctx.fillStyle = player.color;
    ctx.fillText("Lvl " + player.forceLevel, 172.5, 74);
  }
  else if(player.forceLevel>3){
    ctx.fillStyle = player.color;
    ctx.fillText("Lvl   ", 172.5, 74);
    ctx.fillStyle = "white";
    ctx.fillText("     " + player.forceLevel, 172.5, 74);
  }
  else {
    ctx.fillStyle = "white";
    ctx.fillText("Lvl " + player.forceLevel, 172.5, 74);
  }
  ctx.restore();
}

function renderUpgrade(data) {
	var tile = data.tile;
	var time = data.time;
	var player = localPlayers[playerNumber-1];
	
	ctx.save();
	ctx.fillStyle = player.color;
  ctx.strokeStyle = "white"
  ctx.lineWidth = 7.5;
  ctx.translate(tile.topX-10, tile.topY+(TILE_SIZE/2)-10);
  ctx.strokeRect(0, 0, TILE_SIZE+20, 20);
  ctx.fillRect(0, 0, TILE_SIZE+20, 20);
  var width = (player.upgradeTime/time)*(TILE_SIZE+20);
  ctx.fillStyle = "white";
  ctx.fillRect(0,0, width, 20);
	ctx.restore();
}

function renderMap(state){
  ctx.save();
	const player = state.players[playerNumber-1];
	const tiles = state.board;
  var width = TILE_GAP*2 + TILE_SIZE*3;
  var height = width*(BOARD_HEIGHT/BOARD_WIDTH);
  var ratio = width/(BOARD_WIDTH*80+5);
  ctx.translate(camera.x+canvas.width-width-10, camera.y+10);

  ctx.strokeStyle = "white";
  ctx.lineWidth = 10;
  ctx.strokeRect(0, 0, width, height);
  ctx.strokeStyle = player.color;
  ctx.lineWidth = 5;
  ctx.fillStyle = "white";
  ctx.strokeRect(0, 0, width, height);
  ctx.fillRect(0, 0, width, height);

  for(let i = 0; i < BOARD_WIDTH; i++) {
    for (let j = 0; j < BOARD_HEIGHT; j++) {
      var tile = tiles[i][j];
      ctx.fillStyle = tile.color;
      if(tile.text == "⌂"){
        ctx.fillStyle = "white";
        ctx.lineWidth = 1;
        ctx.strokeRect(tile.topX*ratio, tile.topY*ratio, TILE_SIZE*ratio, TILE_SIZE*ratio);
      } else {
				ctx.fillRect(tile.topX*ratio, tile.topY*ratio, TILE_SIZE*ratio, TILE_SIZE*ratio);
			}
    } 
  }

  ctx.fillStyle = player.color;
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(player.x*ratio, player.y*ratio, 1.75, 0, 2 * Math.PI);
  ctx.stroke(); 
  ctx.fill();

  ctx.restore();
}

function renderBullet(bullet) {
	ctx.save();
	ctx.fillStyle = bullet.color;
	ctx.strokeStyle = "white";
	ctx.lineWidth = 2.5;
	ctx.beginPath();
	ctx.arc(bullet.x, bullet.y, BULLET_RADIUS, 0, 2 * Math.PI);
	ctx.stroke(); 
	ctx.fill();
	ctx.restore();
}

function renderHealthBar(player){
  ctx.save();
  ctx.translate(player.x-30, player.y+27.5);
  ctx.fillStyle = player.color;
  ctx.strokeStyle = "white";
  ctx.lineWidth = 5;
  ctx.strokeRect(0, 0, 60, 4);
  ctx.fillRect(0, 0, 60, 4);

  var width = (player.health/10)*60
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, 4);
  ctx.restore();
}

function renderDeathMessage(player){
  ctx.save();
  ctx.translate(camera.x+canvas.width/2-250, camera.y+canvas.height/2-150);
  ctx.strokeStyle = player.color;
  ctx.lineWidth = 14;
  ctx.strokeRect(0, 0, 500, 300);
  ctx.strokeStyle = "white";
  ctx.lineWidth = 10;
  ctx.strokeRect(0, 0, 500, 300);
  ctx.fillStyle = player.color;
  ctx.fillRect(0, 0, 500, 300);

  ctx.font = "80px " + font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "white";
  ctx.fillText("YOU DIED", 250, 100);
  ctx.font = "30px " + font;
  ctx.fillText("TRY NOT TO DO THAT AGAIN", 250, 160);
  ctx.fillText("RESPAWNING IN: " + Math.trunc(5.5-player.respawnDelay/FRAME_RATE), 250, 225);
  ctx.restore();
}

function renderGameOver(player){
  ctx.save();
  ctx.translate(camera.x+canvas.width/2-250, camera.y+canvas.height/2-150);
  ctx.strokeStyle = player.color;
  ctx.lineWidth = 14;
  ctx.strokeRect(0, 0, 500, 300);
  ctx.strokeStyle = "white";
  ctx.lineWidth = 10;
  ctx.strokeRect(0, 0, 500, 300);
  ctx.fillStyle = player.color;
  ctx.fillRect(0, 0, 500, 300);

  ctx.font = "80px " + font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "white";
  ctx.fillText("GAME OVER", 250, 100);
  ctx.font = "30px " + font;
  ctx.fillText("SUCKS TO SUCK LOSER", 250, 160);
  ctx.fillText("(TELL YOUR FRIENDS)", 250, 225);
  ctx.restore();
}

function renderWinnerMessage(player){
  ctx.save();
  ctx.translate(camera.x+canvas.width/2-250, camera.y+canvas.height/2-150);
  ctx.strokeStyle = player.color;
  ctx.lineWidth = 14;
  ctx.strokeRect(0, 0, 500, 300);
  ctx.strokeStyle = "white";
  ctx.lineWidth = 10;
  ctx.strokeRect(0, 0, 500, 300);
  ctx.fillStyle = player.color;
  ctx.fillRect(0, 0, 500, 300);

  ctx.font = "80px " + font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "white";
  ctx.fillText("YOU WIN", 250, 100);
  ctx.font = "30px " + font;
  ctx.fillText("ALL YOUR FRIENDS SUCK", 250, 160);
  ctx.fillText("(TELL YOUR FRIENDS)", 250, 225);
  ctx.restore();
}

function makeUsername() {
	var name = "";
	const words = ['Frodo', 'Alfred', 'Maunu', 'Gonzo', 'Bobo', 'Larry'];
	name += words[Math.floor(Math.random()*words.length)];
	name += Math.floor(Math.random()*1000);
	return name;
}







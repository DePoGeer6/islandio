const {BOARD_HEIGHT, FRAME_RATE, BOARD_WIDTH, TILE_GAP, TILE_SIZE, BULLET_RADIUS, PLAYER_RADIUS, FONT, subs,} = require('./constants');
const {Tile, HomeTile, WallTile, TurretTile, SmitheryTile, MineTile, Player} = require('./globalObjects');
const {findAngle} = require('./utils');

module.exports = {
	createGameState,
	gameLoop,
	getUpdatedVelocity,
	initGame,
	focusTileCheck,
	upgradeCheck,
	shopCheck,
	shoot,
}

var gameStates = {};

function initGame(rn) {
	const state = createGameState();
	for(p of state.players){
		p.roomName = rn;
	}
	gameStates[rn] = state;
	return state;
}

function createGameState() {
	var board = new Array(BOARD_WIDTH);
	var ht = [];
	var mt = [];
	var st = [];
	var wt = [];
	var b = [];
	var tts = [];
	 
	for (let i = 0; i < BOARD_WIDTH; i++) {
		board[i] = new Array(BOARD_HEIGHT);
	}
	for(let i = 0; i < BOARD_WIDTH; i++) {
		for (let j = 0; j < BOARD_HEIGHT; j++) {
			board[i][j] = new Tile((i+1) * TILE_GAP + i * TILE_SIZE, (j+1) * TILE_GAP + j * TILE_SIZE, j, i);
		} 
	}
	
	var playerOne = new Player("Frodo", 725+TILE_SIZE/2, 725+TILE_SIZE/2, "darkblue", 900, 900);
	let tt = board[9][9];
	board[9][9] = new HomeTile(tt.topX, tt.topY, tt.row, tt.column, playerOne.id, playerOne.color);
	playerOne.homeTile = board[9][9];
	ht.push(board[9][9]);
	tt = board[10][9];
	board[10][9] = new MineTile(tt.topX, tt.topY, tt.row, tt.column, playerOne.id, playerOne.color);
	mt.push(board[10][9]);
	
	var playerTwo = new Player("Alfred", 4005+TILE_SIZE/2, 725+TILE_SIZE/2, "orange", 900, 900);
	tt = board[50][9];
	board[50][9] = new HomeTile(tt.topX, tt.topY, tt.row, tt.column, playerTwo.id, playerTwo.color);
	playerTwo.homeTile = board[50][9];
	ht.push(board[50][9]);
	tt = board[49][9];
	board[49][9] = new MineTile(tt.topX, tt.topY, tt.row, tt.column, playerTwo.id, playerTwo.color);
	mt.push(board[49][9]);
	
	var playerThree = new Player("Maunu", 725+TILE_SIZE/2, 3205+TILE_SIZE/2, "lightcoral", 0, 0);
	tt = board[9][40];
	board[9][40] = new HomeTile(tt.topX, tt.topY, tt.row, tt.column, playerThree.id, playerThree.color);
	playerThree.homeTile = board[9][40];
	ht.push(board[9][40]);
	tt = board[10][40];
	board[10][40] = new MineTile(tt.topX, tt.topY, tt.row, tt.column, playerThree.id, playerThree.color);
	mt.push(board[10][40]);
	
	var playerFour = new Player("Bobby", 4005+TILE_SIZE/2, 3205+TILE_SIZE/2, "lightgreen", 0, 0);
	tt = board[50][40];
	board[50][40] = new HomeTile(tt.topX, tt.topY, tt.row, tt.column, playerFour.id, playerFour.color);
	playerFour.homeTile = board[50][40];
	ht.push(board[50][40]);
	tt = board[49][40];
	board[49][40] = new MineTile(tt.topX, tt.topY, tt.row, tt.column, playerFour.id, playerFour.color);
	mt.push(board[49][40]);
	
	return {
		players: [playerOne, playerTwo, playerThree, playerFour],
		board: board,
		homeTiles: ht,
		mineTiles: mt,
		smitheryTiles: st,
		turretTiles: tts,
		wallTiles: wt,
		bullets: b,
		changes: [],
	}
}

function gameLoop(state, roomName) {
	
	if(!state){return;}
	
	gameStates[roomName].players = state.players;
	gameStates[roomName].bullets = state.bullets;
	state.changes = gameStates[roomName].changes;

	var winner;
	var numbLosers = 0;
	for(p of state.players) {
		if(p.gameOver == false){
			winner = p;
		} else {
			numbLosers++;
		}
	}
	if(numbLosers == state.players.length-1){
		return winner;
	}
	
	for(player of state.players) {
		player.x += player.vel.x;
		var tt = playerWithinTile(player.x, player.y, roomName);
		if(tt){
			if(tt.owner == null || tt == null) {
				player.x -= player.vel.x;
			}
			tt = playerWithinTile(player.x, player.y, roomName);
			if(tt.owner != player.id && tt.constructor.name == "WallTile"){
				player.x -= player.vel.x*.5;
			}
		}
		player.y += player.vel.y;
		tt = playerWithinTile(player.x, player.y, roomName);
		if(tt){
			if(tt.owner == null || tt == null) {
				player.y -= player.vel.y;
			}
			tt = playerWithinTile(player.x, player.y, roomName);
			if(tt.owner != player.id && tt.constructor.name == "WallTile"){
				player.y -= player.vel.y*.5;
			}
		}
		borderBox(player, roomName);
		player.arrowData = calcArrow(player, 40);
		
		tt = playerWithinTile(player.x, player.y, roomName);
		if(tt.constructor.name == "MineTile" && !player.hidden){
			player.gold += tt.queueG;
			player.stone += tt.queueS;
			tt.queueG = 0;
			tt.queueS = 0;
			//state.changes.push(tt);
		}
		
		if(tt.owner != player.id && tt.constructor.name == "WallTile" && !player.hidden && !player.immune){
			player.health -= 1/(FRAME_RATE*.5);
			if(player.health <= 0){
				killPlayer(player);
			}
		}
		
		if(tt == player.homeTile && !player.hidden){
			player.regen = true;
		} else if(!player.purchasedRegen){
			player.regen = false;
		}
		
		var focus = focusTile(player.arrowData, roomName);
		if(focus != undefined){
			if(focus.constructor.name == "SmitheryTile"){
				player.renderingShop = true;
				player.focus = focus;
			} else {player.renderingShop = false;}
		}
		
		player.shootDelay++;
		player.regenDelay++;
		player.turretShootDelay++;
		
		if(player.dead){
			if(player.homeTile == null){player.gameOver = true;}
			if(player.respawnDelay >= 5*FRAME_RATE) {
				player.respawnDelay = 0;
				if(player.homeTile != null){
					player.x = player.homeTile.topX + TILE_SIZE/2;
					player.y = player.homeTile.topY + TILE_SIZE/2;
					player.hidden = false;
					player.dead = false;
				} else {
					player.gameOver = true;
					player.hidden = true;
				}
			} else {
				player.hidden = true;
				player.respawnDelay++;
			}
		}
		
		if(player.regen){
			if(player.regenDelay >= FRAME_RATE && player.health <= 9.75){
				player.health += 0.5;
				player.regenDelay = 0;
			}
		}
		
		if(player.immune) {
			player.immuneDelay += 1/FRAME_RATE;
			if(player.immuneDelay >= 10) {
				player.immuneDelay = 0;
				player.immune = false;
			}
		}
		
	}
	
	if(gameStates[roomName].turretTiles.length > 0){
		for(x of gameStates[roomName].turretTiles) {
			var player = playerById(x.owner, roomName);
			if(player.turretShootDelay >= FRAME_RATE) {
				player.turretShootDelay = 0;
				for(p of state.players) {
					if(!p.hidden && !p.immune){
						if(Math.abs(p.x-(x.topX+TILE_SIZE/2)) <= 250 && Math.abs(p.y-(x.topY+TILE_SIZE/2)) <= 250 && p.id != x.owner){
							turretShoot(x, p);
						}
					}
				}
			}
		}
	}
	
	//genResources
	genResources(gameStates[roomName].mineTiles);
	
	for(let i = 0; i<state.bullets.length; i++){
    bullet = state.bullets[i];
    if(bullet == undefined){
      break;
    }
    bullet.x += bullet.s*Math.sin(bullet.ang);
    bullet.y -= bullet.s*Math.cos(bullet.ang);
    bullet.life--;
		if(!bullet.isTurret){
			bullet.damage = 1 + 0.333*(playerById(bullet.owner, roomName).forceLevel-1);
			bullet.s = 7.5+(playerById(bullet.owner, roomName).forceLevel-1);
		}
    if(bullet.life <= 0){
      state.bullets.splice(i, 1);
      i--;
    }
    if(bulletWithinTile(bullet, roomName) != undefined){
      if(bulletWithinTile(bullet, roomName).owner != bullet.owner && bulletWithinTile(bullet, roomName).constructor.name == "WallTile"){
        state.bullets.splice(i, 1);
        i--;
      }
    }
		var p = bullet.hitPlayer(state.players);
		if(p){
			if(!p.hidden && !p.immune){
				p.health -= bullet.damage;
				state.bullets.splice(i, 1);
				i--;
				if(p.health <= 0){
					killPlayer(p);
				}
			}
    }
  }
}

function killPlayer(player) {
	player.gold = 0;
	player.stone = 0;
	player.health = 10;
	
	player.dead = true;
}

function borderBox(player, rn) {
	var tiles = gameStates[rn].board;
	if(player.x < 0){player.x = 0;}
	if(player.y < 0){player.y = 0;}
	if(player.x > tiles[BOARD_WIDTH-1][0].topX+75){player.x = tiles[BOARD_WIDTH-1][0].topX+75;}
	if(player.y > tiles[0][BOARD_HEIGHT-1].topY+75){player.y = tiles[0][BOARD_HEIGHT-1].topY+75;}
}

function calcArrow(player, radius){

  var p1={x:player.mousePos.x,y:player.mousePos.y};
  var p2={x:player.canvas.width/2,y:player.canvas.height/2};
  var p3={x:player.canvas.width/2,y:0};

  var ang = findAngle(p1,p2,p3);
	//console.log(ang);
  if(player.mousePos.x<player.canvas.width/2){
    ang *= -1;
  }
  var angDegree = ang*180/Math.PI;
  if(isNaN(ang)){
    ang = .0001;
  }

  var relArrowX = radius*Math.sin(Math.abs(ang));
  var relArrowY = radius*Math.cos(Math.abs(ang));

  if(player.mousePos.x>player.canvas.width/2){
    arrowX = player.x+relArrowX;
    arrowY = player.y-relArrowY;
  }
  else {
    arrowX = player.x-relArrowX;
    arrowY = player.y-relArrowY;
  }
	//console.log(ang);
	return {
		px: player.x,
		py: player.y,
		radius: radius,
		ang: ang,
		arrowX: arrowX,
		arrowY: arrowY,
	}
}

function getUpdatedVelocity(keys, player) {
	var speed = player.speed;
	if(player.immune){speed = speed * 0.6;}
	var tempVel = {x: 0, y: 0};
	if(player.hidden){return tempVel;}
	
	if (keys && (keys[65]||keys[37])) {
		tempVel.x -= speed;
	}
	if (keys && (keys[68]||keys[39])) {
		tempVel.x += speed;
	}
	if (keys && (keys[87]||keys[38])) {
		tempVel.y -= speed;
	}
	if (keys && (keys[83]||keys[40])) {
		tempVel.y += speed;
	}
	
	return tempVel;
}

function playerWithinTile(px, py, rn){
  for(var y=0; y < BOARD_HEIGHT; y++){
    for(var x=0; x < BOARD_WIDTH; x++){
      var tile = gameStates[rn].board[x][y];
      if((px-tile.topX <= 80)&&(py-tile.topY <= 80)){
         return tile;
      }
    }
  }
}

function focusTile(ad, rn) {
  for(var y=0; y < BOARD_HEIGHT; y++){
    for(var x=0; x < BOARD_WIDTH; x++){
      var tile = gameStates[rn].board[x][y];
      if((ad.arrowX-tile.topX <= 75)&&(ad.arrowY-tile.topY <= 75)){
         return tile;
      }
    }
  }
}


function focusTileCheck(keys, player, rm) {
	if(player.hidden){return false;}
	var focus = focusTile(player.arrowData, rm);
  if(focus != undefined){    
    if(focus.owner == null){
      if(keys && keys[32]){ //press space
        return claimTile(focus, player, "plain");
      }
      if(keys && keys[77]){ //press M
        return claimTile(focus, player, "mine");
      }
      if(keys && keys[70]){ //press F
        return claimTile(focus, player, "smithery");
      }
      if(keys && keys[84]){ //press T
        return claimTile(focus, player, "turret");
      }
    }
  }
}

function claimTile(focus, player, type) {
	var tiles = gameStates[player.roomName].board;
	switch(type) {
		case "plain":
			if(player.stone >= 2){
				tiles[focus.column][focus.row].changeOwner(player);
				player.stone -= 2;
				gameStates[player.roomName].changes.push(tiles[focus.column][focus.row]);
				return tiles[focus.column][focus.row];				
			}
			break;
		case "mine":
			if(player.stone >= 10 && player.numMines < 3){
				tiles[focus.column][focus.row] = new MineTile(focus.topX, focus.topY, focus.row, focus.column, player.id, player.color);
				gameStates[player.roomName].mineTiles.push(tiles[focus.column][focus.row]);
				player.numMines++;
				player.stone -= 10;
				gameStates[player.roomName].changes.push(tiles[focus.column][focus.row]);
				return tiles[focus.column][focus.row];
			}
			break;
		case "smithery": 
			if(player.stone >= 5 && player.gold >= 5){
				tiles[focus.column][focus.row] = new SmitheryTile(focus.topX, focus.topY, focus.row, focus.column, player.id, player.color);
				gameStates[player.roomName].smitheryTiles.push(tiles[focus.column][focus.row]);
				player.stone -= 5;
				player.gold -= 5;
				gameStates[player.roomName].changes.push(tiles[focus.column][focus.row]);
				return tiles[focus.column][focus.row];
			}
			break;
		case "turret":
			if(player.stone >= 70 && player.gold >= 30){
				tiles[focus.column][focus.row] = new TurretTile(focus.topX, focus.topY, focus.row, focus.column, player.id, player.color);
				gameStates[player.roomName].turretTiles.push(tiles[focus.column][focus.row]);
				player.stone -= 70;
				player.gold -= 30;
				gameStates[player.roomName].changes.push(tiles[focus.column][focus.row]);
				return tiles[focus.column][focus.row];
			}
			break;
	}
}

function genResources(mt) {
  for(let i = 0; i<mt.length; i++) {
    mt[i].generateStone();
    mt[i].generateGold();
  }
}

function shopCheck(keys, player, rm) {
	var focus = focusTile(player.arrowData, rm);
	if(focus != undefined) {
		if(focus.constructor.name == "SmitheryTile") {
			if(keys && keys[49] && player.speedLevel < 9 && player.gold >= (player.speedLevel+1)*10){
        player.gold -= (player.speedLevel+1)*10;
        player.speedLevel += 1;
        player.speed = (player.speedLevel-1)/2 + 5;
				return 49;
      }
      if(keys && keys[50] && player.forceLevel < 9 && player.gold >= (player.forceLevel+1)*10){
        player.gold -= (player.forceLevel+1)*10;
        player.forceLevel += 1;
				return 50;
      }
			if(keys && keys[51] && player.gold >= 100 && player.immune == false){
        player.gold -= 100;
        player.immune = true;
				player.immuneDelay = 0;
				return 51;
      }
      if(keys && keys[52] && player.gold >= 150 && player.purchasedRegen == false){
        player.gold -= 150;
        player.purchasedRegen = true;
        player.regen = true;
				return 52;
      }
		}
	}
}

function upgradeCheck(keys, player, rm) {
	var focus = focusTile(player.arrowData, rm);
	if(focus != undefined) {
		if(focus.constructor.name == "MineTile" && focus.owner == player.id && keys && keys[32] && player.gold >= 15*focus.level && focus.level<9){
      upgrade(focus, player, 15*focus.level, 5);
			return {tile: focus, time: 5};
    }
    else if(focus.constructor.name == "Tile" && keys && keys[69] && player.stone >= 50 && focus.owner == player.id){
      upgrade(focus, player, 50, 3);
			return {tile: focus, time: 3};
    }
    else if(focus.constructor.name == "HomeTile" && focus.owner != player.id && keys && keys[32]){
      upgrade(focus, player, 0, 10);
			return {tile: focus, time: 10};
    }
		else{
      player.upgradeTime = 0;
			return false;
    }
	}
}

function upgrade(tile, player, cost, time) {
	player.upgradeTime += 1/FRAME_RATE;
	if(player.upgradeTime >= time) {
		player.upgradeTime = 0;
		if(tile.constructor.name == "MineTile"){
			tile.level++;
			tile.text = "M"+subs[tile.level];
			player.gold -= cost;
		}
		if(tile.constructor.name == "Tile"){
      gameStates[player.roomName].board[tile.column][tile.row] = new WallTile(tile.topX, tile.topY, tile.row, tile.column, player.id, player.color);
      gameStates[player.roomName].wallTiles.push(gameStates[player.roomName].board[tile.column][tile.row]);
      player.stone -= cost;
    }
		if(tile.constructor.name == "HomeTile"){
      playerById(tile.owner, player.roomName).homeTile = null;
      gameStates[player.roomName].board[tile.column][tile.row] = new Tile(tile.topX, tile.topY, tile.row, tile.column, player.id, player.color);
    }
		gameStates[player.roomName].changes.push(gameStates[player.roomName].board[tile.column][tile.row]);
	}
}

function makeBullet(owner, radius, speed) {
  return {
    x: owner.x,
    y: owner.y,
    r: radius,
    s: speed+(owner.forceLevel-1),
    life: 3*FRAME_RATE,
    ang: owner.arrowData.ang,
    owner: owner.id,
		color: owner.color,
    hitPlayer: function(players) {
      for(let i=0; i<players.length; i++){
        if(Math.abs(this.x-players[i].x) <= 23.5 && Math.abs(this.y-players[i].y) <= 23.5){
          if(players[i].id != this.owner){
            //console.log(players[i]);
            return players[i];
          }
        }
      }
      return false;
    }
  }
}

function shoot(player, bullets) {
	if(!player.hidden){
	if(!player.shooting){
		player.shooting = true;
		bullets.push(makeBullet(player, 10, 7.5));
	}
	}
}

function bulletWithinTile(bullet, rn){
  for(var y=0; y < BOARD_HEIGHT; y++){
    for(var x=0; x < BOARD_WIDTH; x++){
      var tile = gameStates[rn].board[x][y]
      var angle = bullet.ang;
      if(angle < 0){angle = 6.28319+bullet.ang;}
      if(angle >= 0.785398 && angle <= 3.92699){
        if((bullet.x+bullet.r-tile.topX <= 80)&&(bullet.y+bullet.r-tile.topY <= 80)){
          return tile;
        }
      } else {
        if((bullet.x-tile.topX <= 80)&&(bullet.y-tile.topY <= 80)){
          return tile;
        }
      }
    }
  }
}

function playerById(id, rn) {
	for(p of gameStates[rn].players) {
		if(id == p.id){return p;}
	}
}

function turretShoot(turret, player) {
  var p1={x:player.x,y:player.y};
  var p2={x:turret.topX+TILE_SIZE/2,y:turret.topY+TILE_SIZE/2};
  var p3={x:turret.topX+TILE_SIZE/2,y:0};
  var bulletAng = findAngle(p1,p2,p3);
  if(player.x < turret.topX+TILE_SIZE/2){
    bulletAng *= -1;
  }
  if(bulletAng >= 2.33874 && bulletAng <= 2.37365){bulletAng = 2.3;}
  if(bulletAng >= -0.802851 && bulletAng <= -0.767945){bulletAng = -0.81;}
  gameStates[player.roomName].bullets.push(makeTurretBullet(turret.topX+TILE_SIZE/2, turret.topY+TILE_SIZE/2, 10, 7.5, bulletAng, turret, player.roomName));
}

function makeTurretBullet(x, y, radius, speed, ang, turret, rn) {
  return {
    x: x,
    y: y,
    r: radius,
		isTurret: true,
		damage: 1,
    s: speed,
    life: 3*FRAME_RATE,
    ang: ang,
    owner: turret.owner,
		color: turret.color,
    hitPlayer: function(players) {
      for(let i=0; i<players.length; i++){
        if(Math.abs(this.x-players[i].x) <= 18.5 && Math.abs(this.y-players[i].y) <= 18.5){
          if(players[i].id != this.owner){
            return players[i];
          }
        }
      }
      return false;
    }
  }
}



 
 



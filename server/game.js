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

var tiles;
var homeTiles = [];
var mineTiles = [];
var smitheryTiles = [];
var wallTiles = [];
var bullets = [];
var players = [];
var turretTiles = [];

function initGame() {
	const state = createGameState();
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
	
	var playerOne = new Player("Frodo", 245+TILE_SIZE/2, 245+TILE_SIZE/2, "darkblue", 900, 900);
	let tt = board[3][3];
	board[3][3] = new HomeTile(tt.topX, tt.topY, tt.row, tt.column, playerOne.id, playerOne.color);
	playerOne.homeTile = board[3][3];
	ht.push(board[3][3]);
	tt = board[4][3];
	board[4][3] = new MineTile(tt.topX, tt.topY, tt.row, tt.column, playerOne.id, playerOne.color);
	mt.push(board[4][3]);
	
	var playerTwo = new Player("Alfred", 565+TILE_SIZE/2, 245+TILE_SIZE/2, "orange", 900, 900);
	tt = board[7][3];
	board[7][3] = new HomeTile(tt.topX, tt.topY, tt.row, tt.column, playerTwo.id, playerTwo.color);
	playerTwo.homeTile = board[7][3];
	ht.push(board[7][3]);
	tt = board[8][3];
	board[8][3] = new MineTile(tt.topX, tt.topY, tt.row, tt.column, playerTwo.id, playerTwo.color);
	mt.push(board[8][3]);
	
	tiles = board; 
	homeTiles = ht;
	mineTiles = mt;
	smitheryTiles = st;
	wallTiles = wt;
	bullets = b;
	turretTiles = tts;
	
	return {
		players: [playerOne, playerTwo],
		board: board,
		homeTiles: ht,
		mineTiles: mt,
		smitheryTiles: st,
		turretTiles: tts,
		wallTiles: wt,
		bullets: b,
	}
}

function gameLoop(state) {
	if(!state){return;}

	var winner;
	var numbLosers = 0;
	for(p of state.players) {
		if(!p.gameOver){
			winner = p;
		} else {
			numbLosers++;
		}
	}
	if(numbLosers == state.players.length-1){
		return p;
	}
	
	for(player of state.players) {
		player.x += player.vel.x;
		if(playerWithinTile(player.x, player.y)){
			if(playerWithinTile(player.x, player.y).owner == null || playerWithinTile(player.x, player.y) == null) {
				player.x -= player.vel.x;
			}
			if(playerWithinTile(player.x, player.y).owner != player.id && playerWithinTile(player.x, player.y).constructor.name == "WallTile"){
				player.x -= player.vel.x*.5;
			}
		}
		player.y += player.vel.y;
		if(playerWithinTile(player.x, player.y)){
			if(playerWithinTile(player.x, player.y).owner == null || playerWithinTile(player.x, player.y) == null) {
				player.y -= player.vel.y;
			}
			if(playerWithinTile(player.x, player.y).owner != player.id && playerWithinTile(player.x, player.y).constructor.name == "WallTile"){
				player.y -= player.vel.y*.5;
			}
		}
		borderBox(player);
		player.arrowData = calcArrow(player, 40);
		
		if(playerWithinTile(player.x, player.y).constructor.name == "MineTile" && !player.hidden){
			player.gold += playerWithinTile(player.x, player.y).queueG;
			player.stone += playerWithinTile(player.x, player.y).queueS;
			playerWithinTile(player.x, player.y).queueG = 0;
			playerWithinTile(player.x, player.y).queueS = 0;
		}
		
		if(playerWithinTile(player.x, player.y).owner != player.id && playerWithinTile(player.x, player.y).constructor.name == "WallTile" && !player.hidden){
			player.health -= 1/(FRAME_RATE*.5);
			if(player.health <= 0){
				killPlayer(player);
			}
		}
		
		if(playerWithinTile(player.x, player.y) == player.homeTile && !player.hidden){
			player.regen = true;
		} else if(!player.purchasedRegen){
			player.regen = false;
		}
		
		var focus = focusTile(player.arrowData);
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
		
		if(player.turretShootDelay >= FRAME_RATE) {
			player.turretShootDelay = 0;
			if(state.turretTiles.length > 0){
			for(x of state.turretTiles) {
				for(p of state.players) {
					if(!p.hidden){
						if(Math.abs(p.x-(x.topX+TILE_SIZE/2)) <= 250 && Math.abs(p.y-(x.topY+TILE_SIZE/2)) <= 250 && p.id != x.owner){
							turretShoot(x, p);
						}
					}
				}
			}
			}
		}
		
	}
	
	//genResources
	genResources(state.mineTiles);
	
	for(let i = 0; i<bullets.length; i++){
    bullet = bullets[i];
    if(bullet == undefined){
      break;
    }
    bullet.x += bullet.s*Math.sin(bullet.ang);
    bullet.y -= bullet.s*Math.cos(bullet.ang);
    bullet.life--;
    bullet.damage = 1 + 0.333*(playerById(bullet.owner).forceLevel-1);
    bullet.s = 7.5+(playerById(bullet.owner).forceLevel-1);
    if(bullet.life <= 0){
      bullets.splice(i, 1);
      i--;
    }
    if(bulletWithinTile(bullet) != undefined){
      if(bulletWithinTile(bullet).owner != bullet.owner && bulletWithinTile(bullet).constructor.name == "WallTile"){
        bullets.splice(i, 1);
        i--;
      }
    }
		var p = bullet.hitPlayer(state.players);
		if(p){
			if(!p.hidden){
				p.health -= bullet.damage;
				bullets.splice(i, 1);
				i--;
				if(p.health <= 0){
					killPlayer(p);
				}
			}
    }
  }
	
	tiles = state.board;
	mineTiles = state.mineTiles;
	houseTiles = state.houseTiles; 
	smitheryTiles = state.smitheryTiles;
	wallTiles = state.wallTiles;
	players = state.players
}

function killPlayer(player) {
	player.gold = 0;
	player.stone = 0;
	player.health = 10;
	
	player.dead = true;
}

function borderBox(player) {
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
	const speed = player.speed;
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

function playerWithinTile(px, py){
  for(var y=0; y < BOARD_HEIGHT; y++){
    for(var x=0; x < BOARD_WIDTH; x++){
      var tile = tiles[x][y]
      if((px-tile.topX <= 80)&&(py-tile.topY <= 80)){
         return tile;
      }
    }
  }
}

function focusTile(ad) {
  for(var y=0; y < BOARD_HEIGHT; y++){
    for(var x=0; x < BOARD_WIDTH; x++){
      var tile = tiles[x][y]
      if((ad.arrowX-tile.topX <= 75)&&(ad.arrowY-tile.topY <= 75)){
         return tile;
      }
    }
  }
}


function focusTileCheck(keys, player) {
	if(player.hidden){return false;}
	var focus = focusTile(player.arrowData);
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
	switch(type) {
		case "plain":
			if(player.stone >= 2){
				tiles[focus.column][focus.row].changeOwner(player);
				player.stone -= 2;
				return tiles[focus.column][focus.row];				
			}
			break;
		case "mine":
			if(player.stone >= 10 && player.numMines < 3){
				tiles[focus.column][focus.row] = new MineTile(focus.topX, focus.topY, focus.row, focus.column, player.id, player.color);
				mineTiles.push(tiles[focus.column][focus.row]);
				player.numMines++;
				player.stone -= 10;
				return tiles[focus.column][focus.row];
			}
			break;
		case "smithery": 
			if(player.stone >= 5 && player.gold >= 5){
				tiles[focus.column][focus.row] = new SmitheryTile(focus.topX, focus.topY, focus.row, focus.column, player.id, player.color);
				smitheryTiles.push(tiles[focus.column][focus.row]);
				player.stone -= 5;
				player.gold -= 5;
				return tiles[focus.column][focus.row];
			}
			break;
		case "turret":
			if(player.stone >= 50 && player.gold >= 15){
				tiles[focus.column][focus.row] = new TurretTile(focus.topX, focus.topY, focus.row, focus.column, player.id, player.color);
				turretTiles.push(tiles[focus.column][focus.row]);
				player.stone -= 50;
				player.gold -= 15;
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

function shopCheck(keys, player) {
	var focus = focusTile(player.arrowData);
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
      if(keys && keys[51] && player.gold >= 150 && player.purchasedRegen == false){
        player.gold -= 150;
        player.purchasedRegen = true;
        player.regen = true;
				return 51;
      }
		}
	}
}

function upgradeCheck(keys, player) {
	var focus = focusTile(player.arrowData);
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
      tiles[tile.column][tile.row] = new WallTile(tile.topX, tile.topY, tile.row, tile.column, player.id, player.color);
      wallTiles.push(tiles[tile.column][tile.row]);
      player.stone -= cost;
    }
		if(tile.constructor.name == "HomeTile"){
      playerById(tile.owner).homeTile = null;
      tiles[tile.column][tile.row] = new Tile(tile.topX, tile.topY, tile.row, tile.column, player.id, player.color);
    }
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

function bulletWithinTile(bullet){
  for(var y=0; y < BOARD_HEIGHT; y++){
    for(var x=0; x < BOARD_WIDTH; x++){
      var tile = tiles[x][y]
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

function playerById(id) {
	for(p of players) {
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
  bullets.push(makeTurretBullet(turret.topX+TILE_SIZE/2, turret.topY+TILE_SIZE/2, 10, 7.5, bulletAng, turret));
}

function makeTurretBullet(x, y, radius, speed, ang, turret) {
  return {
    x: x,
    y: y,
    r: radius,
    s: speed+(playerById(turret.owner).forceLevel-1),
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



 
 



const {FRAME_RATE, BOARD_HEIGHT, BOARD_WIDTH, TILE_GAP, TILE_SIZE, BULLET_RADIUS, PLAYER_RADIUS, FONT, subs} = require('./constants');


class Tile {

  constructor(topX, topY, row, column, owner = null, color = "gainsboro") {
    this.row = row;
    this.column = column;
    this.topX = topX;
    this.topY = topY;
    this.owner = owner;
    this.color = color;
		this.text = "";
		this.textSize = '30px';
		this.repeat = 0;
  }

  changeOwner(p) {
    this.owner = p.id;
    this.color = p.color;
  }
}

class HomeTile extends Tile {

  constructor(topX, topY, row, column, owner, color, text = "⌂") {
    super(topX, topY, row, column, owner, color);
    this.text = text;
		this.textSize = '75px';
  }
}

class WallTile extends Tile {

  constructor(topX, topY, row, column, owner, color, text = "W") {
    super(topX, topY, row, column, owner, color);
    this.text = text;
		this.textSize = '45px';
  }
}

class MineTile extends Tile {

  constructor(topX, topY, row, column, owner, color, level = 1) {
    super(topX, topY, row, column, owner, color);
    this.level = level;
    this.text = "M"+subs[level];
    this.queueS = 0;
    this.queueG = 0;
		this.textSize = '45px';
  }
  generateStone(){
    this.queueS += (1+(this.level-1)/2)/(FRAME_RATE);
  }
  generateGold(){
    this.queueG += (this.level)/(2*FRAME_RATE);
  }
}

class SmitheryTile extends Tile {

  constructor(topX, topY, row, column, owner, color) {
    super(topX, topY, row, column, owner, color);
    this.text = "S";
		this.textSize = '45px';
  }

}

class TurretTile extends Tile {

  constructor(topX, topY, row, column, owner, color) {
    super(topX, topY, row, column, owner, color);
    this.text = "T";
		this.textSize = '45px';
  }

}

class Player {
  constructor(id, x, y, color, gold = 0, stone = 0, health = 10, speed = 5) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.color = color;
    this.gold = gold;
    this.stone = stone;
    this.health = health; 
    this.speedLevel = 1;
    this.forceLevel = 1;
    this.speed = speed;
    this.regen = false;
    this.purchasedRegen = false;
    this.hidden = false;
		this.vel = {x: 0, y: 0};
		this.mousePos = {x: 0, y: 0};
		this.arrowData = {};
		this.numMines = 1;
		this.renderingShop = false;
		this.focus = {};
		this.upgradeTile = 0;
		this.shooting = false;
		this.shootDelay = 0;
		this.dead = false;
		this.respawnDelay = 0;
		this.regenDelay = 0;
		this.turretShootDelay = 0;
		this.gameOver = false;
		this.roomName = null;
		this.canvas = {width: 0, height:0};
		this.immune = false;
		this.immuneDelay = 0;
  }
}

module.exports = {
	Tile,
	HomeTile,
	WallTile,
	MineTile,
	SmitheryTile,
	TurretTile,
	Player,
}
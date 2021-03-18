
class Tile {

  constructor(topX, topY, row, column, owner = null, color = "gainsboro") {
    this.row = row;
    this.column = column;
    this.topX = topX;
    this.topY = topY;
    this.owner = owner;
    this.color = color;
  }

  changeOwner(p) {
    this.owner = p;
    this.color = p.color;
  }
}

class HomeTile extends Tile {

  constructor(topX, topY, row, column, owner, text = "⌂") {
    super(topX, topY, row, column, owner);
    owner.homeTile = this;
    this.text = text;
  }
}

class WallTile extends Tile {

  constructor(topX, topY, row, column, owner, text = "W") {
    super(topX, topY, row, column, owner);
    this.text = text;
  }
}

class MineTile extends Tile {

  constructor(topX, topY, row, column, owner, level = 1) {
    super(topX, topY, row, column, owner);
    this.level = level;
    this.text = "M"+subs[level];
    this.queueS = 0;
    this.queueG = 0;
  }
  generateStone(){
    this.queueS += (1+(this.level-1)/2)/(1000/renderInterval);
  }
  generateGold(){
    this.queueG += (this.level)/(2000/renderInterval);
  }
}

class SmitheryTile extends Tile {

  constructor(topX, topY, row, column, owner) {
    super(topX, topY, row, column, owner);
    this.text = "S";
  }

}

class TurretTile extends Tile {

  constructor(topX, topY, row, column, owner) {
    super(topX, topY, row, column, owner);
    this.text = "T";
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
  } 
}
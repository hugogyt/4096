function GameManager(size, InputManager, Actuator, StorageManager) {
  this.size           = size; // Size of the grid
  this.inputManager   = new InputManager;
  this.storageManager = new StorageManager;
  this.actuator       = new Actuator;

  this.startTiles     = 2;

  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));

  this.setup();
}

// Restart the game
GameManager.prototype.restart = function () {
  this.storageManager.clearGameState();
  this.actuator.continueGame(); // Clear the game won/lost message
  this.setup();
};

// Keep playing after winning (allows going over 4096)
GameManager.prototype.keepPlaying = function () {
  this.keepPlaying = true;
  this.actuator.continueGame(); // Clear the game won/lost message
};

// Return true if the game is lost, or has won and the user hasn't kept playing
GameManager.prototype.isGameTerminated = function () {
  return this.over || (this.won && !this.keepPlaying);
};

// Set up the game
GameManager.prototype.setup = function () {
  var previousState = this.storageManager.getGameState();

  // Reload the game from a previous game if present
  if (previousState) {
    this.grid        = new Grid(previousState.grid.size,
                                previousState.grid.cells); // Reload grid
    this.score       = previousState.score;
    this.over        = previousState.over;
    this.won         = previousState.won;
    this.keepPlaying = previousState.keepPlaying;
  } else {
    this.grid        = new Grid(this.size);
    this.score       = 0;
    this.over        = false;
    this.won         = false;
    this.keepPlaying = false;

    // Add the initial tiles
    this.addStartTiles();
  }

  // Update the actuator
  this.actuate();
};

// Set up the initial tiles to start the game with
GameManager.prototype.addStartTiles = function () {
  for (var i = 0; i < this.startTiles; i++) {
    this.addRandomTile(true);
  }
};

// Adds a tile in a random position
// for computing it as simple
GameManager.prototype.addRandomTile = function (isStart) {
  if (this.grid.cellsAvailable()) {
  	if (isStart) {
  		this.addRandomTileHelper(0.9);
    	
  	} else {
  		// compute for my wife
  		// which position will merge many?
  		// add which value
  		// simplest is put 2 or 4 near 2 and 4
  		if(this.canMergeAlmostMax()) {
  			return;
  		}
  		var cell2 = this.grid.availableContentCell(2);
  		var cell4 = this.grid.availableContentCell(4);
  		if (cell2.x === -1 && cell4.x === -1) {
  			this.addRandomTileHelper(0.5, 1);
  		} else if (cell2.x === -1) {
  			var tile = new Tile(cell4, 4);
  			this.grid.insertTile(tile);
  		} else if (cell4.x === -1) {
  			var tile = new Tile(cell2, 2);
  			this.grid.insertTile(tile);
  		} else {
  			var value = Math.random() < 0.5 ? 2 : 4;
  			if (value === 2) {
  				var tile = new Tile(cell2, 2);
  				this.grid.insertTile(tile);
  			} else {
  				var tile = new Tile(cell4, 4);
  				this.grid.insertTile(tile);
  			}
  		}
  	}
  }
};

GameManager.prototype.canMergeAlmostMax = function () {
	// for sort
	var cells = [];
	for (var x = 0; x < this.size; x++) {
	    for (var y = 0; y < this.size; y++) {
	    	if(this.grid.cells[x][y]) {
	    		cells.push({x:x,y:y,val:this.grid.cells[x][y].value});
	    	}
	    }
	}
	this.grid.sort(cells, -1, cells.length, this.grid.spaceComparor);
	var vector = [
		{x:-1,y:-1},
		{x:-1,y:1},
		{x:1,y:1},
		{x:1,y:-1},
	];
	for(var i=0; i < cells.length ; i++) {
		if (cells[i].value < 32){
			break;
		}
		for(var j = 0; j < vector.length; j++) {
			var tmpcell = {x:cells[i].x+vector[j].x, y:cells[i].y+vector[j].y};
			if (this.grid.withinBounds(tmpcell) && this.grid.cells[tmpcell.x][tmpcell.y] && this.grid.cells[tmpcell.x][tmpcell.y].value === cells[i].value) {
				// may be should add tile in tmpcell line.
				switch(j) {
					case 0:
					case 1:
						var emptyCell1=this.canFindNextEmptyTile(tmpcell.x, tmpcell.y, 1);
						if (emptyCell1.x != -1) {
							if(canFindNextEmptyTile(emptyCell.x, emptyCell.y, 1)) {
								this.addRandomTileHelper(0.9);
								return true;
							}
						}
						break;
					case 2:
					case 3:
						var emptyCell1=this.canFindNextEmptyTile(tmpcell.x, tmpcell.y, 3);
						if (emptyCell1.x != -1) {
							if(canFindNextEmptyTile(emptyCell.x, emptyCell.y, 3)) {
								this.addRandomTileHelper(0.9);
								return true;
							}
						}
					default:
						break;
				}
			}
		}
	}
	return false;
};
GameManager.prototype.canFindNextEmptyTile = function(x,y, director) {
	return this.FindNextEmptyTile(x,y,director).x !== -1;
}

// 0 for up, 1 for right, 2 for down, 3 for left
GameManager.prototype.FindNextEmptyTile = function(x,y, director) {
var iterStep = 1;
	if (director == 0 || director == 3) {
		iterStep = -1;
	}
	var iterKey = x;
	if (director == 0||director == 2) {
		iterKey = y;
	}
	for (var k = iterKey+iterStep; k >= 0 && k < this.size; k+=iterStep) {
		if(director == 2||director == 3) {
			if (!this.grid.cells[x][k]) {
				return {x:x,y:k};
			}
		} else {
			if (!this.grid.cells[k][y]) {
				return {x:k,y:y};
			}
		}
	}
	return {x:-1,y:-1};
}

GameManager.prototype.addRandomTileHelper = function (rate, t) {
  		var value = Math.random() < rate ? 2 : 4;
  		var tile;
  		var type = 0;
  		if (t) {
  			type = t;
  		}
  		switch(type) {
  			case 1:
  				tile = new Tile(this.grid.availableMaxSpaceCell(), value);
  				break;
  			default:
  				tile = new Tile(this.grid.randomAvailableCell(), value);
  				break;
  		}
		this.grid.insertTile(tile);
}

// Sends the updated grid to the actuator
GameManager.prototype.actuate = function () {
  if (this.storageManager.getBestScore() < this.score) {
    this.storageManager.setBestScore(this.score);
  }

  // Clear the state when the game is over (game over only, not win)
  if (this.over) {
    this.storageManager.clearGameState();
  } else {
    this.storageManager.setGameState(this.serialize());
  }

  this.actuator.actuate(this.grid, {
    score:      this.score,
    over:       this.over,
    won:        this.won,
    bestScore:  this.storageManager.getBestScore(),
    terminated: this.isGameTerminated()
  });

};

// Represent the current game as an object
GameManager.prototype.serialize = function () {
  return {
    grid:        this.grid.serialize(),
    score:       this.score,
    over:        this.over,
    won:         this.won,
    keepPlaying: this.keepPlaying
  };
};

// Save all tile positions and remove merger info
GameManager.prototype.prepareTiles = function () {
  this.grid.eachCell(function (x, y, tile) {
    if (tile) {
      tile.mergedFrom = null;
      tile.savePosition();
    }
  });
};

// Move a tile and its representation
GameManager.prototype.moveTile = function (tile, cell) {
  this.grid.cells[tile.x][tile.y] = null;
  this.grid.cells[cell.x][cell.y] = tile;
  tile.updatePosition(cell);
};

// Move tiles on the grid in the specified direction
GameManager.prototype.move = function (direction) {
  // 0: up, 1: right, 2: down, 3: left
  var self = this;

  if (this.isGameTerminated()) return; // Don't do anything if the game's over
  if (this.grid.maxCellMove(direction)) {
    if(!mes) {
      return;
    }
  }
  var cell, tile;

  var vector     = this.getVector(direction);
  var traversals = this.buildTraversals(vector);
  var moved      = false;

  // Save the current tile positions and remove merger information
  this.prepareTiles();

  // Traverse the grid in the right direction and move tiles
  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      cell = { x: x, y: y };
      tile = self.grid.cellContent(cell);

      if (tile) {
        var positions = self.findFarthestPosition(cell, vector);
        var next      = self.grid.cellContent(positions.next);

        // Only one merger per row traversal?
        if (next && next.value === tile.value && !next.mergedFrom) {
          var merged = new Tile(positions.next, tile.value * 2);
          merged.mergedFrom = [tile, next];

          self.grid.insertTile(merged);
          self.grid.removeTile(tile);

          // Converge the two tiles' positions
          tile.updatePosition(positions.next);

          // Update the score
          self.score += merged.value;

          // The mighty 4096 tile
          if (merged.value === 4096) self.won = true;
        } else {
          self.moveTile(tile, positions.farthest);
        }

        if (!self.positionsEqual(cell, tile)) {
          moved = true; // The tile moved from its original cell!
        }
      }
    });
  });

  if (moved) {
    this.addRandomTile();

    if (!this.movesAvailable()) {
      this.over = true; // Game over!
    }

    this.actuate();
  }
};

// Get the vector representing the chosen direction
GameManager.prototype.getVector = function (direction) {
  // Vectors representing tile movement
  var map = {
    0: { x: 0,  y: -1 }, // Up
    1: { x: 1,  y: 0 },  // Right
    2: { x: 0,  y: 1 },  // Down
    3: { x: -1, y: 0 }   // Left
  };

  return map[direction];
};

// Build a list of positions to traverse in the right order
GameManager.prototype.buildTraversals = function (vector) {
  var traversals = { x: [], y: [] };

  for (var pos = 0; pos < this.size; pos++) {
    traversals.x.push(pos);
    traversals.y.push(pos);
  }

  // Always traverse from the farthest cell in the chosen direction
  if (vector.x === 1) traversals.x = traversals.x.reverse();
  if (vector.y === 1) traversals.y = traversals.y.reverse();

  return traversals;
};

GameManager.prototype.findFarthestPosition = function (cell, vector) {
  var previous;

  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (this.grid.withinBounds(cell) &&
           this.grid.cellAvailable(cell));

  return {
    farthest: previous,
    next: cell // Used to check if a merge is required
  };
};

GameManager.prototype.movesAvailable = function () {
  return this.grid.cellsAvailable() || this.tileMatchesAvailable();
};

// Check for available matches between tiles (more expensive check)
GameManager.prototype.tileMatchesAvailable = function () {
  var self = this;

  var tile;

  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      tile = this.grid.cellContent({ x: x, y: y });

      if (tile) {
        for (var direction = 0; direction < 4; direction++) {
          var vector = self.getVector(direction);
          var cell   = { x: x + vector.x, y: y + vector.y };

          var other  = self.grid.cellContent(cell);

          if (other && other.value === tile.value) {
            return true; // These two tiles can be merged
          }
        }
      }
    }
  }

  return false;
};

GameManager.prototype.positionsEqual = function (first, second) {
  return first.x === second.x && first.y === second.y;
};

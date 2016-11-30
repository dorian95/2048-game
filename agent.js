// helper functions
function randomInt(n) {
    return Math.floor(Math.random() * n);
};

function AgentBrain(gameEngine) {
    this.size = 4;
    this.previousState = gameEngine.grid.serialize();
    this.reset();
    this.score = 0;
};

AgentBrain.prototype.reset = function () {
    this.score = 0;
    this.grid = new Grid(this.previousState.size, this.previousState.cells);
};

// Adds a tile in a random position
AgentBrain.prototype.addRandomTile = function () {
    if (this.grid.cellsAvailable()) {
        var value = Math.random() < 0.9 ? 2 : 4;
        var tile = new Tile(this.grid.randomAvailableCell(), value);

        this.grid.insertTile(tile);
    }
};

AgentBrain.prototype.moveTile = function (tile, cell) {
    this.grid.cells[tile.x][tile.y] = null;
    this.grid.cells[cell.x][cell.y] = tile;
    tile.updatePosition(cell);
};

// Move tiles on the grid in the specified direction
AgentBrain.prototype.move = function (direction) {
    // 0: up, 1: right, 2: down, 3: left
    var self = this;

    var cell, tile;

    var vector = this.getVector(direction);
    var traversals = this.buildTraversals(vector);
    var moved = false;

    //console.log(vector);

    //console.log(traversals);

    // Traverse the grid in the right direction and move tiles
    traversals.x.forEach(function (x) {
        traversals.y.forEach(function (y) {
            cell = { x: x, y: y };
            tile = self.grid.cellContent(cell);

            if (tile) {
                var positions = self.findFarthestPosition(cell, vector);
                var next = self.grid.cellContent(positions.next);

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

                } else {
                    self.moveTile(tile, positions.farthest);
                }

                if (!self.positionsEqual(cell, tile)) {
                    moved = true; // The tile moved from its original cell!
                }
            }
        });
    });
    //console.log(moved);
    //if (moved) {
      //  this.addRandomTile();
    //}
    return moved;
};

// Get the vector representing the chosen direction
AgentBrain.prototype.getVector = function (direction) {
    // Vectors representing tile movement
    var map = {
        0: { x: 0, y: -1 }, // Up
        1: { x: 1, y: 0 },  // Right
        2: { x: 0, y: 1 },  // Down
        3: { x: -1, y: 0 }   // Left
    };

    return map[direction];
};

// Build a list of positions to traverse in the right order
AgentBrain.prototype.buildTraversals = function (vector) {
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

AgentBrain.prototype.findFarthestPosition = function (cell, vector) {
    var previous;

    // Progress towards the vector direction until an obstacle is found
    do {
        previous = cell;
        cell = { x: previous.x + vector.x, y: previous.y + vector.y };
    } while (this.grid.withinBounds(cell) &&
             this.grid.cellAvailable(cell));

    return {
        farthest: previous,
        next: cell // Used to check if a merge is required
    };
};

AgentBrain.prototype.positionsEqual = function (first, second) {
    return first.x === second.x && first.y === second.y;
};

function Agent() {
};

Agent.prototype.selectMove = function (gameManager) {
    var brain = new AgentBrain(gameManager);

    // Use the brain to simulate moves
    // brain.move(i)
    // i = 0: up, 1: right, 2: down, 3: left
    // brain.reset() resets the brain to the current game board

    // Teacher's code
    // if (brain.move(0)) return 0;
    // if (brain.move(1)) return 1;
    // if (brain.move(3)) return 3;
    // if (brain.move(2)) return 2;
    // ----------------------------

    // 0 = left, 1 = down, 2 = right,
    var moves = 4;
    var depth = 4;
    var expectedValues = [];
    var moved = false;
    for (var i = 0; i < moves; i++) {
        moved = brain.move(i);

        if (moved) {
            expectedValues.push(this.expectiMiniMax(brain, depth - 1, false));
            brain.reset();
        }
        else {
            expectedValues.push(-1111111111);
        }
    }

    return findIndexOfMaxValue(expectedValues);
};

Agent.prototype.expectiMiniMax = function(brain, depth, isPlayer) {
    if (depth == 0 || !brain.grid.cellsAvailable()) {
        //return brain.score;
        return this.evaluateGrid(brain.grid);
    }

    var previousScore = brain.score;
    var previousState = brain.grid.serialize();

    if (isPlayer) {
        var maxValue = -1111111111;
        var moved = false;

        for (var i = 0; i < 4; i++) {
            moved = brain.move(i);

            if (moved) {
                var value = this.expectiMiniMax(brain, depth - 1, !isPlayer);
               // console.log(value);
                maxValue = Math.max(value, maxValue);
                brain.grid = new Grid(previousState.size, previousState.cells);
                brain.score = previousScore;
            }
        }

        return maxValue;
    } else {
        var expectedValue = 0;
        var cells = brain.grid.availableCells();
        var size = cells.length;

        for (var i = 0; i < size; i++) {
            brain.grid.insertTile(new Tile(cells[i], 2));
            expectedValue += (1.0 / (size)) * 0.9 * this.expectiMiniMax(brain, depth - 1, !isPlayer);
            brain.grid = new Grid(previousState.size, previousState.cells);
            brain.score = previousScore;
        }

        return expectedValue;
    }

};

Agent.prototype.evaluateGrid = function (gameBoard) {
    // calculate a score for the current grid configuration

    //NURSULTAN
    var cells = gameBoard.cells;
    var tileCount = 0;
    var rowTiles = [];
    var colTiles = [];
    var maxTileValue = 0;
    var monotonicity = 0;
    var cell = null;
    var weightMatrix = [
       [0.135759, 0.121925, 0.102812, 0.099937],
       [0.0997992, 0.0888405, 0.076711, 0.0724143],
       [0.060654, 0.0562579, 0.037116, 0.0161889],
       [0.0125498, 0.00992495, 0.00575871, 0.00335193]
    ];

    var valueMatrix = [
        [0, 0, 0, 0], 
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ];
    var totalScore = 0;

    for (var row = 0; row < 4; row++) {
        cell = cells[row][col];
        for (var col = 0; col < 4; col++) {
            if (cell == null) {
                //  cell.value = 0;
                valueMatrix[row][col] = 0 * weightMatrix[row][col];
                totalScore += valueMatrix[row][col];
            }
            else {
    
                //tileCount++;
                //rowTiles.push(cell.value);

            valueMatrix[row][col] =  cell.value * weightMatrix[row][col];
            totalScore += valueMatrix[row][col];
            //  if (cell.value > maxTileValue) {
            //    maxTileValue = cell.value;
            //  maxX = cell.x;
            //maxY = cell.y;
            //}

            }
        }
    }
    return totalScore;
};

// HELPER METHODS

function weightMatrix() {
    var weightMatrix = [
        [0.135759, 0.121925, 0.102812, 0.099937],
        [0.0997992, 0.0888405, 0.076711, 0.0724143],
        [0.060654, 0.0562579, 0.037116, 0.0161889],
        [0.0125498, 0.00992495, 0.00575871, 0.00335193]
    ];

}
function findTiles(gameBoard) {

    var cells = gameBoard.cells;
    var tileCount = 0;
    var rowTiles = [];
    var colTiles = [];
    var maxTileValue = 0;
    var monotonicity = 0;

    for (var row = 0; row < 4; row++) {
        cell = cells[row][col];
        for (var col = 0; col < 3; col++ ) {
                if (cell != null) {
                   tileCount++;
                   rowTiles.push(cell.value);

                    if (cell.value > maxTileValue) {
                        maxTileValue = cell.value;
                        maxX = cell.x;
                        maxY = cell.y;
                    }
                }
            }
    }

    for (var col = 0; col < 4; col++) {

        for (var row = 0; row < 4; row++) {
            cell = cells[row][col];

            if (cell != null) {
                colTiles.push(cell.value);
            }
        }
    }

}


function rowMonotonicity(gameBoard) {

    //var cells = gameBoard.cells;
    var cell = null;
    var rowMonotonicity = 0;
    var neighbor = null;
    for (var row = 0; row < 4; row++) {
        cell = cells[row][col];
        neighbor = cells[row + 1][col];
        for (var col = 0; col < 3; col++ ) {
            if (cell != null && neighbor != null) {
                if (cell[row][col] <= cell[row][col + 1]) {
                    rowMonotonicity++;
                }
            }
        }
    }
    return rowMonotonicity;
}

function colMonotonicity(gameBoard) {

   // var cells = gameBoard.cells;
    var cell = null;
    var rowTile = null;
    var colMonotonicity = 0;

    for (var col = 0; col < 4; col++) {
        cell = cells[row][col];
        for (var row = 0; row < 3; row++) {
            if (cell != null) {

                rowTile = cell;
                if (cell[row][col] <= cell[row + 1][col]) {
                    colMonotonicity++;
                }
            }
            
        }
    }

    return colMonotonicity;
}
function findIndexOfMaxValue(array) {
    var maxValue = array[0];
    var index = 0;

    for (var i = 1; i < array.length; i++) {
        if (maxValue < array[i]) {
            maxValue = array[i];
            index = i;
        }
    }

    return index;
}

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
    // if (moved) {
    //     this.addRandomTile();
    // }
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


    // this.evaluateGrid(brain.grid);

    // 0: left, 1: down, 2: right, 3: top

    var depth = 5;      // search depth boundary
    var expectedValues = [];

    console.log("ORIGINAL GRID")
    printGrid(brain.grid);

    for (var i = 0; i < 4; i++) {
        var moved = brain.move(i);

        // console.log("- - - - - - - - -");
        // console.log("moved:" + moves[i]);
        // printGrid(brain.grid);

        if (moved) {
            expectedValues.push(this.expectiMiniMax(brain, depth - 1, false));
            brain.reset();
        }
        else {
            expectedValues.push(Number.MIN_VALUE);
        }
        // console.log("score: " + expectedValues[i]);
    }

    var index = findIndexOfMaxValue(expectedValues);
    console.log("scores: " + expectedValues[0] + ", " + expectedValues[1] + ", " + expectedValues[2] + ", " + expectedValues[3]);
    console.log("best move: " + moves[index]);
    console.log("= = = = = = = = = = = = = = = = = = = = = = = = = = = = = =");
    return index;
};

var moves = ["TOP", "RIGHT", "DOWN", "LEFT"];

Agent.prototype.expectiMiniMax = function(brain, depth, PLAYER) {
    if (depth == 0 || !brain.grid.cellsAvailable()) {
        return this.evaluateGrid(brain.grid);
    }

    var previousScore = brain.score;
    var previousState = brain.grid.serialize();

    // Max Node. Player chooses a move out of 4 possible moves.
    if (PLAYER) {
        var maxValue    = Number.MIN_VALUE;
        var moved       = false;

        for (var i = 0; i < 4; i++) {
            moved = brain.move(i);

            if (moved) {
                var value = this.expectiMiniMax(brain, depth - 1, !PLAYER);
                maxValue = Math.max(value, maxValue);
                brain.grid = new Grid(previousState.size, previousState.cells);
                brain.score = previousScore;
            }
        }

        return maxValue;

    // Chance Node. Board inserts random tile.
    } else {
        var expectedValue = 0;
        var cells   = brain.grid.availableCells();
        var size    = cells.length;

        for (var i = 0; i < size; i++) {
            brain.grid.insertTile(new Tile(cells[i], 2));
            expectedValue += (1.0 / size) * 0.9 * this.expectiMiniMax(brain, depth - 1, !PLAYER);
            brain.grid = new Grid(previousState.size, previousState.cells);
            brain.score = previousScore;
        }

        for (var i = 0; i < size; i++) {
            brain.grid.insertTile(new Tile(cells[i], 4));
            expectedValue += (1.0 / size) * 0.1 * this.expectiMiniMax(brain, depth - 1, !PLAYER);
            brain.grid = new Grid(previousState.size, previousState.cells);
            brain.score = previousScore;
        }

        return expectedValue;
    }

};

Agent.prototype.evaluateGrid = function (gameBoard) {
    // calculate a score for the current grid configuration

    var cells   = gameBoard.cells;  // copy of the board cells
    var score1  = 0,
        score2  = 0,
        score3  = 0,
        score4  = 0;

    // matrix with weights to calculate score
    // var weigthhMatrix = [
    //     [100, 50, 25, 0],
    //     [50, 25, 0, -25],
    //     [25, 0, -25,-50],
    //     [0,-25,-50,-100]
    // ];

    var weigthhMatrix1 = [
        [32768, 256, 128, 1],
        [16384, 512,  64, 2],
        [8192, 1024,  32, 4],
        [4096, 2048,  16, 8]
    ];

    var weigthhMatrix2 = [
        [4096, 8192, 16384, 32768],
        [2048, 1024,   512,   256],
        [  16,   32,    64,   128],
        [   8,    4,     2,     1]
    ];

    var weigthhMatrix3 = [
        [8, 16, 2048,  4096],
        [4, 32, 1024,  8192],
        [2, 64,  512, 16384],
        [1, 128, 256, 32768]
    ];

    var weigthhMatrix4 = [
        [    1,     2,     4,    8],
        [  128,    64,    32,   16],
        [  256,   512,  1024, 2048],
        [32768, 16384,  8192, 4096]
    ];

    // var weigthhMatrix1 = [
    //     [4096, 32, 16, -8],
    //     [2048, 64,  8, -4],
    //     [1024,128,  4, -2],
    //     [512, 256,  2,  0]
    // ];
    //
    // var weigthhMatrix2 = [
    //     [512, 1024, 2048, 4096],
    //     [256,  128,   64,   32],
    //     [  2,    4,    8,   16],
    //     [  0,   -2,   -4,   -8]
    // ];
    //
    // var weigthhMatrix3 = [
    //     [ 0,  2,  256,  512],
    //     [-2,  4,  128, 1024],
    //     [-4,  8,   64, 2048],
    //     [-8, 16,   32, 4096]
    // ];
    //
    // var weigthhMatrix4 = [
    //     [  -8,   -4,   -2,   0],
    //     [  16,    8,    4,   2],
    //     [  32,   64,  128, 256],
    //     [4096, 2048, 1024, 512]
    // ];


    // score calculated based on weight matrix 1
    for (var row = 0; row < 4; row++) {
        for (var col = 0; col < 4; col++) {
            var tileValue = (cells[row][col] != null) ? cells[row][col].value : 0;
            score1 += tileValue * weigthhMatrix1[row][col];
        }
    }

    for (var row = 0; row < 4; row++) {
        for (var col = 0; col < 4; col++) {
            var tileValue = (cells[row][col] != null) ? cells[row][col].value : 0;
            score2 += tileValue * weigthhMatrix2[row][col];
        }
    }

    for (var row = 0; row < 4; row++) {
        for (var col = 0; col < 4; col++) {
            var tileValue = (cells[row][col] != null) ? cells[row][col].value : 0;
            score3 += tileValue * weigthhMatrix3[row][col];
        }
    }

    for (var row = 0; row < 4; row++) {
        for (var col = 0; col < 4; col++) {
            var tileValue = (cells[row][col] != null) ? cells[row][col].value : 0;
            score4 += tileValue * weigthhMatrix4[row][col];
        }
    }

    var s1 = Math.max(score1, score2);
    var s2 = Math.max(score3, score4);
    return Math.max(s1, s2);

};


// HELPER METHODS
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

printGrid = function(grid) {
    // console.log("printing grid");
    var g = "";
    for (var row = 0; row < grid.size; row++) {
        for (var col = 0; col < grid.size; col++) {
            if (grid.cells[col][row] === null)
                g += "0 ";
            else
                g += grid.cells[col][row].value + " ";
        }
        g += "\n";
    }

    console.log(g);
}

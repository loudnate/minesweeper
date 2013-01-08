goog.provide('minesweeper.Board');
goog.provide('minesweeper.Game');
goog.provide('minesweeper.MineBoard');
goog.provide('minesweeper.Tile');
goog.provide('minesweeper.UserBoard');



/**
 * @constructor
 * @param {number} mines The number of mines for the board.
 * @param {number} size The number of rows and columns for the board.
 */
minesweeper.Game = function(mines, size) {
	this.mineBoard = new minesweeper.MineBoard(mines, size);
	this.userBoard = new minesweeper.UserBoard(size);
};


/**
 * Reveals a tile on the user board.
 * @param {number} row The row of the tile to choose.
 * @param {number} col The column of the tile to choose.
 * @return {Error} An error if the reveal resulted in a mine.
 */
minesweeper.Game.prototype.revealTile = function(row, col) {
	var userTile = this.userBoard.getTile(row, col);

	// Exit if the tile is already revealed.
	if (userTile != minesweeper.Tile.UNKNOWN &&
		userTile != minesweeper.Tile.FLAG) {
		return;
	}

	var mineTile = this.mineBoard.getTile(row, col);
	this.userBoard.setTile(row, col, mineTile);
	if (mineTile == minesweeper.Tile.MINE) {
		return new Error('mine revealed');
	}

	// Explore all boundary tiles if the tile is a 0.
	if (mineTile == 0) {
		this.mineBoard.forEachBoundaryTile(row, col, this.revealTile, this);
	}

	return null;
};


/**
 * Reveals all unknown, adjacent tiles on the user board, only if the the number
 * of adjacent flagged mines is greater or equal to the tile.
 * This is a "shortcut" play, originally triggered by a left + right click in
 * the Microsoft version.
 * @param {number} row The row of the tile to choose.
 * @param {number} col The column of the tile to choose.
 * @return {Error} An error if any of the tiles revealed resulted in a mine.
 */
minesweeper.Game.prototype.revealUnknownAdjacent = function(row, col) {
	// Exit if the tile hasn't been revealed.
	var tile = this.userBoard.getTile(row, col);
	if (tile < 0) {
		return null;
	}

	// Exit if the user hasn't set enough flags.
	var adjacentFlags = 0;
	this.userBoard.forEachBoundaryTile(row, col, function(r, c, tile) {
		if (tile == minesweeper.Tile.FLAG) {
			adjacentFlags++;
		}
	}, this);
	if (tile > adjacentFlags) {
		return null;
	}

	var success = this.userBoard.forEachBoundaryTile(
			row, col, function(r, c, userTile) {
		if (userTile == minesweeper.Tile.UNKNOWN) {
			return (this.revealTile(r, c) == null);
		}
	}, this);

	if (success) {
		return null;
	}
	return new Error('adajcent mine revealed');
};


/**
 * Flags or un-flags a tile on the user board.
 * @param {number} row The row of the tile to choose.
 * @param {number} col The column of the tile to choose.
 */
minesweeper.Game.prototype.flagTile = function(row, col) {
	if (this.userBoard.getTile(row, col) == minesweeper.Tile.UNKNOWN) {
		this.userBoard.setTile(row, col, minesweeper.Tile.FLAG);
	} else if (this.userBoard.getTile(row, col) == minesweeper.Tile.FLAG) {
		this.userBoard.setTile(row, col, minesweeper.Tile.UNKNOWN);
	}
};


/**
 * @return {boolean} Whether the user board is completed correctly and all the
 *     mines are properly flagged.
 */
minesweeper.Game.prototype.validate = function() {
	if (this.userBoard.flagCount != this.mineBoard.mineCount) {
		return false;
	}

	return this.mineBoard.forEachTile(function(r, c, mineTile) {
		var userTile = this.userBoard.getTile(r, c);

		if (mineTile == minesweeper.Tile.MINE ||
			userTile == minesweeper.Tile.FLAG) {
			return mineTile == minesweeper.Tile.MINE &&
				   userTile == minesweeper.Tile.FLAG;
		}
	}, this);
};


/**
 * @return {string} The debug state of the user game.
 */
minesweeper.Game.prototype.toString = function() {
	return this.userBoard.toString();
};


/**
 * @return {string} The debug state of the mines.
 */
minesweeper.Game.prototype.cheat = function() {
	return this.mineBoard.toString();
};


/**
 * Cleanup.
 */
minesweeper.Game.prototype.dispose = function() {
	this.mineBoard.dispose();
	this.userBoard.dispose();

	this.mineBoard = null;
	this.userBoard = null;
};


/**
 * Special game tiles.
 * @enum {number}
 */
minesweeper.Tile = {
	MINE: -1,
	UNKNOWN: -2,
	FLAG: -3
};



/**
 * Creates a new game board.
 * @constructor
 * @param {number} rows The number of rows for the board.
 * @param {number=} opt_cols The number of columns for the board. Defaults to
 *     the number of rows if not specified.
 */
minesweeper.Board = function(rows, opt_cols) {
	this.rowCount = rows;
	this.colCount = opt_cols || rows;

	/**
	 * Contains the board solution, containing mines and mine-edge counts.
	 * @type {Array.<number>}
	 * @private
	 */
	this.data_ = [];
};


/**
 * @type {number}
 */
minesweeper.Board.prototype.rowCount = NaN;


/**
 * @type {number}
 */
minesweeper.Board.prototype.colCount = NaN;


/**
 * Returns the index in a single-dimension data array given a row and column
 * number. Does not check if the row and column are in-bounds.
 * @param  {number} row.
 * @param  {number} col.
 * @return {number} The index.
 * @private
 */
minesweeper.Board.prototype.getIndex_ = function(row, col) {
	return row * this.colCount + col;
};


/**
 * Sets a tile on the board.
 * @param {number} row The row to set.
 * @param {number} col The column to set.
 * @param {number} tile The tile value to set.
 */
minesweeper.Board.prototype.setTile = function(row, col, tile) {
	this.data_[this.getIndex_(row, col)] = tile;
};


/**
 * Gets a tile on the board.
 * @param {number} row The row to set.
 * @param {number} col The column to set.
 * @return {number} The tile value.
 */
minesweeper.Board.prototype.getTile = function(row, col) {
	return this.data_[this.getIndex_(row, col)];
};


/**
 * Executes a method for each tile on the board.
 * @param {function(number, number, number):boolean} callback The method to
 *     execute for each tile with the row, column, and tile as the first three
 *     parameters.
 *     If the callback returns false at any time, iteration will end.
 * @param {*=} opt_scope The scope in which to execute the callback method.
 *     Defaults to the board instance.
 * @return {boolean} False if any of the callback executions returned false,
 *     True otherwise.
 */
minesweeper.Board.prototype.forEachTile = function(callback, opt_scope) {
	var scope = opt_scope || this;

	for (var r = 0; r < this.rowCount; r++) {
		for (var c = 0; c < this.colCount; c++) {
			var ret = callback.call(scope, r, c, this.getTile(r, c));
			if (ret === false) {
				return false;
			}
		}
	}

	return true;
};


/**
 * Executes a method for each boundary tile for a given tile, handling boundary
 * conditions when necessary.
 * @param {number} row The center tile row.
 * @param {number} col The center tile column.
 * @param {function(number, number, number):boolean} callback The method to
 *     execute for each boundary tile with the row, column, and tile as the
 *     first three parameters.
 *     If the callback returns false at any time, iteration will end.
 * @param {*=} opt_scope The scope in which to execute the callback method.
 *     Defaults to the board instance.
 * @return {boolean} False if any of the callback executions returned false,
 *     True otherwise.
 */
minesweeper.Board.prototype.forEachBoundaryTile =
		function(row, col, callback, opt_scope) {
	// Calculate the boundary indices, taking into account the board edges.
	var minRow = Math.max(row - 1, 0);
	var maxRow = Math.min(row + 2, this.rowCount);
	var minCol = Math.max(col - 1, 0);
	var maxCol = Math.min(col + 2, this.colCount);

	var scope = opt_scope || this;

	for (var r = minRow; r < maxRow; r++) {
		for (var c = minCol; c < maxCol; c++) {
			// Exclude the center cell.
			if (r != row || c != col) {
				var ret = callback.call(scope, r, c, this.getTile(r, c));
				if (ret === false) {
					return false;
				}
			}
		}
	}

	return true;
};


/**
 * Shuffles the tiles in the board data using the Fisher-Yates algorithm.
 * @see http://sedition.com/perl/javascript-fy.html
 * @protected
 */
minesweeper.Board.prototype.shuffle = function() {
	var i = this.data_.length;
	if (i == 0) return false;
	while (--i) {
		var j = Math.floor(Math.random() * (i + 1));
		var tempi = this.data_[i];
		var tempj = this.data_[j];
		this.data_[i] = tempj;
		this.data_[j] = tempi;
	}
};


/**
 * @return {string} A string representation of the board.
 */
minesweeper.Board.prototype.toString = function() {
	/** @type {!Array.<string>} */
	var lineBuf = [];

	var horizontalEdge = '';
	for (var i = 0; i < this.colCount * 4 + 1; i++) {
		horizontalEdge += '-';
	}

	// Topmost line.
	lineBuf.push(horizontalEdge);

	for (var r = 0; r < this.rowCount; r++) {
		var rowBuf = '|';
		for (var c = 0; c < this.colCount; c++) {
			rowBuf += ' ';
			var tile = this.getTile(r, c);
			switch (tile) {
				case minesweeper.Tile.MINE:
					rowBuf += 'M';
					break;
				case minesweeper.Tile.UNKNOWN:
					rowBuf += 'U';
					break;
				case minesweeper.Tile.FLAG:
					rowBuf += 'F';
					break;
				default:
					rowBuf += tile.toString();
			}
			rowBuf += ' |';
		}
		lineBuf.push(rowBuf);
		// Row bottom line.
		lineBuf.push(horizontalEdge);
	}
	return lineBuf.join('\n');
};


/**
 * Cleans up.
 */
minesweeper.Board.prototype.dispose = function() {
	this.data_ = null;
};



/**
 * Creates a new board containing mine positions.
 * @constructor
 * @extends {minesweeper.Board}
 * @param {number} mines The number of mines for the board.
 * @param {number} rows The number of rows for the board.
 * @param {number=} opt_cols The number of columns for the board. Defaults to
 *     the number of rows if not specified.
 */
minesweeper.MineBoard = function(mines, rows, opt_cols) {
	goog.base(this, rows, opt_cols);

	this.mineCount = mines;
	this.setMines_(mines);
};
goog.inherits(minesweeper.MineBoard, minesweeper.Board);


/**
 * Randomly distributes mines on the board, wiping it in the process.
 * @param {number} mineCount The number of mines to distribute.
 * @private
 */
minesweeper.MineBoard.prototype.setMines_ = function(mineCount) {
	// Initialize the mines at the beginning of the array, then shuffle.
	// We could instead set mines by picking an index randomly for each mine
	// and handle collisions, but this is cleaner as long as the game board size
	// is small. Since a user has to click on nearly every tile individually,
	// we can assume the board size will always be reasonably small.

	// Clear the board, with the first N tiles being the mines.
	this.forEachTile(function(r, c) {
		if (mineCount > 0) {
			mineCount--;
			this.setTile(r, c, minesweeper.Tile.MINE);
		} else {
			this.setTile(r, c, 0);
		}
	});

	// Shuffle the board to distribute the mines.
	this.shuffle();

	// Calculate the adjacent tile counts.
	this.forEachTile(function(r, c, tile) {
		if (tile == minesweeper.Tile.MINE) {
			this.incrementAdjacentTiles_(r, c);
		}
	});
};


/**
 * Increments all adjacent tile counts for a given tile.
 * @param {number} row The row of the target tile.
 * @param {number} col The column of the target tile.
 * @private
 */
minesweeper.MineBoard.prototype.incrementAdjacentTiles_ = function(row, col) {
	this.forEachBoundaryTile(row, col, function(r, c, tile) {
		// Apply the change as long the value doesn't indicate a special cell.
		if (tile >= 0) {
			this.setTile(r, c, tile + 1);
		}
	});
};



/**
 * Creates a new board to track a user's progress.
 * @constructor
 * @extends {minesweeper.Board}
 * @param {number} rows The number of rows for the board.
 * @param {number=} opt_cols The number of columns for the board. Defaults to
 *     the number of rows if not specified.
 */
minesweeper.UserBoard = function(rows, opt_cols) {
	goog.base(this, rows, opt_cols);

	this.initBoard_();
};
goog.inherits(minesweeper.UserBoard, minesweeper.Board);


/**
 * The number of flags set on the board.
 * @type {number}
 */
minesweeper.UserBoard.prototype.flagCount = 0;


/**
 * The number of unknown tiles on the board.
 * @type {number}
 */
minesweeper.UserBoard.prototype.unknownCount = 0;


/**
 * Initializes the board to contain all unknown tiles.
 * @private
 */
minesweeper.UserBoard.prototype.initBoard_ = function() {
	this.forEachTile(function(r, c) {
		this.setTile(r, c, minesweeper.Tile.UNKNOWN);
	});
};


/**
 * @return {boolean} True if all the tiles have been marked or revealed.
 */
minesweeper.UserBoard.prototype.completed = function() {
	return (this.unknownCount == 0);
};


/**
 * @override
 */
minesweeper.UserBoard.prototype.setTile = function(row, col, tile) {
	if (this.getTile(row, col) == minesweeper.Tile.FLAG) {
		this.flagCount--;
	} else if (this.getTile(row, col) == minesweeper.Tile.UNKNOWN) {
		this.unknownCount--;
	}

	goog.base(this, 'setTile', row, col, tile);

	if (this.getTile(row, col) == minesweeper.Tile.FLAG) {
		this.flagCount++;
	} else if (this.getTile(row, col) == minesweeper.Tile.UNKNOWN) {
		this.unknownCount++;
	}
};

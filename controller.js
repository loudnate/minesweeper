// goog.provide('minesweeper.GameController');

var minesweeper = minesweeper || {};

minesweeper.GameController = class {
    /**
     * The Minesweeper view controller.
     * @constructor
     */
    constructor() {
        this.rootView_ = $('.root');
        this.boardView_ = $('.board');

        this.loadConfig_();
        this.prerender_();
        this.bindConfig_();
        this.startGame();

        this.boardView_.on('click contextmenu', '.board-col', this, this.handleBoardClick_);
    }

    /**
     * The size of the board dimensions.
     * @type {number}
     * @private
     */
    boardSize_ = 8;

    /**
     * The number of mines on the board.
     * @type {number}
     * @private
     */
    mineCount_ = 10;

    /**
     * Pre-renders the game board templates.
     * @private
     */
    prerender_() {
        this.rowTemplate_ = Handlebars.compile($('#template-row').html());
        this.colTemplate_ = Handlebars.compile($('#template-col').html());
    }

    /**
     * Reads stored configuration from localStorage.
     * @private
     */
    loadConfig_() {
        if (localStorage['boardSize_']) {
            this.boardSize_ = localStorage['boardSize_'];
        }

        if (localStorage['mineCount_']) {
            this.mineCount_ = localStorage['mineCount_'];
        }
    }

    /**
     * Binds handlers to the configuration elements.
     * @private
     */
    bindConfig_() {
        var configView = $('.config');

        /**
         * @type {boolean} True if the tool is in flag mode.
         * @private
         */
        this.flagToolActive_ = false;
        configView.find('.flag').on('click', this, function(evt) {
            evt.data.flagToolActive_ = !$(evt.currentTarget).hasClass('active');
        });

        /**
         * @type {boolean} True if the cheat mode is active.
         * @private
         */
        this.cheatMode_ = false;
        configView.find('.cheat').on('click', this, function(evt) {
            evt.data.cheatMode_ = !$(evt.currentTarget).hasClass('active');
            evt.data.updateBoard_(evt.data.game_.userBoard);
        });

        configView.find('.end').on('click', this, function(evt) {
            if (evt.data.game_.validate()) {
                evt.data.success_();
            } else {
                evt.data.failure_();
            }
        });

        configView.find('.newgame').on('click', 'button', this, function(evt) {
            var button = $(evt.currentTarget);
            if (button.data('size') && button.data('mines')) {
                evt.data.boardSize_ = localStorage['boardSize_'] = button.data('size');
                evt.data.mineCount_ = localStorage['mineCount_'] = button.data('mines');
                evt.data.startGame();
            } else {
                console.log('custom game');
            }
        });
    }

    /**
     * Initiates a new game.
     */
    startGame() {
        this.game_ =
            new minesweeper.Game(this.mineCount_, this.boardSize_);
        this.renderBoard_();
        this.updateBoard_(this.game_.userBoard);
    }

    /**
     * Renders the game board.
     * @private
     */
    renderBoard_() {
        var boardHtml = '';

        for (var r = 0; r < this.boardSize_; r++) {
            var rowHtml = '';
            for (var c = 0; c < this.boardSize_; c++) {
                rowHtml += this.colTemplate_({
                    row: r,
                    col: c
                });
            };
            boardHtml += this.rowTemplate_({
                cols: rowHtml
            });
        };

        this.rootView_.removeClass('fail cheat win');
        this.boardView_.removeClass('small medium');

        if (this.boardSize_ > 16) {
              this.boardView_.addClass('small');
        } else if (this.boardSize_ > 8) {
            this.boardView_.addClass('medium');
        }

        this.boardView_.html(boardHtml);
    }

    /**
     * Gets the view for a given tile index.
     * @param {number} row The row to get.
     * @param {number} col The column to get.
     * @return {Element} The tile view element.
     * @private
     */
    getTile_(row, col) {
        return this.boardView_.get(0).children[row].children[col];
    }

    /**
     * @param {minesweeper.Tile} tile The tile type.
     * @return {string} The corresponding CSS class.
     * @private
     */
    getDisplayClass_(tile) {
        var className = ' reveal tile';
        switch (tile) {
            case minesweeper.Tile.UNKNOWN:
                className = '';
                break;
            case minesweeper.Tile.MINE:
                className += 'M';
                break;
            case minesweeper.Tile.FLAG:
                className = ' flag';
                break;
            default:
                className += tile.toString();
        }
        return className;
    }

    /**
     * Sets the tile display on the board.
     * @param {number} row The row to set.
     * @param {number} col The column to set.
     * @param {minesweeper.Tile} tile The tile type to display.
     * @private
     */
    setTile_(row, col, tile) {
        // Replaces the entire className so to not get caught between add/remove
        // states during a draw cycle.
        var className = 'board-col' + this.getDisplayClass_(tile);

        if (tile > 0) {
            this.getTile_(row, col).querySelector('.mine').innerText = tile;
        } else if (this.cheatMode_) {
            if (this.game_.mineBoard.getTile(row, col) == minesweeper.Tile.MINE) {
                className += ' mine-hint';
            }
        }
        this.getTile_(row, col).className = className;
    }

    /**
     * Updates the board state from the current game model.
     * @param {minesweeper.Board} board The board to render.
     * @private
     */
    updateBoard_(board) {
        board.forEachTile(this.setTile_, this);
    }

    /**
     * Handles a click on the board.
     * @param {jQuery.Event} evt The event object.
     * @this {window} jQuery doesn't provide Function binding.
     * @private
     */
    handleBoardClick_(evt) {
        evt.preventDefault();
        if (!evt.data.game_) { return; }

        // Both click and contextmenu events fire on mac when the control key
        // is pressed. Ignore the click event.
        if (evt.ctrlKey && evt.type == 'click') {
            return;
        }

        var target = $(evt.currentTarget);
        var row = target.data('row');
        var col = target.data('col');
        var err = null;
        var secondaryClick = evt.ctrlKey || evt.which == 3;
        var flagTool = evt.data.flagToolActive_ ^ secondaryClick;
        var userTile = evt.data.game_.userBoard.getTile(row, col);

        // The "shortcut move" is a secondary click on a revealed tile.
        if (secondaryClick && userTile >= 0) {
            err = evt.data.game_.revealUnknownAdjacent(row, col);
        } else if (flagTool) {
            evt.data.game_.flagTile(row, col);
        } else {
            err = evt.data.game_.revealTile(row, col);
        }

        if (err) {
            evt.data.failure_();
        } else if (evt.data.game_.userBoard.completed()) {
            evt.data.game_.validate() ? evt.data.success_() : evt.data.failure_();
        } else {
            evt.data.updateBoard_(evt.data.game_.userBoard);
        }
    }

    /**
     * Handles the game ending in success.
     * @private
     */
    success_() {
        this.updateBoard_(this.game_.mineBoard);
        this.game_ = null;

          this.rootView_.addClass('win');
    }

    /**
     * Handles the game ending in failure.
     * @private
     */
    failure_() {
        this.updateBoard_(this.game_.mineBoard);

        var rand = function(min, max){
            return Math.floor(Math.random() * (max - min + 1) + min);
        }

        // Explode!
        // TODO(nater): Clean this code up.
        this.rootView_.addClass('fail');
        this.game_.userBoard.forEachTile(function(r, c, tile) {
            // Don't animate the revealed tiles.
            if (tile < 0) {
                var trans = 'translate3d(' + rand(-500, 500) + 'px,' +
                            rand(-500, 500) + 'px,' + rand(275, 500) + 'px) ' +
                            'rotateX(' + rand(-720, 720) + 'deg) rotateY(' +
                            rand(-720, 720) + 'deg) rotateZ(' +
                            rand(-720, 720) + 'deg)';

                this.getTile_(r, c).querySelector('.cover').
                    style.webkitTransform = trans;
            }
        }, this);

        this.game_ = null;
    }
}

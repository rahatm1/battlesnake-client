var gameState = {
                board: [[]],
                food: [[]],
                game_id: "1",
                height: 35,
                width: 35,
                snakes: [
                {
                  taunt: "git gud",
                  name: "my-snake",
                  id: "A",
                  health_points: 100,
                  coords: [[]]
                }],
                turn: 0,
                you: "A"
            };
/**
 * A lightweight game wrapper
 *
 * @constructor
 */
function Game(canvas, options) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');

    this.score = 0;
    this.key = 'east';
    this.entities = [];

    this.options = {
        fps: 10
    };

    if (options) {
        for (var i in options) this.options[i] = options[i];
    }

    this.scale();
}

/**
 * Start the game loop
 * and initialize the keybindings
 */
Game.prototype.start = function () {
    // TODO: Add more snakes
    // this.keyBindings();
    this.gameLoop();
};

/**
 * Stop the game loop
 */
Game.prototype.stop = function() {
    this.pause = true;
};

/**
 * Scale the canvas element
 * in accordance with the correct ratio
 */
Game.prototype.scale = function () {
    this.ratio = innerWidth < innerHeight ? innerWidth : innerHeight;
    this.tile = Math.round(this.ratio / 20);
    this.grid = Math.round(this.ratio / this.tile);

    this.canvas.width = this.canvas.height = this.ratio;
};

/**
 * Adds an entity to the game
 *
 * @param {Function} entity
 */
Game.prototype.addEntity = function (entity) {
    this.entities.push(entity);
};

/**
 * Determines if an entity collides with another
 *
 * @param {Object} a
 * @param {Object} b
 */
Game.prototype.collide = function(a, b){
    return a.x === b.x && a.y === b.y;
};

/**
 * Tracks the pressed keys
 */
Game.prototype.keyBindings = function () {
    var that = this;

    // define some keys
    var keys = {
        a: 65,
        left: 37,
        d: 68,
        right: 39,
        w: 87,
        up: 38,
        s: 83,
        down: 40
    };

    /**
     * Attach keyboard arrows to snake direction
     */
    document.onkeydown = function (e) {
        switch ((e.which || e.keyCode) | 0) {
            case keys.a:
            case keys.left:
                if (that.key !== 'east') that.key = 'west';
                break;

            case keys.d:
            case keys.right:
                if (that.key !== 'west') that.key = 'east';
                break;

            case keys.w:
            case keys.up:
                if (that.key !== 'south') that.key = 'north';
                break;

            case keys.s:
            case keys.down:
                if (that.key !== 'north') that.key = 'south';
        }
    };
};

/**
 * The gameloop - and entity (update/draw) calls
 * Use of `setTimeout` instead of animationFrame
 * in order to keep it simple as possible
 */
Game.prototype.gameLoop = function () {
    if(this.pause) return;

    var self = this,
        ctx = this.context;

    // clear the view area
    ctx.fillStyle = "#123";

    // add some blur
    ctx.globalAlpha = 0.5;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // disable blur
    ctx.globalAlpha = 1;

    var i = this.entities.length;

    while(i--) {
        var entity = this.entities[i];
        if(entity.update) entity.update();
        if(entity.draw) entity.draw(ctx);
    }

    gameState.turn++;
    setTimeout(function(){
        $.ajax({
            type: "post",
            url: "http://localhost:5000/move",
            data: JSON.stringify(gameState),
            dataType: "json",
            contentType: "application/json"
        }).done(function(data) {
                console.log(data);
                self.key = data.move;
                self.gameLoop();
        });
    }, 1000 / this.options.fps);
};

/**
 * The whole snake things
 *
 * @constructor
 */
function Snake(game, food){
    var tile = game.tile;
    var grid = game.grid;
    var collide = game.collide;

    this.x = 4;
    this.y = 4;
    this.segments = [];
    gameState.snakes[0].coords[0] = [this.x, this.y];

    this.update = function() {
        gameState.snakes[0].health_points--;

        if(game.key === 'west') this.x--;
        if(game.key === 'east') this.x++;
        if(game.key === 'south') this.y--;
        if(game.key === 'north') this.y++;

        // boundaries
        if (this.x>tile || this.x < 0 || this.y > tile || this.y <0) game.stop();
        /**
         * check snake-food collision
         */
        if (game.collide(this, food)) {

            // randomize point position
            food.x = food.y = Math.round(Math.random() * tile);
            gameState.food =[[food.x, food.y]];
            gameState.snakes[0].health_points = 100;

        } else {
            // remove last segment if snake
            // didn't got a point in this turn
            if (this.segments.length) this.segments.pop();
        }

        // push next x and y to the beginning of segments
        this.segments.unshift({x:this.x, y:this.y});

        for (var i = 0; i < this.segments.length; i++) {
            gameState.snakes[0].coords[i] = [this.segments[i].x,
                                             this.segments[i].y];
        }

        /**
         * check collision with snake itself - skipping the head (`--i` instead of `i--`)
         */
        var j = this.segments.length;
        while (--j) {
            if(game.collide(this, this.segments[j])) {
                // break the loop and slice the worm in point of intersection
                // here's in reality gameover...
                game.stop();
            }
        }
    };

    this.draw = function(ctx) {
        // draw rectangle for each segment
        // head gets another color
        var i = this.segments.length;
        while (i--) {
            var segment = this.segments[i];
            ctx.fillStyle = !i ? '#0cf' : '#0ae';
            ctx.fillRect(
            segment.x * grid,
            segment.y * grid,
            grid, grid);
        }
    };
}

/**
 * The whole things to eat
 *
 * @constructor
 */
function Food(game){
    var grid = game.grid;

    this.x = Math.round(Math.random()*game.tile);
    this.y = Math.round(Math.random()*game.tile);
    gameState.food = [[this.x, this.y]];

    this.draw = function(ctx){
        ctx.fillStyle = "#f05";
        ctx.fillRect(this.x * grid, this.y * grid, grid, grid);
    };
}


window.onload = function() {
    var canvas = document.createElement("canvas");
    document.body.appendChild(canvas);

    var game = new Game(canvas);
    var food = new Food(game);
    var snake = new Snake(game, food);

    game.addEntity(food);
    game.addEntity(snake);

    gameState.height = gameState.width = game.tile;

    $.ajax({
        type: "post",
        url: "http://localhost:5000/start",
        data: JSON.stringify({game_id: 1}),
        dataType: "json",
        contentType: "application/json",
    }).done(function() {
        game.start();
    });
};

var gameState = {
                board: [[]],
                food: [[]],
                game_id: "1",
                height: 35,
                width: 35,
                snakes: [
                {
                  taunt: "",
                  name: "Red Snake",
                  id: 0,
                  health_points: 100,
                  coords: [[]]
                },
                {
                  taunt: "",
                  name: "Blue Snake",
                  id: 1,
                  health_points: 100,
                  coords: [[]]
                }
                ],
                turn: 0,
            };
/**
 * A lightweight game wrapper
 *
 * @constructor
 */
function Game(canvas, options) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.snakes = {};

    this.key = [];
    this.entities = [];

    this.options = {
        fps: 15
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
    alert("GAME OVER");
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
    var redSnake = $.extend({}, gameState);
    redSnake.you = 0;

    var blueSnake = $.extend({}, gameState);
    blueSnake.you = 1;

    Promise.delay(1000/this.options.fps).then(() => {
      return [
        $.ajax({
            type: "post",
            url: "http://localhost:5000/move",
            data: JSON.stringify(redSnake),
            dataType: "json",
            contentType: "application/json"
          }),
        $.ajax({
            type: "post",
            url: "http://localhost:5000/move",
            data: JSON.stringify(blueSnake),
            dataType: "json",
            contentType: "application/json"
          })];
        }).spread((move1, move2) => {
            console.log(move1);
            console.log(move2);
            self.key = [move1.move, move2.move];
            self.gameLoop();
        });
};

/**
 * The whole snake things
 *
 * @constructor
 */
function Snake(game, food, name, options){
    var tile = game.tile;
    var grid = game.grid;
    var collide = game.collide;

    this.x = Math.round(Math.random()*(tile-3));
    this.y = Math.round(Math.random()*(tile-3));

    this.snakeId = game.snakes[name];

    this.segments = [
      { x: this.x,   y: this.y },
      { x: this.x-1, y: this.y },
      { x: this.x-2, y: this.y }];
    gameState.snakes[this.snakeId].coords[0] = [this.x, this.y];
    gameState.snakes[this.snakeId].coords[1] = [this.x-1, this.y];
    gameState.snakes[this.snakeId].coords[2] = [this.x-2, this.y];

    this.update = function() {
        gameState.snakes[this.snakeId].health_points--;

        var key = game.key[this.snakeId];

        if(key === 'west') this.x--;
        if(key === 'east') this.x++;
        if(key === 'south') this.y--;
        if(key === 'north') this.y++;

        // boundaries
        if (this.x>tile || this.x < 0 || this.y > tile || this.y <0) game.stop();
        /**
         * check snake-food collision
         */
        if (game.collide(this, food)) {

            // randomize point position
            food.spawnFood(game);
            gameState.food =[[food.x, food.y]];
            gameState.snakes[this.snakeId].health_points = 100;

        } else {
            // remove last segment if snake
            // didn't got a point in this turn
            if (this.segments.length) this.segments.pop();
        }

        // push next x and y to the beginning of segments
        this.segments.unshift({x:this.x, y:this.y});

        for (var i = 0; i < this.segments.length; i++) {
            gameState.snakes[this.snakeId].coords[i] = [this.segments[i].x,
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
            ctx.fillStyle = !i ? options.headColor : options.bodyColor;
            ctx.fillRect(
            segment.x * grid,
            segment.y * grid,
            grid, grid);
        }
    };
}

function getRandomPoint(bound) {
  return Math.round(Math.random()*(bound-1));
}
/**
 * The whole things to eat
 *
 * @constructor
 */
function Food(game){
    var grid = game.grid;

    this.x = getRandomPoint(game.tile);
    this.y = getRandomPoint(game.tile);
    gameState.food = [[this.x, this.y]];

    this.draw = function(ctx){
        ctx.fillStyle = "#f05";
        ctx.fillRect(this.x * grid, this.y * grid, grid, grid);
    };

    this.spawnFood = function(game) {
      var self = this;
      var gameSnakes = game.entities.filter((e) => {
        return e.segments;
      });

      self.x = getRandomPoint(game.tile);
      self.y = getRandomPoint(game.tile);
      while (true) {
          var match = gameSnakes.filter((s) => {
              return (s.segments.filter((e) => {
                  return game.collide(self,e);
                })).length;
              });
            if (match.length){
              self.x = getRandomPoint(game.tile);
              self.y = getRandomPoint(game.tile);
            }
            else {
              break;
          }
        }
    };
}


window.onload = function() {
    var canvas = document.createElement("canvas");
    document.body.appendChild(canvas);

    var game = new Game(canvas);
    var food = new Food(game);
    game.snakes = {
      'red' : 0,
      'blue': 1
    };
    game.key = ['east', 'north'];

    var redSnake = new Snake(game, food, "red", {
      headColor: "green",
      bodyColor: "#009688"
    });

    var blueSnake = new Snake(game, food, "blue", {
      headColor: "blue",
      bodyColor: "#0cf"
    });

    game.addEntity(food);
    game.addEntity(redSnake);
    game.addEntity(blueSnake);

    gameState.height = gameState.width = game.tile;

    Promise.all([
      $.ajax({
          type: "post",
          url: "http://localhost:5000/start",
          data: JSON.stringify({game_id: 1}),
          dataType: "json",
          contentType: "application/json"
        }),
      $.ajax({
          type: "post",
          url: "http://localhost:5000/start",
          data: JSON.stringify({game_id: 1}),
          dataType: "json",
          contentType: "application/json"
      })
    ]).spread(function() {
        game.start();
    });
};

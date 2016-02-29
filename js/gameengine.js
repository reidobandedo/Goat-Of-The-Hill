// This game shell was happily copied from Googler Seth Ladd's "Bad Aliens" game and his Google IO talk in 2011

window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (/* function */ callback, /* DOMElement */ element) {
            window.setTimeout(callback, 1000 / 60);
        };
})();


/***************************
 *      Gamepad Suport     *
 ***************************/

window.addEventListener("gamepadconnected", function (e) {
    // Gamepad connected
    console.log("Gamepad connected", e.gamepad);
});

window.addEventListener("gamepaddisconnected", function (e) {
    // Gamepad disconnected
    console.log("Gamepad " + e.gamepad.index + " disconnected", e.gamepad);
});

function buttonPressed(b) {
    if (typeof(b) === "object") {
        return b.pressed;
    }
}

function GameEngine() {
    this.entities = [];
    this.platforms = [];
    this.goats = [];
    this.collidables = [];
    this.enableDebug = false; // debugging flag for drawing bounding boxes
    this.ctx = null;
    this.click = null;
    this.mouse = null;
    this.wheel = null;
    this.surfaceWidth = null;
    this.surfaceHeight = null;
    this.keys = {}; // TODO: use map to correlate certain e.which's or keys to booleans or elapsed times
    this.gamepads = [];
    this.pauseKey = false;

}

GameEngine.prototype.init = function (ctx) {
    this.ctx = ctx;
    this.surfaceWidth = this.ctx.canvas.width;
    this.surfaceHeight = this.ctx.canvas.height;
    this.startInput();
    this.timer = new Timer();
    console.log('game initialized');
};

GameEngine.prototype.start = function () {
    console.log("starting game");
    var that = this;
    (function gameLoop() {
        that.loop();
        requestAnimFrame(gameLoop, that.ctx.canvas);
    })();
};


GameEngine.prototype.loadScene = function (scene) {
    this.addEntity(scene);
};

GameEngine.prototype.prepForScene = function () {
    this.platforms = [];
    this.collidables = [];
    this.goats = [];
    this.entities = [];
    this.playGame = null;
};

GameEngine.prototype.startInput = function () {
    // VERY USEFUL for finding keycodes: http://keycode.info/
    console.log('Starting input');
    var that = this;

    /* === KEYBOARD EVENTS === */

    // Prevent some keyboard navigation defaults:
    // http://stackoverflow.com/questions/8916620/disable-arrow-key-scrolling-in-users-browser
    this.ctx.canvas.addEventListener("keydown", function (e) {
        // space and arrow keys (32:spacebar, 37:left, 38:up, 39:right, 40:down)
        if ([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) e.preventDefault();
    }, false);

    this.ctx.canvas.addEventListener("keydown", function (e) {
        if (e.which === 75) {
            that.kKey ^= true;
            //console.log("king turned " + (that.kKey ? "on" : "off"));
        }
        if (e.which === 70) {
            that.enableDebug ^= true; // 'F' key to toggle debug
            console.log("debugging turned " + (that.enableDebug ? "on" : "off"));

        }
    }, false);

    this.ctx.canvas.addEventListener("keydown", function (e) {
        if (e.which === 27) {
            that.pauseKey ^= true;
        }
    })

    // Toggling AI's
    this.on = [];
    var toggleAI = function (game, num) {
        game.on[num] ^= true;
        game.goats[num].resetAllKeys();
        game.goats[num].aiEnabled = game.on[num];
    };

    this.ctx.canvas.addEventListener("keyup", function (e) {
        if (e.which === 49) toggleAI(that, 0);
        if (e.which === 50) toggleAI(that, 1);
        if (e.which === 51) toggleAI(that, 2);
        if (e.which === 52) toggleAI(that, 3);
    }, false);

    /* === MOUSE SETTINGS === */

    var getXandY = function (e) {
        var x = e.clientX - that.ctx.canvas.getBoundingClientRect().left;
        var y = e.clientY - that.ctx.canvas.getBoundingClientRect().top;

        return {x: x, y: y};
    };

    this.ctx.canvas.addEventListener("mousemove", function (e) {
        //console.log(getXandY(e));
        that.mouse = getXandY(e);
    }, false);

    this.ctx.canvas.addEventListener("click", function (e) {
        //console.log(getXandY(e));
        that.click = getXandY(e);
    }, false);

    this.ctx.canvas.addEventListener("wheel", function (e) {
        //console.log(getXandY(e));
        that.wheel = e;
        //console.log(e.wheelDelta);
        e.preventDefault();
    }, false);

    this.ctx.canvas.addEventListener("contextmenu", function (e) {
        //console.log(getXandY(e));
        that.rightclick = getXandY(e);
        e.preventDefault();
    }, false);

    console.log('Input started');
};

GameEngine.prototype.addEntity = function (entity) {
    if (entity instanceof Scene) {
        // 1) Add Background entity
        this.entities.push(entity.background);

        // 2) Add Platform entities
        // Note: push.apply allows you to append array contents all at once (no need for loops)
        // Note: setting each array individually here to avoid shallow copying mistakes
        if (entity.platforms.length > 0) {
            this.platforms.push.apply(this.platforms, entity.platforms);
            this.collidables.push.apply(this.collidables, entity.platforms);
            this.entities.push.apply(this.entities, entity.platforms);
        }

        // 3) *Note: Goat entities already persist in game engine
    } else if (entity instanceof Goat) {
        // Add key listeners associated with goat
        // "closure" is needed so listener knows what element to refer to
        (function (goat, gameEngine) {
            gameEngine.ctx.canvas.addEventListener("keydown", function (e) {
                if (e.which === goat.controls.jump) goat.jumpKey = true;
                if (e.which === goat.controls.right) goat.rightKey = true;
                if (e.which === goat.controls.left) goat.leftKey = true;
                if (e.which === goat.controls.attack) goat.attackKey = true;
                if (e.which === goat.controls.run) goat.runKey = true;
            }, false);
            gameEngine.ctx.canvas.addEventListener("keyup", function (e) {
                if (e.which === goat.controls.jump) goat.jumpKey = false;
                if (e.which === goat.controls.right) goat.rightKey = false;
                if (e.which === goat.controls.left) goat.leftKey = false;
                if (e.which === goat.controls.attack) goat.attackKey = false;
                if (e.which === goat.controls.run) goat.runKey = false;
            });
        })(entity, this);
        this.goats.push(entity);
        this.entities.push(entity);
        this.collidables.push(entity);
    } else if (entity instanceof PlayGame) {
        this.playGame = entity; // keep this field in game engine for now, may take it out later...
        this.entities.push(entity);
    } else if (entity instanceof Collectible) {
        this.entities.push(entity);
    }
    if (typeof entity !== 'undefined') console.log('added ' + entity.toString());
};

GameEngine.prototype.draw = function () {

    // 1. Clear the window (Removes previously drawn things from canvas)
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    // 2. Save (What are we saving exactly here?)
    this.ctx.save();

    // 3. Draw each entity onto canvas
    for (var i = 0, len = this.entities.length; i < len; i++) {
        var ent = this.entities[i];
        if (this.playGame.isInTransitionScene) {
            if (ent instanceof Background || ent instanceof PlayGame) this.entities[i].draw(this.ctx);
        } else {
            this.entities[i].draw(this.ctx);
        }
    }
    this.ctx.restore();
};

GameEngine.prototype.update = function () {
    if (typeof this.entities !== 'undefined') {
        var entitiesCount = this.entities.length;

        // Cycle through the list of entities in GameEngine.
        for (var i = 0; i < entitiesCount; i++) {
            var entity = this.entities[i];

            // Only update those not flagged for removal, for optimization
            if (typeof entity !== 'undefined' && !entity.removeFromWorld) {
                entity.update();
                //console.log(entity.toString() + " updated");
            }
        }

        // Removal of flagged entities
        for (var j = this.entities.length - 1; j >= 0; --j) {
            if (this.entities[j].removeFromWorld) {
                this.entities.splice(j, 1);
            }
        }


        // TODO: Find cleaner way (ie upon gamepad disconnect/connect listeners to trigger AI Goats):

        // If player 3 or 4's controller is not connected, AI Goat takes over
        if (this.goats.length == 4) {
            if (typeof navigator.getGamepads()[2] === 'undefined') this.goats[2].aiEnabled = true;
            if (typeof navigator.getGamepads()[3] === 'undefined') this.goats[3].aiEnabled = true;
        }

        // Poll for gamepads
        for (var i = 0; i < this.goats.length; i++) {
            var gamepad = navigator.getGamepads()[i];
            if (gamepad) {
                this.goats[i].jumpKey = buttonPressed(gamepad.buttons[0]);
                this.goats[i].leftKey = gamepad.axes[0] < -0.5;
                this.goats[i].rightKey = gamepad.axes[0] > 0.5;
                this.goats[i].attackKey = buttonPressed(gamepad.buttons[7]);
                this.goats[i].runKey = buttonPressed(gamepad.buttons[6]);
            }
        }
    }
};

GameEngine.prototype.loop = function () {

    if (!this.pauseKey) {
        // 1. Advance game a 'tick' on the game timer
        this.clockTick = this.timer.tick();

        // 2. Update game engine (cycle through all entities)
        this.update();

        // 3. Redraw out to canvas
        this.draw();

        // 4. Reset inputs to prevent repeated firing
        this.click = null;
        this.rightclick = null;
        this.wheel = null;
        this.space = null;
    }

};

GameEngine.prototype.reset = function () {
    for (var i = 0; i < this.entities.length; i++) {
        this.entities[i].reset();
    }
};

GameEngine.prototype.toString = function gameEngineToString() {
    return 'Game Engine';
};

function Timer() {
    this.gameTime = 0;
    this.maxStep = 0.05;
    this.wallLastTimestamp = 0;
}

Timer.prototype.tick = function () {
    var wallCurrent = Date.now();
    var wallDelta = (wallCurrent - this.wallLastTimestamp) / 1000;
    this.wallLastTimestamp = wallCurrent;

    var gameDelta = Math.min(wallDelta, this.maxStep);
    this.gameTime += gameDelta;

    return gameDelta;
};

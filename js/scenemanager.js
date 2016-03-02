/*
 * Sub-classes of Scene include Title, Tutorial, Round, Scoreboard, EndGame
 *
 * Title: Background (& text/images drawn on Canvas)
 * Tutorial: Background (& text/images drawn on Canvas)
 * Round: Background, Platforms, Goats, (& text/images drawn on Canvas)
 * Scoreboard: Background, (& text/images drawn on Canvas)
 * EndGame: Background, (& text/images drawn on Canvas)
 * TODO: add in Esc/Pause screen (has Objective, Controls, Description of powerups) ??? <-- let's do this later...
 */

function Scene(game, background, type) {
    this.game = game;
    this.background = background;
    this.next = null; // field to be set in main ("on the fly")
    this.type = type;
}

Scene.prototype = new Entity();
Scene.prototype.constructor = Scene;

Scene.prototype.toString = function () {
    return "Scene";
};

var drawTextWithOutline = function (ctx, font, text, x, y, fillColor, outlineColor) {
    ctx.font = font;
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 5;
    ctx.lineJoin = 'miter';
    ctx.miterLimit = 5;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fillColor;
    ctx.fillText(text, x, y);
};

/***********************************************
 *          START OF SCENE 'INTERFACE'         *
 ***********************************************/

Scene.prototype.startScene = function () {};

Scene.prototype.endScene = function () {};

Scene.prototype.isSceneDone = function () {};

Scene.prototype.update = function () {};

Scene.prototype.draw = function (ctx) {};

Scene.prototype.reset = function () {};

/***********************************************
 *           END OF SCENE 'INTERFACE'          *
 ***********************************************/

/*
 * The Scene Manager handles loading scene assets into the game engine and transitions between scenes.
 */

// Class constants:
var ROUNDS_PLAYED = 0;

function SceneManager(currentScene) {
    this.currentScene = currentScene; // TODO: all Scenes for game stored in linkedlist attached to this head pointer
    this.goatScores = { // serves as temp storage for goat scores between rounds (data passed from scene to scene)
        0: [],          // player 1
        1: [],          // player 2
        2: [],          // player 3
        3: []           // player 4
    };
}

SceneManager.prototype = new Entity();
SceneManager.prototype.constructor = SceneManager;

SceneManager.prototype.update = function() {
    // check if Scene is done, then start transition to next Scene
    if (this.currentScene.isDone()) {
        if (this.currentScene.type === "Round") {
            this.storeScoresFromCurrentRound();
            ROUNDS_PLAYED++;
        }
        this.currentScene.endScene();
        this.currentScene = this.currentScene.next;
        this.currentScene.startScene();
    } else { // else, if not done, continue updating current Scene
        this.currentScene.update();
    }
};

SceneManager.prototype.storeScoresFromCurrentRound = function () {
    for (var i = 0, len = this.currentScene.goats.length; i < len; i++) {
        this.goatScores[i].push(this.currentScene.goats[i].score);
    }
};

SceneManager.prototype.draw = function() {
    this.currentScene.draw();
};

SceneManager.prototype.reset = function () {
    this.currentScene.reset();
};

SceneManager.prototype.toString = function() {
    return "SceneManager";
};

let stage, canvas, context, queue;
let ship;

const LEFT_KEY = 65;
let pressingLeft = false;
const RIGHT_KEY = 68;
let pressingRight = false;
const FORWARD_KEY = 87;
let pressingForward = false;
const FIRE_KEY = 74;
let pressingFire = false;

function init() {
    canvas = document.getElementById('demoCanvas');
    context = canvas.getContext('2d');
    stage = new createjs.Stage(canvas);

    createjs.Ticker.framerate = 60;
    createjs.Ticker.addEventListener('tick', tick);

    loadEvents();
    loadShip();
}

function loadEvents() {
    window.addEventListener('keydown', function(press) {
        switch(press.keyCode) {
            case LEFT_KEY:
                pressingLeft = true;
                pressingRight = false;
                break;
            case RIGHT_KEY:
                pressingRight = true;
                pressingLeft = false;
                break;
            case FORWARD_KEY:
                pressingForward = true;
                break;
            case FIRE_KEY:
                pressingFire = true;
                break;
        } 
    });

    window.addEventListener('keyup', function(press) {
        if (press.keyCode == LEFT_KEY && pressingRight != true) {
            pressingLeft = false;
        }
        if (press.keyCode == RIGHT_KEY && pressingLeft != true) {
            pressingRight = false;
        }
    });
}

function loadShip() {
    queue = new createjs.LoadQueue();
    queue.loadFile({id:'ship', src:'./assets/space_ship.png'});
    queue.addEventListener('complete', function() {
        console.log(queue.getResult('ship'));
        
        ship = new createjs.Bitmap(queue.getResult('ship'));

        // Starting Position
        ship.x = stage.canvas.width / 2;
        ship.y = stage.canvas.height / 2;

        // Anchor point
        ship.regX = 16;
        ship.regY = 21;

        stage.addChild(ship);
    });
}

function TurnShip() {
    if (pressingLeft) {
        ship.rotation -= 5;
    } if (pressingRight) {
        ship.rotation += 5;
    }
}

function tick() {
    TurnShip();
    stage.update();
}
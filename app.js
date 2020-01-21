let stage, canvas, context, queue;

// *************************
// Key bindings
// *************************
const LEFT_KEY = 65;
let pressingLeft = false;
const RIGHT_KEY = 68;
let pressingRight = false;
const FORWARD_KEY = 87;
let pressingForward = false;
const FIRE_KEY = 74;

// *************************
// Player ship references
// *************************
let ship;
let projectiles = [];

const TURN_SPEED = 3;
const PROJECTILE_SPEED = 7;

let rateOfFire = 10;
let timeSinceLastShot = 0;

// *************************
// Rock references
// *************************
let rockSpawners = [];
let bigRocks = [], mediumRocks = [], smallRocks = [];
let allRocksInGame = [];
let rockSpawnInterval = 40;

const ROCK_SPEED = 5;
const ROCK_TURN_SPEED = 2;
let wavesPerSpawner = (Math.random() * 3) + 1;
let wavesSinceSpawned = 0;

function init() {
    canvas = document.getElementById('demoCanvas');
    context = canvas.getContext('2d');
    stage = new createjs.Stage(canvas);

    createjs.Ticker.framerate = 60;
    createjs.Ticker.addEventListener('tick', tick);

    loadEvents();
    loadShip();
    loadRocks();
}

function tick() {
    timeSinceLastShot += createjs.Ticker.getMeasuredTickTime();
    
    turnShip();
    // pushProjectiles();

    if (wavesSinceSpawned >= rockSpawners.length) {
        rockSpawners = [];
        createRockSpawners();
        wavesSinceSpawned = 0;
    }
    spawnRocks();
    turnRocks();
    pushRocks();

    stage.update();
}

function pushProjectiles() {
    projectiles.forEach(projectile => {
        projectile.projectile.x += Math.cos(projectile.shipRotation) * PROJECTILE_SPEED;
        projectile.projectile.y += Math.sin(projectile.shipRotation) * PROJECTILE_SPEED;
    });
}

function turnRocks() {
    allRocksInGame.forEach(rock => {
        rock.rotation += ROCK_TURN_SPEED;
    });
}

function pushRocks() {
    allRocksInGame.forEach(rockObj => {
        if (rockObj.targetX == 0 && rockObj.targetY == 0) {
            rockObj.targetX = ship.x;
            rockObj.targetY = ship.y;

            let directionX = rockObj.targetX - rockObj.rock.x;
            let directionY = rockObj.targetY - rockObj.rock.y;
    
            let vectorLength = Math.sqrt(directionX * directionX + directionY * directionY);
    
            let vectorNormalX = directionX / vectorLength;
            let vectorNormalY = directionY / vectorLength;

            rockObj.directionNormalX = vectorNormalX;
            rockObj.directionNormalY = vectorNormalY;
        }

        rockObj.rock.x += rockObj.directionNormalX * ROCK_SPEED;
        rockObj.rock.y += rockObj.directionNormalY * ROCK_SPEED;

        let padding = 50;
        if (rockObj.rock.x > stage.canvas.width + padding ||
            rockObj.rock.x < 0 - padding ||
            rockObj.rock.y < 0 - padding ||
            rockObj.rock.y > stage.canvas.height + padding) {

            stage.removeChild(rockObj.rock);
            stage.clear();

            // TODO: Remove rock from array of all rocks
        }
    });
}

function spawnRocks() {
    rockSpawners.forEach(spawner => {
        spawner.timeSinceLastSpawn += 0.5;

        if (spawner.timeSinceLastSpawn >= spawner.spawnInterval) {
            let randomBigRock = bigRocks[Math.round(
                Math.random() * (bigRocks.length - 1)
            )];
            let rock = new createjs.Bitmap(randomBigRock);
            rock.regX = rock.image.width / 2;
            rock.regY = rock.image.height / 2;

            rock.x = spawner.x;
            rock.y = spawner.y;

            let rockObj = {
                rock: rock,
                targetX: 0,
                targetY: 0,
                directionNormalX: 0,
                directionNormalY: 0
            }

            allRocksInGame.push(rockObj);
            stage.addChild(rock);
            spawner.timeSinceLastSpawn = 0;

            wavesSinceSpawned++;
        }
    });
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
                fire();
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

function loadAudio() {
    queue.installPlugin(createjs.Sound);
    createjs.Sound.registerSound('./assets/audio/burst-fire.mp3', 'fire');
}

function loadShip() {
    queue = new createjs.LoadQueue();
    loadAudio();

    queue.loadFile({id:'ship', src:'./assets/space_ship.png'});
    queue.addEventListener('complete', function() {
        ship = new createjs.Bitmap(queue.getResult('ship'));

        // Starting Position
        ship.x = stage.canvas.width / 2;
        ship.y = stage.canvas.height / 2;

        // Anchor point
        ship.regX = 16;
        ship.regY = 21;

        stage.addChild(ship);

        console.log('Loaded ship');
    });
}

function loadRocks() {
    queue.loadManifest([
        {id: 'big_rock', src: './assets/rocks/big_rock.png'},
        {id: 'big_rock_magma', src: './assets/rocks/big_rock_magma.png'},
        {id: 'medium_rock', src: './assets/rocks/medium_rock.png'},
        {id: 'medium_rock_mud', src: './assets/rocks/medium_rock_mud.png'},
        {id: 'small_rock', src: './assets/rocks/small_rock.png'},
        {id: 'tiny_rock', src: './assets/rocks/tiny_rock.png'}
    ]);

    queue.addEventListener('complete', function() {
        bigRocks.push(queue.getResult('big_rock'));
        bigRocks.push(queue.getResult('big_rock_magma'));

        mediumRocks.push(queue.getResult('medium_rock'));
        mediumRocks.push(queue.getResult('medium_rock_mud'));
        
        smallRocks.push(queue.getResult('small_rock'));
        smallRocks.push(queue.getResult('tiny_rock'));

        console.log('Loaded rocks');
    });
}

function createRockSpawners() {
    createRockSpawner(0, stage.canvas.width, 'top');
    createRockSpawner(0, stage.canvas.height, 'left');
    createRockSpawner(0, stage.canvas.height, 'right');
    createRockSpawner(0, stage.canvas.width, 'bottom');
}

function createRockSpawner(min, max, side) {
    let padding = 50;
    let point = min + ((Math.random() * (max - min)));
    let x, y;

    switch (side) {
        case 'left':
            x = min - padding;
            y = point;
            break;
        case 'right':
            x = stage.canvas.width + padding;
            y = point;
            break;
        case 'top':
            x = point;
            y = min - padding;
            break;
        case 'bottom':
            x = point;
            y = stage.canvas.height + padding;
            break;
    }

    let spawner = {
        x: x,
        y: y,
        side: side,
        timeSinceLastSpawn: 0,
        spawnInterval: rockSpawnInterval
    }

    let spawnerGraphic = new createjs.Graphics();
    spawnerGraphic.beginFill('black');
    spawnerGraphic.drawCircle(x, y, 5);
    spawnerGraphic.endFill();

    let spawnerShape = new createjs.Shape(spawnerGraphic);
    spawnerShape.regX = spawnerShape.regY = 0;
    stage.addChild(spawnerShape);

    rockSpawners.push(spawner);
}

function turnShip() {
    if (pressingLeft) {
        ship.rotation -= TURN_SPEED;
    } if (pressingRight) {
        ship.rotation += TURN_SPEED;
    }
}

function fire() {
    if (timeSinceLastShot >= rateOfFire) {
        createjs.Sound.play('fire');

        let projectileGraphic = new createjs.Graphics();
        projectileGraphic.beginFill('red');
        projectileGraphic.drawRoundRect(ship.x, ship.y + (ship.regY / 2), 3, 10, 2);
        projectileGraphic.endFill();

        let projectile = new createjs.Shape(projectileGraphic);

        let projectileObj = {
            projectile: projectile,
        }

        projectiles.push(projectileObj);
        stage.addChild(projectile);

        timeSinceLastShot = 0;
    }
}
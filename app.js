let stage, canvas, context, queue, game_state = 'playing';
let backgroundMusic;
let fps = 60;

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
let ship, shipObj, shipContainer;
let projectiles = [];

const SHIP_SPEED = 3;
const TURN_SPEED = 5;
const PROJECTILE_SPEED = 7;

let cursorShape;
let rateOfFire = 20;
let timePassedAfterFiring = 0;
let engineSoundEffect;
let isEngineSoundPlaying = false;

let engineAnimation;

// *************************
// Rock references
// *************************
let rockSpawners = [];
let bigRocks = [], mediumRocks = [], smallRocks = [];
let allRocksInGame = [];
let rockId = 0;
let rockSpawnInterval = 100;

const ROCK_SPEED = 1;
const MIN_ROCK_TURN_SPEED = 2;
const MAX_ROCK_TURN_SPEED = 5;
let wavesPerSpawner = (Math.random() * 3) + 1;
let wavesSinceSpawned = 0;

// *************************
// Score references
// *************************
let rocksDestroyed = 0;
let secondsSurvived = 0;
let firesBlasted = 0;

function init() {
    canvas = document.getElementById('demoCanvas');
    context = canvas.getContext('2d');
    stage = new createjs.Stage(canvas);

    createjs.Ticker.framerate = fps;
    createjs.Ticker.addEventListener('tick', tick);

    loadEvents();
    loadShip();
    loadAudio();
    loadRocks();
    createCursor();

    setTimeout(function() {
        backgroundMusic = createjs.Sound.play('background_music');
        backgroundMusic.volume = 0.008;
        backgroundMusic.loop = true;
    }, 2000);

    setInterval(function() {
        secondsSurvived++;
    }, 1000);

    setInterval(function() {
        timePassedAfterFiring++;
    }, rateOfFire);
}

function tick() {
    if (game_state == 'playing') {
        turnShip();
        pushShip();
        pushProjectiles();
    
        if (wavesSinceSpawned >= rockSpawners.length) {
            rockSpawners = [];
            createRockSpawners();
            wavesSinceSpawned = 0;
        }
    
        spawnRocks();
        turnRocks();
        pushRocks();
    
        if (ship !== undefined) {
            positionCursor();
        }

        drawWatermark();
        
        stage.update();
    }
}

function drawWatermark() {
    let gameTitle = new createjs.Text("Asteroids - CreateJS", "14px Arial", '#000000');

    gameTitle.textAlign = 'right';
    gameTitle.x = stage.canvas.width - 15;
    gameTitle.y = stage.canvas.height - 30;

    stage.addChild(gameTitle);
}

function createCursor() {
    let cursorGraphic = new createjs.Graphics();
    cursorGraphic.beginFill('green');
    cursorGraphic.drawCircle(0, 0, 5);
    cursorGraphic.endFill();

    cursorShape = new createjs.Shape(cursorGraphic);
    cursorShape.regX = 0;
    cursorShape.regY = 50;
    cursorShape.alpha = 0;

    shipContainer  = new createjs.Container();
    stage.addChild(cursorShape);
}

function positionCursor() {
    cursorShape.x = ship.x;
    cursorShape.y = ship.y - ship.regY;
}

function playEngineAnimation() {
    if (engineAnimation === undefined) {
        let engineData = {
            images: ['./assets/space_ship_engines_spritesheet.png'],
            frames: [
                [0, 0, 10, 6],
                [10, 6, 10, 6],
                [20, 12, 10, 6],
                [30, 18, 10, 6]
            ],
            animations: {
                engine: {
                    frames: [0, 3],
                    speed: 0.4
                }
            }
        }

        let engineSpritesheet = new createjs.SpriteSheet(engineData);
        engineAnimation = new createjs.Sprite(engineSpritesheet, 'engine');
    } else {
        engineAnimation.alpha = 1;
        engineAnimation.play();
    }

    engineAnimation.x = ship.x - 5;
    engineAnimation.y = ship.y + 18;
}

function pushProjectiles() {
    projectiles.forEach(projectileObj => {
        if (projectileObj.targetX == 0 && projectileObj.targetY == 0) {
            let globalCoordsOfCursor = shipContainer.localToGlobal(cursorShape.x, cursorShape.y);
            projectileObj.targetX = globalCoordsOfCursor.x;
            projectileObj.targetY = globalCoordsOfCursor.y;

            let directionX = projectileObj.targetX - projectileObj.projectile.x;
            let directionY = projectileObj.targetY - projectileObj.projectile.y;

            let vectorLength = Math.sqrt(directionX * directionX + directionY * directionY);
    
            let vectorNormalX = directionX / vectorLength;
            let vectorNormalY = directionY / vectorLength;

            projectileObj.directionNormalX = vectorNormalX;
            projectileObj.directionNormalY = vectorNormalY;
        }

        projectileObj.projectile.x += projectileObj.directionNormalX * PROJECTILE_SPEED;
        projectileObj.projectile.y += projectileObj.directionNormalY * PROJECTILE_SPEED;
        
        projectileObj.projectile.setBounds(projectileObj.projectile.x, projectileObj.projectile.y, 7, 7);

        let padding = 50;
        if (projectileObj.projectile.x > stage.canvas.width + padding ||
            projectileObj.projectile.x < 0 - padding ||
            projectileObj.projectile.y < 0 - padding ||
            projectileObj.projectile.y > stage.canvas.height + padding) {

            stage.removeChild(projectileObj.projectile);
            stage.clear();

            projectiles.splice(projectiles.indexOf(projectileObj), 1);
        } else {
            isBlastCollidingWithRock(projectileObj);
        }
    });
}

function turnRocks() {
    allRocksInGame.forEach(rock => {
         rock.rock.rotation += Math.random() * (MAX_ROCK_TURN_SPEED - MIN_ROCK_TURN_SPEED) + MIN_ROCK_TURN_SPEED;
    });
}

function pushRocks() {
    allRocksInGame.forEach(rockObj => {
        if (rockObj !== undefined && rockObj !== null) {
            if (rockObj.targetX == 0 && rockObj.targetY == 0) {
                let globalCoordsOfShip = shipContainer.localToGlobal(ship.x, ship.y);
                rockObj.targetX = globalCoordsOfShip.x;
                rockObj.targetY = globalCoordsOfShip.y;
    
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

            rockObj.rock.setBounds(rockObj.rock.x, rockObj.rock.y, rockObj.rock.image.width, rockObj.rock.image.height,);
    
            let padding = 50;
            if (rockObj.rock.x > stage.canvas.width + padding ||
                rockObj.rock.x < 0 - padding ||
                rockObj.rock.y < 0 - padding ||
                rockObj.rock.y > stage.canvas.height + padding) {
    
                stage.removeChild(rockObj.rock);
                stage.clear();

                allRocksInGame.splice(allRocksInGame.indexOf(rockObj), 1);
            } else {
                isShipCollidingWithRock();
            }
        }
    });
}

function isBlastCollidingWithRock(fireBlast) {
    let isColliding = false;

    let projectile = fireBlast.projectile;

    allRocksInGame.forEach(rockObj => {
        let rock = rockObj.rock;

        if (
            ((projectile.x >= rock.x - rock.getBounds().width / 2 && projectile.x <= rock.x + rock.getBounds().width / 2) &&
            (projectile.y >= rock.y - rock.getBounds().height / 2 && projectile.y <= rock.y + rock.getBounds().height / 2))) {
                stage.removeChild(rockObj.rock);
                stage.clear();

                allRocksInGame.splice(allRocksInGame.indexOf(rockObj), 1);

                stage.removeChild(projectile);
                stage.clear();
    
                projectiles.splice(projectiles.indexOf(fireBlast), 1);
                createjs.Sound.play('meteorite_explosion');
                
                rocksDestroyed++;
                return true;
        }
    });

    return isColliding;
}

function isShipCollidingWithRock() {
    let isColliding = false;

    allRocksInGame.forEach(rockObj => {
        let rock = rockObj.rock;

        let globalCoordsOfShip = shipContainer.localToGlobal(ship.x, ship.y);
        if (
            ((globalCoordsOfShip.x >= rock.x - rock.getBounds().width / 2 && globalCoordsOfShip.x <= rock.x + rock.getBounds().width / 2) &&
            (globalCoordsOfShip.y >= rock.y - rock.getBounds().height / 2 && globalCoordsOfShip.y <= rock.y + rock.getBounds().height / 2))) {
                stage.removeChild(rockObj.rock);
                stage.clear();

                allRocksInGame.splice(allRocksInGame.indexOf(rockObj), 1);

                stage.removeChild(shipContainer);
                stage.clear();

                createjs.Sound.play('ship_explosion');
                game_state = 'game over';
                if (engineSoundEffect !== undefined) {
                    engineSoundEffect.stop();
                }
                if (engineAnimation !== undefined) {
                    engineAnimation.stop();
                }
                if (backgroundMusic !== undefined) {
                    backgroundMusic.stop();
                }
                
                return true;
        }
    });

    return isColliding;
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

            rock.setBounds(rock.x, rock.y, rock.image.width, rock.image.height,);

            let rockObj = {
                id: rockId,
                rock: rock,
                targetX: 0,
                targetY: 0,
                directionNormalX: 0,
                directionNormalY: 0
            }

            rockId++;

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
                pressingForward = !pressingForward;

                if (pressingForward == true) {
                    if (engineSoundEffect !== undefined) {
                        engineSoundEffect.play();
                    }
                    playEngineAnimation();

                } else {
                    engineSoundEffect.stop();
                    engineAnimation.stop();
                    engineAnimation.alpha = 0;
                }
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
        // if (press.keyCode == FORWARD_KEY) {
            // pressingForward = false;

            // engineSoundEffect.stop();
            // engineAnimation.stop();
            // engineAnimation.alpha = 0;
        // }
    });
}

function loadAudio() {
    queue.installPlugin(createjs.Sound);
    createjs.Sound.registerSound('./assets/audio/burst_fire.mp3', 'fire');
    createjs.Sound.registerSound('./assets/audio/engine.mp3', 'engine');
    createjs.Sound.registerSound('./assets/audio/ship_explosion.mp3', 'ship_explosion');
    createjs.Sound.registerSound('./assets/audio/meteorite_explosion.mp3', 'meteorite_explosion');
    createjs.Sound.registerSound('./assets/audio/background_music.mp3', 'background_music');
}

function loadShip() {
    queue = new createjs.LoadQueue();

    queue.loadFile({id:'ship', src:'./assets/space_ship.png'});
    queue.addEventListener('complete', function() {
        ship = new createjs.Bitmap(queue.getResult('ship'));

        // Starting Position
        ship.x = stage.canvas.width / 2;
        ship.y = stage.canvas.height / 2;

        // Anchor point
        ship.regX = 16;
        ship.regY = 21;

        ship.setBounds(ship.x, ship.y, 32, 42);

        shipObj = {
            ship: ship,
            targetX: 0,
            targetY: 0,
            directionNormalX: 0,
            directionNormalY: 0
        }

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
        shipContainer.rotation -= TURN_SPEED;

        shipContainer.addChild(ship, cursorShape);
        if (shipContainer.regX == 0 && shipContainer.regY == 0) {
            shipContainer.regX = shipObj.ship.x;
            shipContainer.regY = shipObj.ship.y;
            shipContainer.x = shipObj.ship.x;
            shipContainer.y = shipObj.ship.y;
        }

        stage.addChild(shipContainer);
        
    } if (pressingRight) {
        shipContainer.rotation += TURN_SPEED;

        shipContainer.addChild(ship, cursorShape);
        if (shipContainer.regX == 0 && shipContainer.regY == 0) {
            shipContainer.regX = shipObj.ship.x;
            shipContainer.regY = shipObj.ship.y;
            shipContainer.x = shipObj.ship.x;
            shipContainer.y = shipObj.ship.y;
        }

        stage.addChild(shipContainer);
    }
}

function pushShip() {
    if (pressingForward) {
        if (isEngineSoundPlaying == false) {
            engineSoundEffect = createjs.Sound.play('engine');
            engineSoundEffect.addEventListener('complete', function() {
                isEngineSoundPlaying = false;
            });

            isEngineSoundPlaying = true;
        }

        if (shipContainer.regX == 0 && shipContainer.regY == 0) {
            shipContainer.regX = shipObj.ship.x;
            shipContainer.regY = shipObj.ship.y;
            shipContainer.x = shipObj.ship.x;
            shipContainer.y = shipObj.ship.y;
        }

        let globalCoordsOfCursor = shipContainer.localToGlobal(cursorShape.x, cursorShape.y);
        let globalCoordsOfShip = shipContainer.localToGlobal(ship.x, ship.y);
        shipObj.targetX = globalCoordsOfCursor.x;
        shipObj.targetY = globalCoordsOfCursor.y;

        let directionX = shipObj.targetX - globalCoordsOfShip.x;
        let directionY = shipObj.targetY - globalCoordsOfShip.y;

        let vectorLength = Math.sqrt(directionX * directionX + directionY * directionY);

        let vectorNormalX = directionX / vectorLength;
        let vectorNormalY = directionY / vectorLength;

        shipObj.directionNormalX = vectorNormalX;
        shipObj.directionNormalY = vectorNormalY;

        shipContainer.x += shipObj.directionNormalX * SHIP_SPEED;
        shipContainer.y += shipObj.directionNormalY * SHIP_SPEED;
        shipObj.ship.setBounds(shipObj.ship.x, shipObj.ship.y, 32, 42);

        shipContainer.addChild(ship, cursorShape, engineAnimation);
        stage.addChild(shipContainer);
    }
}

function fire() {
    if (timePassedAfterFiring >= rateOfFire) {
        createjs.Sound.play('fire');

        let projectileGraphic = new createjs.Graphics();
        projectileGraphic.beginFill('red');
        projectileGraphic.drawRoundRect(0, 0, 7, 7, 4);
        projectileGraphic.endFill();

        let projectile = new createjs.Shape(projectileGraphic);
        
        let globalCoordsOfShip = shipContainer.localToGlobal(ship.x, ship.y);
        projectile.x = globalCoordsOfShip.x;
        projectile.y = globalCoordsOfShip.y;

        projectile.setBounds(projectile.x, projectile.y, 7, 7);

        let projectileObj = {
            projectile: projectile,
            targetX: 0,
            targetY: 0,
            directionNormalX: 0,
            directionNormalY: 0
        }

        projectiles.push(projectileObj);
        stage.addChild(projectile);

        firesBlasted++;
        timePassedAfterFiring = 0;
    }
}
let game = null;
let gameLoadingSplashShownAt = 0;

const bulletHitSoundKeys = ['bulletHit', 'bulletHit2', 'bulletHit3'];
const tankCollisionSoundKeys = ['tankCollision1', 'tankCollision2'];
const tankGunSoundKeys = ['tankGun1', 'tankGun2', 'tankGun3'];
const gameMusicKeys = ['gameMusic1', 'gameMusic2', 'gameMusic3'];
const defaultTankPositions = {
    player1: { x: 88, y: 367, rotation: 0 },
    player2: { x: 1830, y: 782, rotation: Math.PI }
};
const healingZoneTiles = [
    { x: 53, y: 7, width: 3, height: 2 },
    { x: 4, y: 27, width: 3, height: 2 }
];
const healingCooldown = 30000;

function randomSoundKey(keys) {
    return keys[Math.floor(Math.random() * keys.length)];
}

function getSoundPan(scene, x) {
    const worldWidth = scene.physics.world.bounds.width || scene.scale.width;
    return Phaser.Math.Clamp((x / worldWidth) * 2 - 1, -1, 1);
}

function setSoundPan(scene, sound, x) {
    if (sound && typeof sound.setPan === 'function') {
        sound.setPan(getSoundPan(scene, x));
    }
}

function stopSound(sound) {
    if (sound && sound.isPlaying) {
        sound.stop();
    }
}

function playRandomSound(scene, keys, x, config = {}) {
    const sound = scene.sound.add(randomSoundKey(keys), config);
    sound.once('complete', sound.destroy, sound);
    sound.play();
    setSoundPan(scene, sound, x);
    return sound;
}

function createTankAudio(scene, tank) {
    tank.audio = {
        stopped: scene.sound.add('tankStopped', { loop: true, volume: 0.35 }),
        started: scene.sound.add('tankStartedMovement', { volume: 0.45 }),
        moving: scene.sound.add('tankMoving', { loop: true, volume: 0.35 }),
        stopping: scene.sound.add('tankStoppingMovement', { volume: 0.45 })
    };
    tank.movementState = 'stopped';
    tank.movementDirection = 0;
    tank.movementAudioToken = 0;
    tank.audio.stopped.play();
    setSoundPan(scene, tank.audio.stopped, tank.x);
}

function updateTankAudio(scene, tank, direction) {
    if (!tank.audio) return;

    Object.values(tank.audio).forEach((sound) => setSoundPan(scene, sound, tank.x));

    if (direction !== 0) {
        if (tank.movementDirection !== 0 && tank.movementDirection !== direction) {
            tank.movementAudioToken += 1;
            stopSound(tank.audio.started);
            stopSound(tank.audio.stopping);
            stopSound(tank.audio.moving);
            tank.audio.moving.play();
            tank.movementState = 'moving';
        } else if (tank.movementState === 'stopped' || tank.movementState === 'stopping') {
            const audioToken = ++tank.movementAudioToken;
            stopSound(tank.audio.stopped);
            stopSound(tank.audio.stopping);
            stopSound(tank.audio.moving);
            tank.audio.started.play();
            tank.movementState = 'starting';
            tank.audio.started.once('complete', () => {
                if (audioToken === tank.movementAudioToken && tank.movementDirection !== 0 && tank.audio.started.isPlaying === false) {
                    tank.audio.moving.play();
                    tank.movementState = 'moving';
                }
            });
        }
        tank.movementDirection = direction;
        return;
    }

    if (tank.movementDirection !== 0 && tank.movementState !== 'stopping' && tank.movementState !== 'stopped') {
        const audioToken = ++tank.movementAudioToken;
        stopSound(tank.audio.started);
        stopSound(tank.audio.moving);
        tank.audio.stopping.play();
        tank.movementState = 'stopping';
        tank.audio.stopping.once('complete', () => {
            if (audioToken === tank.movementAudioToken && tank.movementDirection === 0 && tank.audio.stopping.isPlaying === false) {
                tank.audio.stopped.play();
                tank.movementState = 'stopped';
            }
        });
    }

    tank.movementDirection = 0;
}

function playTankRebirth(scene) {
    const left = scene.sound.add('tankRebirth', { volume: 0.45 });
    const right = scene.sound.add('tankRebirth', { volume: 0.45 });
    left.once('complete', left.destroy, left);
    right.once('complete', right.destroy, right);
    left.play();
    right.play();
    if (left && typeof left.setPan === 'function') left.setPan(-1);
    if (right && typeof right.setPan === 'function') right.setPan(1);
}

function playTankDeactivated(scene, tank) {
    playRandomSound(scene, ['tankDeactivating'], tank.x, { volume: 0.55 });
}

function playTankScore(scene, tank) {
    playRandomSound(scene, ['tankScore'], tank.x, { volume: 0.45 });
}

function stopProjectileSound(projectile) {
    stopSound(projectile.flyingSound);
    projectile.flyingSound = null;
    if (projectile.lifetimeTimer) {
        projectile.lifetimeTimer.remove(false);
        projectile.lifetimeTimer = null;
    }
}

function getCollisionGameObject(object) {
    return object?.gameObject || object;
}

function deactivateProjectile(scene, projectile) {
    projectile = getCollisionGameObject(projectile);
    if (!projectile || !projectile.active) return;
    stopProjectileSound(projectile);
    projectile.owner = null;
    if (projectile.body) {
        projectile.body.stop();
        projectile.body.enable = false;
    }
    projectile.setActive(false);
    projectile.setVisible(false);
}

function playGameMusicTrack(scene, trackIndex = 0) {
    if (!scene.sys || !scene.sys.isActive()) return;

    const music = scene.sound.add(gameMusicKeys[trackIndex], { volume: 0.21 });
    scene.gameMusic = music;
    music.once('complete', () => {
        music.destroy();
        playGameMusicTrack(scene, (trackIndex + 1) % gameMusicKeys.length);
    });
    music.play();
}

function startGameMusic(scene) {
    const audioContext = scene.sound && scene.sound.context;
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume()
            .then(() => playGameMusicTrack(scene))
            .catch(() => {});
        return;
    }

    playGameMusicTrack(scene);
}

function showTutorial(selections) {
    const tutorial = document.getElementById('tutorial-screen');
    const builderScreen = document.getElementById('builder-screen');
    const homeScreen = document.getElementById('home-screen');
    if (!tutorial) return;

    window.__pendingTankBuild = selections;
    if (builderScreen) builderScreen.style.display = 'none';
    if (homeScreen) homeScreen.style.display = 'none';
    tutorial.hidden = false;
}

function startTutorialGame() {
    const tutorial = document.getElementById('tutorial-screen');
    if (tutorial) tutorial.hidden = true;
    window.startGameWithSelections(window.__pendingTankBuild);
}

window.showTankTutorial = showTutorial;

function buildPhaserConfig() {
    return {
        type: Phaser.Auto,
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: 1920,
            height: 1080,
        },
        parent: 'game-canvas',
        scene: {
            preload: preload,
            create: create,
            update: update
        },
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 0 },
                debug: false
            }
        }
    };
}

function getTankCatalog() {
    if (window.__tankCatalog) {
        return Promise.resolve(window.__tankCatalog);
    }

    return fetch('assets/tanks/parts.json')
        .then((response) => {
            if (!response.ok) throw new Error('Failed to load tank catalog');
            return response.json();
        })
        .then((catalog) => {
            window.__tankCatalog = catalog;
            return catalog;
        });
}

function findCatalogPart(catalog, type, id) {
    const list = catalog[type + 's'] || catalog[type];
    if (!list) return null;
    return list.find((item) => item.id === id) || null;
}

function buildTankSelection(catalog, selection) {
    const belt = findCatalogPart(catalog, 'belt', selection.belt);
    const chassis = findCatalogPart(catalog, 'chassis', selection.chassis);
    const turret = findCatalogPart(catalog, 'turret', selection.turret);
    const cannon = findCatalogPart(catalog, 'cannon', selection.cannon);

    if (!belt || !turret || !chassis || !cannon) {
        console.warn('Tank selection incomplete', selection);
        return null;
    }

    return { belt, turret, chassis, cannon };
}

function buildTankRuntimeConfig(catalog, selection) {
    const baseSelection = selection || {};
    const finishedTank = baseSelection.tank || {
        ...baseSelection,
        rotationSpeed: 2,
        muzzleOffset: 86,
        speed: 80,
        drag: 0.5,
        cooldown: 100,
        damage: 10,
        projectileSpeed: 300,
        projectileType: 'bullet'
    };

    const belt = findCatalogPart(catalog, 'belt', baseSelection.belt) || { stats: { speed: finishedTank.speed || 80, drag: finishedTank.drag || 0.5 } };
    const chassis = findCatalogPart(catalog, 'chassis', baseSelection.chassis) || { stats: { weight: 50, armor: 1 } };
    const cannon = findCatalogPart(catalog, 'cannon', baseSelection.cannon) || { stats: { cooldown: finishedTank.cooldown || 100, damage: finishedTank.damage || 10, projectileSpeed: finishedTank.projectileSpeed || 300 } };

    // defaults are being used here
    const projectileSpeed = Number(finishedTank.projectileSpeed ?? cannon.stats.projectileSpeed ?? 300);
    const damage = Number(finishedTank.damage ?? cannon.stats.damage ?? 10);
    const cooldown = Number(finishedTank.cooldown ?? cannon.stats.cooldown ?? 100);
    const movementSpeed = Number(finishedTank.speed ?? belt.stats.speed ?? 80);
    const drag = Number(finishedTank.drag ?? belt.stats.drag ?? 0.5);
    const rotationSpeed = Number(finishedTank.rotationSpeed ?? 2);
    const muzzleOffset = Number(finishedTank.muzzleOffset ?? 86);

    return {
        rotationSpeed: Phaser.Math.DegToRad(rotationSpeed),
        movementSpeed,
        drag,
        life: finishedTank.hp ?? chassis.stats.hp ?? undefined,
        muzzleOffset,
        projectile: {
            damage,
            speed: projectileSpeed,
            lifetime: 1800,
            owner: undefined,
            hitbox: undefined,
            image: finishedTank.projectile?.image || 'ball_projectile'
        },
        canon: {
            cooldown
        }
    };
}

function createCompositeTank(scene, tankDefinition, x, y, angle = 0) {
    const container = scene.add.container(x, y);
    container.rotation = angle;
    container.name = 'tank';

    const beltDisplay = tankDefinition.belt.display || { x: 0, y: 0, scaleX: 1, scaleY: 1 };
    const chassisDisplay = tankDefinition.chassis.display || { x: 0, y: 0, scaleX: 1, scaleY: 1 };
    const turretDisplay = tankDefinition.turret.display || { x: 0, y: 0, scaleX: 1, scaleY: 1 };
    const cannonDisplay = tankDefinition.cannon.display || { x: 0, y: 0, scaleX: 1, scaleY: 1 };

    const leftBelt = scene.add.image(-38 + (beltDisplay.x || 0), beltDisplay.y || 0, tankDefinition.belt.id)
        .setOrigin(0.5)
        .setScale(beltDisplay.scaleX || 1, beltDisplay.scaleY || 1);

    const rightBelt = scene.add.image(38 + (beltDisplay.x || 0), beltDisplay.y || 0, tankDefinition.belt.id)
        .setOrigin(0.5)
        .setScale(beltDisplay.scaleX || 1, beltDisplay.scaleY || 1);

    const chassisSprite = scene.add.image(chassisDisplay.x || 0, chassisDisplay.y || 0, tankDefinition.chassis.id)
        .setOrigin(0)
        .setScale(chassisDisplay.scaleX || 1, chassisDisplay.scaleY || 1);

    const turretSprite = scene.add.image(turretDisplay.x || 0, turretDisplay.y || 0, tankDefinition.turret.id)
        .setOrigin(0.5)
        .setScale(turretDisplay.scaleX || 1, turretDisplay.scaleY || 1);

    const cannonSprite = scene.add.image(cannonDisplay.x || 0, cannonDisplay.y || 0, tankDefinition.cannon.id)
        .setOrigin(0.5)
        .setScale(cannonDisplay.scaleX || 1, cannonDisplay.scaleY || 1);

    container.add([leftBelt, rightBelt, chassisSprite, turretSprite, cannonSprite]);
    scene.physics.add.existing(container);

    if (container.body) {
        container.body.setCollideWorldBounds(true);
        container.body.setSize(140, 70);
        container.body.setOffset(-70, -35);
    }

    return container;
}

function createPresetTank(scene, textureKey, x, y, movementAngle = 0) {
    const tank = scene.add.container(x, y);
    tank.rotation = movementAngle;
    tank.name = 'tank';

    const sprite = scene.add.image(0, 0, textureKey)
        .setOrigin(0.5)
        .setAngle(90)
        .setScale(0.462);
    tank.add(sprite);
    scene.physics.add.existing(tank);

    if (tank.body) {
        tank.body.setCollideWorldBounds(true);
        tank.hitbox = {
            width: sprite.displayWidth * 0.7,
            height: sprite.displayHeight * 0.55,
            spriteAngle: Phaser.Math.DegToRad(sprite.angle)
        };
        updateTankHitbox(tank);
    }

    return tank;
}

function updateTankHitbox(tank) {
    if (!tank.body || !tank.hitbox) return;

    const angle = tank.rotation + tank.hitbox.spriteAngle;
    const cos = Math.abs(Math.cos(angle));
    const sin = Math.abs(Math.sin(angle));
    const width = tank.hitbox.width * cos + tank.hitbox.height * sin;
    const height = tank.hitbox.width * sin + tank.hitbox.height * cos;

    tank.body.setSize(width, height);
    tank.body.setOffset(-width / 2, -height / 2);
}

function showGameLoadingSplash() {
    const splash = document.getElementById('startup-splash');
    const image = splash?.querySelector('.startup-splash__image');
    if (!splash || !image) return;

    splash.hidden = false;
    splash.classList.remove('startup-splash--closing');
    gameLoadingSplashShownAt = performance.now();
    image.classList.remove('startup-splash__image--entering');
    void image.offsetWidth;
    image.classList.add('startup-splash__image--entering');
}

function hideGameLoadingSplash() {
    const splash = document.getElementById('startup-splash');
    if (!splash) return;

    const minimumDisplayTime = 1200;
    const elapsed = performance.now() - gameLoadingSplashShownAt;
    const remainingDisplayTime = Math.max(0, minimumDisplayTime - elapsed);

    window.setTimeout(() => {
        splash.classList.add('startup-splash--closing');
    }, remainingDisplayTime);

    window.setTimeout(() => {
        splash.hidden = true;
        splash.classList.remove('startup-splash--closing');
    }, remainingDisplayTime + 500);
}

window.startGameWithSelections = function (selections) {
    const homeScreen = document.getElementById('home-screen');
    const builderScreen = document.getElementById('builder-screen');
    const gameScreen = document.getElementById('game-screen');

    showGameLoadingSplash();

    if (window.stopHomeMusic) {
        window.stopHomeMusic();
    }
    if (window.startGameMusic) {
        window.startGameMusic();
    }

    if (!gameScreen) {
        console.error('Missing element #game-screen.');
        hideGameLoadingSplash();
        return;
    }

    if (builderScreen) {
        builderScreen.style.display = 'none';
    }
    if (homeScreen) {
        homeScreen.style.display = 'none';
    }

    gameScreen.hidden = false;
    gameScreen.style.display = 'flex';

    window.__selectedTankBuild = selections || {
        1: { belt: 'belt-esteiras', turret: 'turret-equilibrada', chassis: 'chassis-equilibrado', cannon: 'cannon-parabolica' },
        2: { belt: 'belt-propulsores', turret: 'turret-pesada', chassis: 'chassis-equilibrado', cannon: 'cannon-onda-de-choque' }
    };

    if (game) {
        game.destroy(true);
        game = null;
    }

    game = new Phaser.Game(buildPhaserConfig());
};

document.getElementById('tutorial-start')?.addEventListener('click', startTutorialGame);

function getPartCode(part) {
    const filename = part.sprite.split('/').pop() || '';
    const code = filename.replace(/\D/g, '');
    if (code.length !== 2) {
        throw new Error(`Invalid part code in sprite path: ${part.sprite}`);
    }
    return code;
}

function buildPresetSpriteKey(catalog, selection) {
    if (!selection) return null;
    const cannon = findCatalogPart(catalog, 'cannon', selection.cannon);
    const turret = findCatalogPart(catalog, 'turret', selection.turret);
    const chassis = findCatalogPart(catalog, 'chassis', selection.chassis);
    const belt = findCatalogPart(catalog, 'belt', selection.belt);
    if (!cannon || !turret || !chassis || !belt) {
        console.warn('Unable to build preset sprite key', selection);
        return null;
    }
    return `tank${[cannon, turret, chassis, belt].map(getPartCode).join('')}`;
}

function preload() {
    this.load.tilemapTiledJSON('techMap', 'assets/TechMap01.json');
    this.load.image('techMapPreview', 'assets/TechMapPreview.png');
    this.load.image('techMapAssets', 'assets/TechMap.png');
    this.load.image('techMapHelicopter', 'assets/TechMapHelicopter.png');
    this.load.image('techMapHelipad', 'assets/TechMapHelipad.png');
    this.load.image('concreteFloor', 'assets/ConcreteFloor.png');
    this.load.image('ball_projectile', 'assets/tanks/projectiles/bullet.png');
    this.load.audio('bulletFlyingStandard', 'assets/sounds/tank/bullet/flying/bulletFlyingStandard.mp3');
    this.load.audio('bulletHit', 'assets/sounds/tank/bullet/hit/bulletHit.mp3');
    this.load.audio('bulletHit2', 'assets/sounds/tank/bullet/hit/bulletHit2.mp3');
    this.load.audio('bulletHit3', 'assets/sounds/tank/bullet/hit/bulletHit3.mp3');
    this.load.audio('tankCollision1', 'assets/sounds/tank/collision/freesound_community-071856_hollow-tank-hit-47673.mp3');
    this.load.audio('tankCollision2', 'assets/sounds/tank/collision/freesound_community-hutch-hd-sfx-2014-0143-99637.mp3');
    this.load.audio('tankGun1', 'assets/sounds/tank/gun/rescopicsound-sci-fi-weapon-shoot-firing-pulse-tm-01-233821.mp3');
    this.load.audio('tankGun2', 'assets/sounds/tank/gun/rescopicsound-sci-fi-weapon-shoot-firing-pulse-tm-04-233827.mp3');
    this.load.audio('tankGun3', 'assets/sounds/tank/gun/rescopicsound-sci-fi-weapon-shoot-firing-pulse-tm-05-233825.mp3');
    this.load.audio('tankStopped', 'assets/sounds/tank/movement/tankStopped.mp3');
    this.load.audio('tankStartedMovement', 'assets/sounds/tank/movement/startedTheMovement.mp3');
    this.load.audio('tankMoving', 'assets/sounds/tank/movement/tankMoving.wav');
    this.load.audio('tankStoppingMovement', 'assets/sounds/tank/movement/tankStoppingMovement.mp3');
    this.load.audio('tankRebirth', 'assets/sounds/tank/tankRebirth.mp3');
    this.load.audio('tankDeactivating', 'assets/sounds/tank/desactivated/tankDisactivating.mp3');
    this.load.audio('tankScore', 'assets/sounds/battle/tankScore.mp3');
    this.load.audio('gameMusic1', 'assets/music/game/maksymmalko-game-gaming-minecraft-background-music-362844.mp3');
    this.load.audio('gameMusic2', 'assets/music/game/mondamusic-retro-arcade-game-music-512837.mp3');
    this.load.audio('gameMusic3', 'assets/music/game/nunusev-video-game-battle-music-535133.mp3');

    [
        ['belt-esteiras', 'assets/tanks/belts/track01.png'],
        ['belt-propulsores', 'assets/tanks/belts/track02.png'],
        ['turret-leve', 'assets/tanks/chasiss/turret01.png'],
        ['turret-equilibrada', 'assets/tanks/chasiss/turret02.png'],
        ['turret-pesada', 'assets/tanks/chasiss/turret03.png'],
        ['chassis-equilibrado', 'assets/tanks/chasiss/chassis02.png'],
        ['chassis-leve', 'assets/tanks/chasiss/chassis01.png'],
        ['cannon-parabolica', 'assets/tanks/cannons/cannon01.png'],
        ['cannon-onda-de-choque', 'assets/tanks/cannons/cannon02.png'],
        ['cannon-rapido', 'assets/tanks/cannons/cannon03.png']
    ].forEach(([key, path]) => this.load.image(key, path));

    // 2 tracks x 3 chassis x 3 turrets x 3 cannons = 54 generated tank presets
    const beltCodes = ['01', '02'];
    const chassisCodes = ['01', '02'];
    const turretCodes = ['01', '02', '03'];
    const cannonCodes = ['01', '02', '03'];

    beltCodes.forEach((beltCode) => {
        chassisCodes.forEach((chassisCode) => {
            turretCodes.forEach((turretCode) => {
                cannonCodes.forEach((cannonCode) => {
                    const key = `tank${cannonCode}${turretCode}${chassisCode}${beltCode}`;
                    const path = `assets/preset-sprites/version02/CyberAssets/${key}.png`;
                    this.load.image(key, path);
                });
            });
        });
    });
}

/* These were development proprierties, the actual proprieties to be used come from the build tank page (after the user clicks "INICIAR")*/
// var canonProperties = { cooldown: 100 };

// var ballProprierties = {
//     damage: 10,
//     speed: 300,
//     lifetime: 1800,
//     owner: undefined,
//     hitbox: undefined,
//     image: 'ball_projectile'
// };

// var tank1Properties = {
//     rotationSpeed: Phaser.Math.DegToRad(2),
//     movementSpeed: 80,
//     drag: 0.5,
//     life: undefined,
//     muzzleOffset: 86,
//     projectile: ballProprierties,
//     canon: canonProperties
// };

// var tank2Properties = {
//     rotationSpeed: Phaser.Math.DegToRad(2),
//     movementSpeed: 80,
//     drag: 0.5,
//     life: undefined,
//     muzzleOffset: 86,
//     projectile: ballProprierties,
//     canon: canonProperties
// };

function registerTankCollision(scene, contactKey, x) {
    scene.currentTankContacts.add(contactKey);
    if (!scene.activeTankContacts.has(contactKey)) {
        playRandomSound(scene, tankCollisionSoundKeys, x, { volume: 0.5 });
    }
}

function updateScoreboard(scene, player, points = 1) {
    const playerNumber = player === scene.player1 ? 'one' : 'two';
    scene.scoreboard[playerNumber].hits += 1;
    scene.scoreboard[playerNumber].score += points;
    updateScoreboardDisplay(scene);
}

function updateHealthDisplay(playerNumber, tank) {
    const health = Phaser.Math.Clamp(tank.life / tank.maxLife, 0, 1);
    const healthBar = document.getElementById(`player-${playerNumber}-health`);
    if (!healthBar) return;
    healthBar.style.width = `${health * 100}%`;
    healthBar.parentElement.dataset.health = health > 0.5 ? 'high' : (health > 0.25 ? 'medium' : 'low');
}

function updateScoreboardDisplay(scene) {
    const oneScore = document.getElementById('player-one-score');
    const twoScore = document.getElementById('player-two-score');
    if (!oneScore || !twoScore) return;
    oneScore.textContent = String(scene.scoreboard.one.score);
    twoScore.textContent = String(scene.scoreboard.two.score);
    oneScore.className = `scoreboard__score ${scene.scoreboard.one.score === scene.scoreboard.two.score ? 'scoreboard__score--tie' : scene.scoreboard.one.score > scene.scoreboard.two.score ? 'scoreboard__score--winning' : 'scoreboard__score--losing'}`;
    twoScore.className = `scoreboard__score ${scene.scoreboard.two.score === scene.scoreboard.one.score ? 'scoreboard__score--tie' : scene.scoreboard.two.score > scene.scoreboard.one.score ? 'scoreboard__score--winning' : 'scoreboard__score--losing'}`;
    if (scene.player1) updateHealthDisplay('one', scene.player1);
    if (scene.player2) updateHealthDisplay('two', scene.player2);
}

function showMatchResult(scene, winner) {
    if (scene.matchEnded) return;
    scene.matchEnded = true;
    const result = document.getElementById('match-result');
    if (!result) return;

    const winnerNumber = winner === scene.player1 ? 1 : 2;
    const winnerScore = scene.scoreboard[winnerNumber === 1 ? 'one' : 'two'].score;
    result.innerHTML = `
        <h2>QUAL JOGADOR</h2>
        <div class="match-result__winner">O JOGADOR ${winnerNumber}</div>
        <div class="match-result__victory">VENCEU</div>
        <div class="match-result__score">${winnerScore} x ${scene.scoreboard[winnerNumber === 1 ? 'two' : 'one'].score}</div>
        <div class="match-result__actions">
            <div>
                <button class="match-result__menu" type="button">IR AO MENU</button>
            </div>
            <div>
                <button class="match-result__rematch" type="button">JOGAR<br>DE NOVO</button>
            </div>
            <div>
                <button class="match-result__builder" type="button">MONTAR<br>OUTRO TANQUE</button>
            </div>
        </div>
    `;
    result.hidden = false;
    result.querySelector('.match-result__menu').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    result.querySelector('.match-result__rematch').addEventListener('click', () => {
        result.hidden = true;
        window.startGameWithSelections(window.__selectedTankBuild);
    });
    result.querySelector('.match-result__builder').addEventListener('click', () => {
        result.hidden = true;
        const gameScreen = document.getElementById('game-screen');
        const builderScreen = document.getElementById('builder-screen');
        if (gameScreen) {
            gameScreen.hidden = true;
            gameScreen.style.display = 'none';
        }
        if (game) {
            game.destroy(true);
            game = null;
        }
        if (window.resetTankBuilder) window.resetTankBuilder();
        if (builderScreen) {
            builderScreen.hidden = false;
            builderScreen.style.display = 'flex';
        }
    });
    if (window.pauseGameMusic) window.pauseGameMusic();
    scene.sound.pauseAll();
    scene.scene.pause();
}

function resetTank(tank, position) {
    tank.setPosition(position.x, position.y);
    tank.setRotation(position.rotation);
    updateTankHitbox(tank);
    ensureTankVisible(tank);
    tank.body.reset(position.x, position.y);
    tank.body.enable = true;
    tank.body.stop();
    tank.life = tank.maxLife;
    tank.nextHealAt = 0;
}

function respawnTanks(scene) {
    resetTank(scene.player1, defaultTankPositions.player1);
    resetTank(scene.player2, defaultTankPositions.player2);
    playTankRebirth(scene);
    updateScoreboardDisplay(scene);
}

function createHealingZones(scene, map) {
    return healingZoneTiles.map((tileArea) => {
        const zone = scene.add.zone(
            (tileArea.x + tileArea.width / 2) * map.tileWidth,
            (tileArea.y + tileArea.height / 2) * map.tileHeight,
            tileArea.width * map.tileWidth,
            tileArea.height * map.tileHeight
        );
        scene.physics.add.existing(zone, true);
        return zone;
    });
}

function healTank(scene, tank) {
    const now = scene.time.now;
    if (tank.life >= tank.maxLife || now < tank.nextHealAt) return;

    const tankConfig = tank === scene.player1 ? scene.player1Config : scene.player2Config;
    const healingAmount = tankConfig.projectile.damage;
    tank.life = Math.min(tank.maxLife, tank.life + healingAmount);
    tank.nextHealAt = now + healingCooldown;
    updateScoreboardDisplay(scene);
}

function getTankFromCollision(scene, target) {
    const gameObject = getCollisionGameObject(target);
    if (gameObject === scene.player1 || gameObject === scene.player2) {
        return gameObject;
    }
    return null;
}

function ensureTankVisible(tank) {
    tank.setVisible(true);
    tank.setAlpha(1);
    tank.each((child) => {
        child.setVisible(true);
        child.setAlpha(1);
    });
}

function handleProjectileHit(scene, projectile, target) {
    projectile = getCollisionGameObject(projectile);
    const tank = getTankFromCollision(scene, target);
    if (!projectile || !projectile.active || (tank && projectile.owner === tank)) return;
    playRandomSound(scene, bulletHitSoundKeys, projectile.x, { volume: 0.55 });
    if (tank && projectile.owner) {
        const ownerConfig = projectile.owner === scene.player1 ? scene.player1Config : scene.player2Config;
        tank.life = Math.max(0, tank.life - ownerConfig.projectile.damage);
        ensureTankVisible(tank);
        if (tank.life <= 0) {
            playTankDeactivated(scene, tank);
            playTankScore(scene, tank);
            updateScoreboard(scene, projectile.owner);
            if (scene.scoreboard.one.score >= 3 || scene.scoreboard.two.score >= 3) {
                showMatchResult(scene, projectile.owner);
            } else {
                respawnTanks(scene);
            }
        } else {
            updateScoreboardDisplay(scene);
        }
    }
    deactivateProjectile(scene, projectile);
}

function getProjectileFromCollision(first, second) {
    return [first, second]
        .map(getCollisionGameObject)
        .find((gameObject) => gameObject?.active && gameObject.owner);
}

function handleProjectileCollision(scene, first, second) {
    const firstProjectile = getCollisionGameObject(first);
    const secondProjectile = getCollisionGameObject(second);
    if (!firstProjectile?.active || !secondProjectile?.active) return;

    playRandomSound(scene, bulletHitSoundKeys, (firstProjectile.x + secondProjectile.x) / 2, { volume: 0.55 });
    deactivateProjectile(scene, firstProjectile);
    deactivateProjectile(scene, secondProjectile);
}

function centerBattleMap(scene, map) {
    scene.cameras.main.centerOn(map.widthInPixels / 2, map.heightInPixels / 2);
}

function create() {
    this.scoreboard = {
        one: { score: 0, hits: 0 },
        two: { score: 0, hits: 0 }
    };
    window.__activeBattleScene = this;
    updateScoreboardDisplay(this);

    const selectionState = window.__selectedTankBuild || {
        1: { belt: 'belt-esteiras', turret: 'turret-equilibrada', chassis: 'chassis-equilibrado', cannon: 'cannon-parabolica' },
        2: { belt: 'belt-propulsores', turret: 'turret-pesada', chassis: 'chassis-equilibrado', cannon: 'cannon-onda-de-choque' }
    };

    const map = this.make.tilemap({ key: 'techMap' });
    const baseTileset = map.addTilesetImage('TechMapAssets', 'techMapAssets');
    this.add.image(0, 0, 'techMapPreview').setOrigin(0).setDepth(-1);

    const buildingsLayer = map.createStaticLayer('buildings', baseTileset, 0, 0);
    buildingsLayer.setVisible(false);
    buildingsLayer.setCollisionByExclusion([-1, 0]);

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    const healingZones = createHealingZones(this, map);
    if (!window.startGameMusic) {
        startGameMusic(this);
    }
    this.events.once('shutdown', () => {
        if (this.gameMusic) {
            this.gameMusic.stop();
            this.gameMusic.destroy();
            this.gameMusic = null;
        }
    });

    getTankCatalog().then((catalog) => {
        const p1Key = buildPresetSpriteKey(catalog, selectionState[1]);
        const p2Key = buildPresetSpriteKey(catalog, selectionState[2]);

        const player1Config = buildTankRuntimeConfig(catalog, selectionState[1]);
        const player2Config = buildTankRuntimeConfig(catalog, selectionState[2]);

        if (!p1Key || !p2Key || !this.textures.exists(p1Key) || !this.textures.exists(p2Key)) {
            throw new Error('Selected tank preset sprite was not loaded');
        }

        this.player1 = createPresetTank(this, p1Key, defaultTankPositions.player1.x, defaultTankPositions.player1.y, defaultTankPositions.player1.rotation);
        this.player2 = createPresetTank(this, p2Key, defaultTankPositions.player2.x, defaultTankPositions.player2.y, defaultTankPositions.player2.rotation);

        this.player1.name = 'player1';
        this.player2.name = 'player2';
        createTankAudio(this, this.player1);
        createTankAudio(this, this.player2);
        playTankRebirth(this);

        this.player1Config = player1Config;
        this.player2Config = player2Config;
        this.player1.maxLife = this.player1Config.life || 100;
        this.player2.maxLife = this.player2Config.life || 100;
        this.player1.life = this.player1.maxLife;
        this.player2.life = this.player2.maxLife;
        this.player1.nextHealAt = 0;
        this.player2.nextHealAt = 0;
        updateScoreboardDisplay(this);

        this.player1.muzzleOffset = this.player1Config.muzzleOffset;
        this.player2.muzzleOffset = this.player2Config.muzzleOffset;

        this.activeTankContacts = new Set();
        this.currentTankContacts = new Set();
        this.physics.add.collider(this.player1, buildingsLayer, () => registerTankCollision(this, 'player1-building', this.player1.x));
        this.physics.add.collider(this.player2, buildingsLayer, () => registerTankCollision(this, 'player2-building', this.player2.x));
        this.physics.add.collider(this.player1, this.player2, () => registerTankCollision(this, 'player1-player2', (this.player1.x + this.player2.x) / 2));
        healingZones.forEach((zone) => {
            this.physics.add.overlap(this.player1, zone, () => healTank(this, this.player1));
            this.physics.add.overlap(this.player2, zone, () => healTank(this, this.player2));
        });

        this.player1Input = createTankInput(this.input.keyboard, {
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            shoot: Phaser.Input.Keyboard.KeyCodes.SPACE
        });

        this.player2Input = createTankInput(this.input.keyboard, {
            up: Phaser.Input.Keyboard.KeyCodes.UP,
            down: Phaser.Input.Keyboard.KeyCodes.DOWN,
            left: Phaser.Input.Keyboard.KeyCodes.LEFT,
            right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
            shoot: Phaser.Input.Keyboard.KeyCodes.L
        });

        this.player1Projectiles = this.physics.add.group({
            defaultKey: this.player1Config.projectile.image,
            maxSize: 20
        });

        this.player2Projectiles = this.physics.add.group({
            defaultKey: this.player2Config.projectile.image,
            maxSize: 20
        });

        const onProjectileBuildingCollision = (first, second) => {
            const projectile = getProjectileFromCollision(first, second);
            handleProjectileHit(this, projectile);
        };
        const onPlayer1ProjectileTankCollision = (first, second) => {
            const projectile = getProjectileFromCollision(first, second);
            handleProjectileHit(this, projectile, this.player2);
        };
        const onPlayer2ProjectileTankCollision = (first, second) => {
            const projectile = getProjectileFromCollision(first, second);
            handleProjectileHit(this, projectile, this.player1);
        };
        this.physics.add.collider(this.player1Projectiles, buildingsLayer, onProjectileBuildingCollision);
        this.physics.add.collider(this.player2Projectiles, buildingsLayer, onProjectileBuildingCollision);
        this.physics.add.collider(this.player1Projectiles, this.player2, onPlayer1ProjectileTankCollision);
        this.physics.add.collider(this.player2Projectiles, this.player1, onPlayer2ProjectileTankCollision);
        this.physics.add.collider(this.player1Projectiles, this.player2Projectiles, (first, second) => {
            handleProjectileCollision(this, first, second);
        });
        this.physics.world.on('worldbounds', (body) => {
            const projectile = body.gameObject;
            if (projectile && projectile.flyingSound) {
                deactivateProjectile(this, projectile);
            }
        });

        this.player1LastShot = 0;
        this.player2LastShot = 0;
        hideGameLoadingSplash();
    }).catch((error) => {
        console.error('Failed to build tanks from selected parts', error);
        hideGameLoadingSplash();
    });

    this.cameras.main.stopFollow();
    this.cameras.main.setZoom(1);
    centerBattleMap(this, map);
    this.scale.on('resize', () => centerBattleMap(this, map));
}

function applyVelocity(entity, velocityX, velocityY) {
    if (entity.body && typeof entity.body.setVelocity === 'function') {
        entity.body.setVelocity(velocityX, velocityY);
        return;
    }

    if (typeof entity.setVelocity === 'function') {
        entity.setVelocity(velocityX, velocityY);
    }
}

function createTankInput(keyboard, bindings) {
    return Object.fromEntries(
        Object.entries(bindings).map(([name, keyCode]) => [name, keyboard.addKey(keyCode, false)])
    );
}

function updateTankMovement(tank, config, input) {
    if (input.left.isDown) tank.rotation -= config.rotationSpeed;
    if (input.right.isDown) tank.rotation += config.rotationSpeed;
    updateTankHitbox(tank);

    const direction = input.up.isDown ? 1 : (input.down.isDown ? -1 : 0);
    if (direction !== 0) {
        applyVelocity(
            tank,
            Math.cos(tank.rotation) * config.movementSpeed * direction,
            Math.sin(tank.rotation) * config.movementSpeed * direction
        );
    }

    return direction;
}

function update() {
    if (!this.player1 || !this.player2 || !this.player1Input || !this.player2Input) {
        return;
    }

    this.activeTankContacts = this.currentTankContacts || new Set();
    this.currentTankContacts = new Set();

    this.player1.body.setVelocity(0, 0);
    this.player2.body.setVelocity(0, 0);

    const player1Direction = updateTankMovement(this.player1, this.player1Config, this.player1Input);
    updateTankAudio(this, this.player1, player1Direction);

    const player2Direction = updateTankMovement(this.player2, this.player2Config, this.player2Input);
    updateTankAudio(this, this.player2, player2Direction);

    [this.player1Projectiles, this.player2Projectiles].forEach((projectileGroup) => {
        projectileGroup.children.each((projectile) => {
            if (projectile.active) {
                setSoundPan(this, projectile.flyingSound, projectile.x);
            }
        });
    });

    const player1cooldownFinished = this.time.now > this.player1LastShot + this.player1Config.canon.cooldown;
    if (Phaser.Input.Keyboard.JustDown(this.player1Input.shoot) && player1cooldownFinished) {
        shootProjectile(this, this.player1, this.player1Config.projectile, this.player1Projectiles);
        this.player1LastShot = this.time.now;
    }

    const player2cooldownFinished = this.time.now > this.player2LastShot + this.player2Config.canon.cooldown;
    if (Phaser.Input.Keyboard.JustDown(this.player2Input.shoot) && player2cooldownFinished) {
        shootProjectile(this, this.player2, this.player2Config.projectile, this.player2Projectiles);
        this.player2LastShot = this.time.now;
    }
}

function toggleGamePause() {
    const scene = window.__activeBattleScene;
    const button = document.getElementById('pause-game');
    if (!scene || !button) return;
    const isPaused = scene.scene.isPaused();
    if (isPaused) {
        scene.scene.resume();
        scene.sound.resumeAll();
        if (window.resumeGameMusic) window.resumeGameMusic();
    } else {
        scene.scene.pause();
        scene.sound.pauseAll();
        if (window.pauseGameMusic) window.pauseGameMusic();
    }
    button.classList.toggle('is-paused', !isPaused);
    button.setAttribute('aria-pressed', String(!isPaused));
    button.setAttribute('aria-label', isPaused ? 'Pausar jogo' : 'Retomar jogo');
    button.firstElementChild.textContent = isPaused ? 'Ⅱ' : '▶';
}

document.getElementById('pause-game')?.addEventListener('click', toggleGamePause);

function shootProjectile(scene, player, projectileData, projectileGroup) {
    const spawnX = player.x + Math.cos(player.rotation) * player.muzzleOffset;
    const spawnY = player.y + Math.sin(player.rotation) * player.muzzleOffset;
    const projectile = projectileGroup.get(spawnX, spawnY);

    if (!projectile) return;

    projectile.setActive(true);
    projectile.setVisible(true);
    projectile.body.enable = true;
    projectile.body.reset(spawnX, spawnY);
    projectile.setRotation(player.rotation);

    scene.physics.velocityFromRotation(player.rotation, projectileData.speed, projectile.body.velocity);
    projectile.setDepth(10);
    projectile.body.setAllowGravity(false);
    projectile.body.setCollideWorldBounds(true);
    projectile.body.onWorldBounds = true;
    projectile.owner = player;
    projectile.flyingSound = scene.sound.add('bulletFlyingStandard', { loop: true, volume: 0.3 });
    projectile.flyingSound.play();
    setSoundPan(scene, projectile.flyingSound, projectile.x);
    playRandomSound(scene, tankGunSoundKeys, player.x, { volume: 0.55 });
    projectile.lifetimeTimer = scene.time.delayedCall(projectileData.lifetime, () => {
        deactivateProjectile(scene, projectile);
    });
}

if (typeof window !== 'undefined') {
    window.__selectedTankBuild = window.__selectedTankBuild || {
        1: { belt: 'belt-esteiras', turret: 'turret-equilibrada', chassis: 'chassis-equilibrado', cannon: 'cannon-parabolica' },
        2: { belt: 'belt-propulsores', turret: 'turret-pesada', chassis: 'chassis-equilibrado', cannon: 'cannon-onda-de-choque' }
    };
}

let game = null;
let gameLoadingSplashShownAt = 0;

const bulletHitSoundKeys = ['bulletHit', 'bulletHit2', 'bulletHit3'];
const tankCollisionSoundKeys = ['tankCollision1', 'tankCollision2'];
const tankGunSoundKeys = ['tankGun1', 'tankGun2', 'tankGun3'];
const gameMusicKeys = ['gameMusic1', 'gameMusic2', 'gameMusic3'];

function randomSoundKey(keys) {
    return keys[Math.floor(Math.random() * keys.length)];
}

function getSoundPan(scene, x) {
    const worldWidth = (scene.matter && scene.matter.world && scene.matter.world.bounds)
        ? scene.matter.world.bounds.width
        : (scene.physics && scene.physics.world && scene.physics.world.bounds ? scene.physics.world.bounds.width : scene.scale.width);
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
    tank.audio.stopped.play();
    setSoundPan(scene, tank.audio.stopped, tank.x);
}

function updateTankAudio(scene, tank, direction) {
    if (!tank.audio) return;

    Object.values(tank.audio).forEach((sound) => setSoundPan(scene, sound, tank.x));

    if (direction !== 0) {
        if (tank.movementDirection !== 0 && tank.movementDirection !== direction) {
            stopSound(tank.audio.started);
            stopSound(tank.audio.stopping);
            stopSound(tank.audio.moving);
            tank.audio.moving.play();
            tank.movementState = 'moving';
        } else if (tank.movementState === 'stopped' || tank.movementState === 'stopping') {
            stopSound(tank.audio.stopped);
            stopSound(tank.audio.stopping);
            stopSound(tank.audio.moving);
            tank.audio.started.play();
            tank.movementState = 'starting';
            tank.audio.started.once('complete', () => {
                if (tank.movementDirection !== 0 && tank.audio.started.isPlaying === false) {
                    tank.audio.moving.play();
                    tank.movementState = 'moving';
                }
            });
        }
        tank.movementDirection = direction;
        return;
    }

    if (tank.movementDirection !== 0 && tank.movementState !== 'stopping' && tank.movementState !== 'stopped') {
        stopSound(tank.audio.started);
        stopSound(tank.audio.moving);
        tank.audio.stopping.play();
        tank.movementState = 'stopping';
        tank.audio.stopping.once('complete', () => {
            if (tank.movementDirection === 0 && tank.audio.stopping.isPlaying === false) {
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

function stopProjectileSound(projectile) {
    stopSound(projectile.flyingSound);
    projectile.flyingSound = null;
    if (projectile.lifetimeTimer) {
        projectile.lifetimeTimer.remove(false);
        projectile.lifetimeTimer = null;
    }
}

function deactivateProjectile(scene, projectile) {
    if (!projectile) return;

    if (projectile.active !== false) {
        stopProjectileSound(projectile);
    }

    projectile.owner = null;
    projectile.isProjectile = false;
    projectile.active = false;
    projectile.setVisible(false);
    projectile.setVelocity(0, 0);
    projectile.setPosition(-9999, -9999);

    if (scene && Array.isArray(scene.player1Projectiles)) {
        scene.player1Projectiles = scene.player1Projectiles.filter((item) => item !== projectile);
    }
    if (scene && Array.isArray(scene.player2Projectiles)) {
        scene.player2Projectiles = scene.player2Projectiles.filter((item) => item !== projectile);
    }

    if (projectile.body && typeof projectile.body.destroy === 'function') {
        projectile.body.destroy();
    }
    if (typeof projectile.destroy === 'function') {
        projectile.destroy();
    }
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
            default: 'matter',
            matter: {
                gravity: { y: 0 },
                debug: true
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
    const cannon = findCatalogPart(catalog, 'cannon', selection.cannon);

    if (!belt || !chassis || !cannon) {
        console.warn('Tank selection incomplete', selection);
        return null;
    }

    return { belt, chassis, cannon };
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
    const projectileSpeed = Number(finishedTank.projectileSpeed ?? cannon.stats.projectileSpeed ?? 300) * 0.75;
    const damage = Number(finishedTank.damage ?? cannon.stats.damage ?? 10);
    const cooldown = Number(finishedTank.cooldown ?? cannon.stats.cooldown ?? 100);
    const movementSpeed = Number(finishedTank.speed ?? belt.stats.speed ?? 80) * 0.65;
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

function configureMatterTankBody(entity, width, height, radius = 8) {
    if (!entity || typeof entity.setBody !== 'function') return;

    entity.setBody({
        type: 'rectangle',
        width,
        height,
        chamfer: { radius }
    });
    entity.setFrictionAir(0.05);
    entity.setDensity(0.0012);
    entity.setMass(1.2);

    if (entity.body) {
        entity.body.frictionAir = 0.05;
        entity.body.density = 0.0012;
        entity.body.mass = 1.2;
        entity.body.inertia = Infinity;
    }
}

function createCompositeTank(scene, tankDefinition, x, y, angle = 0) {
    const container = scene.add.container(x, y);
    container.rotation = angle;
    container.name = 'tank';

    const beltDisplay = tankDefinition.belt.display || { x: 0, y: 0, scaleX: 1, scaleY: 1 };
    const chassisDisplay = tankDefinition.chassis.display || { x: 0, y: 0, scaleX: 1, scaleY: 1 };
    const cannonDisplay = tankDefinition.cannon.display || { x: 0, y: 0, scaleX: 1, scaleY: 1 };

    const leftBelt = scene.add.image(-38 + (beltDisplay.x || 0), beltDisplay.y || 0, tankDefinition.belt.id)
        .setOrigin(0.5)
        .setScale(beltDisplay.scaleX || 1, beltDisplay.scaleY || 1);

    const rightBelt = scene.add.image(38 + (beltDisplay.x || 0), beltDisplay.y || 0, tankDefinition.belt.id)
        .setOrigin(0.5)
        .setScale(beltDisplay.scaleX || 1, beltDisplay.scaleY || 1);

    const chassisSprite = scene.add.image(chassisDisplay.x || 0, chassisDisplay.y || 0, tankDefinition.chassis.id)
        .setOrigin(0.5)
        .setScale(chassisDisplay.scaleX || 1, chassisDisplay.scaleY || 1);

    const cannonSprite = scene.add.image(cannonDisplay.x || 0, cannonDisplay.y || 0, tankDefinition.cannon.id)
        .setOrigin(0.5)
        .setScale(cannonDisplay.scaleX || 1, cannonDisplay.scaleY || 1);

    container.add([leftBelt, rightBelt, chassisSprite, cannonSprite]);
    scene.matter.add.existing(container);
    if (container.body) {
        container.setBody({
            type: 'rectangle',
            width: 130,
            height: 70,
            chamfer: { radius: 8 }
        });
    }

    return container;
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
        1: { belt: 'belt-esteiras', chassis: 'chassis-equilibrado', cannon: 'cannon-parabolica' },
        2: { belt: 'belt-propulsores', chassis: 'chassis-pesado', cannon: 'cannon-onda-de-choque' }
    };

    if (game) {
        game.destroy(true);
        game = null;
    }

    game = new Phaser.Game(buildPhaserConfig());
};

function buildPresetSpriteKey(selection) {
    if (!selection) return null;
    return `${selection.belt}__${selection.chassis}__${selection.cannon}`;
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
    this.load.audio('gameMusic1', 'assets/music/game/maksymmalko-game-gaming-minecraft-background-music-362844.mp3');
    this.load.audio('gameMusic2', 'assets/music/game/mondamusic-retro-arcade-game-music-512837.mp3');
    this.load.audio('gameMusic3', 'assets/music/game/nunusev-video-game-battle-music-535133.mp3');

    [
        ['belt-esteiras', 'assets/tanks/belts/Track01.png'],
        ['belt-propulsores', 'assets/tanks/belts/Track02.png'],
        ['chassis-equilibrado', 'assets/tanks/chasiss/Chassis01.png'],
        ['chassis-leve', 'assets/tanks/chasiss/Chassis02.png'],
        ['chassis-pesado', 'assets/tanks/chasiss/Chassis03.png'],
        ['cannon-parabolica', 'assets/tanks/cannons/Cannon01.png'],
        ['cannon-onda-de-choque', 'assets/tanks/cannons/Cannon02.png'],
        ['cannon-rapido', 'assets/tanks/cannons/Cannon03.png']
    ].forEach(([key, path]) => this.load.image(key, path));

    // 2 belts x 3 chassis x 3 cannons = 18 generated tank presets
    const beltIds = ['belt-esteiras', 'belt-propulsores'];
    const chassisIds = ['chassis-equilibrado', 'chassis-leve', 'chassis-pesado'];
    const cannonIds = ['cannon-parabolica', 'cannon-onda-de-choque', 'cannon-rapido'];

    beltIds.forEach((beltId) => {
        chassisIds.forEach((chassisId) => {
            cannonIds.forEach((cannonId) => {
                const key = `${beltId}__${chassisId}__${cannonId}`;
                const path = `assets/preset-sprites/${key}.png`;
                this.load.image(key, path);
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

function updateScoreboard(scene, player, points = 100) {
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

function handleProjectileHit(scene, projectile, target) {
    if (!projectile || !projectile.active || (target && projectile.owner === target)) return;
    playRandomSound(scene, bulletHitSoundKeys, projectile.x, { volume: 0.55 });
    if (target && projectile.owner) {
        updateScoreboard(scene, projectile.owner);
        const ownerConfig = projectile.owner === scene.player1 ? scene.player1Config : scene.player2Config;
        target.life = Math.max(0, target.life - ownerConfig.projectile.damage);
        updateScoreboardDisplay(scene);
    }
    deactivateProjectile(scene, projectile);
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
        1: { belt: 'belt-esteiras', chassis: 'chassis-equilibrado', cannon: 'cannon-parabolica' },
        2: { belt: 'belt-propulsores', chassis: 'chassis-pesado', cannon: 'cannon-onda-de-choque' }
    };

    const map = this.make.tilemap({ key: 'techMap' });
    const baseTileset = map.addTilesetImage('TechMapAssets', 'techMapAssets');
    this.add.image(0, 0, 'techMapPreview').setOrigin(0).setDepth(-1);

    const buildingsLayer = map.createStaticLayer('buildings', baseTileset, 0, 0);
    buildingsLayer.setVisible(false);
    buildingsLayer.setCollisionByExclusion([-1, 0]);

    this.matter.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels, 64, true, true, true, true);
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
        const player1Build = buildTankSelection(catalog, selectionState[1]);
        const player2Build = buildTankSelection(catalog, selectionState[2]);

        const p1Key = buildPresetSpriteKey(selectionState[1]);
        const p2Key = buildPresetSpriteKey(selectionState[2]);

        const player1Config = buildTankRuntimeConfig(catalog, selectionState[1]);
        const player2Config = buildTankRuntimeConfig(catalog, selectionState[2]);

        if (this.textures.exists(p1Key)) {
            this.player1 = this.matter.add.image(88, 367, p1Key);
            this.player1.setScale(1);
            configureMatterTankBody(this.player1, 130, 70, 8);
        } else {
            this.player1 = createCompositeTank(this, player1Build, 88, 367, 0);
        }

        if (this.textures.exists(p2Key)) {
            this.player2 = this.matter.add.image(1830, 782, p2Key).setAngle(180);
            this.player2.setScale(1);
            configureMatterTankBody(this.player2, 130, 70, 8);
        } else {
            this.player2 = createCompositeTank(this, player2Build, 1830, 782, Math.PI);
        }

        this.player1.name = 'player1';
        this.player2.name = 'player2';
        if (this.player1.body) this.player1.body.inertia = Infinity;
        if (this.player2.body) this.player2.body.inertia = Infinity;
        createTankAudio(this, this.player1);
        createTankAudio(this, this.player2);
        playTankRebirth(this);

        this.player1Config = player1Config;
        this.player2Config = player2Config;
        this.player1.maxLife = this.player1Config.life || 100;
        this.player2.maxLife = this.player2Config.life || 100;
        this.player1.life = this.player1.maxLife;
        this.player2.life = this.player2.maxLife;
        updateScoreboardDisplay(this);

        this.player1.muzzleOffset = this.player1Config.muzzleOffset;
        this.player2.muzzleOffset = this.player2Config.muzzleOffset;

        this.activeTankContacts = new Set();
        this.currentTankContacts = new Set();
        this.matter.world.on('collisionstart', (event) => {
            const pairs = event.pairs || [];

            for (const pair of pairs) {
                const bodyA = pair.bodyA && pair.bodyA.gameObject ? pair.bodyA.gameObject : null;
                const bodyB = pair.bodyB && pair.bodyB.gameObject ? pair.bodyB.gameObject : null;

                if (!bodyA || !bodyB) continue;

                const isPlayer1Tank = bodyA === this.player1 || bodyB === this.player1;
                const isPlayer2Tank = bodyA === this.player2 || bodyB === this.player2;

                if (isPlayer1Tank && isPlayer2Tank) {
                    registerTankCollision(this, 'player1-player2', (this.player1.x + this.player2.x) / 2);
                }

                const projectile = bodyA && bodyA.isProjectile ? bodyA : (bodyB && bodyB.isProjectile ? bodyB : null);
                const targetTank = bodyA && (bodyA === this.player1 || bodyA === this.player2) ? bodyA : (bodyB && (bodyB === this.player1 || bodyB === this.player2) ? bodyB : null);

                if (projectile && targetTank) {
                    handleProjectileHit(this, projectile, targetTank);
                }
            }
        });

        this.player1Input = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            shoot: Phaser.Input.Keyboard.KeyCodes.SPACE
        });

        this.player2Input = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.UP,
            down: Phaser.Input.Keyboard.KeyCodes.DOWN,
            left: Phaser.Input.Keyboard.KeyCodes.LEFT,
            right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
            shoot: Phaser.Input.Keyboard.KeyCodes.L
        });
        
        this.player1Projectiles = [];
        this.player2Projectiles = [];

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
    if (typeof entity.setVelocity === 'function') {
        entity.setVelocity(velocityX, velocityY);
        return;
    }

    if (entity.body && typeof entity.body.setVelocity === 'function') {
        entity.body.setVelocity(velocityX, velocityY);
    }
}

function update() {
    if (!this.player1 || !this.player2 || !this.player1Input || !this.player2Input) {
        return;
    }

    const dampenAngularVelocity = (entity) => {
        if (!entity || !entity.body) return;
        entity.body.angularVelocity *= 0.92;
        if (Math.abs(entity.body.angularVelocity) < 0.01) {
            entity.body.angularVelocity = 0;
        }
    };

    this.activeTankContacts = this.currentTankContacts || new Set();
    this.currentTankContacts = new Set();

    this.player1.setVelocity(0, 0);
    this.player2.setVelocity(0, 0);
    dampenAngularVelocity(this.player1);
    dampenAngularVelocity(this.player2);

    if (this.player1Input.left.isDown) this.player1.rotation -= this.player1Config.rotationSpeed;
    else if (this.player1Input.right.isDown) this.player1.rotation += this.player1Config.rotationSpeed;

    const player1Direction = this.player1Input.up.isDown ? 1 : (this.player1Input.down.isDown ? -1 : 0);
    if (player1Direction !== 0) {
        applyVelocity(
            this.player1,
            Math.cos(this.player1.rotation) * this.player1Config.movementSpeed * player1Direction,
            Math.sin(this.player1.rotation) * this.player1Config.movementSpeed * player1Direction
        );
    }
    updateTankAudio(this, this.player1, player1Direction);

    if (this.player2Input.left.isDown) this.player2.rotation -= this.player2Config.rotationSpeed;
    else if (this.player2Input.right.isDown) this.player2.rotation += this.player2Config.rotationSpeed;

    const player2Direction = this.player2Input.up.isDown ? 1 : (this.player2Input.down.isDown ? -1 : 0);
    if (player2Direction !== 0) {
        applyVelocity(
            this.player2,
            Math.cos(this.player2.rotation) * this.player2Config.movementSpeed * player2Direction,
            Math.sin(this.player2.rotation) * this.player2Config.movementSpeed * player2Direction
        );
    }
    updateTankAudio(this, this.player2, player2Direction);

    [this.player1Projectiles, this.player2Projectiles].forEach((projectiles) => {
        (projectiles || []).forEach((projectile) => {
            if (projectile && projectile.active) {
                setSoundPan(this, projectile.flyingSound, projectile.x);
            }
        });
    });

    const player1cooldownFinished = this.time.now > this.player1LastShot + this.player1Config.canon.cooldown;
    if (Phaser.Input.Keyboard.JustDown(this.player1Input.shoot) && player1cooldownFinished) {
        shootProjectile(this, this.player1, this.player1Config.projectile);
        this.player1LastShot = this.time.now;
    }

    const player2cooldownFinished = this.time.now > this.player2LastShot + this.player2Config.canon.cooldown;
    if (Phaser.Input.Keyboard.JustDown(this.player2Input.shoot) && player2cooldownFinished) {
        shootProjectile(this, this.player2, this.player2Config.projectile);
        this.player2LastShot = this.time.now;
    }
}

function toggleGamePause() {
    const scene = window.__activeBattleScene;
    const button = document.getElementById('pause-game');
    if (!scene || !button) return;
    const isPaused = scene.scene.isPaused();
    if (isPaused) scene.scene.resume();
    else scene.scene.pause();
    button.classList.toggle('is-paused', !isPaused);
    button.setAttribute('aria-pressed', String(!isPaused));
    button.setAttribute('aria-label', isPaused ? 'Pausar jogo' : 'Retomar jogo');
    button.firstElementChild.textContent = isPaused ? 'Ⅱ' : '▶';
}

document.getElementById('pause-game')?.addEventListener('click', toggleGamePause);

function shootProjectile(scene, player, projectileData) {
    const spawnX = player.x + Math.cos(player.rotation) * player.muzzleOffset;
    const spawnY = player.y + Math.sin(player.rotation) * player.muzzleOffset;
    const projectilePool = player === scene.player1 ? scene.player1Projectiles : scene.player2Projectiles;
    const projectile = scene.matter.add.image(spawnX, spawnY, projectileData.image);

    if (!projectile) return;

    projectile.setActive(true);
    projectile.setVisible(true);
    projectile.isProjectile = true;
    projectile.active = true;
    projectile.owner = player;
    projectile.setPosition(spawnX, spawnY);
    projectile.setRotation(player.rotation);
    projectile.setBody({
        type: 'rectangle',
        width: 12,
        height: 8,
        chamfer: { radius: 3 }
    });
    projectile.setIgnoreGravity(true);
    projectile.setFrictionAir(0.01);
    if (projectile.body) {
        projectile.body.frictionAir = 0.01;
    }
    projectile.setDepth(10);

    const velocity = projectileData.speed;
    const vx = Math.cos(player.rotation) * velocity;
    const vy = Math.sin(player.rotation) * velocity;
    projectile.setVelocity(vx, vy);

    if (Array.isArray(projectilePool)) {
        projectilePool.push(projectile);
    }

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
        1: { belt: 'belt-esteiras', chassis: 'chassis-equilibrado', cannon: 'cannon-parabolica' },
        2: { belt: 'belt-propulsores', chassis: 'chassis-pesado', cannon: 'cannon-onda-de-choque' }
    };
}


let game = null;

function buildPhaserConfig() {
    return {
        type: Phaser.Auto,
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: 1920,
            height: 1080,
        },
        parent: 'game-screen',
        scene: {
            preload: preload,
            create: create,
            update: update
        },
        physics: {
            default: 'arcade',
            arcade: {
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
    scene.physics.add.existing(container);

    if (container.body) {
        container.body.setCollideWorldBounds(true);
        container.body.setSize(140, 70);
        container.body.setOffset(-70, -35);
    }

    return container;
}

window.startGameWithSelections = function (selections) {
    const builderScreen = document.getElementById('builder-screen');
    const gameScreen = document.getElementById('game-screen');

    if (!gameScreen) {
        console.error('Missing element #game-screen.');
        return;
    }

    if (builderScreen) {
        builderScreen.style.display = 'none';
    }

    gameScreen.hidden = false;
    gameScreen.style.display = 'block';

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
    this.load.image('ball_projectile', 'assets/tanks/projectiles/ball_bullet.png');

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

function create() {
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

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    getTankCatalog().then((catalog) => {
        const player1Build = buildTankSelection(catalog, selectionState[1]);
        const player2Build = buildTankSelection(catalog, selectionState[2]);

        const p1Key = buildPresetSpriteKey(selectionState[1]);
        const p2Key = buildPresetSpriteKey(selectionState[2]);

        const player1Config = buildTankRuntimeConfig(catalog, selectionState[1]);
        const player2Config = buildTankRuntimeConfig(catalog, selectionState[2]);

        if (this.textures.exists(p1Key)) {
            this.player1 = this.physics.add.image(88, 367, p1Key);
            this.player1.setScale(1);
        } else {
            this.player1 = createCompositeTank(this, player1Build, 88, 367, 0);
        }

        if (this.textures.exists(p2Key)) {
            this.player2 = this.physics.add.image(1830, 782, p2Key).setAngle(180);
            this.player2.setScale(1);
        } else {
            this.player2 = createCompositeTank(this, player2Build, 1830, 782, Math.PI);
        }

        this.player1.name = 'player1';
        this.player2.name = 'player2';

        this.player1Config = player1Config;
        this.player2Config = player2Config;

        this.player1.muzzleOffset = this.player1Config.muzzleOffset;
        this.player2.muzzleOffset = this.player2Config.muzzleOffset;

        this.physics.add.collider(this.player1, buildingsLayer);
        this.physics.add.collider(this.player2, buildingsLayer);
        this.physics.add.collider(this.player1, this.player2);

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

        this.player1Projectiles = this.physics.add.group({
            defaultKey: this.player1Config.projectile.image,
            maxSize: 1
        });

        this.player2Projectiles = this.physics.add.group({
            defaultKey: this.player2Config.projectile.image,
            maxSize: 1
        });

        this.physics.add.collider(this.player1Projectiles, buildingsLayer);
        this.physics.add.collider(this.player2Projectiles, buildingsLayer);

        this.player1LastShot = 0;
        this.player2LastShot = 0;
    }).catch((error) => {
        console.error('Failed to build tanks from selected parts', error);
    });

    this.cameras.main.stopFollow();
    this.cameras.main.setZoom(1);
    this.cameras.main.centerOn(map.widthInPixels / 2, map.heightInPixels / 2);
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

function update() {
    if (!this.player1 || !this.player2 || !this.player1Input || !this.player2Input) {
        return;
    }

    this.player1.body.setVelocity(0, 0);
    this.player2.body.setVelocity(0, 0);

    if (this.player1Input.left.isDown) this.player1.rotation -= this.player1Config.rotationSpeed;
    else if (this.player1Input.right.isDown) this.player1.rotation += this.player1Config.rotationSpeed;

    if (this.player1Input.up.isDown) {
        applyVelocity(
            this.player1,
            Math.cos(this.player1.rotation) * this.player1Config.movementSpeed,
            Math.sin(this.player1.rotation) * this.player1Config.movementSpeed
        );
    }

    if (this.player1Input.down.isDown) {
        applyVelocity(
            this.player1,
            Math.cos(this.player1.rotation) * this.player1Config.movementSpeed * -1,
            Math.sin(this.player1.rotation) * this.player1Config.movementSpeed * -1
        );
    }

    if (this.player2Input.left.isDown) this.player2.rotation -= this.player2Config.rotationSpeed;
    else if (this.player2Input.right.isDown) this.player2.rotation += this.player2Config.rotationSpeed;

    if (this.player2Input.up.isDown) {
        applyVelocity(
            this.player2,
            Math.cos(this.player2.rotation) * this.player2Config.movementSpeed,
            Math.sin(this.player2.rotation) * this.player2Config.movementSpeed
        );
    }

    if (this.player2Input.down.isDown) {
        applyVelocity(
            this.player2,
            Math.cos(this.player2.rotation) * this.player2Config.movementSpeed * -1,
            Math.sin(this.player2.rotation) * this.player2Config.movementSpeed * -1
        );
    }

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

function shootProjectile(scene, player, projectileData, projectileGroup) {
    const spawnX = player.x + Math.cos(player.rotation) * player.muzzleOffset;
    const spawnY = player.y + Math.sin(player.rotation) * player.muzzleOffset;
    const projectile = projectileGroup.get(spawnX, spawnY);

    if (!projectile) return;

    projectile.setActive(true);
    projectile.setVisible(true);
    projectile.setRotation(player.rotation);

    scene.physics.velocityFromRotation(player.rotation, projectileData.speed, projectile.body.velocity);
    projectile.setDepth(10);
    projectile.body.setAllowGravity(false);
    projectile.body.setCollideWorldBounds(true);
    projectile.body.onWorldBounds = true;
    projectile.owner = projectileData.owner;
}

if (typeof window !== 'undefined') {
    window.__selectedTankBuild = window.__selectedTankBuild || {
        1: { belt: 'belt-esteiras', chassis: 'chassis-equilibrado', cannon: 'cannon-parabolica' },
        2: { belt: 'belt-propulsores', chassis: 'chassis-pesado', cannon: 'cannon-onda-de-choque' }
    };
}


const config = {
    type: Phaser.Auto, //WebGL default
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1920, // This -> 1920x1080 is the size of the background image.
        height: 1080,
    },
    parent: 'game-screen',
    scene: { // the this.property refers to here
        preload: preload,
        create: create,
        update: update
    },
    physics: {
        default: 'arcade',
        topView: {
            gravity: { y: 0 },
            debug: true
        }
    },
}

var game = new Phaser.Game(config);

function preload() // Setup function (load assets)
{
    this.load.tilemapTiledJSON('techMap', 'assets/TechMap01.json');
    this.load.image('techMapPreview', 'assets/TechMapPreview.png');
    this.load.image('techMapAssets', 'assets/TechMap.png');
    this.load.image('techMapHelicopter', 'assets/TechMapHelicopter.png');
    this.load.image('techMapHelipad', 'assets/TechMapHelipad.png');
    this.load.image('concreteFloor', 'assets/ConcreteFloor.png');
    this.load.image('player1', 'assets/tank_1.png');
    this.load.image('ball_projectile', 'assets/ball_bullet.png')
}

/* OBJECTS */
var canonProperties = {
    cooldown: 100,
}

var ballProprierties = {
    damage: 10,
    speed: 300,
    lifetime: 1800,
    owner: undefined, // The player who shoot the projectile
    hitbox: undefined,
    image: 'ball_projectile'
}

var tank1Properties = { // These are the values that will change based on the user choices.
    rotationSpeed: Phaser.Math.DegToRad(2),
    movementSpeed: 80,
    drag: 0.5,
    life: undefined,
    muzzleOffset: 5,
    projectile: ballProprierties,
    canon: canonProperties
}

var tank2Properties = { // These are the values that will change based on the user choices.
    rotationSpeed: Phaser.Math.DegToRad(2),
    movementSpeed: 80,
    drag: 0.5,
    life: undefined,
    muzzleOffset: 5,
    projectile: ballProprierties,
    canon: canonProperties
}

/* END OBJECTS */

function create() // Create the scene, renders, world building
{

    const map = this.make.tilemap({ key: 'techMap' });
    const baseTileset = map.addTilesetImage('TechMapAssets', 'techMapAssets');
    this.add.image(0, 0, 'techMapPreview').setOrigin(0).setDepth(-1);

    const buildingsLayer = map.createStaticLayer('buildings', baseTileset, 0, 0);
    buildingsLayer.setVisible(false);

    buildingsLayer.setCollisionByExclusion([-1, 0]);

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    // all objects are positioned based on their center
    this.player1 = this.physics.add.sprite(88, 367, 'player1') // Sprite with physics
    this.player2 = this.physics.add.sprite(1830, 782, 'player1')
    this.player1.name = "player1";
    this.player2.name = "player2";
    

    this.player1.setCollideWorldBounds(true); // Doesn't exit the scene borders
    this.player2.setCollideWorldBounds(true);
    this.physics.add.collider(this.player1, buildingsLayer);
    this.physics.add.collider(this.player2, buildingsLayer);
    this.physics.add.collider(this.player1, this.player2);
    this.cameras.main.stopFollow();
    this.cameras.main.setZoom(1);
    this.cameras.main.centerOn(map.widthInPixels / 2, map.heightInPixels / 2);

    this.player1.setScale(0.42)
    this.player2.setScale(0.42).setAngle(180)

    this.player1.muzzleOffset = tank1Properties.muzzleOffset;
    this.player2.muzzleOffset = tank2Properties.muzzleOffset;


    //player1
    this.player1Input = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
        shoot: Phaser.Input.Keyboard.KeyCodes.SPACE
    });

    //player2
    this.player2Input = this.input.keyboard.addKeys({// Use numpad
        up: Phaser.Input.Keyboard.KeyCodes.UP,
        down: Phaser.Input.Keyboard.KeyCodes.DOWN,
        left: Phaser.Input.Keyboard.KeyCodes.LEFT,
        right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
        shoot: Phaser.Input.Keyboard.KeyCodes.L 
    });


    /* Projectiles */

    // Define the existence of the projectile group
    this.player1Projectiles = this.physics.add.group({
        defaultKey: ballProprierties.image,
        maxSize: 1 // Quantity of projectiles in the scene
    })
    
    this.player2Projectiles = this.physics.add.group({
        defaultKey: ballProprierties.image,
        maxSize: 1
    })

    this.physics.add.collider(this.player1Projectiles, buildingsLayer);
    this.physics.add.collider(this.player2Projectiles, buildingsLayer);

    

    // for cooldown
    this.player1LastShot = 0;
    this.player2LastShot = 0;
}

function update() { // Game mainloop

    // Movement speed
    this.player1.setVelocity(0); // Reset velocity between frames (no acceleration)
    this.player2.setVelocity(0); // Reset velocity between frames (no acceleration)

    // Player1 movement

    // Rotation

    if (this.player1Input.left.isDown) this.player1.rotation -= tank1Properties.rotationSpeed;
    else if (this.player1Input.right.isDown) this.player1.rotation += tank1Properties.rotationSpeed;

    if (this.player1Input.up.isDown) {
        this.player1.setVelocity(
            Math.cos(this.player1.rotation) * tank1Properties.movementSpeed,
            Math.sin(this.player1.rotation) * tank1Properties.movementSpeed,
        );
    }
    if (this.player1Input.down.isDown) {
        this.player1.setVelocity(
            Math.cos(this.player1.rotation) * tank1Properties.movementSpeed * -1,
            Math.sin(this.player1.rotation) * tank1Properties.movementSpeed * -1,
        );

    };


    // Player2 movement
    // Rotation
    if (this.player2Input.left.isDown) this.player2.rotation -= tank2Properties.rotationSpeed;
    else if (this.player2Input.right.isDown) this.player2.rotation += tank2Properties.rotationSpeed;

    if (this.player2Input.up.isDown) {
        this.player2.setVelocity(
            Math.cos(this.player2.rotation) * tank2Properties.movementSpeed,
            Math.sin(this.player2.rotation) * tank2Properties.movementSpeed,
        );
    }
    if (this.player2Input.down.isDown) {
        this.player2.setVelocity(
            Math.cos(this.player2.rotation) * tank2Properties.movementSpeed * -1,
            Math.sin(this.player2.rotation) * tank2Properties.movementSpeed * -1,
        );

    };

    //console.log(`${this.player1}` + this.player1.x);
    //console.log(`${this.player1}` + this.player1.y);

    
    // shooting

    // Create the projectile (it is a variable)

    // Select projectile
    // Depends on which shooting button was pressed (E for p1; L for p2)
    
    const player1cooldownFinished = this.time.now > this.player1LastShot + tank1Properties.canon.cooldown;
    
    // this.player1Input.shoot.isDown // Use this for continuous shooting on holding
    if (Phaser.Input.Keyboard.JustDown(this.player1Input.shoot) && player1cooldownFinished) {
        shootProjectile(this, this.player1, tank1Properties.projectile, this.player1Projectiles);
        this.player1LastShot = this.time.now;
        console.log('p1 shooting');
    }

    const player2cooldownFinished = this.time.now > this.player2LastShot + tank2Properties.canon.cooldown;
    
    // this.player2Input.shoot.isDown
    if (Phaser.Input.Keyboard.JustDown(this.player2Input.shoot) && player2cooldownFinished) {
        shootProjectile(this, this.player2, tank2Properties.projectile, this.player2Projectiles);
        this.player2LastShot = this.time.now;
    }

    function shootProjectile(scene, player, projectileData, projectileGroup) {

        // Based on the player who shoot:

        const spawnX = player.x + Math.cos(player.rotation) * player.muzzleOffset; // + muzzleOffset; // Spawn at the cannon, not inside the player
        const spawnY = player.y + Math.sin(player.rotation) * player.muzzleOffset; // + muzzleOffset;


        const projectile = projectileGroup.get(spawnX, spawnY) // Create the projectile based on the coordinates where it should appear

        // Load projectile data 
        if (!projectile) return;

        projectile.setActive(true);
        projectile.setVisible(true);
        projectile.setData('damage',  projectileData.damage);
        projectile.setData('lifetime',  projectileData.lifetime);
        projectile.setData('owner',  player);
        projectile.setData('hitbox',  projectileData.hitbox);
        projectile.setData('image',  projectileData.image);
        
        // projectile.setData('speed',  projectileData.speed);

        projectile.setVelocity(
            Math.cos(player.rotation) * projectileData.speed,
            Math.sin(player.rotation) * projectileData.speed
        )

        scene.time.delayedCall(projectileData.lifetime, () => {
            if (projectile.active) {
                projectile.destroy();
            }
        });
    }
}


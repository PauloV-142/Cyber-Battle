const config = {
    type: Phaser.Auto, //WebGL default
    width: 800,
    height: 600,
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
    // 'sky' is the key for the image asset
    this.load.image('player', 'assets/basic_blue_player.png');
}

function create() // Create the scene, renders, world building
{
    // all objects are positioned based on their center

    this.player = this.physics.add.sprite(400, 300, 'player') // Sprite with physics
    this.player.setCollideWorldBounds(true); // Doesn't exit the scene borders

    this.arrowKeys = this.input.keyboard.createCursorKeys(); // Arrow keys (a.k.a. cursors)
}

function update() { // Game mainloop
    this.player.setVelocity(0); // Reset velocity between frames (no acceleration)
    
    const tankProperties = { // These are the values that will change based on the user choices.
        rotationSpeed: Phaser.Math.DegToRad(2),
        movementSpeed: 80,
    }

    // Rotation
    if (this.arrowKeys.left.isDown) this.player.rotation -= tankProperties.rotationSpeed;
    else if (this.arrowKeys.right.isDown) this.player.rotation += tankProperties.rotationSpeed;
    
    // Moving
    if (this.arrowKeys.up.isDown) {
        this.player.setVelocity(
            Math.cos(this.player.rotation) * tankProperties.movementSpeed,
            Math.sin(this.player.rotation) * tankProperties.movementSpeed,
        );      
    }
    if (this.arrowKeys.down.isDown) {
        this.player.setVelocity(
            Math.cos(this.player.rotation) * tankProperties.movementSpeed * -1,
            Math.sin(this.player.rotation) * tankProperties.movementSpeed * -1,
        );

    };
    
}


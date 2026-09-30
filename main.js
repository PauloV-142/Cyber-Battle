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
    this.load.image('player1', 'assets/basic_blue_player.png');
}

function create() // Create the scene, renders, world building
{
    
    // all objects are positioned based on their center
    this.player1 = this.physics.add.sprite(400, 300, 'player1') // Sprite with physics
    this.player2 = this.physics.add.sprite(400, 300, 'player1')

    this.player1.setCollideWorldBounds(true); // Doesn't exit the scene borders
    this.player2.setCollideWorldBounds(true);
    
    //player1
    this.arrowKeys = this.input.keyboard.createCursorKeys(); // Arrow keys (a.k.a. cursors)

    //player2
    this.wasd = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
    });

}

var tankProperties = { // These are the values that will change based on the user choices.
    rotationSpeed: Phaser.Math.DegToRad(2),
    movementSpeed: 80,
    drag: 0.5
}

function update() { // Game mainloop

    // Movement speed
    this.player1.setVelocity(0); // Reset velocity between frames (no acceleration)
    this.player2.setVelocity(0); // Reset velocity between frames (no acceleration)
    
    
    
    // Player1 movement
    
    // Rotation
    
    if (this.arrowKeys.left.isDown) this.player1.rotation -= tankProperties.rotationSpeed;
    else if (this.arrowKeys.right.isDown) this.player1.rotation += tankProperties.rotationSpeed;

    if (this.arrowKeys.up.isDown) {
        this.player1.setVelocity(
            Math.cos(this.player1.rotation) * tankProperties.movementSpeed,
            Math.sin(this.player1.rotation) * tankProperties.movementSpeed,
        );      
    }
    if (this.arrowKeys.down.isDown) {
        this.player1.setVelocity(
            Math.cos(this.player1.rotation) * tankProperties.movementSpeed * -1,
            Math.sin(this.player1.rotation) * tankProperties.movementSpeed * -1,
        );

    };


    // Player2 movement
    // Rotation
    if (this.wasd.left.isDown) this.player2.rotation -= tankProperties.rotationSpeed;
    else if (this.wasd.right.isDown) this.player2.rotation += tankProperties.rotationSpeed;

    if (this.wasd.up.isDown) {
        this.player2.setVelocity(
            Math.cos(this.player2.rotation) * tankProperties.movementSpeed,
            Math.sin(this.player2.rotation) * tankProperties.movementSpeed,
        );      
    }
    if (this.wasd.down.isDown) {
        this.player2.setVelocity(
            Math.cos(this.player2.rotation) * tankProperties.movementSpeed * -1,
            Math.sin(this.player2.rotation) * tankProperties.movementSpeed * -1,
        );

    };

    
}


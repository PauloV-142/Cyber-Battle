const config = {
    type: Phaser.Auto, //WebGL default
    width: 800,
    height: 600,
    scene: { // Further info later
        preload: preload,
        create: create,
        update: update
    },
    pysics: {
            default: 'topView', // TODO: add colision
            topView: {
                gravity: { y: 0 }, 
                debug: false
            }
        },
}

var game = new Phaser.Game(config);

function preload() // Setup function (load assets)
{
    // 'sky' is the key for the image asset
    this.load.image('tank', 'assets/basic_blue_tank.png');
}

function create() // Create the scene, renders, world building
{
    // all objects are positioned based on their center
    this.add.image(400, 300, 'tank');
    this.add.image(400, 400, 'tank');
}

function update() {

}


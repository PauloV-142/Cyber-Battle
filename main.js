// Since Pixijs 8.x , It's required to wrap the 'Application' in async function
(async () => {

// Setup

const app = new PIXI.Application();

// The only case await is needed, I think.
await app.init({ width: 640, height: 360 });

document.body.appendChild(app.canvas);

// Finished setup

// Needed to create a 'layer' to be filled with content
const boxes = new PIXI.Graphics();

// Creates the first box and then Fills it, finishing it's creation
boxes.rect(50, 50, 150, 100);
boxes.fill(0xff0000);

// Same thing, when a shape is filled, another one can be created
boxes.rect(200, 200, 150, 100);
boxes.fill(0x00ff00);

// Add the 'layer' to stage
app.stage.addChild(boxes);

})(); // The async function is executed immediately after creation, so it just runs the code

/* Observations & Tips:

When you're calling a constructor or something directly from PixiJS, you need to use: PIXI.Thing (Just like python imports)

*/

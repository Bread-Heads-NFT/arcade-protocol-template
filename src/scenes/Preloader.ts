import { DEFAULT_HEIGHT, DEFAULT_WIDTH } from '@/components/Game';
import { Scene } from 'phaser';

// Define the Preloader scene, which loads assets before the game starts
export class Preloader extends Scene {
    constructor() {
        super('Preloader'); // Set the scene key
    }

    init() {
        //  We loaded this image in our Boot Scene, so we can display it here
        this.add.tileSprite(0, 0, DEFAULT_WIDTH, DEFAULT_HEIGHT, 'background').setOrigin(0, 0).setScale(2);

        //  A simple progress bar. This is the outline of the bar.
        this.add.rectangle(DEFAULT_WIDTH * .5, DEFAULT_HEIGHT * .5, DEFAULT_WIDTH * .75, DEFAULT_HEIGHT * .1).setStrokeStyle(1, 0xffffff);

        //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
        const bar = this.add.rectangle(DEFAULT_WIDTH * .125, DEFAULT_HEIGHT * .5, 0, DEFAULT_HEIGHT * .1, 0xffffff);

        //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
        this.load.on('progress', (progress: number) => {
            bar.width = (DEFAULT_WIDTH * .75 * progress);
        });
    }

    // Preload assets required for the game
    preload() {
        // Load background image
        this.load.image('background', 'assets/bg.png');
        // Load bird sprite sheet (for animation)
        this.load.spritesheet('bird', 'assets/bird.png', { frameWidth: 16, frameHeight: 16 });
        // Load crumb image
        this.load.image('crumb', 'assets/crumb.png');
        // Load music file
        this.load.audio('music', 'assets/music.mp3');
        // Load crumb catch sound effect (placeholder)
        this.load.audio('crumb-catch', 'assets/pickup.ogg');
        // Load game over sound effect
        this.load.audio('gameover', 'assets/gameover.ogg');
    }

    // Create method is called after preload completes
    create() {
        //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        //  For example, you can define global animations here, so we can use them in other scenes.

        //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
        this.scene.start('WalletConnect');
    }
}
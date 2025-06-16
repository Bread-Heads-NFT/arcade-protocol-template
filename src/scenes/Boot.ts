// Import Phaser's Scene class for creating game scenes
import { Scene } from 'phaser';

// Define the Boot scene, which is the first scene to run
export class Boot extends Scene {
    constructor() {
        super('Boot'); // Set the scene key
    }

    // Preload method is called before create
    preload() {
        //  The Boot Scene is typically used to load in any assets you require for your Preloader, such as a game logo or background.
        //  The smaller the file size of the assets, the better, as the Boot Scene itself has no preloader.

        this.load.image('background', 'assets/bg.png');
    }

    // Create method is called after preload
    create() {
        // Start the Preloader scene
        this.scene.start('Preloader');
    }
}
import { DEFAULT_HEIGHT, DEFAULT_WIDTH } from '@/components/Game';
import { Umi } from '@metaplex-foundation/umi';
import { Scene, GameObjects } from 'phaser';

// Define the MainMenu scene, which displays the main menu UI
export class MainMenu extends Scene {
    private umi!: Umi;
    background!: GameObjects.Image;
    logo!: GameObjects.Image;
    title!: GameObjects.Text;
    welcome!: GameObjects.Text;

    constructor() {
        super('MainMenu'); // Set the scene key
    }

    init(args: { umi: Umi }) {
        this.umi = args.umi;
    }

    // Create method sets up the main menu UI
    create() {
        this.background = this.add.image(DEFAULT_WIDTH / 2, DEFAULT_HEIGHT / 2, 'background').setSize(DEFAULT_WIDTH, DEFAULT_HEIGHT);

        this.logo = this.add.image(DEFAULT_WIDTH / 2, DEFAULT_HEIGHT / 4, 'logo');

        this.welcome = this.add.text(DEFAULT_WIDTH / 2, DEFAULT_HEIGHT * 0.4, 'Welcome', {
            fontFamily: 'Arial Black', fontSize: 32, color: '#ffffff',
            stroke: '#000000', strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5);

        this.welcome = this.add.text(DEFAULT_WIDTH / 2, DEFAULT_HEIGHT * 0.5, this.umi.identity.publicKey.toString(), {
            fontFamily: 'Arial Black', fontSize: 24, color: '#0f0',
            stroke: '#000000', strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5);

        // Create button for the original game
        const gameButton = this.add.text(DEFAULT_WIDTH / 2, DEFAULT_HEIGHT * 0.65, 'Start Game', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        // Create button for the CryptoClicker game
        const cryptoClickerButton = this.add.text(DEFAULT_WIDTH / 2, DEFAULT_HEIGHT * 0.8, 'Crypto Clicker', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#FFD700',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        // Add hover effects for both buttons
        gameButton.on('pointerover', () => {
            gameButton.setStyle({ color: '#ff0' });
        });

        gameButton.on('pointerout', () => {
            gameButton.setStyle({ color: '#ffffff' });
        });

        cryptoClickerButton.on('pointerover', () => {
            cryptoClickerButton.setStyle({ color: '#ff0' });
        });

        cryptoClickerButton.on('pointerout', () => {
            cryptoClickerButton.setStyle({ color: '#FFD700' });
        });

        // Add click handlers for both buttons
        gameButton.on('pointerdown', () => {
            this.scene.start('Game', { umi: this.umi });
        });

        cryptoClickerButton.on('pointerdown', () => {
            this.scene.start('FlappyBird', { umi: this.umi });
        });
    }
}
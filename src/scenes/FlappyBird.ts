// Import Phaser's Scene class for creating game scenes
import { Scene } from 'phaser';
// Import default width and height constants for the game canvas
import { DEFAULT_WIDTH, DEFAULT_HEIGHT } from '@/components/Game';
// Import Context type from Metaplex UMI for blockchain-related features
import { Context } from '@metaplex-foundation/umi';
// Import utility function to record play sessions (e.g., for rewards or analytics)
import { recordPlayUtil } from '@/utils/recordPlay';

// Define the FlappyBird scene, which extends Phaser's Scene class
export class FlappyBird extends Scene {
    // UMI context for blockchain operations (signing, identity, etc.)
    private umi!: Pick<Context, 'eddsa' | 'identity' | 'payer' | 'programs' | 'rpc' | 'transactions'>;
    // Player's asset identifier (e.g., NFT or wallet address)
    private playerAsset!: string | null;
    // Referrer identifier, if any (for referral tracking)
    private referrer!: string | null;

    // Game objects
    private bird!: Phaser.Physics.Arcade.Sprite; // The player-controlled bird sprite
    private crumbs!: Phaser.Physics.Arcade.Group; // Group for falling crumb objects
    private scoreText!: Phaser.GameObjects.Text; // Text object to display the score
    private gameOverText!: Phaser.GameObjects.Text; // Text object for game over message
    private restartButton!: Phaser.GameObjects.Text; // Button to restart the game
    private startText!: Phaser.GameObjects.Text; // Instructions to start the game
    private background!: Phaser.GameObjects.TileSprite; // Scrolling background image

    // Game state variables
    private score: number = 0; // Current player score
    private gameStarted: boolean = false; // Has the game started?
    private isGameOver: boolean = false; // Is the game over?
    private crumbDropInterval: number = 1000; // Time between crumb drops (ms)
    private lastCrumbDrop: number = 0; // Timestamp of last crumb drop
    private targetBirdX: number | null = null; // Target X position for bird movement
    private music!: Phaser.Sound.BaseSound; // Background music object
    private inputTriggered: boolean = false; // Was input triggered this frame?
    private inputPointer: Phaser.Input.Pointer | null = null; // Last pointer input

    // Constructor sets the scene key for Phaser
    constructor() {
        super('FlappyBird');
    }

    // Initialize scene with data passed from previous scene (UMI, player asset, referrer)
    init(data: { umi: any; playerAsset: string | null; referrer: string | null }) {
        this.umi = data.umi; // Blockchain context
        this.playerAsset = data.playerAsset; // Player's asset
        this.referrer = data.referrer; // Referrer info
        this.score = 0; // Reset score
        this.gameStarted = false; // Reset game state
        this.isGameOver = false; // Reset game over state
    }

    // Create game objects and set up the scene
    create() {
        // Record the play.
        recordPlayUtil(this.umi, this.playerAsset!, this.referrer!).then(() => {
            console.log('Play recorded');
        }).catch((error: any) => {
            console.error('Error recording play', error);
        });

        // Add a moving background using a tile sprite
        this.background = this.add.tileSprite(0, 0, DEFAULT_WIDTH, DEFAULT_HEIGHT, 'background').setOrigin(0, 0).setScale(2);

        // Create the bird's flapping animation
        this.anims.create({
            key: 'flap',
            frames: this.anims.generateFrameNumbers('bird', { start: 0, end: 3 }),
            frameRate: 4,
        })

        // Create the bird sprite and set its properties
        this.bird = this.physics.add.sprite(DEFAULT_WIDTH * 0.3, DEFAULT_HEIGHT * 0.5, 'bird');
        this.bird.setGravityY(0); // No gravity until game starts
        // this.bird.setCollideWorldBounds(true); // Uncomment to keep bird in bounds
        this.bird.setScale(2); // Make the bird larger
        this.bird.play('flap'); // Start flapping animation

        // Create a group for falling crumbs
        this.crumbs = this.physics.add.group();

        // Add score text to the top left corner
        this.scoreText = this.add.text(16, 16, 'Score: 0', {
            fontSize: '32px',
            color: '#fff',
            stroke: '#000',
            strokeThickness: 4
        });

        // Add game over text (hidden initially)
        this.gameOverText = this.add.text(DEFAULT_WIDTH * 0.5, DEFAULT_HEIGHT * 0.4, 'Game Over', {
            fontSize: '64px',
            color: '#ff0000',
            stroke: '#000',
            strokeThickness: 6
        })
            .setOrigin(0.5)
            .setVisible(false); // Hide initially

        // Add restart button (hidden initially)
        this.restartButton = this.add.text(DEFAULT_WIDTH * 0.5, DEFAULT_HEIGHT * 0.6, 'Click to Restart', {
            fontSize: '32px',
            color: '#fff',
            backgroundColor: '#000',
            padding: { x: 20, y: 10 }
        })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true }) // Make button clickable
            .setVisible(false) // Hide initially
            .on('pointerdown', () => this.scene.restart()); // Restart scene on click

        // Add start instructions text
        this.startText = this.add.text(DEFAULT_WIDTH * 0.5, DEFAULT_HEIGHT * 0.3, 'Click to Start & Flap', {
            fontSize: '32px',
            color: '#fff',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Set up input handler for pointer down events
        // this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.handleInput(pointer));
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (!this.gameStarted) {
                this.startGame(); // Start the game on first click
            }
            this.inputTriggered = true; // Mark input for this frame
            this.inputPointer = pointer; // Store pointer for use in update
        });

        // Set up collision detection between bird and crumbs
        this.physics.add.overlap(this.bird, this.crumbs, (bird, crumb) => {
            this.incrementScore(); // Increase score on overlap
            crumb.destroy(); // Remove crumb from game
            // Play crumb catch sound effect
            this.sound.play('crumb-catch', { volume: 0.25 });
        });

        // Prepare background music (but don't play yet)
        this.music = this.sound.add('music', { loop: true });
    }

    // Main update loop, called every frame
    update(time: number, delta: number) {
        // If game is over or not started, skip update
        if (this.isGameOver || !this.gameStarted) return;

        // Handle input if triggered
        if (this.inputTriggered) {
            this.handleInput(this.inputPointer!);
        }

        // Make background scroll speed scale with crumb velocity
        const crumbVelocity = 100 + this.score * 10;
        const backgroundScrollSpeed = crumbVelocity * 0.2; // Parallax factor for background
        if (this.background) {
            this.background.tilePositionX += backgroundScrollSpeed * (delta / 1000); // Move background horizontally
        }

        // Hide start text after game starts
        if (this.startText.visible) {
            this.startText.setVisible(false);
        }

        // Rotate bird based on vertical velocity for visual feedback
        if (this.gameStarted && this.bird.body) {
            const velocity = this.bird.body.velocity.y;
            this.bird.angle = Phaser.Math.Clamp(velocity * 0.1, -30, 90);
        }

        // Drop crumbs at regular intervals
        if (this.gameStarted && time > this.lastCrumbDrop + this.crumbDropInterval) {
            this.dropCrumb(); // Spawn a new crumb
            this.lastCrumbDrop = time; // Update last drop time
        }

        // Remove crumbs that are off screen and rotate crumbs to match velocity
        this.crumbs.getChildren().forEach((crumb: any) => {
            if (crumb.y > DEFAULT_HEIGHT + crumb.height) {
                crumb.destroy(); // Remove crumb if it falls off screen
            } else {
                // Rotate crumb to match its velocity direction
                const vx = crumb.body.velocity.x;
                const vy = crumb.body.velocity.y;
                crumb.angle = Phaser.Math.RadToDeg(Math.atan2(vy, vx));
            }
        });

        // Game over if bird hits top or bottom bounds
        if (this.bird.y <= 0 || this.bird.y >= DEFAULT_HEIGHT) {
            this.handleGameOver(); // Trigger game over logic
            return;
        }

        // Scale music playback rate with score for dynamic audio feedback
        if (this.music && this.music.isPlaying) {
            (this.music as any).rate = .8 + this.score * 0.01;
        }
    }

    // Handle player input (flap and move horizontally)
    private handleInput(pointer: Phaser.Input.Pointer) {
        this.inputTriggered = false; // Reset input flag

        if (!this.isGameOver) {
            this.flapBird(); // Make the bird jump
            // Move bird horizontally toward pointer x (up to 40px per flap)
            const maxMove = 20;
            const pointerX = pointer.x;
            const currentX = this.bird.x;
            let deltaX = pointerX - currentX;
            if (Math.abs(deltaX) > maxMove) {
                deltaX = maxMove * Math.sign(deltaX);
            }
            const newX = Phaser.Math.Clamp(currentX + deltaX, 0, DEFAULT_WIDTH);
            this.tweens.add({
                targets: this.bird,
                x: newX,
                duration: 150,
                ease: 'Sine.easeOut',
            });
        }
    }

    // Start the game (enable gravity, play music)
    private startGame() {
        this.gameStarted = true;
        this.bird.setGravityY(1500); // Enable gravity for bird
        this.music.play(); // Start background music
    }

    // Make the bird jump upward
    private flapBird() {
        this.bird.setVelocityY(-400); // Set upward velocity for jump
        this.bird.play('flap'); // Play flap animation
    }

    // Drop a crumb from the top of the screen
    private dropCrumb() {
        const x = Phaser.Math.Between(DEFAULT_WIDTH / 4, DEFAULT_WIDTH); // Random x position for crumb
        const crumb = this.crumbs.create(x, 0, 'crumb'); // Create crumb sprite at top
        crumb.setSize(16, 16);
        crumb.setVelocityX(-(100 + this.score * 10)); // Move left, speed up with score
        crumb.setVelocityY(300); // Fall down at constant speed
        crumb.setImmovable(true);
        // Random scale for crumb size
        const scale = Phaser.Math.FloatBetween(0.8, 1.2);
        crumb.setScale(scale);
        // Random brown tint for crumb color
        const h = Phaser.Math.FloatBetween(0.08, 0.12); // ~30-43 deg hue
        const s = Phaser.Math.FloatBetween(0.5, 0.7);
        const l = Phaser.Math.FloatBetween(0.2, 0.4);
        const color = Phaser.Display.Color.HSLToColor(h, s, l).color;
        crumb.setTint(color);
    }

    // Increase the player's score and update the UI
    private incrementScore() {
        this.score += 1; // Add one to score
        this.scoreText.setText('Score: ' + this.score); // Update score display
    }

    // Handle game over logic and UI
    private handleGameOver() {
        if (this.isGameOver) return; // Prevent multiple triggers

        this.isGameOver = true;
        this.physics.pause(); // Pause all physics in the scene

        // Stop background music
        this.music.stop();
        // Play game over sound effect
        this.sound.play('gameover', { volume: 0.5 });

        this.gameOverText.setVisible(true); // Show game over message
        this.restartButton.setVisible(true); // Show restart button
    }
} 
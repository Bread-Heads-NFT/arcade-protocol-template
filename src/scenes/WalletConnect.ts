import { Scene } from 'phaser';
import EventCenter from "@/events/eventCenter";
import { Umi } from "@metaplex-foundation/umi";
import { DEFAULT_HEIGHT, DEFAULT_WIDTH } from '@/components/Game';

export class WalletConnect extends Scene {
    private umi: Umi | undefined;
    private playerAsset: string | null | undefined;
    private referrer: string | null | undefined;

    constructor() {
        super('WalletConnect');
    }

    init() {
        console.log("init");
        // Tell the EventCenter that we are ready to receive events.
        EventCenter.emit("ready");
        // Listen for the "umi" event, which is emitted by the NextJS component when the user connects their wallet.
        EventCenter.on("umi", (umi: Umi) => {
            this.umi = umi;
        });
        EventCenter.on("playerAsset", (playerAsset: string | null) => {
            this.playerAsset = playerAsset;
        });
        EventCenter.on("referrer", (referrer: string | null) => {
            this.referrer = referrer;
        });
    }

    create() {
        // Create the bird's flapping animation
        this.anims.create({
            key: 'flap',
            frames: this.anims.generateFrameNumbers('bird', { start: 0, end: 3 }),
            frameRate: 4,
            repeat: -1,
        })

        // Add the game background image (bg.png)
        this.add.image(DEFAULT_WIDTH / 2, DEFAULT_HEIGHT / 2, 'background').setDisplaySize(DEFAULT_WIDTH, DEFAULT_HEIGHT);

        // Add the flapping bird near the prompt
        const birdY = DEFAULT_HEIGHT / 6 + 60;
        let bird;
        bird = this.add.sprite(DEFAULT_WIDTH / 2, birdY, 'bird').setScale(2);
        bird.play('flap');
        // Simple up/down tween
        this.tweens.add({
            targets: bird,
            y: birdY + 10,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Add the wallet connect prompt
        this.add
            .text(
                DEFAULT_WIDTH / 2,
                DEFAULT_HEIGHT / 6,
                `Connect your wallet to play.`,
                { fontSize: "30px", fontFamily: "futura", color: "#FFD700", align: "center", stroke: "#000", strokeThickness: 6 }
            )
            .setOrigin(0.5);

        // Raining crumbs effect
        this.time.addEvent({
            delay: 200, // spawn a crumb every 200ms
            callback: () => {
                const x = Phaser.Math.Between(20, DEFAULT_WIDTH - 20);
                const crumb = this.add.sprite(x, -10, 'crumb').setScale(0.5 + Math.random() * 0.5);
                this.tweens.add({
                    targets: crumb,
                    y: DEFAULT_HEIGHT + 20,
                    alpha: 0,
                    duration: Phaser.Math.Between(1200, 2200),
                    onComplete: () => crumb.destroy()
                });
            },
            loop: true
        });
    }

    update() {
        if (this.umi && this.playerAsset !== undefined) {
            this.scene.start('FlappyBird', { umi: this.umi, playerAsset: this.playerAsset, referrer: this.referrer });
        }
    }
}
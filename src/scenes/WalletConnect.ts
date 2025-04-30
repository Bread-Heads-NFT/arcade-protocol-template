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

    createCryptoBackground() {
        // Create a dark gradient background
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x0a0a2a, 0x0a0a2a, 0x000000, 0x000000, 1);
        bg.fillRect(0, 0, DEFAULT_WIDTH, DEFAULT_HEIGHT);

        // Add some "blockchain" elements
        for (let i = 0; i < 10; i++) {
            const x = Phaser.Math.Between(50, DEFAULT_WIDTH - 50);
            const y = Phaser.Math.Between(50, DEFAULT_HEIGHT - 50);
            const size = Phaser.Math.Between(30, 80);

            // Create a block
            const block = this.add.graphics();
            block.lineStyle(1, 0x3498db, 0.3);
            block.strokeRect(x, y, size, size);

            // Add some "data" inside the block
            for (let j = 0; j < 3; j++) {
                const lineY = y + 10 + (j * 10);
                const lineWidth = Phaser.Math.Between(size * 0.5, size * 0.8);
                block.lineStyle(2, 0x3498db, 0.2);
                block.lineBetween(x + 5, lineY, x + lineWidth, lineY);
            }
        }

        // Add some floating particles
        for (let i = 0; i < 50; i++) {
            const x = Phaser.Math.Between(0, DEFAULT_WIDTH);
            const y = Phaser.Math.Between(0, DEFAULT_HEIGHT);
            const particle = this.add.circle(x, y, 1, 0xFFD700, 0.3);

            // Animate the particles
            this.tweens.add({
                targets: particle,
                y: particle.y - Phaser.Math.Between(50, 150),
                alpha: 0,
                duration: Phaser.Math.Between(3000, 8000),
                repeat: -1,
                delay: Phaser.Math.Between(0, 2000)
            });
        }

        // Add some "connection lines" between random points
        const connectionLines = this.add.graphics();
        connectionLines.lineStyle(1, 0x3498db, 0.2);

        for (let i = 0; i < 15; i++) {
            const x1 = Phaser.Math.Between(0, DEFAULT_WIDTH);
            const y1 = Phaser.Math.Between(0, DEFAULT_HEIGHT);
            const x2 = Phaser.Math.Between(0, DEFAULT_WIDTH);
            const y2 = Phaser.Math.Between(0, DEFAULT_HEIGHT);

            connectionLines.lineBetween(x1, y1, x2, y2);
        }
    }

    create() {
        // Create the crypto-themed background
        this.createCryptoBackground();

        this.add
            .text(
                DEFAULT_WIDTH / 2,
                DEFAULT_HEIGHT / 6,
                `Connect your wallet to play.`,
                { fontSize: "30px", fontFamily: "futura", color: "#FFD700", align: "center" }
            )
            .setOrigin(0.5);
    }

    update() {
        if (this.umi && this.playerAsset !== undefined) {
            this.scene.start('CryptoClicker', { umi: this.umi, playerAsset: this.playerAsset, referrer: this.referrer });
        }
    }
}
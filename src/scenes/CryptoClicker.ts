import { Scene } from 'phaser';
import { DEFAULT_WIDTH, DEFAULT_HEIGHT } from '@/components/Game';
import { Context, publicKey, Umi } from '@metaplex-foundation/umi';
import { recordPlay, recordGuestPlay } from '@breadheads/bgl-insert-coin';
import { findAssetSignerPda } from '@metaplex-foundation/mpl-core';

interface Achievement {
    id: string;
    name: string;
    description: string;
    requirement: number;
    type: 'crypto' | 'clicks' | 'upgrades';
    unlocked: boolean;
}

export class CryptoClicker extends Scene {
    private umi!: Pick<Context, 'eddsa' | 'identity' | 'payer' | 'programs' | 'rpc' | 'transactions'>;
    private playerAsset!: string | null;
    private referrer!: string | null;
    private coin!: Phaser.GameObjects.Image;
    private clickText!: Phaser.GameObjects.Text;
    private cryptoCount: number = 0;
    private cryptoPerClick: number = 1;
    private cryptoPerSecond: number = 0;
    private countText!: Phaser.GameObjects.Text;
    private upgradeButtons: Phaser.GameObjects.Container[] = [];
    private totalClicks: number = 0;
    private totalUpgrades: number = 0;
    private upgrades: {
        name: string;
        cost: number;
        perClick?: number;
        perSecond?: number;
        owned: number;
        button?: Phaser.GameObjects.Container;
    }[] = [
            { name: 'Mining Rig', cost: 10, perClick: 1, owned: 0 },
            { name: 'GPU', cost: 50, perClick: 5, owned: 0 },
            { name: 'ASIC Miner', cost: 200, perSecond: 1, owned: 0 },
            { name: 'Mining Farm', cost: 1000, perSecond: 5, owned: 0 },
            { name: 'Quantum Miner', cost: 5000, perSecond: 25, owned: 0 },
        ];
    private saveKey: string = 'crypto-clicker-save';
    private autoSaveTimer: Phaser.Time.TimerEvent | null = null;
    private achievements: Achievement[] = [
        { id: 'crypto10', name: 'Crypto Beginner', description: 'Earn 10 crypto', requirement: 10, type: 'crypto', unlocked: false },
        { id: 'crypto100', name: 'Crypto Enthusiast', description: 'Earn 100 crypto', requirement: 100, type: 'crypto', unlocked: false },
        { id: 'crypto1000', name: 'Crypto Investor', description: 'Earn 1,000 crypto', requirement: 1000, type: 'crypto', unlocked: false },
        { id: 'crypto10000', name: 'Crypto Whale', description: 'Earn 10,000 crypto', requirement: 10000, type: 'crypto', unlocked: false },
        { id: 'clicks10', name: 'Clicker Novice', description: 'Click 10 times', requirement: 10, type: 'clicks', unlocked: false },
        { id: 'clicks100', name: 'Clicker Pro', description: 'Click 100 times', requirement: 100, type: 'clicks', unlocked: false },
        { id: 'clicks1000', name: 'Clicker Master', description: 'Click 1,000 times', requirement: 1000, type: 'clicks', unlocked: false },
        { id: 'upgrades5', name: 'Upgrader', description: 'Purchase 5 upgrades', requirement: 5, type: 'upgrades', unlocked: false },
        { id: 'upgrades25', name: 'Tech Enthusiast', description: 'Purchase 25 upgrades', requirement: 25, type: 'upgrades', unlocked: false },
        { id: 'upgrades50', name: 'Mining Magnate', description: 'Purchase 50 upgrades', requirement: 50, type: 'upgrades', unlocked: false },
    ];
    private achievementsButton!: Phaser.GameObjects.Text;
    private achievementsPanel!: Phaser.GameObjects.Container;
    private showingAchievements: boolean = false;
    private upgradesContainer!: Phaser.GameObjects.Container;
    private upgradesPanel!: Phaser.GameObjects.Rectangle;
    private scrollUpButton!: Phaser.GameObjects.Triangle;
    private scrollDownButton!: Phaser.GameObjects.Triangle;
    private currentUpgradeIndex: number = 0;
    private visibleUpgradesCount: number = 3;

    constructor() {
        super('CryptoClicker');
    }

    init(args: { umi: Umi, playerAsset: string | null, referrer: string | null }) {
        this.umi = args.umi as Pick<Context, "eddsa" | "identity" | "payer" | "programs" | "rpc" | "transactions">;
        this.playerAsset = args.playerAsset;
        this.referrer = args.referrer;
    }

    preload() {
        // Assets are already loaded in the Preloader scene
    }

    create() {
        // Record the play.
        this.recordPlay().then(() => {
            console.log('Play recorded');
        }).catch((error) => {
            console.error('Error recording play', error);
        });
        // Create a custom crypto-themed background
        this.createCryptoBackground();

        // Title
        this.add.text(DEFAULT_WIDTH / 2, 50, 'CRYPTO CLICKER', {
            fontFamily: 'Arial Black',
            fontSize: 32,
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5);

        // Create the clickable coin
        this.coin = this.add.image(DEFAULT_WIDTH / 2, 200, 'crypto_coin')
            .setScale(3)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.clickCoin());

        // Add a glow effect to the coin
        this.tweens.add({
            targets: this.coin,
            scale: 3.2,
            duration: 100,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Click text that appears when clicking
        this.clickText = this.add.text(0, 0, '+1', {
            fontFamily: 'Arial',
            fontSize: 24,
            color: '#FFD700'
        }).setOrigin(0.5).setVisible(false);

        // Crypto counter
        this.countText = this.add.text(DEFAULT_WIDTH / 2, 300, 'Crypto: 0', {
            fontFamily: 'Arial',
            fontSize: 24,
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Stats text
        this.add.text(DEFAULT_WIDTH / 2, 340, 'per click: 1 | per second: 0', {
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#CCCCCC'
        }).setOrigin(0.5).setName('statsText');

        // Create upgrade section
        this.add.text(DEFAULT_WIDTH / 2, 380, 'UPGRADES', {
            fontFamily: 'Arial Black',
            fontSize: 20,
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Create upgrade buttons with simple scrolling
        this.createSimpleScrollableUpgrades();

        // Start the passive income timer
        this.time.addEvent({
            delay: 1000,
            callback: this.addPassiveIncome,
            callbackScope: this,
            loop: true
        });

        // Add a back button to return to the main menu
        const backButton = this.add.text(100, 50, 'Back', {
            fontFamily: 'Arial',
            fontSize: 20,
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => backButton.setStyle({ color: '#FFD700' }))
            .on('pointerout', () => backButton.setStyle({ color: '#FFFFFF' }))
            .on('pointerdown', () => this.scene.start('MainMenu', { umi: this.umi }));

        // Add save/load buttons
        this.createSaveLoadButtons();

        // Create achievements button and panel
        this.createAchievementsSystem();

        // Load saved game data if available
        this.loadGame();

        // Set up auto-save every 30 seconds
        this.autoSaveTimer = this.time.addEvent({
            delay: 30000,
            callback: this.saveGame,
            callbackScope: this,
            loop: true
        });
    }

    createAchievementsSystem() {
        // Achievements button
        this.achievementsButton = this.add.text(DEFAULT_WIDTH - 100, 90, 'Achievements', {
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => this.achievementsButton.setStyle({ color: '#FFD700' }))
            .on('pointerout', () => this.achievementsButton.setStyle({ color: '#FFFFFF' }))
            .on('pointerdown', () => this.toggleAchievementsPanel());

        // Create achievements panel (initially hidden)
        this.achievementsPanel = this.add.container(DEFAULT_WIDTH / 2, DEFAULT_HEIGHT / 2)
            .setVisible(false)
            .setDepth(100);

        // Panel background
        const panelBg = this.add.rectangle(0, 0, 500, 400, 0x000000, 0.9)
            .setStrokeStyle(2, 0xFFD700);

        // Panel title
        const panelTitle = this.add.text(0, -170, 'ACHIEVEMENTS', {
            fontFamily: 'Arial Black',
            fontSize: 24,
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Close button
        const closeButton = this.add.text(230, -170, 'X', {
            fontFamily: 'Arial Black',
            fontSize: 20,
            color: '#FFFFFF'
        }).setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => closeButton.setStyle({ color: '#FF6666' }))
            .on('pointerout', () => closeButton.setStyle({ color: '#FFFFFF' }))
            .on('pointerdown', () => this.toggleAchievementsPanel());

        // Add elements to panel
        this.achievementsPanel.add([panelBg, panelTitle, closeButton]);

        // We'll create achievement items only when the panel is shown
    }

    createAchievementItems() {
        const startY = -130;
        const spacing = 35;

        // Remove all existing achievement items
        // We need to keep only the first 3 items (background, title, close button)
        while (this.achievementsPanel.length > 3) {
            const item = this.achievementsPanel.getAt(this.achievementsPanel.length - 1);
            this.achievementsPanel.remove(item);
            item.destroy(); // Properly destroy the item to prevent memory leaks
        }

        // Create achievement items container to group them
        const itemsContainer = this.add.container(0, 0);
        this.achievementsPanel.add(itemsContainer);

        this.achievements.forEach((achievement, index) => {
            const y = startY + (index * spacing);

            // Achievement background
            const bg = this.add.rectangle(0, y, 450, 30, 0x333333, 0.8)
                .setStrokeStyle(1, 0x666666);

            // Achievement name and description
            const nameText = this.add.text(-210, y, achievement.unlocked ? achievement.name : '???', {
                fontFamily: 'Arial',
                fontSize: 14,
                color: achievement.unlocked ? '#FFD700' : '#999999'
            }).setOrigin(0, 0.5);

            const descText = this.add.text(0, y, achievement.unlocked ? achievement.description : 'Locked', {
                fontFamily: 'Arial',
                fontSize: 12,
                color: achievement.unlocked ? '#FFFFFF' : '#999999'
            }).setOrigin(0.5);

            // Add to the items container
            itemsContainer.add([bg, nameText, descText]);
        });
    }

    toggleAchievementsPanel() {
        this.showingAchievements = !this.showingAchievements;
        this.achievementsPanel.setVisible(this.showingAchievements);

        // Create achievement items only when showing the panel
        if (this.showingAchievements) {
            this.createAchievementItems();
        }
    }

    checkAchievements() {
        let newAchievements = false;

        this.achievements.forEach(achievement => {
            if (!achievement.unlocked) {
                let unlocked = false;

                switch (achievement.type) {
                    case 'crypto':
                        unlocked = this.cryptoCount >= achievement.requirement;
                        break;
                    case 'clicks':
                        unlocked = this.totalClicks >= achievement.requirement;
                        break;
                    case 'upgrades':
                        unlocked = this.totalUpgrades >= achievement.requirement;
                        break;
                }

                if (unlocked) {
                    achievement.unlocked = true;
                    newAchievements = true;

                    // Show notification for new achievement
                    this.showAchievementNotification(achievement);
                }
            }
        });

        if (newAchievements) {
            // Save game when new achievements are unlocked
            this.saveGame();
        }
    }

    showAchievementNotification(achievement: Achievement) {
        const notification = this.add.container(DEFAULT_WIDTH / 2, 150)
            .setDepth(100)
            .setAlpha(0);

        // Background
        const bg = this.add.rectangle(0, 0, 400, 70, 0x000000, 0.8)
            .setStrokeStyle(2, 0xFFD700);

        // Title
        const title = this.add.text(0, -20, 'Achievement Unlocked!', {
            fontFamily: 'Arial Black',
            fontSize: 18,
            color: '#FFD700'
        }).setOrigin(0.5);

        // Achievement name
        const name = this.add.text(0, 10, achievement.name, {
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#FFFFFF'
        }).setOrigin(0.5);

        notification.add([bg, title, name]);

        // Animation
        this.tweens.add({
            targets: notification,
            alpha: 1,
            y: 100,
            duration: 1000,
            ease: 'Power2',
            hold: 2000,
            yoyo: true,
            onComplete: () => {
                notification.destroy();
            }
        });
    }

    createSaveLoadButtons() {
        // Save button
        const saveButton = this.add.text(DEFAULT_WIDTH - 100, 30, 'Save Game', {
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => saveButton.setStyle({ color: '#FFD700' }))
            .on('pointerout', () => saveButton.setStyle({ color: '#FFFFFF' }))
            .on('pointerdown', () => {
                this.saveGame();
                this.showNotification('Game Saved!');
            });

        // Reset button
        const resetButton = this.add.text(DEFAULT_WIDTH - 100, 60, 'Reset Game', {
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#FF6666',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => resetButton.setStyle({ color: '#FF0000' }))
            .on('pointerout', () => resetButton.setStyle({ color: '#FF6666' }))
            .on('pointerdown', () => {
                if (confirm('Are you sure you want to reset your progress?')) {
                    this.resetGame();
                    this.showNotification('Game Reset!');
                }
            });
    }

    showNotification(message: string) {
        const notification = this.add.text(DEFAULT_WIDTH / 2, DEFAULT_HEIGHT / 2, message, {
            fontFamily: 'Arial Black',
            fontSize: 24,
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4,
            backgroundColor: '#333333'
        }).setOrigin(0.5)
            .setPadding(10)
            .setDepth(100);

        this.tweens.add({
            targets: notification,
            alpha: 0,
            y: notification.y - 50,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => {
                notification.destroy();
            }
        });
    }

    saveGame() {
        const saveData = {
            cryptoCount: this.cryptoCount,
            cryptoPerClick: this.cryptoPerClick,
            cryptoPerSecond: this.cryptoPerSecond,
            totalClicks: this.totalClicks,
            totalUpgrades: this.totalUpgrades,
            upgrades: this.upgrades.map(upgrade => ({
                name: upgrade.name,
                cost: upgrade.cost,
                perClick: upgrade.perClick,
                perSecond: upgrade.perSecond,
                owned: upgrade.owned
            })),
            achievements: this.achievements
        };

        localStorage.setItem(this.saveKey, JSON.stringify(saveData));
    }

    loadGame() {
        const savedData = localStorage.getItem(this.saveKey);

        if (savedData) {
            try {
                const data = JSON.parse(savedData);

                // Restore player stats
                this.cryptoCount = data.cryptoCount || 0;
                this.cryptoPerClick = data.cryptoPerClick || 1;
                this.cryptoPerSecond = data.cryptoPerSecond || 0;
                this.totalClicks = data.totalClicks || 0;
                this.totalUpgrades = data.totalUpgrades || 0;

                // Restore upgrades
                if (data.upgrades && Array.isArray(data.upgrades)) {
                    data.upgrades.forEach((savedUpgrade: any, index: number) => {
                        if (index < this.upgrades.length) {
                            this.upgrades[index].cost = savedUpgrade.cost;
                            this.upgrades[index].owned = savedUpgrade.owned;
                        }
                    });
                }

                // Restore achievements
                if (data.achievements && Array.isArray(data.achievements)) {
                    data.achievements.forEach((savedAchievement: any, index: number) => {
                        if (index < this.achievements.length) {
                            this.achievements[index].unlocked = savedAchievement.unlocked;
                        }
                    });
                }

                // Update UI
                this.updateCountText();
                this.updateUpgradeButtons();

                this.showNotification('Game Loaded!');
            } catch (error) {
                console.error('Error loading saved game:', error);
            }
        }
    }

    resetGame() {
        // Reset player stats
        this.cryptoCount = 0;
        this.cryptoPerClick = 1;
        this.cryptoPerSecond = 0;
        this.totalClicks = 0;
        this.totalUpgrades = 0;

        // Reset upgrades
        this.upgrades.forEach(upgrade => {
            upgrade.owned = 0;
            upgrade.cost = upgrade.name === 'Mining Rig' ? 10 :
                upgrade.name === 'GPU' ? 50 :
                    upgrade.name === 'ASIC Miner' ? 200 :
                        upgrade.name === 'Mining Farm' ? 1000 : 5000;
        });

        // Reset achievements
        this.achievements.forEach(achievement => {
            achievement.unlocked = false;
        });

        // Update UI
        this.updateCountText();
        this.updateUpgradeButtons();

        // Clear saved data
        localStorage.removeItem(this.saveKey);
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

    update() {
        // Update the stats text
        const statsText = this.children.getByName('statsText') as Phaser.GameObjects.Text;
        statsText.setText(`per click: ${this.cryptoPerClick} | per second: ${this.cryptoPerSecond}`);

        // Update upgrade buttons (enable/disable based on affordability)
        this.updateUpgradeButtons();
    }

    clickCoin() {
        // Increase crypto count
        this.cryptoCount += this.cryptoPerClick;
        this.totalClicks++;
        this.updateCountText();

        // Show click text animation
        this.clickText.setPosition(this.coin.x, this.coin.y - 50);
        this.clickText.setText(`+${this.cryptoPerClick}`);
        this.clickText.setVisible(true);
        this.clickText.setAlpha(1);

        this.tweens.add({
            targets: this.clickText,
            y: this.clickText.y - 50,
            alpha: 0,
            duration: 800,
            onComplete: () => {
                this.clickText.setVisible(false);
            }
        });

        // Add a quick scale animation to the coin
        this.tweens.add({
            targets: this.coin,
            scale: 3.5,
            duration: 100,
            yoyo: true
        });

        // Check for achievements
        this.checkAchievements();
    }

    addPassiveIncome() {
        if (this.cryptoPerSecond > 0) {
            this.cryptoCount += this.cryptoPerSecond;
            this.updateCountText();

            // Check for achievements
            this.checkAchievements();
        }
    }

    updateCountText() {
        this.countText.setText(`Crypto: ${Math.floor(this.cryptoCount)}`);
    }

    createSimpleScrollableUpgrades() {
        // Create a visible panel area for the upgrades
        this.upgradesPanel = this.add.rectangle(DEFAULT_WIDTH / 2, 480, 300, 160, 0x222222, 0.5)
            .setStrokeStyle(1, 0x444444);

        // Create upgrade buttons
        this.createUpgradeButtons();

        // Add scroll buttons
        this.scrollUpButton = this.add.triangle(DEFAULT_WIDTH / 2 + 160, 420, 0, 10, 10, 0, 20, 10, 0xFFD700)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.scrollUpgrades(-1));

        this.scrollDownButton = this.add.triangle(DEFAULT_WIDTH / 2 + 160, 560, 0, 0, 10, 10, 20, 0, 0xFFD700)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.scrollUpgrades(1));

        // Add mousewheel support
        this.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: any, deltaX: number, deltaY: number) => {
            if (pointer.y > 400 && pointer.y < 560 &&
                pointer.x > DEFAULT_WIDTH / 2 - 150 && pointer.x < DEFAULT_WIDTH / 2 + 150) {
                this.scrollUpgrades(deltaY > 0 ? 1 : -1);
            }
        });

        // Update button visibility
        this.updateUpgradeVisibility();
    }

    scrollUpgrades(direction: number) {
        // Calculate the new index
        const newIndex = Phaser.Math.Clamp(
            this.currentUpgradeIndex + direction,
            0,
            Math.max(0, this.upgrades.length - this.visibleUpgradesCount)
        );

        // Only update if the index changed
        if (newIndex !== this.currentUpgradeIndex) {
            this.currentUpgradeIndex = newIndex;
            this.updateUpgradeVisibility();
        }
    }

    updateUpgradeVisibility() {
        // Hide all upgrade buttons first
        this.upgradeButtons.forEach(button => {
            button.setVisible(false);
        });

        // Show only the visible ones
        for (let i = this.currentUpgradeIndex; i < this.currentUpgradeIndex + this.visibleUpgradesCount; i++) {
            if (i < this.upgradeButtons.length) {
                const button = this.upgradeButtons[i];
                button.setVisible(true);

                // Position the button based on its position in the visible set
                const visibleIndex = i - this.currentUpgradeIndex;
                // Adjust the Y position to ensure buttons are within the scrollbox
                button.setPosition(DEFAULT_WIDTH / 2, 430 + (visibleIndex * 50));
            }
        }

        // Update scroll button visibility
        this.scrollUpButton.setVisible(this.currentUpgradeIndex > 0);
        this.scrollDownButton.setVisible(this.currentUpgradeIndex < this.upgrades.length - this.visibleUpgradesCount);
    }

    createUpgradeButtons() {
        this.upgradeButtons = [];

        this.upgrades.forEach((upgrade, index) => {
            // Create container for the button
            const container = this.add.container(DEFAULT_WIDTH / 2, 430 + (index * 50));

            // Background for the button - make it slightly smaller to fit better
            const bg = this.add.rectangle(0, 0, 280, 45, 0x333333, 0.8)
                .setStrokeStyle(2, 0xFFD700)
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', () => this.buyUpgrade(index));

            // Upgrade name and info - adjust text positions
            const nameText = this.add.text(-130, -12, upgrade.name, {
                fontFamily: 'Arial',
                fontSize: 16,
                color: '#FFFFFF'
            });

            const costText = this.add.text(-130, 8, `Cost: ${upgrade.cost}`, {
                fontFamily: 'Arial',
                fontSize: 14,
                color: '#FFD700'
            });

            // Move the effect text to make room for owned count
            const effectText = this.add.text(10, -12, upgrade.perClick ?
                `+${upgrade.perClick} per click` :
                `+${upgrade.perSecond} per second`, {
                fontFamily: 'Arial',
                fontSize: 14,
                color: '#AAFFAA'
            });

            // Reposition the owned text to be inside the button
            const ownedText = this.add.text(10, 8, `Owned: ${upgrade.owned}`, {
                fontFamily: 'Arial',
                fontSize: 14,
                color: '#CCCCCC'
            }).setName('ownedText');

            // Add all elements to the container
            container.add([bg, nameText, costText, effectText, ownedText]);

            // Store reference to the button
            upgrade.button = container;
            this.upgradeButtons.push(container);
        });
    }

    updateUpgradeButtons() {
        this.upgrades.forEach((upgrade, index) => {
            if (upgrade.button) {
                const bg = upgrade.button.getAt(0) as Phaser.GameObjects.Rectangle;
                const ownedText = upgrade.button.getByName('ownedText') as Phaser.GameObjects.Text;

                // Update owned count
                ownedText.setText(`Owned: ${upgrade.owned}`);

                // Enable/disable based on affordability
                if (this.cryptoCount >= upgrade.cost) {
                    bg.setFillStyle(0x333333, 0.8);
                    bg.setStrokeStyle(2, 0xFFD700);
                } else {
                    bg.setFillStyle(0x222222, 0.8);
                    bg.setStrokeStyle(2, 0x555555);
                }
            }
        });

        // Also update visibility in case the number of upgrades changed
        this.updateUpgradeVisibility();
    }

    buyUpgrade(index: number) {
        const upgrade = this.upgrades[index];

        if (this.cryptoCount >= upgrade.cost) {
            // Purchase the upgrade
            this.cryptoCount -= upgrade.cost;
            upgrade.owned++;
            this.totalUpgrades++;

            // Increase the cost for next purchase (by 15%)
            upgrade.cost = Math.floor(upgrade.cost * 1.15);

            // Update the player's stats
            if (upgrade.perClick) {
                this.cryptoPerClick += upgrade.perClick;
            }
            if (upgrade.perSecond) {
                this.cryptoPerSecond += upgrade.perSecond;
            }

            // Update the UI
            this.updateCountText();
            this.updateUpgradeButtons();

            // Update the cost text
            if (upgrade.button) {
                const costText = upgrade.button.getAt(2) as Phaser.GameObjects.Text;
                costText.setText(`Cost: ${upgrade.cost}`);
            }

            // Check for achievements
            this.checkAchievements();
        }
    }

    async recordPlay() {
        const arcade = process.env.NEXT_PUBLIC_COLLECTION_ID;
        const tokenMint = process.env.NEXT_PUBLIC_TOKEN_MINT;
        if (this.playerAsset && arcade && tokenMint) {
            await recordPlay(this.umi, {
                player: publicKey(this.playerAsset),
                arcade: publicKey(arcade),
                tokenMint: publicKey(tokenMint),
                gameId: 0
            }).sendAndConfirm(this.umi);
        } else if (this.referrer && arcade && tokenMint) {
            await recordGuestPlay(this.umi, {
                referrer: publicKey(this.referrer),
                referrerSigner: findAssetSignerPda(this.umi, { asset: publicKey(this.referrer) }),
                arcade: publicKey(arcade),
                tokenMint: publicKey(tokenMint),
                gameId: 0
            }).sendAndConfirm(this.umi);
        } else if (arcade && tokenMint) {
            await recordGuestPlay(this.umi, {
                arcade: publicKey(arcade),
                tokenMint: publicKey(tokenMint),
                gameId: 0
            }).sendAndConfirm(this.umi);
        }
    }
} 
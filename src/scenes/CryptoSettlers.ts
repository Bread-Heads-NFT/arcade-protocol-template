import { Scene } from 'phaser';
import { Umi } from '@metaplex-foundation/umi';
import { DEFAULT_WIDTH, DEFAULT_HEIGHT } from '@/components/Game';
import EventCenter from '@/events/eventCenter';

// Hex tile types
enum HexType {
    BLOCKCHAIN = 'blockchain',  // Equivalent to forest (produces tokens)
    MINING = 'mining',          // Equivalent to hills (produces hashpower)
    SERVER = 'server',          // Equivalent to mountains (produces compute)
    NETWORK = 'network',        // Equivalent to fields (produces bandwidth)
    STORAGE = 'storage',        // Equivalent to pasture (produces storage)
    DESERT = 'desert'           // Desert - produces nothing
}

// Resource types
enum ResourceType {
    TOKEN = 'token',
    HASHPOWER = 'hashpower',
    COMPUTE = 'compute',
    BANDWIDTH = 'bandwidth',
    STORAGE = 'storage'
}

// Building types
enum BuildingType {
    NODE = 'node',              // Equivalent to settlement
    DATACENTER = 'datacenter',  // Equivalent to city
    LINK = 'link'               // Equivalent to road
}

// Hex tile class
interface HexTile {
    type: HexType;
    resourceType: ResourceType | null;
    tokenValue: number;
    x: number;
    y: number;
    sprite: Phaser.GameObjects.Sprite;
    tokenSprite: Phaser.GameObjects.Sprite | null;
}

// Player class
interface Player {
    id: number;
    color: number;
    resources: Map<ResourceType, number>;
    buildings: {
        nodes: Phaser.GameObjects.Sprite[];
        datacenters: Phaser.GameObjects.Sprite[];
        links: Phaser.GameObjects.Sprite[];
    };
    victoryPoints: number;
}

// Vertex class for building placement
interface Vertex {
    x: number;
    y: number;
    buildings: {
        playerId: number | null;
        type: BuildingType | null;
        sprite: Phaser.GameObjects.Sprite | null;
    };
    adjacentHexes: HexTile[];
    adjacentVertices: Vertex[];
}

// Edge class for link placement
interface Edge {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    playerId: number | null;
    sprite: Phaser.GameObjects.Sprite | null;
    vertices: [Vertex, Vertex];
}

export class CryptoSettlers extends Scene {
    private umi!: Umi;
    private hexTiles: HexTile[] = [];
    private players: Player[] = [];
    private currentPlayerIndex: number = 0;
    private dice: { die1: number, die2: number } = { die1: 0, die2: 0 };
    private gamePhase: 'setup' | 'main' = 'setup';
    private setupRound: number = 1;
    private setupPlayerIndex: number = 0;
    private setupDirection: 1 | -1 = 1;
    private hexSize: number = 40;
    private uiGroup!: Phaser.GameObjects.Group;
    private resourceCounters: Map<ResourceType, Phaser.GameObjects.Text> = new Map();
    private diceText!: Phaser.GameObjects.Text;
    private currentPlayerText!: Phaser.GameObjects.Text;
    private endTurnButton!: Phaser.GameObjects.Text;
    private buildButtons: Map<string, Phaser.GameObjects.Text> = new Map();
    private selectedBuildingType: string | null = null;
    private vertices: Vertex[] = [];
    private edges: Edge[] = [];
    private selectedVertex: Vertex | null = null;
    private selectedEdge: Edge | null = null;
    private vertexMarkers: Phaser.GameObjects.Sprite[] = [];
    private edgeMarkers: Phaser.GameObjects.Sprite[] = [];

    constructor() {
        super('CryptoSettlers');
    }

    init(args: { umi: Umi }) {
        this.umi = args.umi;
        EventCenter.on('umi', (umi: Umi) => {
            this.umi = umi;
        });
    }

    preload() {
        // We'll skip loading images for now and use text labels instead
    }

    create() {
        // Initialize the game board
        this.createBoard();

        // Initialize players
        this.initializePlayers();

        // Create UI elements
        this.createUI();

        // Start the game in setup phase
        this.startSetupPhase();

        // Add debug button for testing
        this.createDebugButton();
    }

    update() {
        // Update game logic here
    }

    private createBoard() {
        // Define the board layout (hexagonal grid)
        const boardLayout = [
            { row: 0, cols: 3 },
            { row: 1, cols: 4 },
            { row: 2, cols: 5 },
            { row: 3, cols: 4 },
            { row: 4, cols: 3 }
        ];

        // Define resource distribution (similar to Catan)
        const hexTypes = [
            HexType.BLOCKCHAIN, HexType.BLOCKCHAIN, HexType.BLOCKCHAIN, HexType.BLOCKCHAIN,
            HexType.MINING, HexType.MINING, HexType.MINING,
            HexType.SERVER, HexType.SERVER, HexType.SERVER,
            HexType.NETWORK, HexType.NETWORK, HexType.NETWORK, HexType.NETWORK,
            HexType.STORAGE, HexType.STORAGE, HexType.STORAGE, HexType.STORAGE,
            HexType.DESERT
        ];

        // Shuffle hex types
        this.shuffleArray(hexTypes);

        // Define token values (similar to Catan)
        const tokenValues = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

        // Shuffle token values
        this.shuffleArray(tokenValues);

        // Calculate board dimensions with adjusted spacing
        const hexWidth = this.hexSize * 2;
        const hexHeight = Math.sqrt(3) * this.hexSize;
        const boardWidth = hexWidth * 5;
        const boardHeight = hexHeight * 5;
        const startX = (DEFAULT_WIDTH - boardWidth) / 2 + hexWidth / 2;
        const startY = (DEFAULT_HEIGHT - boardHeight) / 2 + hexHeight / 2 + 50; // Added 50px offset to move board down

        // Create hex tiles
        let hexIndex = 0;
        let tokenIndex = 0;
        let desertIndex = -1;

        // Find the desert index
        for (let i = 0; i < hexTypes.length; i++) {
            if (hexTypes[i] === HexType.DESERT) {
                desertIndex = i;
                break;
            }
        }

        // Create the board
        for (let rowIndex = 0; rowIndex < boardLayout.length; rowIndex++) {
            const row = boardLayout[rowIndex];
            const cols = row.cols;

            for (let colIndex = 0; colIndex < cols; colIndex++) {
                const hexType = hexTypes[hexIndex];
                let tokenValue = 0;

                // Skip token assignment for desert
                if (hexIndex !== desertIndex) {
                    tokenValue = tokenValues[tokenIndex];
                    tokenIndex++;
                }

                // Calculate hex position
                const x = startX + (hexWidth * 0.75) * colIndex;
                const y = startY + hexHeight * rowIndex + (colIndex % 2 === 1 ? hexHeight / 2 : 0);

                // Create hex using a polygon shape and text label instead of sprite
                const hexPoints = this.getHexPoints(0, 0, this.hexSize);
                const hexGraphics = this.add.graphics();

                // Set color based on hex type
                let fillColor = 0x000000;
                switch (hexType) {
                    case HexType.BLOCKCHAIN:
                        fillColor = 0x00FF00; // Green
                        break;
                    case HexType.MINING:
                        fillColor = 0xAA5500; // Brown
                        break;
                    case HexType.SERVER:
                        fillColor = 0x888888; // Gray
                        break;
                    case HexType.NETWORK:
                        fillColor = 0xFFFF00; // Yellow
                        break;
                    case HexType.STORAGE:
                        fillColor = 0x00FFFF; // Cyan
                        break;
                    case HexType.DESERT:
                        fillColor = 0xFFAA00; // Orange
                        break;
                }

                hexGraphics.fillStyle(fillColor, 0.7);
                hexGraphics.lineStyle(2, 0x000000, 1);
                hexGraphics.fillPoints(hexPoints, true);
                hexGraphics.strokePoints(hexPoints, true);
                hexGraphics.setPosition(x, y);

                // Create hex label with smaller font
                const hexLabel = this.add.text(x, y - 10, hexType, {
                    fontSize: '10px', // Smaller font
                    color: '#000000',
                    backgroundColor: '#FFFFFF',
                    padding: { x: 2, y: 1 } // Smaller padding
                });
                hexLabel.setOrigin(0.5);

                // Create token value label with smaller font
                let tokenLabel = null;
                if (hexType !== HexType.DESERT) {
                    tokenLabel = this.add.text(x, y + 10, tokenValue.toString(), {
                        fontSize: '14px', // Smaller font
                        color: '#FFFFFF',
                        backgroundColor: '#000000',
                        padding: { x: 6, y: 3 }, // Smaller padding
                        fontStyle: 'bold'
                    });
                    tokenLabel.setOrigin(0.5);
                }

                // Map hex type to resource type
                let resourceType: ResourceType | null = null;
                switch (hexType) {
                    case HexType.BLOCKCHAIN:
                        resourceType = ResourceType.TOKEN;
                        break;
                    case HexType.MINING:
                        resourceType = ResourceType.HASHPOWER;
                        break;
                    case HexType.SERVER:
                        resourceType = ResourceType.COMPUTE;
                        break;
                    case HexType.NETWORK:
                        resourceType = ResourceType.BANDWIDTH;
                        break;
                    case HexType.STORAGE:
                        resourceType = ResourceType.STORAGE;
                        break;
                    default:
                        resourceType = null;
                }

                // Create a container for the hex elements
                const container = this.add.container(x, y, [hexGraphics]);
                container.setSize(hexWidth, hexHeight);
                container.setInteractive(new Phaser.Geom.Polygon(hexPoints), Phaser.Geom.Polygon.Contains);

                // Create hex tile object with sprite as the container
                const hexTile: HexTile = {
                    type: hexType,
                    resourceType: resourceType,
                    tokenValue: tokenValue,
                    x: x,
                    y: y,
                    sprite: container as any, // Type cast container to sprite for compatibility
                    tokenSprite: tokenLabel as any // Type cast text to sprite for compatibility
                };

                // Add to hex tiles array
                this.hexTiles.push(hexTile);

                // Make hex interactive
                container.on('pointerdown', () => {
                    this.onHexClicked(hexTile);
                });

                hexIndex++;
            }
        }

        // After creating all hex tiles, create vertices and edges
        this.createVerticesAndEdges();
    }

    private initializePlayers() {
        // Create 4 players with different colors
        const playerColors = [0xFF0000, 0x0000FF, 0x00FF00, 0xFFFF00];

        for (let i = 0; i < 4; i++) {
            const player: Player = {
                id: i,
                color: playerColors[i],
                resources: new Map([
                    // Give each player some starting resources for testing
                    [ResourceType.TOKEN, 5],
                    [ResourceType.HASHPOWER, 5],
                    [ResourceType.COMPUTE, 5],
                    [ResourceType.BANDWIDTH, 5],
                    [ResourceType.STORAGE, 5]
                ]),
                buildings: {
                    nodes: [],
                    datacenters: [],
                    links: []
                },
                victoryPoints: 0
            };

            this.players.push(player);
        }

        // Set current player
        this.currentPlayerIndex = 0;
    }

    private createUI() {
        // Create UI group
        this.uiGroup = this.add.group();

        // Create resource counters with more compact layout
        const resourceTypes = Object.values(ResourceType);
        const startX = 20; // Moved left
        const startY = 30; // Moved up
        const spacing = 80; // Reduced spacing

        resourceTypes.forEach((type, index) => {
            const x = startX + index * spacing;
            const y = startY;

            // Resource text label with smaller font
            const resourceText = this.add.text(x, y, type.substring(0, 3).toUpperCase(), {
                fontSize: '12px', // Smaller font
                color: '#FFFFFF',
                backgroundColor: '#000000',
                padding: { x: 3, y: 1 } // Smaller padding
            });
            resourceText.setOrigin(0.5);
            this.uiGroup.add(resourceText);

            // Resource counter with smaller font
            const counter = this.add.text(x + 25, y, '0', {
                fontSize: '18px', // Smaller font
                color: '#FFFFFF'
            });
            counter.setOrigin(0, 0.5);
            this.uiGroup.add(counter);

            this.resourceCounters.set(type, counter);
        });

        // Create dice display
        this.diceText = this.add.text(DEFAULT_WIDTH / 2, 30, 'Roll: -', {
            fontSize: '18px', // Smaller font
            color: '#FFFFFF'
        });
        this.diceText.setOrigin(0.5);
        this.uiGroup.add(this.diceText);

        // Create current player display
        this.currentPlayerText = this.add.text(DEFAULT_WIDTH / 2, 60, 'Player 1', {
            fontSize: '18px', // Smaller font
            color: '#FFFFFF'
        });
        this.currentPlayerText.setOrigin(0.5);
        this.uiGroup.add(this.currentPlayerText);

        // Create end turn button
        this.endTurnButton = this.add.text(DEFAULT_WIDTH - 80, 30, 'End Turn', {
            fontSize: '16px', // Smaller font
            color: '#FFFFFF',
            backgroundColor: '#333333',
            padding: {
                x: 8,
                y: 4 // Smaller padding
            }
        });
        this.endTurnButton.setInteractive();
        this.endTurnButton.on('pointerdown', () => {
            this.endTurn();
        });
        this.uiGroup.add(this.endTurnButton);

        // Create trade button
        const tradeButton = this.add.text(DEFAULT_WIDTH - 80, 70, 'Trade', {
            fontSize: '16px', // Smaller font
            color: '#FFFFFF',
            backgroundColor: '#333333',
            padding: {
                x: 8,
                y: 4 // Smaller padding
            }
        });
        tradeButton.setInteractive();
        tradeButton.on('pointerdown', () => {
            this.openTradeUI();
        });
        this.uiGroup.add(tradeButton);

        // Create build buttons with more compact layout
        const buildTypes = [
            { type: BuildingType.NODE, label: 'Build Node' },
            { type: BuildingType.DATACENTER, label: 'Build Datacenter' },
            { type: BuildingType.LINK, label: 'Build Link' }
        ];

        buildTypes.forEach((build, index) => {
            const button = this.add.text(100, DEFAULT_HEIGHT - 120 + index * 35, build.label, {
                fontSize: '16px', // Smaller font
                color: '#FFFFFF',
                backgroundColor: '#333333',
                padding: {
                    x: 8,
                    y: 4 // Smaller padding
                }
            });

            button.setInteractive();
            button.on('pointerdown', () => {
                this.selectBuildingType(build.type);
            });

            this.buildButtons.set(build.type, button);
            this.uiGroup.add(button);
        });

        // Initially hide build buttons in setup phase
        this.updateBuildButtons();
    }

    private startSetupPhase() {
        this.gamePhase = 'setup';
        this.setupRound = 1;
        this.setupPlayerIndex = 0;
        this.setupDirection = 1;

        // Update UI for setup phase
        this.currentPlayerText.setText(`Setup: Player ${this.setupPlayerIndex + 1}`);
        this.endTurnButton.setVisible(false);

        // Only allow building nodes and links in setup
        this.updateBuildButtons();
    }

    private startMainPhase() {
        this.gamePhase = 'main';
        this.currentPlayerIndex = 0;

        // Update UI for main phase
        this.updateCurrentPlayerUI();
        this.endTurnButton.setVisible(true);

        // Roll dice for first turn
        this.rollDice();

        // Update build buttons
        this.updateBuildButtons();
    }

    private endTurn() {
        if (this.gamePhase === 'setup') {
            // In setup phase, move to next player
            if (this.setupRound === 1 && this.setupPlayerIndex === 3) {
                // End of first round, reverse direction
                this.setupRound = 2;
                this.setupDirection = -1;
            } else if (this.setupRound === 2 && this.setupPlayerIndex === 0) {
                // End of second round, start main game
                this.startMainPhase();
                return;
            } else {
                // Move to next player
                this.setupPlayerIndex = (this.setupPlayerIndex + this.setupDirection + 4) % 4;
            }

            // Update UI
            this.currentPlayerText.setText(`Setup: Player ${this.setupPlayerIndex + 1}`);
        } else {
            // In main phase, move to next player
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 4;

            // Update UI
            this.updateCurrentPlayerUI();

            // Roll dice for next turn
            this.rollDice();
        }

        // Reset selected building type
        this.selectedBuildingType = null;

        // Update build buttons
        this.updateBuildButtons();
    }

    private rollDice() {
        // Roll two dice
        this.dice.die1 = Phaser.Math.Between(1, 6);
        this.dice.die2 = Phaser.Math.Between(1, 6);
        const total = this.dice.die1 + this.dice.die2;

        // Update dice text
        this.diceText.setText(`Roll: ${total}`);

        // Distribute resources based on dice roll
        if (total !== 7) {
            this.distributeResources(total);
        } else {
            // TODO: Implement robber mechanic
            console.log('Robber rolled!');
        }
    }

    private distributeResources(diceValue: number) {
        // Find all hex tiles with the rolled value
        const matchingTiles = this.hexTiles.filter(tile => tile.tokenValue === diceValue);

        // For each matching tile, give resources to players with adjacent nodes/datacenters
        matchingTiles.forEach(tile => {
            // Skip if desert or no resource type
            if (tile.type === HexType.DESERT || !tile.resourceType) {
                return;
            }

            // Find all vertices adjacent to this hex
            const adjacentVertices = this.vertices.filter(vertex =>
                vertex.adjacentHexes.includes(tile)
            );

            // For each vertex with a building, give resources to the owner
            adjacentVertices.forEach(vertex => {
                if (vertex.buildings.playerId !== null) {
                    const player = this.players[vertex.buildings.playerId];
                    const resourceType = tile.resourceType!;

                    // Determine amount based on building type
                    let amount = 0;
                    if (vertex.buildings.type === BuildingType.NODE) {
                        amount = 1;
                    } else if (vertex.buildings.type === BuildingType.DATACENTER) {
                        amount = 2;
                    }

                    // Add resources to player
                    const currentAmount = player.resources.get(resourceType) || 0;
                    player.resources.set(resourceType, currentAmount + amount);

                    // Show resource gain animation
                    this.showResourceGainAnimation(vertex.x, vertex.y, resourceType, amount);
                }
            });
        });

        // Update resource counters
        this.updateResourceCounters();
    }

    private showResourceGainAnimation(x: number, y: number, resourceType: ResourceType, amount: number) {
        // Create resource text label instead of icon
        const resourceText = this.add.text(x, y, resourceType.substring(0, 3).toUpperCase(), {
            fontSize: '12px', // Smaller font
            color: '#FFFFFF',
            backgroundColor: '#000000',
            padding: { x: 3, y: 1 } // Smaller padding
        });
        resourceText.setOrigin(0.5);

        // Create amount text
        const amountText = this.add.text(x + 20, y, `+${amount}`, { // Moved closer
            fontSize: '18px', // Smaller font
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 3 // Thinner stroke
        });

        // Animate
        this.tweens.add({
            targets: [resourceText, amountText],
            y: y - 50,
            alpha: 0,
            duration: 1500,
            onComplete: () => {
                resourceText.destroy();
                amountText.destroy();
            }
        });
    }

    private updateResourceCounters() {
        const currentPlayer = this.players[this.currentPlayerIndex];

        // Update each resource counter
        Object.values(ResourceType).forEach(type => {
            const counter = this.resourceCounters.get(type);
            if (counter) {
                counter.setText(currentPlayer.resources.get(type)?.toString() || '0');
            }
        });
    }

    private updateCurrentPlayerUI() {
        // Update current player text
        this.currentPlayerText.setText(`Player ${this.currentPlayerIndex + 1}`);

        // Update resource counters
        this.updateResourceCounters();
    }

    private updateBuildButtons() {
        if (this.gamePhase === 'setup') {
            // In setup phase, only show node and link buttons
            this.buildButtons.get(BuildingType.NODE)?.setVisible(true);
            this.buildButtons.get(BuildingType.DATACENTER)?.setVisible(false);
            this.buildButtons.get(BuildingType.LINK)?.setVisible(true);
        } else {
            // In main phase, show all buttons
            this.buildButtons.forEach(button => button.setVisible(true));
        }

        // Highlight selected building type
        this.buildButtons.forEach((button, type) => {
            button.setBackgroundColor(type === this.selectedBuildingType ? '#666666' : '#333333');
        });
    }

    private selectBuildingType(type: string) {
        this.selectedBuildingType = type;
        this.updateBuildButtons();
        this.showBuildingPlacementOptions();
    }

    private onHexClicked(hexTile: HexTile) {
        // Handle hex click based on game phase and selected building type
        console.log(`Hex clicked: ${hexTile.type} with value ${hexTile.tokenValue}`);
    }

    private createVerticesAndEdges() {
        // Create vertices at hex corners
        const vertexPositions: { x: number, y: number }[] = [];

        // Calculate vertex positions based on hex positions
        this.hexTiles.forEach(hex => {
            // Calculate the 6 corners of the hex
            const corners = this.getHexCorners(hex.x, hex.y, this.hexSize);

            // Add each corner as a potential vertex
            corners.forEach(corner => {
                // Check if this vertex already exists (within a small distance)
                const existingVertex = vertexPositions.find(v =>
                    Phaser.Math.Distance.Between(v.x, v.y, corner.x, corner.y) < 10
                );

                if (!existingVertex) {
                    vertexPositions.push(corner);
                }
            });
        });

        // Create vertex objects
        vertexPositions.forEach(pos => {
            const vertex: Vertex = {
                x: pos.x,
                y: pos.y,
                buildings: {
                    playerId: null,
                    type: null,
                    sprite: null
                },
                adjacentHexes: [],
                adjacentVertices: []
            };

            // Find adjacent hexes
            this.hexTiles.forEach(hex => {
                const corners = this.getHexCorners(hex.x, hex.y, this.hexSize);
                const isAdjacent = corners.some(corner =>
                    Phaser.Math.Distance.Between(corner.x, corner.y, pos.x, pos.y) < 10
                );

                if (isAdjacent) {
                    vertex.adjacentHexes.push(hex);
                }
            });

            this.vertices.push(vertex);
        });

        // Create edges between vertices
        for (let i = 0; i < this.vertices.length; i++) {
            const v1 = this.vertices[i];

            for (let j = i + 1; j < this.vertices.length; j++) {
                const v2 = this.vertices[j];
                const distance = Phaser.Math.Distance.Between(v1.x, v1.y, v2.x, v2.y);

                // If vertices are close enough, create an edge between them
                if (distance < this.hexSize * 1.2) {
                    const edge: Edge = {
                        x1: v1.x,
                        y1: v1.y,
                        x2: v2.x,
                        y2: v2.y,
                        playerId: null,
                        sprite: null,
                        vertices: [v1, v2]
                    };

                    this.edges.push(edge);

                    // Update adjacent vertices
                    v1.adjacentVertices.push(v2);
                    v2.adjacentVertices.push(v1);
                }
            }
        }
    }

    private getHexCorners(centerX: number, centerY: number, size: number): { x: number, y: number }[] {
        const corners = [];

        for (let i = 0; i < 6; i++) {
            const angle = 2 * Math.PI / 6 * i;
            const x = centerX + size * Math.cos(angle);
            const y = centerY + size * Math.sin(angle);
            corners.push({ x, y });
        }

        return corners;
    }

    private showBuildingPlacementOptions() {
        // Clear existing markers
        this.clearBuildingMarkers();

        const currentPlayer = this.players[this.currentPlayerIndex];

        if (this.selectedBuildingType === BuildingType.NODE || this.selectedBuildingType === BuildingType.DATACENTER) {
            // Show valid vertices for node/datacenter placement
            this.vertices.forEach(vertex => {
                if (this.canPlaceBuildingAtVertex(vertex)) {
                    // Use a circle with text label instead of sprite
                    const marker = this.add.circle(vertex.x, vertex.y, 10, currentPlayer.color, 0.5); // Smaller circle
                    const label = this.add.text(vertex.x, vertex.y, this.selectedBuildingType === BuildingType.NODE ? 'N' : 'D', {
                        fontSize: '10px', // Smaller font
                        color: '#FFFFFF'
                    });
                    label.setOrigin(0.5);

                    // Group as container for easier interaction
                    const container = this.add.container(vertex.x, vertex.y, [marker, label]);
                    container.setSize(20, 20); // Smaller size
                    container.setInteractive();
                    container.on('pointerdown', () => {
                        this.placeBuilding(vertex);
                    });

                    this.vertexMarkers.push(container as any); // Type cast for compatibility
                }
            });
        } else if (this.selectedBuildingType === BuildingType.LINK) {
            // Show valid edges for link placement
            this.edges.forEach(edge => {
                if (this.canPlaceLinkAtEdge(edge)) {
                    const midX = (edge.x1 + edge.x2) / 2;
                    const midY = (edge.y1 + edge.y2) / 2;
                    const angle = Math.atan2(edge.y2 - edge.y1, edge.x2 - edge.x1);

                    // Use a rectangle with text label instead of sprite
                    const marker = this.add.rectangle(midX, midY, this.hexSize, 6, currentPlayer.color, 0.5); // Thinner rectangle
                    marker.setRotation(angle);
                    const label = this.add.text(midX, midY, 'L', {
                        fontSize: '10px', // Smaller font
                        color: '#FFFFFF',
                        backgroundColor: '#000000',
                        padding: { x: 1, y: 0 } // Smaller padding
                    });
                    label.setOrigin(0.5);
                    label.setRotation(angle);

                    // Group as container for easier interaction
                    const container = this.add.container(midX, midY, [marker, label]);
                    container.setSize(this.hexSize, 15); // Smaller size
                    container.setInteractive();
                    container.on('pointerdown', () => {
                        this.placeLink(edge);
                    });

                    this.edgeMarkers.push(container as any); // Type cast for compatibility
                }
            });
        }
    }

    private clearBuildingMarkers() {
        // Clear vertex markers
        this.vertexMarkers.forEach(marker => marker.destroy());
        this.vertexMarkers = [];

        // Clear edge markers
        this.edgeMarkers.forEach(marker => marker.destroy());
        this.edgeMarkers = [];
    }

    private canPlaceBuildingAtVertex(vertex: Vertex): boolean {
        // Check if vertex is already occupied
        if (vertex.buildings.playerId !== null) {
            return false;
        }

        // In setup phase, no adjacency restrictions
        if (this.gamePhase === 'setup') {
            return true;
        }

        // Check if player has a link connected to this vertex
        const hasConnectedLink = this.edges.some(edge =>
            edge.playerId === this.currentPlayerIndex &&
            (edge.vertices[0] === vertex || edge.vertices[1] === vertex)
        );

        if (!hasConnectedLink) {
            return false;
        }

        // Check distance rule (no buildings on adjacent vertices)
        const hasAdjacentBuilding = vertex.adjacentVertices.some(v => v.buildings.playerId !== null);

        if (hasAdjacentBuilding) {
            return false;
        }

        // For datacenter, check if player already has a node here
        if (this.selectedBuildingType === BuildingType.DATACENTER) {
            return vertex.buildings.type === BuildingType.NODE &&
                vertex.buildings.playerId === this.currentPlayerIndex;
        }

        return true;
    }

    private canPlaceLinkAtEdge(edge: Edge): boolean {
        // Check if edge is already occupied
        if (edge.playerId !== null) {
            return false;
        }

        // In setup phase, must be connected to the last placed node
        if (this.gamePhase === 'setup') {
            const lastNode = this.players[this.setupPlayerIndex].buildings.nodes[
                this.players[this.setupPlayerIndex].buildings.nodes.length - 1
            ];

            if (!lastNode) {
                return false;
            }

            // Find the vertex where the last node was placed
            const lastNodeVertex = this.vertices.find(v =>
                v.buildings.sprite === lastNode
            );

            if (!lastNodeVertex) {
                return false;
            }

            // Check if edge is connected to the last node
            return edge.vertices[0] === lastNodeVertex || edge.vertices[1] === lastNodeVertex;
        }

        // In main phase, must be connected to player's existing building
        const isConnectedToPlayerBuilding = edge.vertices.some(vertex =>
            (vertex.buildings.playerId === this.currentPlayerIndex) ||
            this.edges.some(e =>
                e.playerId === this.currentPlayerIndex &&
                (e.vertices[0] === vertex || e.vertices[1] === vertex)
            )
        );

        return isConnectedToPlayerBuilding;
    }

    private placeBuilding(vertex: Vertex) {
        const currentPlayer = this.players[this.currentPlayerIndex];

        // Check if player has enough resources
        if (this.gamePhase === 'main') {
            if (this.selectedBuildingType === BuildingType.NODE) {
                // Check resources for node (1 token, 1 compute, 1 bandwidth, 1 storage)
                if (currentPlayer.resources.get(ResourceType.TOKEN)! < 1 ||
                    currentPlayer.resources.get(ResourceType.COMPUTE)! < 1 ||
                    currentPlayer.resources.get(ResourceType.BANDWIDTH)! < 1 ||
                    currentPlayer.resources.get(ResourceType.STORAGE)! < 1) {
                    console.log('Not enough resources to build a node');
                    return;
                }

                // Deduct resources
                currentPlayer.resources.set(ResourceType.TOKEN, currentPlayer.resources.get(ResourceType.TOKEN)! - 1);
                currentPlayer.resources.set(ResourceType.COMPUTE, currentPlayer.resources.get(ResourceType.COMPUTE)! - 1);
                currentPlayer.resources.set(ResourceType.BANDWIDTH, currentPlayer.resources.get(ResourceType.BANDWIDTH)! - 1);
                currentPlayer.resources.set(ResourceType.STORAGE, currentPlayer.resources.get(ResourceType.STORAGE)! - 1);
            } else if (this.selectedBuildingType === BuildingType.DATACENTER) {
                // Check resources for datacenter (2 token, 3 hashpower)
                if (currentPlayer.resources.get(ResourceType.TOKEN)! < 2 ||
                    currentPlayer.resources.get(ResourceType.HASHPOWER)! < 3) {
                    console.log('Not enough resources to build a datacenter');
                    return;
                }

                // Deduct resources
                currentPlayer.resources.set(ResourceType.TOKEN, currentPlayer.resources.get(ResourceType.TOKEN)! - 2);
                currentPlayer.resources.set(ResourceType.HASHPOWER, currentPlayer.resources.get(ResourceType.HASHPOWER)! - 3);

                // Remove the existing node
                if (vertex.buildings.sprite) {
                    vertex.buildings.sprite.destroy();

                    // Remove from player's nodes array
                    const nodeIndex = currentPlayer.buildings.nodes.indexOf(vertex.buildings.sprite);
                    if (nodeIndex !== -1) {
                        currentPlayer.buildings.nodes.splice(nodeIndex, 1);
                    }
                }
            }

            // Update resource counters
            this.updateResourceCounters();
        }

        // Create building using a circle with text label instead of sprite
        const circle = this.add.circle(vertex.x, vertex.y, 10, currentPlayer.color); // Smaller circle
        const label = this.add.text(vertex.x, vertex.y, this.selectedBuildingType === BuildingType.NODE ? 'N' : 'D', {
            fontSize: '10px', // Smaller font
            color: '#FFFFFF'
        });
        label.setOrigin(0.5);

        // Group as container
        const container = this.add.container(vertex.x, vertex.y, [circle, label]);
        container.setSize(20, 20); // Smaller size

        // Update vertex data
        vertex.buildings = {
            playerId: this.currentPlayerIndex,
            type: this.selectedBuildingType as BuildingType,
            sprite: container as any // Type cast for compatibility
        };

        // Add to player's buildings
        if (this.selectedBuildingType === BuildingType.NODE) {
            currentPlayer.buildings.nodes.push(container as any); // Type cast for compatibility
            currentPlayer.victoryPoints += 1;
        } else if (this.selectedBuildingType === BuildingType.DATACENTER) {
            currentPlayer.buildings.datacenters.push(container as any); // Type cast for compatibility
            currentPlayer.victoryPoints += 1; // +1 more (already had +1 from the node)
        }

        // Clear building markers
        this.clearBuildingMarkers();

        // In setup phase, automatically select link building type after placing a node
        if (this.gamePhase === 'setup' && this.selectedBuildingType === BuildingType.NODE) {
            this.selectBuildingType(BuildingType.LINK);
        } else {
            this.selectedBuildingType = null;
            this.updateBuildButtons();
        }

        // Check for victory
        if (currentPlayer.victoryPoints >= 10) {
            this.gameWon();
        }
    }

    private placeLink(edge: Edge) {
        const currentPlayer = this.players[this.currentPlayerIndex];

        // Check if player has enough resources
        if (this.gamePhase === 'main') {
            // Check resources for link (1 token, 1 bandwidth)
            if (currentPlayer.resources.get(ResourceType.TOKEN)! < 1 ||
                currentPlayer.resources.get(ResourceType.BANDWIDTH)! < 1) {
                console.log('Not enough resources to build a link');
                return;
            }

            // Deduct resources
            currentPlayer.resources.set(ResourceType.TOKEN, currentPlayer.resources.get(ResourceType.TOKEN)! - 1);
            currentPlayer.resources.set(ResourceType.BANDWIDTH, currentPlayer.resources.get(ResourceType.BANDWIDTH)! - 1);

            // Update resource counters
            this.updateResourceCounters();
        }

        // Calculate midpoint and angle
        const midX = (edge.x1 + edge.x2) / 2;
        const midY = (edge.y1 + edge.y2) / 2;
        const angle = Math.atan2(edge.y2 - edge.y1, edge.x2 - edge.x1);

        // Create link using a rectangle with text label instead of sprite
        const rect = this.add.rectangle(0, 0, this.hexSize, 6, currentPlayer.color); // Thinner rectangle
        const label = this.add.text(0, 0, 'L', {
            fontSize: '10px', // Smaller font
            color: '#FFFFFF'
        });
        label.setOrigin(0.5);

        // Group as container
        const container = this.add.container(midX, midY, [rect, label]);
        container.setSize(this.hexSize, 15); // Smaller size
        container.setRotation(angle);

        // Update edge data
        edge.playerId = this.currentPlayerIndex;
        edge.sprite = container as any; // Type cast for compatibility

        // Add to player's buildings
        currentPlayer.buildings.links.push(container as any); // Type cast for compatibility

        // Clear building markers
        this.clearBuildingMarkers();

        // In setup phase, end turn after placing a link
        if (this.gamePhase === 'setup') {
            this.endTurn();
        } else {
            this.selectedBuildingType = null;
            this.updateBuildButtons();
        }
    }

    private gameWon() {
        const winner = this.players[this.currentPlayerIndex];

        // Display winner message
        const winText = this.add.text(DEFAULT_WIDTH / 2, DEFAULT_HEIGHT / 2, `Player ${winner.id + 1} wins!`, {
            fontSize: '48px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center'
        });
        winText.setOrigin(0.5);

        // Disable further interaction
        this.endTurnButton.disableInteractive();
        this.buildButtons.forEach(button => button.disableInteractive());
    }

    private openTradeUI() {
        // Create trade UI background
        const background = this.add.rectangle(DEFAULT_WIDTH / 2, DEFAULT_HEIGHT / 2, 450, 350, 0x333333, 0.9); // Smaller background

        // Create title
        const title = this.add.text(DEFAULT_WIDTH / 2, DEFAULT_HEIGHT / 2 - 150, 'Trade Resources', {
            fontSize: '22px', // Smaller font
            color: '#FFFFFF'
        });
        title.setOrigin(0.5);

        // Create resource selection UI
        const resourceTypes = Object.values(ResourceType);
        const offerText = this.add.text(DEFAULT_WIDTH / 2 - 180, DEFAULT_HEIGHT / 2 - 110, 'Offer:', {
            fontSize: '18px', // Smaller font
            color: '#FFFFFF'
        });

        const receiveText = this.add.text(DEFAULT_WIDTH / 2 - 180, DEFAULT_HEIGHT / 2, 'Receive:', {
            fontSize: '18px', // Smaller font
            color: '#FFFFFF'
        });

        // Create offer resource buttons with more compact layout
        const offerButtons: Phaser.GameObjects.Text[] = [];
        const offerAmounts: number[] = Array(resourceTypes.length).fill(0);
        const offerAmountTexts: Phaser.GameObjects.Text[] = [];

        resourceTypes.forEach((type, index) => {
            const x = DEFAULT_WIDTH / 2 - 100 + index * 70; // Reduced spacing
            const y = DEFAULT_HEIGHT / 2 - 90; // Adjusted position

            // Resource text label with smaller font
            const resourceText = this.add.text(x, y - 12, type.substring(0, 3).toUpperCase(), {
                fontSize: '12px', // Smaller font
                color: '#FFFFFF',
                backgroundColor: '#000000',
                padding: { x: 3, y: 1 } // Smaller padding
            });
            resourceText.setOrigin(0.5);

            // Amount text with smaller font
            const amountText = this.add.text(x, y + 12, '0', {
                fontSize: '16px', // Smaller font
                color: '#FFFFFF'
            });
            amountText.setOrigin(0.5);
            offerAmountTexts.push(amountText);

            // Plus button with smaller font
            const plusButton = this.add.text(x + 15, y, '+', { // Moved closer
                fontSize: '18px', // Smaller font
                color: '#FFFFFF',
                backgroundColor: '#555555',
                padding: {
                    x: 4,
                    y: 0 // Smaller padding
                }
            });
            plusButton.setOrigin(0, 0.5);
            plusButton.setInteractive();
            plusButton.on('pointerdown', () => {
                const currentPlayer = this.players[this.currentPlayerIndex];
                const currentAmount = currentPlayer.resources.get(type) || 0;

                if (currentAmount > offerAmounts[index]) {
                    offerAmounts[index]++;
                    amountText.setText(offerAmounts[index].toString());
                }
            });

            // Minus button with smaller font
            const minusButton = this.add.text(x - 15, y, '-', { // Moved closer
                fontSize: '18px', // Smaller font
                color: '#FFFFFF',
                backgroundColor: '#555555',
                padding: {
                    x: 4,
                    y: 0 // Smaller padding
                }
            });
            minusButton.setOrigin(1, 0.5);
            minusButton.setInteractive();
            minusButton.on('pointerdown', () => {
                if (offerAmounts[index] > 0) {
                    offerAmounts[index]--;
                    amountText.setText(offerAmounts[index].toString());
                }
            });

            offerButtons.push(plusButton, minusButton);
        });

        // Create receive resource buttons with more compact layout
        const receiveButtons: Phaser.GameObjects.Text[] = [];
        const receiveAmounts: number[] = Array(resourceTypes.length).fill(0);
        const receiveAmountTexts: Phaser.GameObjects.Text[] = [];

        resourceTypes.forEach((type, index) => {
            const x = DEFAULT_WIDTH / 2 - 100 + index * 70; // Reduced spacing
            const y = DEFAULT_HEIGHT / 2 + 20; // Adjusted position

            // Resource text label with smaller font
            const resourceText = this.add.text(x, y - 12, type.substring(0, 3).toUpperCase(), {
                fontSize: '12px', // Smaller font
                color: '#FFFFFF',
                backgroundColor: '#000000',
                padding: { x: 3, y: 1 } // Smaller padding
            });
            resourceText.setOrigin(0.5);

            // Amount text with smaller font
            const amountText = this.add.text(x, y + 12, '0', {
                fontSize: '16px', // Smaller font
                color: '#FFFFFF'
            });
            amountText.setOrigin(0.5);
            receiveAmountTexts.push(amountText);

            // Plus button with smaller font
            const plusButton = this.add.text(x + 15, y, '+', { // Moved closer
                fontSize: '18px', // Smaller font
                color: '#FFFFFF',
                backgroundColor: '#555555',
                padding: {
                    x: 4,
                    y: 0 // Smaller padding
                }
            });
            plusButton.setOrigin(0, 0.5);
            plusButton.setInteractive();
            plusButton.on('pointerdown', () => {
                receiveAmounts[index]++;
                amountText.setText(receiveAmounts[index].toString());
            });

            // Minus button with smaller font
            const minusButton = this.add.text(x - 15, y, '-', { // Moved closer
                fontSize: '18px', // Smaller font
                color: '#FFFFFF',
                backgroundColor: '#555555',
                padding: {
                    x: 4,
                    y: 0 // Smaller padding
                }
            });
            minusButton.setOrigin(1, 0.5);
            minusButton.setInteractive();
            minusButton.on('pointerdown', () => {
                if (receiveAmounts[index] > 0) {
                    receiveAmounts[index]--;
                    amountText.setText(receiveAmounts[index].toString());
                }
            });

            receiveButtons.push(plusButton, minusButton);
        });

        // Create trade with bank button with smaller font
        const tradeWithBankButton = this.add.text(DEFAULT_WIDTH / 2, DEFAULT_HEIGHT / 2 + 90, 'Trade with Bank (4:1)', {
            fontSize: '18px', // Smaller font
            color: '#FFFFFF',
            backgroundColor: '#555555',
            padding: {
                x: 8,
                y: 4 // Smaller padding
            }
        });
        tradeWithBankButton.setOrigin(0.5);
        tradeWithBankButton.setInteractive();

        // Group all trade UI elements
        const tradeUIElements = [
            background, title, offerText, receiveText,
            ...offerButtons, ...receiveButtons,
            ...offerAmountTexts, ...receiveAmountTexts,
            tradeWithBankButton
        ];

        // Function to close trade UI
        const closeTradeUI = () => {
            tradeUIElements.forEach(element => element.destroy());
        };

        // Create close button with smaller font
        const closeButton = this.add.text(DEFAULT_WIDTH / 2 + 210, DEFAULT_HEIGHT / 2 - 150, 'X', { // Adjusted position
            fontSize: '18px', // Smaller font
            color: '#FFFFFF',
            backgroundColor: '#FF0000',
            padding: {
                x: 8,
                y: 4 // Smaller padding
            }
        });
        closeButton.setInteractive();
        closeButton.on('pointerdown', closeTradeUI);
        tradeUIElements.push(closeButton);

        // Update the trade button event
        tradeWithBankButton.on('pointerdown', () => {
            // Check if trade is valid (4:1 ratio)
            const totalOffered = offerAmounts.reduce((sum, amount) => sum + amount, 0);
            const totalReceived = receiveAmounts.reduce((sum, amount) => sum + amount, 0);

            if (totalOffered >= 4 && totalReceived === 1) {
                // Execute trade
                const currentPlayer = this.players[this.currentPlayerIndex];

                // Deduct offered resources
                resourceTypes.forEach((type, index) => {
                    if (offerAmounts[index] > 0) {
                        const currentAmount = currentPlayer.resources.get(type) || 0;
                        currentPlayer.resources.set(type, currentAmount - offerAmounts[index]);
                    }
                });

                // Add received resources
                resourceTypes.forEach((type, index) => {
                    if (receiveAmounts[index] > 0) {
                        const currentAmount = currentPlayer.resources.get(type) || 0;
                        currentPlayer.resources.set(type, currentAmount + receiveAmounts[index]);
                    }
                });

                // Update resource counters
                this.updateResourceCounters();

                // Close trade UI
                closeTradeUI();
            } else {
                // Show error message
                const errorText = this.add.text(DEFAULT_WIDTH / 2, DEFAULT_HEIGHT / 2 + 140, 'Invalid trade! Bank trades at 4:1 ratio.', {
                    fontSize: '18px',
                    color: '#FF0000'
                });
                errorText.setOrigin(0.5);
                tradeUIElements.push(errorText);

                // Remove error message after 2 seconds
                this.time.delayedCall(2000, () => {
                    errorText.destroy();
                });
            }
        });
    }

    // Helper function to shuffle an array
    private shuffleArray(array: any[]) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // Helper function to get hex polygon points
    private getHexPoints(centerX: number, centerY: number, size: number): Phaser.Math.Vector2[] {
        const points: Phaser.Math.Vector2[] = [];

        for (let i = 0; i < 6; i++) {
            const angle = 2 * Math.PI / 6 * i;
            const x = centerX + size * Math.cos(angle);
            const y = centerY + size * Math.sin(angle);
            points.push(new Phaser.Math.Vector2(x, y));
        }

        return points;
    }

    private createDebugButton() {
        // Create debug button with smaller font
        const debugButton = this.add.text(DEFAULT_WIDTH - 80, DEFAULT_HEIGHT - 40, 'Debug', {
            fontSize: '14px', // Smaller font
            color: '#FFFFFF',
            backgroundColor: '#333333',
            padding: {
                x: 8,
                y: 4 // Smaller padding
            }
        });
        debugButton.setInteractive();
        debugButton.on('pointerdown', () => {
            this.showDebugInfo();
        });
    }

    private showDebugInfo() {
        // Create debug overlay
        const background = this.add.rectangle(DEFAULT_WIDTH / 2, DEFAULT_HEIGHT / 2, 550, 450, 0x000000, 0.9); // Smaller background

        // Create title
        const title = this.add.text(DEFAULT_WIDTH / 2, 40, 'Debug Information', {
            fontSize: '20px', // Smaller font
            color: '#FFFFFF'
        });
        title.setOrigin(0.5);

        // Create game state info with smaller font
        const gamePhaseText = this.add.text(80, 80, `Game Phase: ${this.gamePhase}`, {
            fontSize: '14px', // Smaller font
            color: '#FFFFFF'
        });

        const currentPlayerText = this.add.text(80, 105, `Current Player: ${this.currentPlayerIndex + 1}`, {
            fontSize: '14px', // Smaller font
            color: '#FFFFFF'
        });

        const diceText = this.add.text(80, 130, `Last Dice Roll: ${this.dice.die1 + this.dice.die2}`, {
            fontSize: '14px', // Smaller font
            color: '#FFFFFF'
        });

        // Create player resources info with smaller font
        const resourcesTitle = this.add.text(80, 165, 'Player Resources:', {
            fontSize: '16px', // Smaller font
            color: '#FFFFFF'
        });

        const resourceTexts: Phaser.GameObjects.Text[] = [];
        const resourceTypes = Object.values(ResourceType);

        this.players.forEach((player, playerIndex) => {
            const playerText = this.add.text(80, 195 + playerIndex * 50, `Player ${playerIndex + 1}:`, { // Reduced spacing
                fontSize: '14px', // Smaller font
                color: '#FFFFFF'
            });

            resourceTypes.forEach((type, typeIndex) => {
                const amount = player.resources.get(type) || 0;
                const resourceText = this.add.text(220 + typeIndex * 65, 195 + playerIndex * 50, // Reduced spacing
                    `${type.substring(0, 3).toUpperCase()}: ${amount}`, {
                    fontSize: '12px', // Smaller font
                    color: '#FFFFFF'
                });
                resourceTexts.push(resourceText);
            });
        });

        // Create close button with smaller font
        const closeButton = this.add.text(DEFAULT_WIDTH / 2, DEFAULT_HEIGHT - 70, 'Close', {
            fontSize: '16px', // Smaller font
            color: '#FFFFFF',
            backgroundColor: '#555555',
            padding: {
                x: 8,
                y: 4 // Smaller padding
            }
        });
        closeButton.setOrigin(0.5);
        closeButton.setInteractive();

        // Group all debug UI elements
        const debugElements = [
            background, title, gamePhaseText, currentPlayerText, diceText,
            resourcesTitle, ...resourceTexts, closeButton
        ];

        // Close function
        closeButton.on('pointerdown', () => {
            debugElements.forEach(element => element.destroy());
        });
    }
} 
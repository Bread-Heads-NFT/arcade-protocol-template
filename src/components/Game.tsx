'use client';
import React, { useEffect, useState } from 'react'
import Phaser from 'phaser';
import { Boot } from '@/scenes/Boot';
import { Preloader } from '@/scenes/Preloader';
import { WalletConnect } from '@/scenes/WalletConnect';
import { MainMenu } from '@/scenes/MainMenu';
import { Game as MainGame } from '@/scenes/Game';
import { FlappyBird } from '@/scenes/FlappyBird';
import { useUmi } from '@/providers/useUmi';
import EventCenter from '@/events/eventCenter';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSearchParams } from 'next/navigation';

export const DEFAULT_WIDTH: number = 512;
export const DEFAULT_HEIGHT: number = 512;
const MAX_WIDTH = 2048; // Maximum width for the game

const Game = () => {
    const umi = useUmi();
    const searchParams = useSearchParams();
    const [ready, setReady] = useState(false);

    const playerAsset = searchParams.get('nft');
    console.log("playerAsset", playerAsset);

    const referrer = searchParams.get('referrer');
    console.log("referrer", referrer);

    EventCenter.on("ready", () => {
        setReady(true);
    });

    useEffect(() => {
        if (ready && umi) {
            EventCenter.emit("umi", umi);
            EventCenter.emit("playerAsset", playerAsset);
            EventCenter.emit("referrer", referrer);
        }
    }, [ready, umi, playerAsset, referrer]);

    useEffect(() => {
        const config: Phaser.Types.Core.GameConfig = {
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            type: Phaser.AUTO,
            scene: [
                Boot,
                Preloader,
                WalletConnect,
                MainMenu,
                MainGame,
                FlappyBird,
            ],
            render: {
                pixelArt: true,
            },
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH,
                parent: 'game-container',
                width: DEFAULT_WIDTH,
                height: DEFAULT_HEIGHT,
                min: {
                    width: DEFAULT_WIDTH,
                    height: DEFAULT_HEIGHT
                },
                max: {
                    width: MAX_WIDTH,
                    height: MAX_WIDTH
                }
            },
            pixelArt: true,
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { x: 0, y: 0 },
                    debug: false,
                }
            },
        };
        const game = new Phaser.Game(config)
        return () => {
            game.destroy(true)
        }
    }, [])

    return (
        <div id="game-container" className="w-full max-w-[1024px] aspect-square flex justify-center items-center">
            <div className="game-content"></div>
        </div>
    )
}

export default Game;
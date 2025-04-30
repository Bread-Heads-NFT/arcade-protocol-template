'use client';
import React, { useEffect, useState } from 'react'
import Phaser from 'phaser';
import { Boot } from '@/scenes/Boot';
import { Preloader } from '@/scenes/Preloader';
import { WalletConnect } from '@/scenes/WalletConnect';
import { MainMenu } from '@/scenes/MainMenu';
import { Game as MainGame } from '@/scenes/Game';
import { CryptoClicker } from '@/scenes/CryptoClicker';
import { useUmi } from '@/providers/useUmi';
import EventCenter from '@/events/eventCenter';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSearchParams } from 'next/navigation';

export const DEFAULT_WIDTH: number = 800;
export const DEFAULT_HEIGHT: number = 600;

const Game = () => {
    const wallet = useWallet();
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
        if (ready && wallet.connected) {
            EventCenter.emit("umi", umi);
            EventCenter.emit("playerAsset", playerAsset);
            EventCenter.emit("referrer", referrer);
        }
    }, [ready, wallet.connected, umi, playerAsset, referrer]);

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
                CryptoClicker,
            ],
            render: {
                pixelArt: true,
            },
            scale: {
                mode: Phaser.Scale.FIT,
                autoRound: true,
            },
            pixelArt: true,
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { x: 0, y: 800 },
                    debug: false
                }
            },

        };
        const game = new Phaser.Game(config)
        return () => {
            game.destroy(true)
        }
    }, [])
    return (
        <div>

        </div>
    )
}


export default Game;
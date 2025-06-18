import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { ReactNode, useMemo } from 'react';
import { dasApi } from '@metaplex-foundation/digital-asset-standard-api';
import { mplCore } from '@metaplex-foundation/mpl-core';
import { generateSigner, publicKey, signerIdentity } from '@metaplex-foundation/umi';
import { UmiContext } from './useUmi';
import { mplToolbox } from '@metaplex-foundation/mpl-toolbox';
import { bglInsertCoin } from '@breadheads/bgl-insert-coin';
import { useSolanaWallets, useSendTransaction } from '@privy-io/react-auth/solana';
import { Connection, PublicKey as Web3PublicKey } from '@solana/web3.js';

export const UmiProvider = ({
    children,
    endpoint,
}: {
    children: ReactNode;
    endpoint: string;
}) => {
    const wallets = useSolanaWallets();
    const privyWallet = wallets.wallets[0];
    const externalWallet = useWallet();

    console.log("privyWallet", privyWallet);
    console.log("externalWallet", externalWallet);

    const { sendTransaction } = useSendTransaction();
    const connection = useMemo(() => new Connection(endpoint), [endpoint]);

    const umi = useMemo(() => {
        if (!privyWallet) {
            return null;
        }
        // If using an external wallet (like Solflare)
        if (privyWallet.connectorType === "solana_adapter") {
            const u = createUmi(endpoint)
                .use(mplCore())
                .use(dasApi())
                .use(mplToolbox())
                .use(bglInsertCoin());

            // Wrap the Privy wallet in a minimal adapter for Umi
            const wallet = wallets.wallets[0];
            const umiWalletAdapter = {
                publicKey: new Web3PublicKey(wallet.address),
                signTransaction: wallet.signTransaction,
                signAllTransactions: wallet.signAllTransactions,
                signMessage: wallet.signMessage,
            };
            return u.use(walletAdapterIdentity(umiWalletAdapter));
        }
        // If using Privy wallet
        else if (privyWallet) {
            const u = createUmi(endpoint)
                .use(mplCore())
                .use(dasApi())
                .use(mplToolbox())
                .use(bglInsertCoin());

            // Wrap the Privy wallet in a minimal adapter for Umi with UI confirmations
            const umiWalletAdapter = {
                publicKey: new Web3PublicKey(privyWallet.address),
                signTransaction: async (tx: any) => {
                    const result = await sendTransaction({
                        transaction: tx,
                        connection,
                        uiOptions: {
                            showWalletUIs: true
                        }
                    });
                    return tx;
                },
                signAllTransactions: async (txs: any[]) => {
                    const signedTxs = await Promise.all(txs.map(async tx => {
                        await sendTransaction({
                            transaction: tx,
                            connection,
                            uiOptions: {
                                showWalletUIs: true
                            }
                        });
                        return tx;
                    }));
                    return signedTxs;
                },
                signMessage: async (msg: any) => {
                    return privyWallet.signMessage(msg);
                },
            };
            return u.use(walletAdapterIdentity(umiWalletAdapter));
        }
        return null;
    }, [privyWallet, externalWallet, endpoint, sendTransaction, connection]);

    return <UmiContext.Provider value={{ umi }}>{children}</UmiContext.Provider>;
};
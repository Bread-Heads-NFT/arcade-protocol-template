import { recordPlay, recordGuestPlay } from '@breadheads/bgl-insert-coin';
import { findAssetSignerPda } from '@metaplex-foundation/mpl-core';
import { Context, publicKey } from '@metaplex-foundation/umi';

// Utility function to record a play session, e.g., for analytics or rewards
// Import Context type from Metaplex UMI for blockchain-related features

// Export a function to record a play session
export async function recordPlayUtil(
    umi: Pick<Context, 'eddsa' | 'identity' | 'payer' | 'programs' | 'rpc' | 'transactions'>,
    playerAsset: string | null,
    referrer: string | null
): Promise<void> {
    const arcade = process.env.NEXT_PUBLIC_COLLECTION_ID;
    const tokenMint = process.env.NEXT_PUBLIC_TOKEN_MINT;
    const authority = process.env.NEXT_PUBLIC_ARCADE_AUTHORITY!;
    console.log("Umi:", umi.identity)
    if (playerAsset && arcade && tokenMint) {
        await recordPlay(umi, {
            player: publicKey(playerAsset),
            arcade: publicKey(arcade),
            authority: publicKey(authority),
            tokenMint: publicKey(tokenMint),
            gameId: 0
        }).sendAndConfirm(umi);
    } else if (referrer && arcade && tokenMint) {
        await recordGuestPlay(umi, {
            referrer: publicKey(referrer),
            referrerSigner: findAssetSignerPda(umi, { asset: publicKey(referrer) }),
            arcade: publicKey(arcade),
            authority: publicKey(authority),
            tokenMint: publicKey(tokenMint),
            gameId: 0
        }).sendAndConfirm(umi);
    } else if (arcade && tokenMint) {
        await recordGuestPlay(umi, {
            arcade: publicKey(arcade),
            authority: publicKey(authority),
            tokenMint: publicKey(tokenMint),
            gameId: 0
        }).sendAndConfirm(umi);
    }
}
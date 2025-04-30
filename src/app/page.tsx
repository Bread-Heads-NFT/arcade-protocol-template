'use client';
import { UmiProvider } from "@/providers/UmiProvider";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { clusterApiUrl } from "@solana/web3.js";
import { TipLinkWalletAdapter } from "@tiplink/wallet-adapter";
import { TipLinkModalTheme, TipLinkWalletModalProvider, WalletDisconnectButton, WalletMultiButton } from "@tiplink/wallet-adapter-react-ui";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useSearchParams } from 'next/navigation';

const Game = dynamic(() => import('@/components/Game'), { ssr: false });

require('@tiplink/wallet-adapter-react-ui/styles.css');

export default function Home() {
  // You can also provide a custom RPC endpoint.
  const adapter = useMemo(() => new TipLinkWalletAdapter({
    title: "Crypto Clicker",
    clientId: "694bf97c-d2ac-4dfc-a786-a001812658df",
    theme: 'dark'
  }), []);

  return (
    <main>
      < ConnectionProvider endpoint={process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || "https://api.devnet.solana.com"} >
        <WalletProvider wallets={[adapter]} autoConnect>
          <TipLinkWalletModalProvider title="Crypto Clicker" logoSrc="/assets/logo.png" theme={TipLinkModalTheme.DARK}>
            <UmiProvider>
              <div className="p-5 w-full">
                <WalletMultiButton className="ml-auto" />
                <Game />
              </div>
            </UmiProvider>
          </TipLinkWalletModalProvider>
        </WalletProvider>
      </ConnectionProvider >
    </main >
  )
}

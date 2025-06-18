'use client';
import { UmiProvider } from "@/providers/UmiProvider";
import { PrivyClientConfig, PrivyProvider, useLogin, usePrivy } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

const Game = dynamic(() => import('@/components/Game'), { ssr: false });

require('@tiplink/wallet-adapter-react-ui/styles.css');

interface GameHeaderProps {
  handleAuthClick: () => Promise<void>;
  authenticated: boolean;
}

function GameHeader({ handleAuthClick, authenticated }: GameHeaderProps) {
  return (
    <header className="w-full bg-blue-900 border-b-4 border-blue-700 p-3 shadow-lg">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1
            className="text-lg text-yellow-300 pixel-font"
            style={{
              fontFamily: "'Press Start 2P', cursive",
              textShadow: '2px 2px 0px rgba(0,0,0,0.5)'
            }}
          >
            Crumb Catcher
          </h1>
          <span
            className="text-xs text-blue-300 pixel-font"
            style={{ fontFamily: "'Press Start 2P', cursive" }}
          >
            Flappy Bird Clone
          </span>
        </div>
        <button
          onClick={handleAuthClick}
          className="px-4 py-2 text-sm font-bold text-white uppercase bg-yellow-500 rounded-lg shadow-lg transform transition-transform duration-100 hover:scale-105 active:scale-95 hover:bg-yellow-400 active:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50 border-b-4 border-yellow-700 active:border-b-0 active:mt-1 pixel-font"
          style={{
            fontFamily: "'Press Start 2P', cursive",
            letterSpacing: '0.1em',
            textShadow: '2px 2px 0px rgba(0,0,0,0.2)'
          }}
        >
          {authenticated ? 'Logout' : 'Login'}
        </button>
      </div>
    </header>
  );
}

function GameContent() {
  const { login } = useLogin();
  const { ready, authenticated, logout } = usePrivy();
  const router = useRouter();

  const handleAuthClick = async () => {
    if (authenticated) {
      await logout();
      router.refresh();
    } else {
      login();
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-blue-900 to-blue-950">
      <GameHeader handleAuthClick={handleAuthClick} authenticated={authenticated} />
      <main className="flex-1 flex justify-center items-start px-4 pt-4">
        <div className="w-full max-w-[1024px]">
          <UmiProvider endpoint={process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || "https://api.devnet.solana.com"}>
            {ready && <Game />}
          </UmiProvider>
        </div>
      </main>
    </div>
  );
}

const Head = () => (
  <head>
    <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
  </head>
);

export default function Home() {
  const privyConfig: PrivyClientConfig = {
    appearance: {
      walletChainType: "solana-only"
    },
    loginMethods: ["google", "discord", "twitter", "wallet"],
    embeddedWallets: {
      solana: {
        createOnLogin: 'users-without-wallets',
      },
    },
    externalWallets: {
      solana: {
        connectors: toSolanaWalletConnectors()
      },

    }
  };

  return (
    <>
      <Head />
      <PrivyProvider
        appId="cm9q9yktk02pikw0m3877e00l"
        clientId="client-WY5iw8qRp2NzdrQ8377MNMbCETRoA9kRLtitpirMFBnF2"
        config={privyConfig}
      >
        <GameContent />
      </PrivyProvider>
    </>
  );
}

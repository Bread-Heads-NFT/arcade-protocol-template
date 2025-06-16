import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Crumb Catcher - Solana Flappy Bird Clone",
  description: "A Solana-powered Flappy Bird clone where you catch crumbs instead of dodging pipes. Built with Phaser and Next.js, featuring wallet integration and NFT support by Bread Heads Studios.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}

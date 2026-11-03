import type { Metadata } from "next";
import { Newsreader, Inter } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SignSafe — Check it before you sign it",
  description:
    "Find the traps, ask the right questions, and get a fair version before you sign. Powered by Clocked.",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "SignSafe — Check it before you sign it",
    description:
      "Find the traps, ask the right questions, and get a fair version before you sign.",
    type: "website",
    siteName: "SignSafe",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${newsreader.variable} ${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans bg-[#FBF8F1] text-[#14213D] relative selection:bg-[#E8A33D]/20">
        {/* Subtle procedural paper grain texture (pure SVG noise, no raster files) */}
        <svg
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-50 h-full w-full opacity-40 mix-blend-multiply select-none"
        >
          <filter id="signsafe-paper-grain">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves="3"
              stitchTiles="stitch"
            />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.12  0 0 0 0 0.12  0 0 0 0 0.12  0 0 0 0.04 0"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#signsafe-paper-grain)" />
        </svg>

        {children}
      </body>
    </html>
  );
}

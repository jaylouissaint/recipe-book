import type { Metadata, Viewport } from "next";
import { Figtree, Instrument_Serif, Montserrat, Patrick_Hand, Zilla_Slab } from "next/font/google";
import localFont from "next/font/local";
import LiveUpdates from "@/components/LiveUpdates";
import Offline from "@/components/Offline";
import "./globals.css";

// Recipe content in Jay's book, and for any character Ramiya's handwriting doesn't have.
const hand = Patrick_Hand({
  variable: "--font-patrick",
  weight: "400",
  subsets: ["latin"],
});

// Ramiya's own handwriting (made 2026-10-30), for recipe content in her book (globals.css
// .hand-ramiya). It has letters, digits and & ! ? %, but no . , ( ) - / : ' quotes, dashes,
// fractions or ▷: those come from Patrick Hand.
const ramiya = localFont({
  src: "./fonts/RamiyasHandwriting-Regular.ttf",
  variable: "--font-ramiya",
  display: "swap",
  // No generated stand-in font: characters this font lacks should come from Patrick Hand (the
  // next font in .hand-ramiya), not a system font.
  adjustFontFallback: false,
  fallback: [],
  // Drawn smaller than Patrick Hand: shown a little bigger so the two sit together.
  // Only for plain letters, digits and symbols: its ⅓ ⅔ ⅛ are drawn tiny, so fractions come from
  // Patrick Hand too.
  declarations: [
    { prop: "size-adjust", value: "118%" },
    { prop: "unicode-range", value: "U+0020-007E" },
  ],
});

// Interface text
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

// Page titles ("My Recipes", "Groceries")
const instrument = Instrument_Serif({
  variable: "--font-instrument",
  weight: "400",
  subsets: ["latin"],
});

// Book page labels
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const zilla = Zilla_Slab({
  variable: "--font-zilla",
  weight: ["300", "500"],
  subsets: ["latin"],
});

// Each book's name, Home Screen name, manifest and icons are set by src/app/b/[book]/layout.tsx.
export const metadata: Metadata = {
  description: "Our family recipes, written by hand.",
};

export const viewport: Viewport = {
  themeColor: "#fbf8f2",
  colorScheme: "light",
  // The page runs to the screen's edges, so bars at the bottom can keep clear of the iPhone's home
  // indicator (env(safe-area-inset-bottom) reports it only with this).
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* The menu's place (top capsule or side), set before drawing so the page doesn't jump. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("rb-nav")==="side")document.documentElement.dataset.nav="side"}catch(e){}`,
          }}
        />
      </head>
      <body
        className={`${hand.variable} ${ramiya.variable} ${figtree.variable} ${instrument.variable} ${montserrat.variable} ${zilla.variable} antialiased`}
      >
        <Offline />
        <LiveUpdates />
        {children}
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Figtree, Instrument_Serif, Montserrat, Patrick_Hand, Zilla_Slab } from "next/font/google";
import LiveUpdates from "@/components/LiveUpdates";
import Offline from "@/components/Offline";
import "./globals.css";

// Recipe content. Swap for a custom handwriting font later (see PLAN.md "Your own handwriting font").
const hand = Patrick_Hand({
  variable: "--font-hand-family",
  weight: "400",
  subsets: ["latin"],
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
        className={`${hand.variable} ${figtree.variable} ${instrument.variable} ${montserrat.variable} ${zilla.variable} antialiased`}
      >
        <Offline />
        <LiveUpdates />
        {children}
      </body>
    </html>
  );
}

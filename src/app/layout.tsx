import type { Metadata, Viewport } from "next";
import { Figtree, Instrument_Serif, Montserrat, Patrick_Hand, Zilla_Slab } from "next/font/google";
import AppNav from "@/components/AppNav";
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

export const metadata: Metadata = {
  title: { default: "Ramiya’s Recipes", template: "%s · Ramiya’s Recipes" },
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
    <html lang="en">
      <body
        className={`${hand.variable} ${figtree.variable} ${instrument.variable} ${montserrat.variable} ${zilla.variable} antialiased`}
      >
        <div className="lg:flex">
          <AppNav />
          <div className="min-w-0 flex-1 pb-24 lg:pb-0">{children}</div>
        </div>
      </body>
    </html>
  );
}

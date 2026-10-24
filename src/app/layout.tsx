import type { Metadata, Viewport } from "next";
import { Montserrat, Patrick_Hand, Zilla_Slab } from "next/font/google";
import "./globals.css";

// Swap this for a custom handwriting font later (see plan: "Your own handwriting font").
const hand = Patrick_Hand({
  variable: "--font-hand-family",
  weight: "400",
  subsets: ["latin"],
});

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
  title: "Recipe Book",
  description: "Our family recipes, written by hand.",
};

export const viewport: Viewport = {
  themeColor: "#a3174b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${hand.variable} ${montserrat.variable} ${zilla.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

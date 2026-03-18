import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif, Geist_Mono } from "next/font/google";
import { Nav } from "@/components/nav";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: "400",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lenny's Lens — Where Newsletter Claims Meet Podcast Moments",
  description:
    "An interactive analysis of how Lenny Rachitsky's written editorial voice connects to his guest conversations. See where 50 podcast guests support, extend, or contradict his newsletter claims.",
  openGraph: {
    title: "Lenny's Lens",
    description:
      "Where newsletter claims meet podcast moments. An interactive analysis of Lenny Rachitsky's editorial voice across 10 newsletters and 50 podcasts.",
    type: "website",
    siteName: "Lenny's Lens",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Lenny's Lens — interactive network graph showing connections between newsletter claims and podcast moments" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lenny's Lens",
    description:
      "Where newsletter claims meet podcast moments. 228 moments, 156 connections, 24 topics — visualized.",
    images: ["/og-image.png"],
    creator: "@swilliams185",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${instrumentSans.variable} ${instrumentSerif.variable} ${geistMono.variable} antialiased`}
      >
        <Nav />
        {children}
      </body>
    </html>
  );
}

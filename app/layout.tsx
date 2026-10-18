import type { Metadata } from "next";
import { Archivo, Permanent_Marker } from "next/font/google";
import { BRAND } from "@/src/lib/brand";
import "./globals.css";

// One family for everything. Its width axis does the work: wide for headlines,
// narrow for the prep-sheet columns. The marker face is only for the
// hand-written bits on the sample sheet.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const marker = Permanent_Marker({
  variable: "--font-pm",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name}: the weekly prep sheet for meal prep kitchens`,
    template: `%s | ${BRAND.name}`,
  },
  description:
    "Prepline reads the week's orders from your WooCommerce store and tells you how much of each protein to pull, split by how it's prepped.",
  metadataBase: new URL(BRAND.siteUrl),
  openGraph: {
    title: `${BRAND.name}: the weekly prep sheet for meal prep kitchens`,
    description: "Your week's orders, turned into what to pull: pounds of each protein, by prep type and meal size.",
    siteName: BRAND.name,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${archivo.variable} ${marker.variable} antialiased`}>{children}</body>
    </html>
  );
}

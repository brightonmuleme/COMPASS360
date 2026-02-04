import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-heading" });

export const metadata: Metadata = {
  title: "COMPASS 360 - School Platform Premium",
  description: "Next-gen educational platform for schools, students, and tutors.",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

import { SchoolProvider } from "@/lib/store";
import ConfigureAmplifyClientSide from "@/lib/amplify";

// ... (keep metadata)

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable}`} suppressHydrationWarning={true}>
        <SchoolProvider>
          <ConfigureAmplifyClientSide />
          {children}
        </SchoolProvider>
      </body>
    </html>
  );
}

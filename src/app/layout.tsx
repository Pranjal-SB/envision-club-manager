import type { Metadata } from "next";
import { Raleway, Inter } from "next/font/google";
import "./globals.css";

/*
  Aaruush's own type stack. Their site loads Xirod for display and Raleway
  Bold / Inter for everything else. Xirod is not freely licensed for
  redistribution, so Raleway ExtraBold carries the display role here — still
  their face, and legible at the sizes a dashboard needs.
*/
const raleway = Raleway({
  subsets: ["latin"],
  weight: ["600", "800"],
  variable: "--font-raleway",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Envision — club management",
  description:
    "Members, projects, teams, and tasks for Team Envision. Who is doing what, and what is late.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${raleway.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}

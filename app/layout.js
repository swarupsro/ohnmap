import { Inter } from "next/font/google";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

export const metadata = {
  title: "Nmap Insight Dashboard",
  description: "Interactive dashboard for normal text Nmap scan output."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} dark`}>
      <body>{children}</body>
    </html>
  );
}

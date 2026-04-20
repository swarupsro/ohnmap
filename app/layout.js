import "./globals.css";

export const metadata = {
  title: "Nmap Insight Dashboard",
  description: "Interactive dashboard for normal text Nmap scan output."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}

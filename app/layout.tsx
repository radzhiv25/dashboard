import type { Metadata } from "next";
import { JetBrains_Mono, Syne } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "ORBIS";

export const metadata: Metadata = {
  title: `${appName} — Amazon market intelligence`,
  description:
    "Estimate total addressable revenue for any Amazon Best Sellers category.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#050608] font-sans text-zinc-100">
        {children}
      </body>
    </html>
  );
}

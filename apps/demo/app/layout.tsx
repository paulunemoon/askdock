import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Askdock — a chat widget that only knows your site",
  description:
    "Open-source grounded chat widget. Any model, your own API key, your own content.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

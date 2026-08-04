import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "CyberPass", template: "%s · CyberPass" },
  description:
    "Centralisez vos preuves de sécurité, accélérez vos questionnaires et partagez un passeport cyber maîtrisé.",
  applicationName: "CyberPass",
  robots: { index: false, follow: false }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#102a2b"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}

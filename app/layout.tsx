import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Taller Automotriz Jamiro | San Carlos",
  description:
    "Electromecánica, mecánica general y mantenimiento automotriz con 16 años de experiencia en San Carlos.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        {children}

        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-95GTLB8C97"
          strategy="afterInteractive"
        />

        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){window.dataLayer.push(arguments);}
            gtag("js", new Date());
            gtag("config", "G-95GTLB8C97");
          `}
        </Script>
      </body>
    </html>
  );
}
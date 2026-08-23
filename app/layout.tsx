import type { Metadata } from "next";
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
      <body>{children}</body>
    </html>
  );
}
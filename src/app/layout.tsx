import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Playfair_Display, Inter } from "next/font/google";
import { headers } from "next/headers";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import "./globals.css";

// next/font auto-aloja las fuentes: sin peticiones externas → CSP estricta.
const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

const display = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Consultorio Dra. Reyna Massiel",
    template: "%s · Dra. Reyna Massiel",
  },
  description:
    "Sistema de gestión clínica — cardiología, medicina interna y ecocardiografía.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#B14A73",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = headers().get("x-nonce") ?? undefined;

  // Evita el destello de tema equivocado antes de la hidratación.
  const scriptNoFlash = `(function(){try{var t=localStorage.getItem('reyna-tema');var d=t?t==='oscuro':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

  return (
    <html
      lang="es"
      className={`${serif.variable} ${display.variable} ${sans.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: scriptNoFlash }} />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

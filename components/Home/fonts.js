import { Anton, Archivo, Chakra_Petch } from "next/font/google";

export const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

export const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

// Fuente del hero: esquinas cortadas en diagonal, como los cristales del fondo
export const chakra = Chakra_Petch({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-hero",
  display: "swap",
});

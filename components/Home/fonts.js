import { Anton, Archivo, Chakra_Petch } from "next/font/google";

export const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

// Archivo es variable: un solo archivo cubre todos los grosores (400 a 900)
export const archivo = Archivo({
  subsets: ["latin"],
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

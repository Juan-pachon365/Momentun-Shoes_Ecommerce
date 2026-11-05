import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="es">
      <Head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <meta name="theme-color" content="#0d0a13" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

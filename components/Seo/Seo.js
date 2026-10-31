import Head from "next/head";

export function Seo({ title, description = "Tienda de zapatos Momentum Shoes. Encuentra tu par ideal." }) {
  const fullTitle = title ? `${title} | Momentum Shoes` : "Momentum Shoes";
  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
    </Head>
  );
}

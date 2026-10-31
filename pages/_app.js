import Head from "next/head";
import { useRouter } from "next/router";
import "@/scss/global.scss";
import { ToastProvider } from "@/contexts/ToastContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { CartProvider } from "@/contexts/CartContext";
import { Layout } from "@/components/Layout";

export default function App({ Component, pageProps }) {
  const router = useRouter();
  // El panel de administración tiene su propio diseño (menú lateral), sin encabezado ni pie de la tienda
  const sinLayout = router.pathname.startsWith("/admin");
  return (
    <ToastProvider>
      <AuthProvider>
        <WishlistProvider>
          <CartProvider>
            <Head>
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <title>Momentum Shoes</title>
            </Head>
            {sinLayout ? (
              <Component {...pageProps} />
            ) : (
              <Layout>
                <Component {...pageProps} />
              </Layout>
            )}
          </CartProvider>
        </WishlistProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

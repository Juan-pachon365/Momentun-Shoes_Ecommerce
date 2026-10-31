import { anton, archivo, chakra } from "./fonts";
import styles from "./Home.module.css";
import HomeHero from "./HomeHero";
import CategoryGrid from "./CategoryGrid";
import NewArrivals from "./NewArrivals";
import SizeFinder from "./SizeFinder";
import BrandStrip from "./BrandStrip";
import Community from "./Community";

// Solo el contenido del Home. Tu Header (con carrito y lista de deseos) y tu Footer
// siguen viniendo de tu layout actual: este componente no los reemplaza.
export default function Home({ data, heroImage = "/images/hero-cristal.webp" }) {
  const { categories, brands, products, sizes } = data;

  return (
    <div className={`${styles.home} ${anton.variable} ${archivo.variable} ${chakra.variable}`}>
      <HomeHero image={heroImage} />
      <CategoryGrid categories={categories} />
      <NewArrivals products={products} brands={brands} />
      <SizeFinder sizes={sizes} />
      <BrandStrip brands={brands} />
      <Community />
    </div>
  );
}

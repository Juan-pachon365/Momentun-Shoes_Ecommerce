import Home from "@/components/Home/Home";
import { getHomeData } from "@/lib/homeQueries";
import { supabase } from "@/lib/supabase";
import { Seo } from "@/components/Seo";

export default function Index({ data }) {
  return (
    <>
      <Seo title="Inicio" />
      <Home data={data} />
    </>
  );
}

export async function getStaticProps() {
  try {
    const data = await getHomeData(supabase);
    return { props: { data }, revalidate: 60 };
  } catch (error) {
    console.error(error);
    return {
      props: { data: { categories: [], brands: [], products: [], sizes: { kids: [], adults: [] } } },
      revalidate: 10,
    };
  }
}

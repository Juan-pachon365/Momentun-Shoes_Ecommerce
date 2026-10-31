// Rutas reales de la tienda
export const routes = {
  product: (uid) => `/producto/${uid}`,
  category: (slug) => `/catalogo?categoria=${slug}`,
  brand: (slug) => `/catalogo?marca=${slug}`,
  size: (numero) => `/catalogo?talla=${numero}`,
  allProducts: "/catalogo",
  
  instagram: "https://www.instagram.com/momentun_shoes_d.c?vrfl=c2J4Y251aW54bmMy",
};

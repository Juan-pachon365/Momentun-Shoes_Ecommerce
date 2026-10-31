import { useEffect, useRef, useState } from "react";

// <img> que se oculta si el archivo no existe (también si falló antes de que React cargara)
export default function SafeImg(props) {
  const ref = useRef(null);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setBroken(true);
  }, []);

  if (broken) return null;
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  return <img ref={ref} {...props} onError={() => setBroken(true)} />;
}

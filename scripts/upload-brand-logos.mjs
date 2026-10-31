
import fs from "node:fs";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env.local");

const required = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Faltan en .env.local: ${missing.join(", ")}`);
  process.exit(1);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const LOGOS_DIR = path.join(process.cwd(), "scripts", "logos");
const EXTENSIONS = [".png", ".svg", ".webp", ".jpg", ".jpeg"];

const { data: brands, error } = await supabase.from("brands").select("id, name, slug, logo").order("name");
if (error) {
  console.error("No se pudieron leer las marcas:", error.message);
  process.exit(1);
}

let ok = 0;
for (const brand of brands) {
  const file = EXTENSIONS.map((ext) => path.join(LOGOS_DIR, brand.slug + ext)).find((f) => fs.existsSync(f));
  if (!file) {
    console.log(`-  ${brand.name}: no hay archivo ${brand.slug}.(png|svg|webp|jpg) en scripts/logos, se omite`);
    continue;
  }

  try {
    const result = await cloudinary.uploader.upload(file, {
      folder: `momentum-shoes/_brands/${brand.slug}`,
      public_id: "logo",
      overwrite: true,
      invalidate: true,
      resource_type: "image",
    });

    const { error: updateError } = await supabase.from("brands").update({ logo: result.secure_url }).eq("id", brand.id);
    if (updateError) throw updateError;

    ok += 1;
    console.log(`OK ${brand.name}: ${result.secure_url}`);
  } catch (err) {
    console.error(`X  ${brand.name}: ${err.message || err}`);
  }
}

console.log(`\nListo: ${ok} de ${brands.length} marcas con logo.`);

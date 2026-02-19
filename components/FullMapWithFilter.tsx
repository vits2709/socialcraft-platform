"use client";

import dynamic from "next/dynamic";
import { useCategoryFilter } from "./CategoryFilter";
import CategoryFilter from "./CategoryFilter";

const FullMap = dynamic(() => import("./FullMap"), { ssr: false });

type SpotPin = {
  id: string;
  name: string;
  slug: string | null;
  lat: number;
  lng: number;
  categoria: string | null;
  fascia_prezzo: number | null;
  is_featured: boolean;
  city: string | null;
  indirizzo: string | null;
  avg_rating?: number | null;
};

export default function FullMapWithFilter({ spots }: { spots: SpotPin[] }) {
  const { selected, setSelected, categories, filtered } = useCategoryFilter(spots);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Filtro categoria */}
      {categories.length > 0 && (
        <div
          style={{
            padding: "8px 12px",
            background: "rgba(255,255,255,0.9)",
            borderBottom: "1px solid rgba(0,0,0,0.07)",
            backdropFilter: "blur(8px)",
          }}
        >
          <CategoryFilter
            categories={categories}
            selected={selected}
            onChange={setSelected}
          />
        </div>
      )}

      {/* Mappa */}
      <div style={{ flex: 1 }}>
        <FullMap spots={filtered as any} />
      </div>
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";

const FullMap = dynamic(() => import("@/components/FullMap"), { ssr: false });

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
  avg_rating?: number | null;
};

export default function FullMapLoader({ spots }: { spots: SpotPin[] }) {
  return <FullMap spots={spots} />;
}

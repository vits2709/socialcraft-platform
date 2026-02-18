"use client";

import dynamic from "next/dynamic";
import type { HomeSpotPin } from "@/components/HomeMap";

const HomeMap = dynamic(() => import("@/components/HomeMap"), { ssr: false });

export default function HomeMapLoader({ spots }: { spots: HomeSpotPin[] }) {
  return <HomeMap spots={spots} />;
}

"use client";

import dynamic from "next/dynamic";

const SpotMap = dynamic(() => import("@/components/SpotMap"), { ssr: false });

export default function SpotMapLoader(props: { lat: number; lng: number; name: string }) {
  return <SpotMap {...props} />;
}

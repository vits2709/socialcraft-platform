"use client";

import { useEffect, useState } from "react";

type OrariGiorno = { apertura: string; chiusura: string; chiuso: boolean };
type OrariData = Record<string, OrariGiorno>;

const GIORNO_MAP: Record<number, string> = {
  0: "dom",
  1: "lun",
  2: "mar",
  3: "mer",
  4: "gio",
  5: "ven",
  6: "sab",
};

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function isOpenNow(orari: OrariData): boolean {
  const now = new Date();
  const dayKey = GIORNO_MAP[now.getDay()];
  const day = orari[dayKey];
  if (!day || day.chiuso) return false;
  const currentMin = now.getHours() * 60 + now.getMinutes();
  const openMin = timeToMinutes(day.apertura);
  const closeMin = timeToMinutes(day.chiusura);
  // Handle overnight closing (e.g. 22:00 - 02:00)
  if (closeMin < openMin) {
    return currentMin >= openMin || currentMin < closeMin;
  }
  return currentMin >= openMin && currentMin < closeMin;
}

export default function SpotOpenNow({ orari }: { orari: OrariData }) {
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    function update() {
      setOpen(isOpenNow(orari));
    }
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [orari]);

  if (open === null) return null;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 700,
        background: open ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.10)",
        border: `1px solid ${open ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.25)"}`,
        color: open ? "#059669" : "#dc2626",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: open ? "#10b981" : "#ef4444",
          display: "inline-block",
        }}
      />
      {open ? "Aperto ora" : "Chiuso"}
    </span>
  );
}

"use client";

import { useState } from "react";

export const ALL_CATEGORIES = [
  "bar",
  "ristorante",
  "pub",
  "caffetteria",
  "club",
  "barber",
  "parrucchiere",
  "estetica",
  "palestra",
  "altro",
] as const;

export type Categoria = (typeof ALL_CATEGORIES)[number] | string;

const EMOJI: Record<string, string> = {
  bar: "🍹",
  ristorante: "🍽️",
  pub: "🍺",
  caffetteria: "☕",
  club: "🎵",
  barber: "✂️",
  parrucchiere: "💇",
  estetica: "💅",
  palestra: "🏋️",
  altro: "📍",
};

type Props = {
  categories: string[];   // categorie presenti negli spot
  selected: string | null;
  onChange: (cat: string | null) => void;
};

export default function CategoryFilter({ categories, selected, onChange }: Props) {
  if (categories.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        flexWrap: "wrap",
        padding: "8px 0",
      }}
    >
      <button
        className="btn mini"
        onClick={() => onChange(null)}
        style={{
          background: selected === null ? "rgba(99,102,241,0.15)" : undefined,
          borderColor: selected === null ? "rgba(99,102,241,0.4)" : undefined,
          fontWeight: selected === null ? 700 : undefined,
        }}
      >
        Tutti
      </button>
      {categories.map((cat) => (
        <button
          key={cat}
          className="btn mini"
          onClick={() => onChange(selected === cat ? null : cat)}
          style={{
            background: selected === cat ? "rgba(99,102,241,0.15)" : undefined,
            borderColor: selected === cat ? "rgba(99,102,241,0.4)" : undefined,
            fontWeight: selected === cat ? 700 : undefined,
          }}
        >
          {EMOJI[cat] ?? "📍"} {cat.charAt(0).toUpperCase() + cat.slice(1)}
        </button>
      ))}
    </div>
  );
}

/** Hook per gestire il filtro categoria su una lista di spot */
export function useCategoryFilter<T extends { categoria?: string | null }>(items: T[]) {
  const [selected, setSelected] = useState<string | null>(null);

  const categories = Array.from(
    new Set(items.map((s) => s.categoria).filter((c): c is string => !!c))
  ).sort();

  const filtered = selected ? items.filter((s) => s.categoria === selected) : items;

  return { selected, setSelected, categories, filtered };
}

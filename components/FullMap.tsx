"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// ✅ Fix icone Leaflet a livello modulo — sincrono, prima di qualsiasi render
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

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
  indirizzo?: string | null;
  avg_rating?: number | null;
};


function featuredIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:36px;height:36px;border-radius:50%;
      background:linear-gradient(135deg,#6366f1,#ec4899);
      display:flex;align-items:center;justify-content:center;
      font-size:18px;box-shadow:0 4px 14px rgba(99,102,241,0.45);
      border:2px solid white;
    ">🏅</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

function prezzoStr(n: number | null): string {
  if (!n) return "";
  return "€".repeat(n);
}

function ratingStr(r: number | null | undefined): string {
  if (!r) return "—";
  return `⭐ ${Number(r).toFixed(1)}`;
}

/** Estrae la città da: campo city → ultima parte dell'indirizzo → null */
function extractCity(spot: SpotPin): string | null {
  if (spot.city) return spot.city;
  if (spot.indirizzo) {
    // "Via Roma 1, Vasto (CH)" → "Vasto (CH)" → keep first word chunk after comma
    const parts = spot.indirizzo.split(",");
    if (parts.length >= 2) {
      return parts[parts.length - 1].trim().replace(/\s*\(.*?\)/, "").trim();
    }
  }
  return null;
}

export default function FullMap({ spots }: { spots: SpotPin[] }) {
  // Guard post-mount (Leaflet richiede il DOM)
  const [mounted, setMounted] = useState(false);
  const [categoriaFilter, setCategoriaFilter] = useState("");
  const [cittaFilter, setCittaFilter] = useState("");

  useEffect(() => { setMounted(true); }, []);

  // Only spots with valid coordinates
  const withCoords = spots.filter((s) => s.lat != null && s.lng != null);

  // Unique categories
  const categorie = Array.from(
    new Set(withCoords.map((s) => s.categoria).filter(Boolean))
  ) as string[];

  // Cities from city field OR extracted from indirizzo
  const citta = Array.from(
    new Set(withCoords.map((s) => extractCity(s)).filter(Boolean))
  ) as string[];

  const filtered = withCoords.filter((s) => {
    if (categoriaFilter && s.categoria !== categoriaFilter) return false;
    if (cittaFilter && extractCity(s) !== cittaFilter) return false;
    return true;
  });

  const center: [number, number] =
    filtered.length > 0
      ? [filtered[0].lat, filtered[0].lng]
      : [42.5, 14.0];

  if (!mounted) return null;

  const selectStyle: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.15)",
    background: "rgba(255,255,255,0.95)",
    fontSize: 14,
    outline: "none",
    cursor: "pointer",
    backdropFilter: "blur(8px)",
    boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
    WebkitAppearance: "none",
    appearance: "none",
    minWidth: 0,
    flex: "1 1 auto",
    maxWidth: 200,
  };

  const countBadgeStyle: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(0,0,0,0.10)",
    fontSize: 13,
    fontWeight: 700,
    backdropFilter: "blur(8px)",
    boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      {/* ---- FILTRI OVERLAY ---- */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          right: 12,
          zIndex: 1000,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {categorie.length > 0 && (
          <select
            value={categoriaFilter}
            onChange={(e) => setCategoriaFilter(e.target.value)}
            style={selectStyle}
            aria-label="Filtra per categoria"
          >
            <option value="">Tutte le categorie</option>
            {categorie.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        )}

        {citta.length > 1 && (
          <select
            value={cittaFilter}
            onChange={(e) => setCittaFilter(e.target.value)}
            style={selectStyle}
            aria-label="Filtra per città"
          >
            <option value="">Tutte le città</option>
            {citta.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}

        <span style={countBadgeStyle}>
          {filtered.length} spot
        </span>
      </div>

      {/* ---- MAPPA ---- */}
      <MapContainer
        center={center}
        zoom={filtered.length === 1 ? 15 : 10}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {filtered.map((s) => (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={s.is_featured ? featuredIcon() : undefined}
          >
            <Popup>
              <div style={{ minWidth: 160, fontFamily: "system-ui, sans-serif" }}>
                <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 4 }}>
                  {s.is_featured ? "🏅 " : ""}
                  {s.name}
                </div>
                {(s.categoria || s.fascia_prezzo) && (
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 3 }}>
                    {s.categoria
                      ? s.categoria.charAt(0).toUpperCase() + s.categoria.slice(1)
                      : ""}
                    {s.fascia_prezzo ? ` · ${prezzoStr(s.fascia_prezzo)}` : ""}
                  </div>
                )}
                <div style={{ fontSize: 12, marginBottom: 8 }}>
                  {ratingStr(s.avg_rating)}
                </div>
                {s.slug && (
                  <a
                    href={`/v/${s.slug}`}
                    style={{
                      display: "inline-block",
                      padding: "5px 11px",
                      borderRadius: 8,
                      background: "rgba(99,102,241,0.12)",
                      border: "1px solid rgba(99,102,241,0.25)",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#6366f1",
                      textDecoration: "none",
                    }}
                  >
                    Apri spot →
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

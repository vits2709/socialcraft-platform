"use client";

import { useState, useTransition } from "react";
import { updateSpotAction, UpdateSpotData } from "@/app/admin/venues/[venueId]/edit/actions";

type OrariGiorno = { apertura: string; chiusura: string; chiuso: boolean };
type OrariData = Record<string, OrariGiorno>;

const GIORNI = [
  { key: "lun", label: "Lunedì" },
  { key: "mar", label: "Martedì" },
  { key: "mer", label: "Mercoledì" },
  { key: "gio", label: "Giovedì" },
  { key: "ven", label: "Venerdì" },
  { key: "sab", label: "Sabato" },
  { key: "dom", label: "Domenica" },
];

const CATEGORIE = [
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
];

const SERVIZI_OPTIONS = [
  "WiFi",
  "Parcheggio",
  "Pagamento carta",
  "Area fumatori",
  "Pet friendly",
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.12)",
  outline: "none",
  background: "rgba(255,255,255,0.8)",
  fontSize: 16, /* ≥16px: previene auto-zoom iOS Safari su focus */
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
};

function defaultOrari(): OrariData {
  const result: OrariData = {};
  for (const g of GIORNI) {
    result[g.key] = { apertura: "09:00", chiusura: "22:00", chiuso: false };
  }
  return result;
}

type VenueData = {
  id: string;
  indirizzo?: string | null;
  telefono?: string | null;
  sito_web?: string | null;
  categoria?: string | null;
  fascia_prezzo?: number | null;
  servizi?: string[] | null;
  is_active?: boolean | null;
  is_featured?: boolean | null;
  orari?: OrariData | null;
  foto?: string[] | null;
  cover_image?: string | null;
  instagram?: string | null;
  facebook?: string | null;
};

export default function SpotEditForm({ venue }: { venue: VenueData }) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Basic fields
  const [indirizzo, setIndirizzo] = useState(venue.indirizzo ?? "");
  const [telefono, setTelefono] = useState(venue.telefono ?? "");
  const [sitoWeb, setSitoWeb] = useState(venue.sito_web ?? "");
  const [instagram, setInstagram] = useState(venue.instagram ?? "");
  const [facebook, setFacebook] = useState(venue.facebook ?? "");
  const [categoria, setCategoria] = useState(venue.categoria ?? "");
  const [fascia, setFascia] = useState<string>(
    venue.fascia_prezzo != null ? String(venue.fascia_prezzo) : ""
  );
  const [servizi, setServizi] = useState<string[]>(venue.servizi ?? []);
  const [isActive, setIsActive] = useState(venue.is_active ?? true);
  const [isFeatured, setIsFeatured] = useState(venue.is_featured ?? false);

  // Orari
  const [orari, setOrari] = useState<OrariData>(
    venue.orari && Object.keys(venue.orari).length > 0
      ? (venue.orari as OrariData)
      : defaultOrari()
  );

  // Foto
  const [foto, setFoto] = useState<string[]>(venue.foto ?? []);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  // Cover image
  const [coverImage, setCoverImage] = useState(venue.cover_image ?? "");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverErr, setCoverErr] = useState<string | null>(null);

  function toggleServizio(s: string) {
    setServizi((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  function updateGiorno(key: string, field: keyof OrariGiorno, value: string | boolean) {
    setOrari((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    setCoverErr(null);
    try {
      const fd = new FormData();
      fd.append("venue_id", venue.id);
      fd.append("file", file);
      const res = await fetch("/api/admin/spots/upload-photo", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "upload_failed");
      setCoverImage(json.url);
    } catch (err: unknown) {
      setCoverErr(err instanceof Error ? err.message : "Errore upload");
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadErr(null);
    try {
      const fd = new FormData();
      fd.append("venue_id", venue.id);
      fd.append("file", file);
      const res = await fetch("/api/admin/spots/upload-photo", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "upload_failed");
      setFoto((prev) => [...prev, json.url]);
    } catch (err: unknown) {
      setUploadErr(err instanceof Error ? err.message : "Errore upload");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function removePhoto(url: string) {
    setFoto((prev) => prev.filter((u) => u !== url));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setError(null);

    const data: UpdateSpotData = {
      indirizzo: indirizzo || undefined,
      telefono: telefono || undefined,
      sito_web: sitoWeb || undefined,
      instagram: instagram || null,
      facebook: facebook || null,
      categoria: categoria || undefined,
      fascia_prezzo: fascia ? parseInt(fascia) : null,
      servizi,
      is_active: isActive,
      is_featured: isFeatured,
      orari,
      foto,
      cover_image: coverImage || null,
    };

    startTransition(async () => {
      try {
        await updateSpotAction(venue.id, data);
        setMsg("Salvato con successo!");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Errore salvataggio");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
      {/* Stato */}
      <div className="notice" style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <span style={{ fontWeight: 700 }}>Spot Attivo</span>
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
          />
          <span style={{ fontWeight: 700 }}>🏅 Spot Verificato (featured)</span>
        </label>
      </div>

      {/* Campi base */}
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <div className="muted" style={{ marginBottom: 6, fontSize: 13 }}>Indirizzo</div>
          <input
            style={inputStyle}
            value={indirizzo}
            onChange={(e) => setIndirizzo(e.target.value)}
            placeholder="Es: Via Roma 1, Vasto (CH)"
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div className="muted" style={{ marginBottom: 6, fontSize: 13 }}>Telefono</div>
            <input
              style={inputStyle}
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Es: +39 0873 123456"
              type="tel"
            />
          </div>
          <div>
            <div className="muted" style={{ marginBottom: 6, fontSize: 13 }}>Sito web</div>
            <input
              style={inputStyle}
              value={sitoWeb}
              onChange={(e) => setSitoWeb(e.target.value)}
              placeholder="https://..."
              type="url"
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div className="muted" style={{ marginBottom: 6, fontSize: 13 }}>Instagram</div>
            <input
              style={inputStyle}
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@nomepagina"
            />
          </div>
          <div>
            <div className="muted" style={{ marginBottom: 6, fontSize: 13 }}>Facebook (URL)</div>
            <input
              style={inputStyle}
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              placeholder="https://facebook.com/..."
              type="url"
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div className="muted" style={{ marginBottom: 6, fontSize: 13 }}>Categoria</div>
            <select
              style={selectStyle}
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              <option value="">— Seleziona —</option>
              {CATEGORIE.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="muted" style={{ marginBottom: 6, fontSize: 13 }}>Fascia prezzo</div>
            <select
              style={selectStyle}
              value={fascia}
              onChange={(e) => setFascia(e.target.value)}
            >
              <option value="">— Seleziona —</option>
              <option value="1">€ — Economico</option>
              <option value="2">€€ — Medio</option>
              <option value="3">€€€ — Premium</option>
            </select>
          </div>
        </div>
      </div>

      {/* Servizi */}
      <div>
        <div className="muted" style={{ marginBottom: 8, fontSize: 13, fontWeight: 700 }}>
          Servizi offerti
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {SERVIZI_OPTIONS.map((s) => (
            <label
              key={s}
              style={{
                display: "flex",
                gap: 6,
                alignItems: "center",
                padding: "8px 12px",
                borderRadius: 12,
                border: `1px solid ${servizi.includes(s) ? "rgba(99,102,241,0.4)" : "rgba(0,0,0,0.1)"}`,
                background: servizi.includes(s) ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.7)",
                cursor: "pointer",
                fontSize: 13,
                transition: "all 180ms",
              }}
            >
              <input
                type="checkbox"
                checked={servizi.includes(s)}
                onChange={() => toggleServizio(s)}
                style={{ cursor: "pointer" }}
              />
              {s}
            </label>
          ))}
        </div>
      </div>

      {/* Orari */}
      <div>
        <div className="muted" style={{ marginBottom: 10, fontSize: 13, fontWeight: 700 }}>
          Orari di apertura
        </div>
        <div
          style={{
            border: "1px solid rgba(0,0,0,0.1)",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          {GIORNI.map((g, i) => {
            const day = orari[g.key] ?? { apertura: "09:00", chiusura: "22:00", chiuso: false };
            return (
              <div
                key={g.key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "100px 1fr 1fr auto",
                  gap: 10,
                  padding: "10px 14px",
                  alignItems: "center",
                  background: i % 2 === 0 ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.55)",
                  borderBottom: i < GIORNI.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none",
                  opacity: day.chiuso ? 0.5 : 1,
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 13 }}>{g.label}</span>
                <input
                  type="time"
                  value={day.apertura}
                  disabled={day.chiuso}
                  onChange={(e) => updateGiorno(g.key, "apertura", e.target.value)}
                  style={{ ...inputStyle, width: "auto", padding: "6px 8px" }}
                />
                <input
                  type="time"
                  value={day.chiusura}
                  disabled={day.chiuso}
                  onChange={(e) => updateGiorno(g.key, "chiusura", e.target.value)}
                  style={{ ...inputStyle, width: "auto", padding: "6px 8px" }}
                />
                <label style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer", fontSize: 12 }}>
                  <input
                    type="checkbox"
                    checked={day.chiuso}
                    onChange={(e) => updateGiorno(g.key, "chiuso", e.target.checked)}
                  />
                  Chiuso
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cover Image */}
      <div>
        <div className="muted" style={{ marginBottom: 10, fontSize: 13, fontWeight: 700 }}>
          Immagine di copertina
        </div>
        {coverImage && (
          <div style={{ position: "relative", marginBottom: 12, display: "inline-block" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImage}
              alt="cover spot"
              style={{ width: "100%", maxWidth: 360, height: 140, objectFit: "cover", borderRadius: 12, border: "1px solid rgba(0,0,0,0.1)", display: "block" }}
            />
            <button
              type="button"
              onClick={() => setCoverImage("")}
              style={{
                position: "absolute", top: 6, right: 6,
                background: "rgba(0,0,0,0.6)", color: "white", border: "none",
                borderRadius: "50%", width: 24, height: 24, cursor: "pointer",
                fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >×</button>
          </div>
        )}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 16px", borderRadius: 12,
              border: "1px dashed rgba(99,102,241,0.4)",
              background: "rgba(99,102,241,0.05)",
              cursor: uploadingCover ? "not-allowed" : "pointer",
              fontSize: 13, fontWeight: 600,
            }}
          >
            {uploadingCover ? "Caricamento…" : "🖼 Carica copertina"}
            <input type="file" accept="image/*" disabled={uploadingCover} onChange={handleCoverUpload} style={{ display: "none" }} />
          </label>
          <span className="muted" style={{ fontSize: 12 }}>oppure incolla URL:</span>
          <input
            style={{ ...inputStyle, flex: 1, minWidth: 180 }}
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            placeholder="https://..."
            type="url"
          />
        </div>
        {coverErr && <span style={{ color: "red", fontSize: 12 }}>{coverErr}</span>}
      </div>

      {/* Foto */}
      <div>
        <div className="muted" style={{ marginBottom: 10, fontSize: 13, fontWeight: 700 }}>
          Foto dello spot
        </div>

        {foto.length > 0 && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            {foto.map((url) => (
              <div key={url} style={{ position: "relative" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt="foto spot"
                  style={{
                    width: 100,
                    height: 100,
                    objectFit: "cover",
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.1)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => removePhoto(url)}
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    background: "rgba(0,0,0,0.6)",
                    color: "white",
                    border: "none",
                    borderRadius: "50%",
                    width: 22,
                    height: 22,
                    cursor: "pointer",
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              borderRadius: 12,
              border: "1px dashed rgba(99,102,241,0.4)",
              background: "rgba(99,102,241,0.05)",
              cursor: uploading ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {uploading ? "Caricamento…" : "📷 Aggiungi foto"}
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={handlePhotoUpload}
              style={{ display: "none" }}
            />
          </label>
          {uploadErr && <span style={{ color: "red", fontSize: 12 }}>{uploadErr}</span>}
        </div>
      </div>

      {/* Feedback + submit */}
      {msg && (
        <div
          className="notice"
          style={{ color: "green", borderColor: "rgba(16,185,129,0.3)" }}
        >
          ✅ {msg}
        </div>
      )}
      {error && (
        <div
          className="notice"
          style={{ color: "red", borderColor: "rgba(239,68,68,0.3)" }}
        >
          ❌ {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          className="btn primary"
          type="submit"
          disabled={isPending}
          style={{ minWidth: 140 }}
        >
          {isPending ? "Salvataggio…" : "Salva modifiche"}
        </button>
      </div>
    </form>
  );
}

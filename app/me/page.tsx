"use client";

import { useEffect, useMemo, useState } from "react";

type BadgeLevel = "BRONZE" | "SILVER" | "GOLD";

type Badge = {
  key: string;
  title: string;
  subtitle: string;
  level: BadgeLevel;
  progress: number; // 0..1
  current: number;
  target: number;
  hint: string;
};

type RecentEvent = {
  id: string;
  created_at: string;
  event_type: string;
  points: number | null;
  venue_id: string | null;
  venue_name: string | null;
};

type MePayload = {
  ok: boolean;
  user: {
    id: string;
    name: string | null;
    nickname_locked: boolean;
    created_at?: string | null;
  };
  stats: {
    points_total: number;
    scans_total: number;
    venues_distinct: number;
    favorite_venue: { id: string; name: string } | null;
    last_7d_points: number;
    last_7d_scans: number;
    active_days_7d: number;
  };
  badges: Badge[];
  recent: RecentEvent[];
};

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function levelFromProgress(p: number): BadgeLevel {
  if (p >= 1) return "GOLD";
  if (p >= 0.66) return "SILVER";
  return "BRONZE";
}

export default function MePage() {
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<MePayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [nameInput, setNameInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [openRecent, setOpenRecent] = useState(false);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/me", { cache: "no-store" });

      // se per qualsiasi motivo non torna JSON, mostriamo errore chiaro
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const txt = await res.text();
        throw new Error(`Risposta non JSON (status ${res.status}). Prima riga: ${txt.slice(0, 60)}`);
      }

      const j = (await res.json()) as MePayload;
      if (!j.ok) throw new Error("api_me_failed");
      setPayload(j);
      setNameInput(j.user.name ?? "");
    } catch (e: any) {
      setErr(e?.message || "Errore sconosciuto");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const canEditName = useMemo(() => {
    if (!payload) return false;
    // nickname modificabile solo se NON lockato e non già valorizzato
    return !payload.user.nickname_locked && !payload.user.name;
  }, [payload]);

  async function saveNicknameOnce() {
    if (!payload) return;
    const raw = nameInput.trim();
    if (!raw) return setErr("Inserisci un nickname.");
    if (raw.toLowerCase() === "guest" || raw.toLowerCase() === "utente") {
      return setErr('Nickname non valido ("Guest/utente" non consentito).');
    }
    if (raw.length > 24) return setErr("Max 24 caratteri.");

    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/me/nickname", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: raw }),
      });

      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const txt = await res.text();
        throw new Error(`Risposta non JSON (status ${res.status}). ${txt.slice(0, 80)}`);
      }
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "save_failed");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Errore salvataggio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 980, margin: "0 auto" }}>
      <div className="cardHead" style={{ alignItems: "flex-start" }}>
        <div>
          <h1 className="h1" style={{ marginBottom: 6 }}>
            Profilo
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            Statistiche + badge
          </p>
        </div>

        <button className="btn" onClick={load} disabled={loading}>
          Aggiorna
        </button>
      </div>

      {err ? (
        <div className="notice" style={{ marginTop: 12 }}>
          Errore: {err}
        </div>
      ) : null}

      {loading ? (
        <div className="notice" style={{ marginTop: 12 }}>
          Caricamento…
        </div>
      ) : null}

      {payload ? (
        <>
          {/* STATS */}
          <section style={{ marginTop: 14 }}>
            <div className="notice" style={{ marginBottom: 12 }}>
              <b>Overview</b>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <div className="card" style={{ padding: 14 }}>
                <div className="muted">Nickname</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>
                  {payload.user.name ?? "—"}
                </div>
              </div>

              <div className="card" style={{ padding: 14 }}>
                <div className="muted">Punti totali</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>
                  {payload.stats.points_total.toLocaleString("it-IT")}
                </div>
              </div>

              <div className="card" style={{ padding: 14 }}>
                <div className="muted">Scan totali</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>
                  {payload.stats.scans_total.toLocaleString("it-IT")}
                </div>
              </div>

              <div className="card" style={{ padding: 14 }}>
                <div className="muted">Venue diverse</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>
                  {payload.stats.venues_distinct.toLocaleString("it-IT")}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="card" style={{ padding: 14 }}>
                <div className="muted">Venue preferita</div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>
                  {payload.stats.favorite_venue ? payload.stats.favorite_venue.name : "—"}
                </div>
              </div>

              <div className="card" style={{ padding: 14 }}>
                <div className="muted">Attivo ultimi 7 giorni</div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>
                  {payload.stats.active_days_7d}/7 giorni • {payload.stats.last_7d_scans} scan •{" "}
                  {payload.stats.last_7d_points} punti
                </div>
              </div>
            </div>
          </section>

          {/* BADGES */}
          <section style={{ marginTop: 18 }}>
            <div className="notice" style={{ marginBottom: 12 }}>
              <b>Badge</b> <span className="muted">• Bronzo / Silver / Gold</span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              {payload.badges.map((b) => (
                <div key={b.key} className="card" style={{ padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 900 }}>{b.title}</div>
                      <div className="muted">{b.subtitle}</div>
                    </div>

                    <span className="badge" style={{ fontWeight: 800 }}>
                      {b.level}
                    </span>
                  </div>

                  <div className="muted" style={{ marginTop: 10 }}>
                    {b.hint}
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span className="muted">
                        {b.current}/{b.target}
                      </span>
                      <span className="muted">{Math.round(clamp01(b.progress) * 100)}%</span>
                    </div>

                    <div
                      style={{
                        height: 10,
                        borderRadius: 999,
                        background: "rgba(0,0,0,0.06)",
                        overflow: "hidden",
                        marginTop: 6,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.round(clamp01(b.progress) * 100)}%`,
                          background: "linear-gradient(90deg, #7c3aed, #ec4899)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* NICKNAME (ONE TIME) */}
          <section style={{ marginTop: 18 }}>
            <div className="notice" style={{ marginBottom: 12 }}>
              <b>Nickname</b>
              <span className="muted"> • modificabile una sola volta</span>
            </div>

            <div className="card" style={{ padding: 14 }}>
              <div className="muted" style={{ marginBottom: 8 }}>
                Come vuoi comparire in classifica
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  disabled={!canEditName || saving}
                  placeholder="Es: Vits"
                  style={{
                    flex: 1,
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.12)",
                    outline: "none",
                  }}
                />

                <button className="btn" onClick={saveNicknameOnce} disabled={!canEditName || saving}>
                  {saving ? "Salvo…" : "Salva nickname"}
                </button>
              </div>

              {!canEditName ? (
                <div className="muted" style={{ marginTop: 10 }}>
                  Nickname già impostato: non è più modificabile.
                </div>
              ) : (
                <div className="muted" style={{ marginTop: 10 }}>
                  “Guest / utente” non è consentito. Max 24 caratteri.
                </div>
              )}
            </div>
          </section>

          {/* RECENT (collassabile) */}
          <section style={{ marginTop: 18 }}>
            <div className="notice" style={{ marginBottom: 12 }}>
              <b>Attività recente</b>{" "}
              <span className="muted">• {payload.recent.length}</span>
            </div>

            <div className="card" style={{ padding: 14 }}>
              <button className="btn" onClick={() => setOpenRecent((s) => !s)}>
                {openRecent ? "Nascondi" : "Mostra"} attività
              </button>

              {openRecent ? (
                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  {payload.recent.map((ev) => (
                    <div
                      key={ev.id}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        border: "1px solid rgba(0,0,0,0.10)",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800 }}>
                          {ev.event_type}
                          {ev.venue_name ? <span className="muted"> • {ev.venue_name}</span> : null}
                        </div>
                        <div className="muted">
                          {new Date(ev.created_at).toLocaleString("it-IT")}
                        </div>
                      </div>

                      <div style={{ fontWeight: 900 }}>
                        {ev.points ? `+${ev.points}` : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
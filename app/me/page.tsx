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
    // modificabile solo se NON lockato e non già valorizzato
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

  const displayName = payload?.user.name ?? "—";

  return (
    <div className="profilePage">
      <div className="card profileTopCard">
        <div className="profileHeader">
          <div>
            <h1 className="profileTitle">Profilo Esploratore</h1>
            <p className="profileSubtitle">Statistiche, badge e attività recente.</p>
          </div>

          <div className="profileActions">
            <button className="btn" onClick={load} disabled={loading}>
              {loading ? "Aggiorno..." : "Aggiorna"}
            </button>
          </div>
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
      </div>

      {payload ? (
        <div className="profileGrid">
          {/* COL SINISTRA: Overview + Badge + Attività */}
          <div className="profileCol">
            {/* OVERVIEW */}
            <section className="card">
              <div className="profileSectionHead">
                <h2 className="profileSectionTitle">Overview</h2>
                <span className="profileSectionHint">dati principali</span>
              </div>

              <div className="statsGrid">
                <div className="statCard">
                  <div className="statLabel">Nickname</div>
                  <div className="statValue">{displayName}</div>
                </div>

                <div className="statCard">
                  <div className="statLabel">Punti totali</div>
                  <div className="statValue">{payload.stats.points_total.toLocaleString("it-IT")}</div>
                </div>

                <div className="statCard">
                  <div className="statLabel">Scan totali</div>
                  <div className="statValue">{payload.stats.scans_total.toLocaleString("it-IT")}</div>
                </div>

                <div className="statCard">
                  <div className="statLabel">Spot visitati</div>
                  <div className="statValue">{payload.stats.venues_distinct.toLocaleString("it-IT")}</div>
                </div>
              </div>

              <div className="twoColCards" style={{ marginTop: 12 }}>
                <div className="statCard">
                  <div className="statLabel">Spot preferito</div>
                  <div className="statValue" style={{ fontSize: 16 }}>
                    {payload.stats.favorite_venue ? payload.stats.favorite_venue.name : "—"}
                  </div>
                </div>

                <div className="statCard">
                  <div className="statLabel">Ultimi 7 giorni</div>
                  <div className="statValue" style={{ fontSize: 16 }}>
                    {payload.stats.active_days_7d}/7 • {payload.stats.last_7d_scans} scan •{" "}
                    {payload.stats.last_7d_points} punti
                  </div>
                </div>
              </div>
            </section>

            {/* BADGES */}
            <section className="card">
              <div className="profileSectionHead">
                <h2 className="profileSectionTitle">Badge</h2>
                <span className="profileSectionHint">Bronzo / Silver / Gold</span>
              </div>

              <div className="badgeGrid">
                {payload.badges.map((b) => {
                  const pct = Math.round(clamp01(b.progress) * 100);
                  return (
                    <div key={b.key} className="badgeCard">
                      <div className="badgeTop">
                        <div style={{ minWidth: 0 }}>
                          <div className="badgeTitle">{b.title}</div>
                          <div className="badgeSub">{b.subtitle}</div>
                        </div>
                        <span className="badge" style={{ fontWeight: 900 }}>
                          {b.level}
                        </span>
                      </div>

                      <div className="badgeHint">{b.hint}</div>

                      <div style={{ marginTop: 10 }}>
                        <div className="badgeProgressRow">
                          <span className="muted">
                            {b.current}/{b.target}
                          </span>
                          <span className="muted">{pct}%</span>
                        </div>

                        <div className="badgeBar">
                          <div className="badgeBarFill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* RECENT (collassabile) */}
            <section className="card">
              <div className="profileSectionHead">
                <h2 className="profileSectionTitle">Attività recente</h2>
                <span className="profileSectionHint">{payload.recent.length} eventi</span>
              </div>

              <button className="btn" onClick={() => setOpenRecent((s) => !s)}>
                {openRecent ? "Nascondi attività" : "Mostra attività"}
              </button>

              {openRecent ? (
                <div className="recentList">
                  {payload.recent.map((ev) => (
                    <div key={ev.id} className="recentRow">
                      <div style={{ minWidth: 0 }}>
                        <div className="recentTitle">
                          {ev.event_type}
                          {ev.venue_name ? <span className="muted"> • {ev.venue_name}</span> : null}
                        </div>
                        <div className="recentTime">{new Date(ev.created_at).toLocaleString("it-IT")}</div>
                      </div>

                      <div className="recentPts">{ev.points ? `+${ev.points}` : "—"}</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          </div>

          {/* COL DESTRA: Nickname (one time) + tips */}
          <div className="profileCol">
            {/* NICKNAME (ONE TIME) */}
            <section className="card">
              <div className="profileSectionHead">
                <h2 className="profileSectionTitle">Nickname</h2>
                <span className="profileSectionHint">una sola volta</span>
              </div>

              <div className="muted" style={{ marginBottom: 10, lineHeight: 1.35 }}>
                Questo nickname comparirà in classifica e non sarà più modificabile.
              </div>

              <div className="nickBox">
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  disabled={!canEditName || saving}
                  placeholder="Es: Vits"
                  className="nickInput"
                />

                <button className="btn primary nickBtn" onClick={saveNicknameOnce} disabled={!canEditName || saving}>
                  {saving ? "Salvo…" : "Salva"}
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
            </section>

            {/* QUICK TIPS */}
            <section className="card">
              <div className="profileSectionHead">
                <h2 className="profileSectionTitle">Tip veloci</h2>
                <span className="profileSectionHint">per salire</span>
              </div>

              <div className="tipsList">
                <div className="tipRow">
                  <div className="tipIcon">📍</div>
                  <div className="tipBody">
                    <div className="tipTitle">Fai scan in più Spot</div>
                    <div className="tipText">Più Spot visiti, più sali in classifica.</div>
                  </div>
                </div>

                <div className="tipRow">
                  <div className="tipIcon">🧾</div>
                  <div className="tipBody">
                    <div className="tipTitle">Carica scontrini</div>
                    <div className="tipText">Se approvati, ottieni punti extra (consumazione).</div>
                  </div>
                </div>

                <div className="tipRow">
                  <div className="tipIcon">⭐</div>
                  <div className="tipBody">
                    <div className="tipTitle">Lascia un voto</div>
                    <div className="tipText">Aiuta lo Spot (e migliora il rating).</div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}
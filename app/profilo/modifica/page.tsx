"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BADGE_DEFS, type BadgeRarity } from "@/lib/badges-config";

// ─── SVG Social Icons ─────────────────────────────────────────────────────────

function InstagramIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#f09433" />
          <stop offset="25%"  stopColor="#e6683c" />
          <stop offset="50%"  stopColor="#dc2743" />
          <stop offset="75%"  stopColor="#cc2366" />
          <stop offset="100%" stopColor="#bc1888" />
        </linearGradient>
      </defs>
      <path
        fill="url(#ig-grad)"
        d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12c0 3.259.014 3.668.072 4.948.059 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24c3.259 0 3.668-.014 4.948-.072 1.277-.059 2.148-.261 2.913-.558.788-.306 1.459-.717 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.689.072-4.948 0-3.259-.014-3.667-.072-4.947-.059-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
      />
    </svg>
  );
}

function TikTokIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#010101"
        d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"
      />
      <path
        fill="#69C9D0"
        d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"
        opacity="0"
      />
    </svg>
  );
}

function XIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#000000"
        d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"
      />
    </svg>
  );
}

// ─── Costanti ────────────────────────────────────────────────────────────────

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  { label: "Esploratori", emojis: ["🧭", "🗺️", "🏔️", "⛺", "🌍", "🧗", "🚀", "🛸"] },
  { label: "Animali",     emojis: ["🦁", "🐺", "🦊", "🐻", "🦅", "🐬", "🦋", "🐉"] },
  { label: "Cibo & Drink",emojis: ["☕", "🍕", "🍣", "🍸", "🍺", "🎂", "🍜", "🧁"] },
  { label: "Oggetti",     emojis: ["👑", "💎", "🏆", "⚡", "🔥", "💫", "🎯", "🎮"] },
  { label: "Visi",        emojis: ["😎", "🤩", "😏", "🥷", "🤠", "👻", "🦸", "🧙"] },
];

const PRESET_COLORS = [
  { hex: "#2D1B69", label: "Viola scuro" },
  { hex: "#7BC043", label: "Verde lime" },
  { hex: "#1E88E5", label: "Blu" },
  { hex: "#E53935", label: "Rosso" },
  { hex: "#FB8C00", label: "Arancione" },
  { hex: "#E91E93", label: "Rosa" },
  { hex: "#00897B", label: "Teal" },
  { hex: "#F9A825", label: "Giallo" },
  { hex: "#3949AB", label: "Indaco" },
  { hex: "#880E4F", label: "Bordeaux" },
  { hex: "#2E7D32", label: "Verde scuro" },
  { hex: "#424242", label: "Grigio scuro" },
];

const RARITY_CFG: Record<BadgeRarity, { label: string; color: string; border: string; bg: string }> = {
  common:    { label: "Comune",      color: "#2563eb", border: "2px solid rgba(59,130,246,0.5)",  bg: "rgba(59,130,246,0.07)"  },
  rare:      { label: "Raro",        color: "#7c3aed", border: "2px solid rgba(124,58,237,0.5)", bg: "rgba(124,58,237,0.07)" },
  epic:      { label: "Epico",       color: "#c2410c", border: "2px solid rgba(234,88,12,0.5)",  bg: "rgba(251,146,60,0.08)"  },
  legendary: { label: "Leggendario", color: "#b91c1c", border: "2px solid rgba(220,38,38,0.65)", bg: "rgba(220,38,38,0.07)"  },
};

const RARITY_ORDER: Record<BadgeRarity, number> = { legendary: 4, epic: 3, rare: 2, common: 1 };

// ─── Types ────────────────────────────────────────────────────────────────────

type ProfileData = {
  username: string;
  bio: string;
  instagram: string;
  tiktok: string;
  twitter_x: string;
  avatar_emoji: string;
  profile_color: string;
  showcase_badges: string[];
  is_public: boolean;
};

type DbUnlock = { badge_id: string; unlocked_at: string };

const EMPTY_PROFILE: ProfileData = {
  username: "", bio: "", instagram: "", tiktok: "", twitter_x: "",
  avatar_emoji: "🧭", profile_color: "#2D1B69", showcase_badges: [], is_public: true,
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ModificaProfiloPage() {
  const [loading, setLoading]         = useState(true);
  const [initialProfile, setInitial]  = useState<ProfileData>(EMPTY_PROFILE);
  const [profile, setProfile]         = useState<ProfileData>(EMPTY_PROFILE);
  const [badgeUnlocks, setBadgeUnlocks] = useState<DbUnlock[]>([]);

  // salvataggio unico
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Caricamento ──────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      fetch("/api/me", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/badges", { cache: "no-store" }).then((r) => r.json()),
    ]).then(([meJson, bdJson]) => {
      if (meJson?.ok) {
        const u = meJson.user;
        const loaded: ProfileData = {
          username:        u.username        ?? "",
          bio:             u.bio             ?? "",
          instagram:       u.instagram       ?? "",
          tiktok:          u.tiktok          ?? "",
          twitter_x:       u.twitter_x       ?? "",
          avatar_emoji:    u.avatar_emoji    ?? "🧭",
          profile_color:   u.profile_color   ?? "#2D1B69",
          showcase_badges: Array.isArray(u.showcase_badges) ? u.showcase_badges : [],
          is_public:       u.is_public !== false,
        };
        setProfile(loaded);
        setInitial(loaded);
      }
      if (bdJson?.ok && Array.isArray(bdJson.unlocks)) {
        setBadgeUnlocks(bdJson.unlocks);
      }
    }).finally(() => setLoading(false));
  }, []);

  // ── Badge sbloccati ───────────────────────────────────────────────────────

  const sbloccati = useMemo(() => {
    const ids = new Set(badgeUnlocks.map((u) => u.badge_id));
    return BADGE_DEFS
      .filter((b) => ids.has(b.id))
      .sort((a, b) => RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity]);
  }, [badgeUnlocks]);

  // ── isDirty ───────────────────────────────────────────────────────────────

  const isDirty = useMemo(
    () => JSON.stringify(profile) !== JSON.stringify(initialProfile),
    [profile, initialProfile]
  );

  // ── Toggle visibilità (immediato) ─────────────────────────────────────────

  function toggleVisibility() {
    const next = !profile.is_public;
    setProfile((p) => ({ ...p, is_public: next }));
    fetch("/api/me/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_public: next }),
    }).catch(() => {});
    // aggiorna anche initialProfile per non considerarlo "dirty"
    setInitial((p) => ({ ...p, is_public: next }));
  }

  // ── Salvataggio unico ─────────────────────────────────────────────────────

  async function saveAll() {
    if (!isDirty || saving) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username:        profile.username.trim()  || undefined,
          bio:             profile.bio.trim()       || null,
          instagram:       profile.instagram.trim() || null,
          tiktok:          profile.tiktok.trim()    || null,
          twitter_x:       profile.twitter_x.trim() || null,
          avatar_emoji:    profile.avatar_emoji     || "🧭",
          profile_color:   profile.profile_color    || "#2D1B69",
          showcase_badges: profile.showcase_badges,
        }),
      });
      const json = await res.json();

      if (!json.ok) {
        const msg =
          json.error === "username_taken"   ? "Username già in uso" :
          json.error === "invalid_username" ? "Username non valido" :
          json.error === "bio_too_long"     ? "Bio troppo lunga (max 100 caratteri)" :
          json.error ?? "Errore durante il salvataggio";
        setSaveError(msg);
        return;
      }

      // aggiorna username se il server ha normalizzato lo slug
      const saved = { ...profile };
      if (json.user?.username) saved.username = json.user.username;
      setProfile(saved);
      setInitial(saved);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaveError("Errore di rete, riprova.");
    } finally {
      setSaving(false);
    }
  }

  function toggleShowcaseBadge(id: string) {
    setProfile((p) => {
      const prev = p.showcase_badges;
      if (prev.includes(id)) return { ...p, showcase_badges: prev.filter((x) => x !== id) };
      if (prev.length >= 3)  return { ...p, showcase_badges: [...prev.slice(1), id] };
      return { ...p, showcase_badges: [...prev, id] };
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const { avatar_emoji, profile_color, username, bio, instagram, tiktok, twitter_x, is_public, showcase_badges } = profile;

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ opacity: 0.5, fontSize: 15 }}>Caricamento...</div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media (max-width: 640px) {
          .modifica-sheet { animation: slideInRight 280ms cubic-bezier(0.22, 0.61, 0.36, 1) both; }
        }
      `}</style>

      <div className="modifica-sheet" style={{ minHeight: "100dvh", background: "#f6f4fb", display: "flex", flexDirection: "column" }}>

        {/* ── Header sticky ── */}
        <div style={{
          position: "sticky", top: 0, zIndex: 10,
          background: "white", borderBottom: "1px solid rgba(0,0,0,0.08)",
          padding: "0 16px", height: 56,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}>
          <Link href="/me" style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 800, fontSize: 14, color: "#2D1B69", textDecoration: "none" }}>
            ← Profilo
          </Link>
          <div style={{ fontWeight: 900, fontSize: 15, color: "#0f172a" }}>✏️ Modifica profilo</div>
          {username ? (
            <a href={`/profilo/${username}`} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", textDecoration: "none" }}>
              👁 Vedi
            </a>
          ) : <div style={{ width: 36 }} />}
        </div>

        {/* ── Preview live ── */}
        <div style={{ padding: "20px 16px 14px", display: "flex", alignItems: "center", gap: 14, maxWidth: 680, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%", flexShrink: 0,
            background: profile_color, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 30, boxShadow: `0 4px 16px ${profile_color}55`, transition: "background 0.2s, box-shadow 0.2s",
          }}>
            {avatar_emoji || "🧭"}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 17, color: "#0f172a" }}>@{username || "il-tuo-username"}</div>
            {bio && <div style={{ fontSize: 13, color: "#4b5563", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bio}</div>}
            {(instagram || tiktok || twitter_x) && (
              <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
                {instagram && (
                  <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 4, textDecoration: "none", fontSize: 12, color: "#6b7280" }}>
                    <InstagramIcon size={16} /> @{instagram}
                  </a>
                )}
                {tiktok && (
                  <a href={`https://tiktok.com/@${tiktok}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 4, textDecoration: "none", fontSize: 12, color: "#6b7280" }}>
                    <TikTokIcon size={16} /> @{tiktok}
                  </a>
                )}
                {twitter_x && (
                  <a href={`https://x.com/${twitter_x}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 4, textDecoration: "none", fontSize: 12, color: "#6b7280" }}>
                    <XIcon size={16} /> @{twitter_x}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Contenuto ── */}
        <div style={{
          flex: 1, padding: "0 16px 32px",
          display: "flex", flexDirection: "column", gap: 12,
          maxWidth: 680, width: "100%", margin: "0 auto", boxSizing: "border-box",
        }}>

          {/* ── TOGGLE PUBBLICO / PRIVATO ── */}
          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>
                  {is_public ? "🌍 Profilo pubblico" : "🔒 Profilo privato"}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>
                  {is_public ? "Visibile agli altri esploratori" : "Non visitabile da altri utenti"}
                </div>
              </div>
              <button type="button" onClick={toggleVisibility}
                aria-label={is_public ? "Rendi privato" : "Rendi pubblico"}
                style={{
                  position: "relative", width: 52, height: 28, borderRadius: 999,
                  border: "none", cursor: "pointer", flexShrink: 0, padding: 0,
                  background: is_public ? "linear-gradient(135deg, #2D1B69, #7BC043)" : "rgba(0,0,0,0.18)",
                  transition: "background 0.22s",
                }}>
                <span style={{
                  position: "absolute", top: 4, left: is_public ? 26 : 4,
                  width: 20, height: 20, borderRadius: "50%", background: "white",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.25)", transition: "left 0.22s", display: "block",
                }} />
              </button>
            </div>
          </Card>

          {/* ── USERNAME ── */}
          <Card title="🔗 Username">
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                fontSize: 13, color: "#9ca3af", pointerEvents: "none", lineHeight: 1,
              }}>/profilo/</span>
              <input type="text" value={username}
                onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                placeholder="il-tuo-username"
                style={inputStyle(false, 68)} />
            </div>
          </Card>

          {/* ── AVATAR EMOJI ── */}
          <Card title="😎 Avatar">
            {EMOJI_CATEGORIES.map((cat) => (
              <div key={cat.label} style={{ marginBottom: 8 }}>
                <div style={catLabelStyle}>{cat.label}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {cat.emojis.map((emoji) => {
                    const sel = avatar_emoji === emoji;
                    return (
                      <button key={emoji} type="button"
                        onClick={() => setProfile((p) => ({ ...p, avatar_emoji: emoji }))}
                        style={{
                          width: 42, height: 42, borderRadius: 10, fontSize: 22, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          border: sel ? "2.5px solid #2D1B69" : "2px solid rgba(0,0,0,0.09)",
                          background: sel ? "rgba(45,27,105,0.1)" : "rgba(0,0,0,0.03)",
                          boxShadow: sel ? "0 0 0 3px rgba(45,27,105,0.15)" : "none",
                          transition: "border 0.12s, background 0.12s, box-shadow 0.12s",
                        }}>
                        {emoji}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </Card>

          {/* ── COLORE PROFILO ── */}
          <Card title="🎨 Colore profilo">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {PRESET_COLORS.map(({ hex, label }) => {
                const sel = profile_color.toLowerCase() === hex.toLowerCase();
                return (
                  <button key={hex} type="button"
                    onClick={() => setProfile((p) => ({ ...p, profile_color: hex }))}
                    title={label}
                    style={{
                      width: 38, height: 38, borderRadius: "50%", background: hex,
                      border: sel ? "3px solid white" : "3px solid transparent",
                      outline: sel ? `3px solid ${hex}` : "none",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 15, transition: "outline 0.12s, box-shadow 0.12s",
                      boxShadow: sel ? `0 0 0 2px ${hex}` : "0 1px 5px rgba(0,0,0,0.18)",
                    }}>
                    {sel && <span style={{ color: "white", fontWeight: 900 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* ── BIO ── */}
          <Card title={<>📝 Bio <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.45 }}>{bio.length}/100</span></>}>
            <textarea value={bio}
              onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value.slice(0, 100) }))}
              maxLength={100} rows={3}
              placeholder="Raccontati in poche parole... es. Esploratore seriale di caffetterie 🧭"
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 10, fontSize: 14,
                border: "1px solid rgba(0,0,0,0.14)", resize: "none",
                boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.5,
              }} />
          </Card>

          {/* ── BADGE VETRINA ── */}
          <Card title={<>🏆 Badge vetrina <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.45 }}>{showcase_badges.length}/3 selezionati</span></>}>
            {sbloccati.length === 0 ? (
              <div style={{ padding: "16px", borderRadius: 10, background: "rgba(0,0,0,0.03)", fontSize: 13, color: "#9ca3af", textAlign: "center" }}>
                Sblocca badge esplorando la città per personalizzare la vetrina 🏙️
              </div>
            ) : (
              <>
                {showcase_badges.length > 0 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {showcase_badges.map((bid) => {
                      const b = BADGE_DEFS.find((d) => d.id === bid);
                      if (!b) return null;
                      const rc = RARITY_CFG[b.rarity];
                      return (
                        <div key={bid} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 8, background: rc.bg, border: rc.border }}>
                          <span style={{ fontSize: 17 }}>{b.icon}</span>
                          <span style={{ fontSize: 12, fontWeight: 800, color: rc.color }}>{b.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8, maxHeight: 290, overflowY: "auto" }}>
                  {sbloccati.map((b) => {
                    const rc = RARITY_CFG[b.rarity];
                    const sel = showcase_badges.includes(b.id);
                    return (
                      <button key={b.id} type="button" onClick={() => toggleShowcaseBadge(b.id)}
                        style={{
                          padding: "10px 8px", borderRadius: 12, cursor: "pointer", textAlign: "center", position: "relative",
                          border: sel ? "2.5px solid #2D1B69" : "2px solid rgba(0,0,0,0.09)",
                          background: sel ? "rgba(45,27,105,0.08)" : "rgba(0,0,0,0.02)",
                          transition: "border 0.12s, background 0.12s",
                        }}>
                        {sel && <span style={{ position: "absolute", top: 5, right: 7, fontSize: 11, fontWeight: 900, color: "#2D1B69" }}>✓</span>}
                        <div style={{ fontSize: 24, marginBottom: 5 }}>{b.icon}</div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: rc.color, lineHeight: 1.2 }}>{b.name}</div>
                        <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>{rc.label}</div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </Card>

          {/* ── LINK SOCIAL ── */}
          <Card title="🔗 Link social">
            <div style={{ display: "grid", gap: 12 }}>
              {(
                [
                  { key: "instagram" as const, label: "Instagram", Icon: InstagramIcon, url: (v: string) => `https://instagram.com/${v}` },
                  { key: "tiktok"    as const, label: "TikTok",    Icon: TikTokIcon,    url: (v: string) => `https://tiktok.com/@${v}` },
                  { key: "twitter_x" as const, label: "X (Twitter)", Icon: XIcon,       url: (v: string) => `https://x.com/${v}` },
                ]
              ).map(({ key, label, Icon, url }) => (
                <div key={key}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <Icon size={20} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{label}</span>
                    {profile[key] && (
                      <a href={url(profile[key])} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 11, color: "#6b7280", textDecoration: "underline", marginLeft: "auto" }}>
                        apri ↗
                      </a>
                    )}
                  </div>
                  <div style={{ position: "relative" }}>
                    <span style={{
                      position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                      fontSize: 14, color: "#d1d5db", pointerEvents: "none", lineHeight: 1,
                    }}>@</span>
                    <input type="text" value={profile[key]}
                      onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value.replace(/^@+/, "") }))}
                      placeholder="tuousername"
                      style={inputStyle(false, 28)} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* ── SALVA TUTTO ── */}
          {saveError && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", fontSize: 13, color: "#b91c1c" }}>
              {saveError}
            </div>
          )}

          <button type="button" onClick={saveAll}
            disabled={!isDirty || saving}
            style={{
              padding: "15px 20px", borderRadius: 14, border: "none", cursor: isDirty ? "pointer" : "not-allowed",
              fontSize: 15, fontWeight: 900, color: "white",
              background: isDirty
                ? "linear-gradient(135deg, #2D1B69 0%, #7BC043 100%)"
                : "rgba(0,0,0,0.12)",
              boxShadow: isDirty ? "0 4px 18px rgba(45,27,105,0.35)" : "none",
              transition: "background 0.2s, box-shadow 0.2s, opacity 0.2s",
              opacity: saving ? 0.7 : 1,
            }}>
            {saving ? "Salvataggio in corso..." : saved ? "✅ Profilo aggiornato!" : "💾 Salva modifiche"}
          </button>

          <Link href="/me" style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "13px", borderRadius: 14, background: "white",
            border: "1px solid rgba(0,0,0,0.09)", fontWeight: 800, fontSize: 14,
            color: "#2D1B69", textDecoration: "none", boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
          }}>
            ← Torna al profilo
          </Link>

        </div>
      </div>
    </>
  );
}

// ─── Micro-componenti ─────────────────────────────────────────────────────────

function Card({ title, children }: { title?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{
      background: "white", borderRadius: 16, padding: "16px",
      boxShadow: "0 1px 8px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.07)",
      display: "grid", gap: 12,
    }}>
      {title && <div style={{ fontWeight: 900, fontSize: 15, color: "#0f172a" }}>{title}</div>}
      {children}
    </div>
  );
}

const catLabelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, color: "#9ca3af",
  textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6,
};

function inputStyle(hasError: boolean, paddingLeft: number): React.CSSProperties {
  return {
    width: "100%", padding: `9px 10px 9px ${paddingLeft}px`,
    borderRadius: 10, border: `1px solid ${hasError ? "#ef4444" : "rgba(0,0,0,0.14)"}`,
    fontSize: 14, fontWeight: 600, boxSizing: "border-box", fontFamily: "inherit",
  };
}

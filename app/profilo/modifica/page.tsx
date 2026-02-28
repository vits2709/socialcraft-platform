"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BADGE_DEFS, type BadgeRarity } from "@/lib/badges-config";

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

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ModificaProfiloPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData>({
    username: "",
    bio: "",
    instagram: "",
    tiktok: "",
    twitter_x: "",
    avatar_emoji: "🧭",
    profile_color: "#2D1B69",
    showcase_badges: [],
    is_public: true,
  });
  const [badgeUnlocks, setBadgeUnlocks] = useState<DbUnlock[]>([]);

  // stati salvataggio
  const [savingAvatar,   setSavingAvatar]   = useState(false);
  const [savedAvatar,    setSavedAvatar]    = useState(false);
  const [savingColor,    setSavingColor]    = useState(false);
  const [savedColor,     setSavedColor]     = useState(false);
  const [savingBio,      setSavingBio]      = useState(false);
  const [savedBio,       setSavedBio]       = useState(false);
  const [bioErr,         setBioErr]         = useState<string | null>(null);
  const [savingShowcase, setSavingShowcase] = useState(false);
  const [savedShowcase,  setSavedShowcase]  = useState(false);
  const [savingSocial,   setSavingSocial]   = useState(false);
  const [savedSocial,    setSavedSocial]    = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [savedUsername,  setSavedUsername]  = useState(false);
  const [usernameErr,    setUsernameErr]    = useState<string | null>(null);

  // ── Caricamento dati ──────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      fetch("/api/me", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/badges", { cache: "no-store" }).then((r) => r.json()),
    ]).then(([meJson, bdJson]) => {
      if (meJson?.ok) {
        const u = meJson.user;
        setProfile({
          username:        u.username        ?? "",
          bio:             u.bio             ?? "",
          instagram:       u.instagram       ?? "",
          tiktok:          u.tiktok          ?? "",
          twitter_x:       u.twitter_x       ?? "",
          avatar_emoji:    u.avatar_emoji    ?? "🧭",
          profile_color:   u.profile_color   ?? "#2D1B69",
          showcase_badges: Array.isArray(u.showcase_badges) ? u.showcase_badges : [],
          is_public:       u.is_public !== false,
        });
      }
      if (bdJson?.ok && Array.isArray(bdJson.unlocks)) {
        setBadgeUnlocks(bdJson.unlocks);
      }
    }).finally(() => setLoading(false));
  }, []);

  // ── Badge sbloccati ordinati per rarità ───────────────────────────────────

  const sbloccati = useMemo(() => {
    const unlockedIds = new Set(badgeUnlocks.map((u) => u.badge_id));
    return BADGE_DEFS
      .filter((b) => unlockedIds.has(b.id))
      .sort((a, b) => RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity]);
  }, [badgeUnlocks]);

  // ── Helper PATCH ─────────────────────────────────────────────────────────

  async function patch(fields: Record<string, unknown>) {
    const res = await fetch("/api/me/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    return res.json();
  }

  function flash(
    setSaving: (v: boolean) => void,
    setSaved:  (v: boolean) => void,
  ) {
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // ── Salvataggi granulari ──────────────────────────────────────────────────

  async function saveAvatar(emoji: string) {
    setProfile((p) => ({ ...p, avatar_emoji: emoji }));
    setSavingAvatar(true);
    const json = await patch({ avatar_emoji: emoji }).catch(() => ({ ok: false }));
    if (json.ok) flash(setSavingAvatar, setSavedAvatar);
    else setSavingAvatar(false);
  }

  async function saveColor(color: string) {
    setProfile((p) => ({ ...p, profile_color: color }));
    setSavingColor(true);
    const json = await patch({ profile_color: color }).catch(() => ({ ok: false }));
    if (json.ok) flash(setSavingColor, setSavedColor);
    else setSavingColor(false);
  }

  async function saveVisibility(pub: boolean) {
    setProfile((p) => ({ ...p, is_public: pub }));
    await patch({ is_public: pub }).catch(() => {});
  }

  async function saveBio() {
    setBioErr(null);
    setSavingBio(true);
    const json = await patch({ bio: profile.bio.trim() || null }).catch(() => ({ ok: false, error: "Errore di rete" }));
    if (!json.ok) {
      setSavingBio(false);
      setBioErr(
        json.error === "bio_too_long" ? "Bio troppo lunga (max 100 caratteri)" : json.error ?? "Errore"
      );
      return;
    }
    flash(setSavingBio, setSavedBio);
  }

  async function saveShowcase() {
    setSavingShowcase(true);
    const json = await patch({ showcase_badges: profile.showcase_badges }).catch(() => ({ ok: false }));
    if (json.ok) flash(setSavingShowcase, setSavedShowcase);
    else setSavingShowcase(false);
  }

  async function saveSocial() {
    setSavingSocial(true);
    const json = await patch({
      instagram: profile.instagram.trim() || null,
      tiktok:    profile.tiktok.trim()    || null,
      twitter_x: profile.twitter_x.trim() || null,
    }).catch(() => ({ ok: false }));
    if (json.ok) flash(setSavingSocial, setSavedSocial);
    else setSavingSocial(false);
  }

  async function saveUsername() {
    setUsernameErr(null);
    setSavingUsername(true);
    const json = await patch({ username: profile.username.trim() }).catch(() => ({ ok: false, error: "Errore di rete" }));
    if (!json.ok) {
      setSavingUsername(false);
      setUsernameErr(
        json.error === "username_taken"    ? "Username già in uso" :
        json.error === "invalid_username"  ? "Username non valido" :
        json.error ?? "Errore"
      );
      return;
    }
    if (json.user?.username) setProfile((p) => ({ ...p, username: json.user.username }));
    flash(setSavingUsername, setSavedUsername);
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
      {/* Stile animazione slide-in (mobile) */}
      <style>{`
        @media (max-width: 640px) {
          .modifica-sheet {
            animation: slideInRight 280ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
          }
        }
      `}</style>

      <div
        className="modifica-sheet"
        style={{
          minHeight: "100dvh",
          background: "#f6f4fb",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── Header fisso ── */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            background: "white",
            borderBottom: "1px solid rgba(0,0,0,0.08)",
            padding: "0 16px",
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Link
            href="/me"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontWeight: 800,
              fontSize: 14,
              color: "#2D1B69",
              textDecoration: "none",
            }}
          >
            ← Torna al profilo
          </Link>

          <div style={{ fontWeight: 900, fontSize: 15, color: "#0f172a" }}>
            ✏️ Modifica profilo
          </div>

          {username ? (
            <a
              href={`/profilo/${username}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#6b7280",
                textDecoration: "none",
              }}
            >
              👁 Vedi
            </a>
          ) : (
            <div style={{ width: 40 }} />
          )}
        </div>

        {/* ── Preview avatar live ── */}
        <div
          style={{
            padding: "24px 16px 16px",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: "50%",
              background: profile_color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
              flexShrink: 0,
              boxShadow: `0 4px 18px ${profile_color}55`,
              transition: "background 0.25s, box-shadow 0.25s",
            }}
          >
            {avatar_emoji || "🧭"}
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18, color: "#0f172a" }}>
              @{username || "il-tuo-username"}
            </div>
            {bio && (
              <div style={{ fontSize: 13, color: "#4b5563", marginTop: 2 }}>{bio}</div>
            )}
          </div>
        </div>

        {/* ── Contenuto ── */}
        <div
          style={{
            flex: 1,
            padding: "0 16px 32px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            maxWidth: 680,
            width: "100%",
            margin: "0 auto",
            boxSizing: "border-box",
          }}
        >

          {/* ── TOGGLE PUBBLICO / PRIVATO ── */}
          <Card>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>
                  {is_public ? "🌍 Profilo pubblico" : "🔒 Profilo privato"}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>
                  {is_public
                    ? "Il tuo profilo è visitabile dagli altri esploratori"
                    : "Il tuo profilo non è visitabile da altri utenti"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => saveVisibility(!is_public)}
                aria-label={is_public ? "Rendi privato" : "Rendi pubblico"}
                style={{
                  position: "relative",
                  width: 52,
                  height: 28,
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  background: is_public
                    ? "linear-gradient(135deg, #2D1B69, #7BC043)"
                    : "rgba(0,0,0,0.18)",
                  transition: "background 0.22s",
                  flexShrink: 0,
                  padding: 0,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 4,
                    left: is_public ? 26 : 4,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "white",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                    transition: "left 0.22s",
                    display: "block",
                  }}
                />
              </button>
            </div>
          </Card>

          {/* ── USERNAME ── */}
          <Card title="🔗 Username">
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
                <span
                  style={{
                    position: "absolute",
                    left: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 13,
                    color: "#9ca3af",
                    pointerEvents: "none",
                    lineHeight: 1,
                  }}
                >
                  /profilo/
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      username: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                    }))
                  }
                  placeholder="il-tuo-username"
                  style={inputStyle(!!usernameErr, 68)}
                />
              </div>
              <SaveButton onClick={saveUsername} saving={savingUsername} saved={savedUsername} />
            </div>
            {usernameErr && <ErrorText>{usernameErr}</ErrorText>}
          </Card>

          {/* ── AVATAR EMOJI ── */}
          <Card title="😎 Avatar">
            {EMOJI_CATEGORIES.map((cat) => (
              <div key={cat.label} style={{ marginBottom: 10 }}>
                <div style={catLabelStyle}>{cat.label}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {cat.emojis.map((emoji) => {
                    const sel = avatar_emoji === emoji;
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => saveAvatar(emoji)}
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 10,
                          border: sel ? "2.5px solid #2D1B69" : "2px solid rgba(0,0,0,0.09)",
                          background: sel ? "rgba(45,27,105,0.1)" : "rgba(0,0,0,0.03)",
                          fontSize: 22,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: sel ? "0 0 0 3px rgba(45,27,105,0.15)" : "none",
                          transition: "border 0.12s, background 0.12s, box-shadow 0.12s",
                        }}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {(savingAvatar || savedAvatar) && (
              <div style={feedbackStyle}>{savingAvatar ? "Salvataggio..." : "✅ Salvato!"}</div>
            )}
          </Card>

          {/* ── COLORE PROFILO ── */}
          <Card title="🎨 Colore profilo">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {PRESET_COLORS.map(({ hex, label }) => {
                const sel = profile_color.toLowerCase() === hex.toLowerCase();
                return (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => saveColor(hex)}
                    title={label}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      background: hex,
                      border: sel ? "3px solid white" : "3px solid transparent",
                      outline: sel ? `3px solid ${hex}` : "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 15,
                      boxShadow: sel ? `0 0 0 2px ${hex}` : "0 1px 5px rgba(0,0,0,0.18)",
                      transition: "outline 0.12s, box-shadow 0.12s",
                    }}
                  >
                    {sel && <span style={{ color: "white", fontWeight: 900 }}>✓</span>}
                  </button>
                );
              })}
            </div>
            {(savingColor || savedColor) && (
              <div style={feedbackStyle}>{savingColor ? "Salvataggio..." : "✅ Salvato!"}</div>
            )}
          </Card>

          {/* ── BIO ── */}
          <Card title={<>📝 Bio <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.45 }}>{bio.length}/100</span></>}>
            <textarea
              value={bio}
              onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value.slice(0, 100) }))}
              maxLength={100}
              placeholder="Raccontati in poche parole... es. Esploratore seriale di caffetterie 🧭"
              rows={3}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${bioErr ? "#ef4444" : "rgba(0,0,0,0.14)"}`,
                fontSize: 14,
                resize: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
                lineHeight: 1.5,
              }}
            />
            {bioErr && <ErrorText>{bioErr}</ErrorText>}
            <SaveButton onClick={saveBio} saving={savingBio} saved={savedBio} label="Salva bio" />
          </Card>

          {/* ── BADGE VETRINA ── */}
          <Card title="🏆 Badge vetrina">
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 10 }}>
              Seleziona fino a 3 badge da mostrare nel tuo profilo pubblico.
              {showcase_badges.length > 0 && ` (${showcase_badges.length}/3 selezionati)`}
            </div>

            {sbloccati.length === 0 ? (
              <div
                style={{
                  padding: "18px 14px",
                  borderRadius: 12,
                  background: "rgba(0,0,0,0.03)",
                  fontSize: 13,
                  color: "#9ca3af",
                  textAlign: "center",
                }}
              >
                Sblocca badge esplorando la città per personalizzare la vetrina 🏙️
              </div>
            ) : (
              <>
                {/* Preview selezione corrente */}
                {showcase_badges.length > 0 && (
                  <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                    {showcase_badges.map((bid) => {
                      const b = BADGE_DEFS.find((d) => d.id === bid);
                      if (!b) return null;
                      const rc = RARITY_CFG[b.rarity];
                      return (
                        <div
                          key={bid}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "6px 10px",
                            borderRadius: 8,
                            background: rc.bg,
                            border: rc.border,
                          }}
                        >
                          <span style={{ fontSize: 18 }}>{b.icon}</span>
                          <span style={{ fontSize: 12, fontWeight: 800, color: rc.color }}>{b.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Griglia */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                    gap: 8,
                    maxHeight: 300,
                    overflowY: "auto",
                    paddingRight: 2,
                  }}
                >
                  {sbloccati.map((b) => {
                    const rc = RARITY_CFG[b.rarity];
                    const sel = showcase_badges.includes(b.id);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => toggleShowcaseBadge(b.id)}
                        style={{
                          padding: "10px 8px",
                          borderRadius: 12,
                          border: sel ? "2.5px solid #2D1B69" : "2px solid rgba(0,0,0,0.09)",
                          background: sel ? "rgba(45,27,105,0.08)" : "rgba(0,0,0,0.02)",
                          cursor: "pointer",
                          textAlign: "center",
                          position: "relative",
                          transition: "border 0.12s, background 0.12s",
                        }}
                      >
                        {sel && (
                          <span
                            style={{
                              position: "absolute",
                              top: 5,
                              right: 7,
                              fontSize: 11,
                              fontWeight: 900,
                              color: "#2D1B69",
                            }}
                          >
                            ✓
                          </span>
                        )}
                        <div style={{ fontSize: 24, marginBottom: 5 }}>{b.icon}</div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: rc.color, lineHeight: 1.2 }}>
                          {b.name}
                        </div>
                        <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>
                          {rc.label}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <SaveButton
                  onClick={saveShowcase}
                  saving={savingShowcase}
                  saved={savedShowcase}
                  label="Salva vetrina"
                  style={{ marginTop: 10 }}
                />
              </>
            )}
          </Card>

          {/* ── LINK SOCIAL ── */}
          <Card title="🔗 Link social">
            <div style={{ display: "grid", gap: 10 }}>
              {(
                [
                  { key: "instagram" as const, label: "📷 Instagram", placeholder: "tuousername" },
                  { key: "tiktok"    as const, label: "🎵 TikTok",    placeholder: "tuousername" },
                  { key: "twitter_x" as const, label: "𝕏 X (Twitter)", placeholder: "tuousername" },
                ]
              ).map(({ key, label, placeholder }) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, width: 108, flexShrink: 0, color: "#4b5563" }}>
                    {label}
                  </span>
                  <div style={{ position: "relative", flex: 1 }}>
                    <span
                      style={{
                        position: "absolute",
                        left: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: 14,
                        color: "#d1d5db",
                        pointerEvents: "none",
                        lineHeight: 1,
                      }}
                    >
                      @
                    </span>
                    <input
                      type="text"
                      value={profile[key]}
                      onChange={(e) =>
                        setProfile((p) => ({
                          ...p,
                          [key]: e.target.value.replace(/^@+/, ""),
                        }))
                      }
                      placeholder={placeholder}
                      style={inputStyle(false, 28)}
                    />
                  </div>
                </div>
              ))}
            </div>
            <SaveButton
              onClick={saveSocial}
              saving={savingSocial}
              saved={savedSocial}
              label="Salva social"
              style={{ marginTop: 12 }}
            />
          </Card>

          {/* ── LINK AL PROFILO ── */}
          <Link
            href="/me"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "14px",
              borderRadius: 14,
              background: "white",
              border: "1px solid rgba(0,0,0,0.09)",
              fontWeight: 800,
              fontSize: 14,
              color: "#2D1B69",
              textDecoration: "none",
              boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
            }}
          >
            ← Torna al profilo
          </Link>

        </div>
      </div>
    </>
  );
}

// ─── Micro-componenti ─────────────────────────────────────────────────────────

function Card({
  title,
  children,
}: {
  title?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: 16,
        padding: "16px 16px",
        boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
        border: "1px solid rgba(0,0,0,0.07)",
        display: "grid",
        gap: 12,
      }}
    >
      {title && (
        <div style={{ fontWeight: 900, fontSize: 15, color: "#0f172a" }}>{title}</div>
      )}
      {children}
    </div>
  );
}

function SaveButton({
  onClick,
  saving,
  saved,
  label = "Salva",
  style: extraStyle,
}: {
  onClick: () => void;
  saving: boolean;
  saved: boolean;
  label?: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="btn primary"
      style={{ fontSize: 13, alignSelf: "flex-start", ...extraStyle }}
    >
      {saving ? "Salvataggio..." : saved ? "✅ Salvato!" : label}
    </button>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, color: "#ef4444", marginTop: 2 }}>{children}</div>;
}

const catLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  color: "#9ca3af",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 6,
};

const feedbackStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#6b7280",
  marginTop: 2,
};

function inputStyle(hasError: boolean, paddingLeft: number): React.CSSProperties {
  return {
    width: "100%",
    padding: `9px 10px 9px ${paddingLeft}px`,
    borderRadius: 10,
    border: `1px solid ${hasError ? "#ef4444" : "rgba(0,0,0,0.14)"}`,
    fontSize: 14,
    fontWeight: 600,
    boxSizing: "border-box",
    fontFamily: "inherit",
  };
}

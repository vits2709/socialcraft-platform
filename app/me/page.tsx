"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PushNotificationSetup from "@/components/PushNotificationSetup";
import { getExplorerLevel } from "@/lib/levels";
import { BADGE_DEFS, BadgeStats, BadgeRarity } from "@/lib/badges-config";

// ─── Types ───────────────────────────────────────────────────────────────────

type StatsPayload =
  | { ok: false; error: string }
  | { ok: true; stats: BadgeStats };

type MePayload =
  | { ok: false; error: string }
  | {
      ok: true;
      user: {
        id: string;
        name: string | null;
        points: number;
        updated_at: string;
        notification_preferences: Record<string, boolean> | null;
        username?: string | null;
        bio?: string | null;
        instagram?: string | null;
        tiktok?: string | null;
        twitter_x?: string | null;
        avatar_emoji?: string | null;
        profile_color?: string | null;
        showcase_badges?: string[] | null;
        is_public?: boolean | null;
      };
      last_events: Array<{
        event_type: string;
        points: number;
        points_delta: number;
        created_at: string;
        venue_id: string | null;
      }>;
    };

type DbUnlock = { badge_id: string; unlocked_at: string };

type HallOfFamePrize = {
  id: string;
  week_start: string;
  prize_description: string;
  prize_image: string | null;
  redemption_code: string | null;
  redemption_code_expires_at: string | null;
  redeemed: boolean;
  redeemed_at: string | null;
  winner_assigned_at: string | null;
  spot_id: string | null;
  venues: { name: string; slug: string | null } | null;
};

type UserNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
};

type UserMission = {
  user_mission_id: string;
  mission_id: string;
  title: string;
  description: string;
  completion_message: string | null;
  mission_type: string;
  type: string;
  points_reward: number;
  is_surprise: boolean;
  is_surprise_hidden: boolean;
  active_from: string;
  active_until: string;
  completed_at: string | null;
  points_awarded: number | null;
  progress: Record<string, unknown>;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function formatInt(n: number) {
  return (Number(n) || 0).toLocaleString("it-IT");
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

// ─── Rarity config ───────────────────────────────────────────────────────────

const RARITY_CFG: Record<
  BadgeRarity,
  { label: string; color: string; border: string; bg: string; barColor: string }
> = {
  common: {
    label: "Comune",
    color: "#2563eb",
    border: "2px solid rgba(59,130,246,0.5)",
    bg: "rgba(59,130,246,0.07)",
    barColor: "linear-gradient(90deg, #60a5fa, #2563eb)",
  },
  rare: {
    label: "Raro",
    color: "#7c3aed",
    border: "2px solid rgba(124,58,237,0.5)",
    bg: "rgba(124,58,237,0.07)",
    barColor: "linear-gradient(90deg, #a78bfa, #7c3aed)",
  },
  epic: {
    label: "Epico",
    color: "#c2410c",
    border: "2px solid rgba(234,88,12,0.5)",
    bg: "rgba(251,146,60,0.08)",
    barColor: "linear-gradient(90deg, #fb923c, #c2410c)",
  },
  legendary: {
    label: "Leggendario",
    color: "#b91c1c",
    border: "2px solid rgba(220,38,38,0.65)",
    bg: "rgba(220,38,38,0.07)",
    barColor: "linear-gradient(90deg, #f87171, #b91c1c, #d97706)",
  },
};

const RARITY_ORDER: Record<BadgeRarity, number> = {
  legendary: 4,
  epic: 3,
  rare: 2,
  common: 1,
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 18,
        border: "1px dashed rgba(0,0,0,0.12)",
        background: "rgba(255,255,255,0.6)",
        display: "grid",
        gap: 12,
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 16 }}>{title}</div>
          {subtitle ? <div style={{ opacity: 0.72, marginTop: 4 }}>{subtitle}</div> : null}
        </div>
        {right ?? null}
      </div>
      {children}
    </div>
  );
}

function ShowcaseBadge({
  badge,
  unlockedAt,
}: {
  badge: (typeof BADGE_DEFS)[number];
  unlockedAt: string | null;
}) {
  const rc = RARITY_CFG[badge.rarity];
  return (
    <div
      style={{
        minWidth: 0,
        borderRadius: 16,
        border: rc.border,
        background: rc.bg,
        padding: "12px 12px",
        textAlign: "center",
        display: "grid",
        gap: 6,
      }}
    >
      <div style={{ fontSize: 28 }}>{badge.icon}</div>
      <div>
        <div style={{ fontWeight: 950, fontSize: 12, lineHeight: 1.3 }}>{badge.name}</div>
        <div style={{ fontSize: 10, color: rc.color, fontWeight: 800, marginTop: 2 }}>
          {rc.label}
        </div>
      </div>
      {unlockedAt && (
        <div style={{ fontSize: 10, opacity: 0.55 }}>{fmtDate(unlockedAt)}</div>
      )}
    </div>
  );
}

function BadgeCard({
  badge,
  unlockedAt,
  s,
}: {
  badge: (typeof BADGE_DEFS)[number];
  unlockedAt: string | null;
  s: BadgeStats;
}) {
  const computed = badge.compute(s);
  const pct = Math.round(clamp(computed.progress01 * 100, 0, 100));
  const isUnlocked = computed.unlocked;
  const isSecret = !!(badge.secret && !isUnlocked);
  const rc = RARITY_CFG[badge.rarity];

  return (
    <div
      style={{
        borderRadius: 18,
        background: "rgba(255,255,255,0.85)",
        padding: 16,
        display: "grid",
        gap: 12,
        position: "relative",
        overflow: "hidden",
        border: rc.border,
        opacity: isSecret ? 0.88 : isUnlocked ? 1 : 0.83,
        minWidth: 0,
      }}
      title={isUnlocked ? "Badge sbloccato" : isSecret ? "Badge segreto" : "Badge bloccato"}
    >
      {/* Header */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {/* Icona */}
        <div
          style={{
            width: 44,
            height: 44,
            flexShrink: 0,
            borderRadius: 14,
            border: `1px solid ${rc.color}22`,
            background: rc.bg,
            display: "grid",
            placeItems: "center",
            fontSize: 22,
          }}
        >
          {isSecret ? "🔐" : badge.icon}
        </div>

        {/* Titolo + descrizione */}
        <div style={{ flex: 1, minWidth: 0, display: "grid", gap: 4 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span
              style={{
                fontWeight: 950,
                fontSize: 15,
                lineHeight: 1.2,
                wordBreak: "break-word",
              }}
            >
              {isSecret ? "???" : badge.name}
            </span>
            <span
              style={{
                padding: "1px 7px",
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 900,
                background: rc.bg,
                color: rc.color,
                border: `1px solid ${rc.color}35`,
                whiteSpace: "nowrap",
              }}
            >
              {rc.label}
            </span>
          </div>

          <div
            style={{
              opacity: 0.7,
              fontSize: 13,
              lineHeight: 1.35,
              wordBreak: "break-word",
              fontStyle: isSecret ? "italic" : "normal",
            }}
          >
            {isSecret ? (badge.secretHint ?? "Segreto nascosto...") : badge.desc}
          </div>

          {isUnlocked && (
            <div style={{ fontSize: 11, color: rc.color, fontWeight: 800 }}>
              ✅{" "}
              {unlockedAt ? `Sbloccato il ${fmtDate(unlockedAt)}` : "Sbloccato"}
            </div>
          )}
        </div>

        {/* Chip stato */}
        <span
          style={{
            flexShrink: 0,
            padding: "6px 10px",
            borderRadius: 999,
            border: `1px solid ${rc.color}22`,
            background: rc.bg,
            fontSize: 12,
            fontWeight: 900,
            whiteSpace: "nowrap",
            alignSelf: "flex-start",
          }}
        >
          {isUnlocked ? "✅" : isSecret ? "🔐" : "🔒"}
        </span>
      </div>

      {/* Progress bar (nascosta per segreti bloccati) */}
      {!isSecret && (
        <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              fontSize: 12,
              opacity: 0.75,
              minWidth: 0,
            }}
          >
            <div style={{ fontWeight: 900, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{computed.label}</div>
            <div style={{ fontWeight: 900, flexShrink: 0 }}>{pct}%</div>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 999,
              background: "rgba(0,0,0,0.08)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                borderRadius: 999,
                background: rc.barColor,
              }}
            />
          </div>
        </div>
      )}

      {/* Cerchio decorativo */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: -38,
          bottom: -38,
          width: 110,
          height: 110,
          borderRadius: 999,
          background: `${rc.color}0d`,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        borderRadius: 999,
        border: "1px solid rgba(0,0,0,0.08)",
        background: "rgba(255,255,255,0.7)",
        fontSize: 13,
        lineHeight: 1,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 99,
          background: "linear-gradient(90deg, #6b7cff, #ff4fb8)",
          display: "inline-block",
        }}
      />
      <b style={{ fontWeight: 900 }}>{label}:</b>
      <span style={{ opacity: 0.85, fontWeight: 800 }}>{value}</span>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MePage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [me, setMe] = useState<MePayload | null>(null);
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [nickInput, setNickInput] = useState("");
  const [nickSaving, setNickSaving] = useState(false);
  const [nickErr, setNickErr] = useState<string | null>(null);

  const [badgeUnlocks, setBadgeUnlocks] = useState<DbUnlock[]>([]);
  const [badgeTab, setBadgeTab] = useState<"tutti" | "sbloccati" | "in_corso" | "segreti">(
    "tutti"
  );
  const [badgesExpanded, setBadgesExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [prizes, setPrizes] = useState<HallOfFamePrize[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [missions, setMissions] = useState<UserMission[]>([]);
  const [missionTab, setMissionTab] = useState<"attive" | "completate">("attive");

  const DEFAULT_PREFS: Record<string, boolean> = {
    mission_assigned: true,
    mission_completed: true,
    prize_won: true,
    prize_expiring: true,
    overtaken: true,
    promo_active: true,
    badge_unlocked: true,
  };
  const PREF_LABELS: Record<string, string> = {
    mission_assigned: "Missioni assegnate",
    mission_completed: "Missioni completate",
    prize_won: "Premio vinto",
    prize_expiring: "Premio in scadenza",
    overtaken: "Superato in classifica",
    promo_active: "Promozioni attive",
    badge_unlocked: "Badge sbloccato",
  };
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>(DEFAULT_PREFS);
  const prefDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Profilo pubblico ─────────────────────────────────────────────────────
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileBio, setProfileBio] = useState("");
  const [profileInstagram, setProfileInstagram] = useState("");
  const [profileTiktok, setProfileTiktok] = useState("");
  const [profileTwitterX, setProfileTwitterX] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("🧭");
  const [profileColor, setProfileColor] = useState("#2D1B69");
  const [profilePublic, setProfilePublic] = useState(true);
  const [profileUsername, setProfileUsername] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  async function loadAll(silent = false) {
    if (!silent) {
      setLoading(true);
      setErr(null);
    } else {
      setRefreshing(true);
      setErr(null);
    }

    try {
      const [meRes, stRes, bdRes, prizeRes, notifRes, missionsRes] = await Promise.all([
        fetch("/api/me", { cache: "no-store" }),
        fetch("/api/profile/stats", { cache: "no-store" }),
        fetch("/api/badges", { cache: "no-store" }),
        fetch("/api/prizes/hall-of-fame", { cache: "no-store" }),
        fetch("/api/notifications", { cache: "no-store" }),
        fetch("/api/missions", { cache: "no-store" }),
      ]);

      const meJson = (await meRes.json()) as MePayload;
      const stJson = (await stRes.json()) as StatsPayload;
      const bdJson = await bdRes.json();
      const prizeJson = await prizeRes.json();
      const notifJson = await notifRes.json();
      const missionsJson = await missionsRes.json();

      setMe(meJson);
      setStats(stJson);
      if (bdJson?.ok && Array.isArray(bdJson.unlocks)) setBadgeUnlocks(bdJson.unlocks);
      if (prizeJson?.ok && Array.isArray(prizeJson.prizes)) setPrizes(prizeJson.prizes);
      if (notifJson?.ok) {
        setNotifications(notifJson.notifications ?? []);
        setUnreadCount(notifJson.unread ?? 0);
      }
      if (missionsJson?.ok && Array.isArray(missionsJson.missions)) {
        setMissions(missionsJson.missions);
      }
      if (meJson?.ok && meJson.user.notification_preferences) {
        setNotifPrefs({ ...DEFAULT_PREFS, ...meJson.user.notification_preferences });
      }
      if (meJson?.ok) {
        const u = meJson.user;
        setProfileUsername(u.username ?? "");
        setProfileBio(u.bio ?? "");
        setProfileInstagram(u.instagram ?? "");
        setProfileTiktok(u.tiktok ?? "");
        setProfileTwitterX(u.twitter_x ?? "");
        setProfileAvatar(u.avatar_emoji ?? "🧭");
        setProfileColor(u.profile_color ?? "#2D1B69");
        setProfilePublic(u.is_public !== false);
      }

      if (!meJson?.ok) setErr(meJson?.error ?? "Errore /api/me");
      else if (!stJson?.ok) setErr(stJson?.error ?? "Errore /api/profile/stats");
      else setErr(null);
    } catch (e: any) {
      setErr(e?.message ?? "Errore di rete");
    }

    setLoading(false);
    setRefreshing(false);
  }

  async function markNotifRead(id: string) {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
    await fetch(`/api/notifications/${id}`, { method: "PATCH" }).catch(() => {});
  }

  function togglePref(key: string) {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    if (prefDebounceRef.current) clearTimeout(prefDebounceRef.current);
    prefDebounceRef.current = setTimeout(() => {
      fetch("/api/me/notification-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: updated }),
      }).catch(() => {});
    }, 500);
  }

  async function saveNickname() {
    const name = nickInput.trim();
    if (name.length < 2) { setNickErr("Minimo 2 caratteri"); return; }
    if (name.length > 24) { setNickErr("Massimo 24 caratteri"); return; }

    setNickSaving(true);
    setNickErr(null);
    try {
      const res = await fetch("/api/me/nickname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!json.ok) { setNickErr(json.error ?? "Errore salvataggio"); return; }
      await loadAll(true);
    } catch (e: any) {
      setNickErr(e?.message ?? "Errore di rete");
    } finally {
      setNickSaving(false);
    }
  }

  async function saveProfile() {
    setProfileSaving(true);
    setProfileErr(null);
    setProfileSaved(false);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: profileUsername.trim() || undefined,
          bio: profileBio.trim() || null,
          instagram: profileInstagram.trim() || null,
          tiktok: profileTiktok.trim() || null,
          twitter_x: profileTwitterX.trim() || null,
          avatar_emoji: profileAvatar || "🧭",
          profile_color: profileColor || "#2D1B69",
          is_public: profilePublic,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        const msg =
          json.error === "username_taken"
            ? "Username già in uso"
            : json.error === "invalid_username"
            ? "Username non valido"
            : json.error === "bio_too_long"
            ? "Bio troppo lunga (max 100 caratteri)"
            : json.error ?? "Errore salvataggio";
        setProfileErr(msg);
        return;
      }
      setProfileSaved(true);
      if (json.user?.username) setProfileUsername(json.user.username);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (e: any) {
      setProfileErr(e?.message ?? "Errore di rete");
    } finally {
      setProfileSaving(false);
    }
  }

  useEffect(() => {
    loadAll(false);
  }, []);

  // Inizializza isMobile + preferenza espansione badge da localStorage
  useEffect(() => {
    const saved = localStorage.getItem("badges_expanded");
    if (saved === "true") setBadgesExpanded(true);
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  function toggleBadges() {
    const next = !badgesExpanded;
    setBadgesExpanded(next);
    localStorage.setItem("badges_expanded", String(next));
  }

  // Auto-salva i badge appena sbloccati nel DB (idempotente)
  useEffect(() => {
    const s = stats && stats.ok ? stats.stats : null;
    if (!s) return;

    const newIds = BADGE_DEFS
      .filter((def) => def.compute(s).unlocked)
      .filter((def) => !badgeUnlocks.some((u) => u.badge_id === def.id))
      .map((def) => def.id);

    if (newIds.length === 0) return;

    fetch("/api/badges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ badge_ids: newIds }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && Array.isArray(data.unlocks)) setBadgeUnlocks(data.unlocks);
      })
      .catch(() => {});
  }, [stats, badgeUnlocks]);

  const s = stats && stats.ok ? stats.stats : null;

  const points = useMemo(() => {
    if (s) return Number(s.points_total ?? 0) || 0;
    if (me && me.ok) return Number(me.user.points ?? 0) || 0;
    return 0;
  }, [s, me]);

  const levelInfo = useMemo(() => getExplorerLevel(points), [points]);

  const nickname = me && me.ok ? (me.user.name ?? null) : null;
  const hasNickname = !!nickname;

  // ── Badge computed data ─────────────────────────────────────────────────
  const badgeResults = useMemo(() => {
    if (!s) return [];
    return BADGE_DEFS.map((def) => {
      const r = def.compute(s);
      const dbUnlock = badgeUnlocks.find((u) => u.badge_id === def.id);
      return { def, ...r, unlockedAt: dbUnlock?.unlocked_at ?? null };
    });
  }, [s, badgeUnlocks]);

  const sbloccati = useMemo(
    () =>
      [...badgeResults.filter((b) => b.unlocked)].sort(
        (a, b) => RARITY_ORDER[b.def.rarity] - RARITY_ORDER[a.def.rarity]
      ),
    [badgeResults]
  );

  // In corso = non leggendari con progresso parziale (nasconde i segreti)
  const inCorso = useMemo(
    () =>
      badgeResults.filter(
        (b) => !b.unlocked && b.progress01 > 0 && b.def.rarity !== "legendary"
      ),
    [badgeResults]
  );

  // Segreti = tutti i leggendari (locked come mystery, unlocked normali)
  const segreti = useMemo(
    () => badgeResults.filter((b) => b.def.rarity === "legendary"),
    [badgeResults]
  );

  // Vetrina = i 3 più rari tra gli sbloccati
  const showcase = useMemo(() => sbloccati.slice(0, 3), [sbloccati]);

  const currentTabBadges = useMemo(() => {
    if (badgeTab === "sbloccati") return sbloccati;
    if (badgeTab === "in_corso") return inCorso;
    if (badgeTab === "segreti") return segreti;
    return badgeResults;
  }, [badgeTab, sbloccati, inCorso, segreti, badgeResults]);

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "80px 14px", textAlign: "center" }}>
        <div style={{ opacity: 0.6, fontSize: 15 }}>Caricamento profilo...</div>
      </div>
    );
  }

return (
  <div
    style={{
      width: "100%",
      maxWidth: 980,
      margin: "0 auto",
      padding: "18px 14px",
      display: "grid",
      gap: 14,
      boxSizing: "border-box",
    }}
  >
      {/* Richiesta permesso notifiche */}
      <PushNotificationSetup />

      {/* ── PROFILO PUBBLICO ─────────────────────────────────────────────── */}
      <div
        style={{
          borderRadius: 18,
          border: "1px dashed rgba(0,0,0,0.12)",
          background: "rgba(255,255,255,0.6)",
          overflow: "hidden",
        }}
      >
        <button
          type="button"
          onClick={() => setProfileOpen((o) => !o)}
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 16px",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontWeight: 950,
            fontSize: 16,
            gap: 8,
          }}
        >
          <span>🌐 Profilo Pubblico</span>
          <span style={{ fontSize: 13, opacity: 0.5, fontWeight: 700 }}>
            {profileOpen ? "▲ Chiudi" : "▼ Modifica"}
          </span>
        </button>

        {profileOpen && (
          <div style={{ padding: "0 16px 18px", display: "grid", gap: 14 }}>
            {/* URL profilo */}
            {profileUsername && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "rgba(45,27,105,0.06)",
                  border: "1px solid rgba(45,27,105,0.15)",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ opacity: 0.7 }}>Il tuo profilo:</span>
                <a
                  href={`/profilo/${profileUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontWeight: 800, color: "#2D1B69" }}
                >
                  /profilo/{profileUsername}
                </a>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {/* Avatar emoji */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 800, display: "block", marginBottom: 4 }}>
                  Avatar emoji
                </label>
                <input
                  type="text"
                  value={profileAvatar}
                  onChange={(e) => setProfileAvatar(e.target.value.slice(0, 2))}
                  maxLength={2}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid rgba(0,0,0,0.14)",
                    fontSize: 22,
                    textAlign: "center",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Colore */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 800, display: "block", marginBottom: 4 }}>
                  Colore profilo
                </label>
                <input
                  type="color"
                  value={profileColor}
                  onChange={(e) => setProfileColor(e.target.value)}
                  style={{
                    width: "100%",
                    height: 42,
                    padding: 2,
                    borderRadius: 8,
                    border: "1px solid rgba(0,0,0,0.14)",
                    cursor: "pointer",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 800, display: "block", marginBottom: 4 }}>
                Username (URL profilo)
              </label>
              <input
                type="text"
                value={profileUsername}
                onChange={(e) => setProfileUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="es. marco-rossi"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(0,0,0,0.14)",
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Bio */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 800, display: "block", marginBottom: 4 }}>
                Bio <span style={{ fontWeight: 400, opacity: 0.6 }}>({profileBio.length}/100)</span>
              </label>
              <textarea
                value={profileBio}
                onChange={(e) => setProfileBio(e.target.value.slice(0, 100))}
                maxLength={100}
                placeholder="Presentati agli altri esploratori..."
                rows={2}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(0,0,0,0.14)",
                  fontSize: 14,
                  resize: "none",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Social */}
            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 800, marginBottom: 2, display: "block" }}>
                Social
              </label>
              {[
                { label: "📷 Instagram", value: profileInstagram, setter: setProfileInstagram },
                { label: "🎵 TikTok", value: profileTiktok, setter: setProfileTiktok },
                { label: "𝕏 X / Twitter", value: profileTwitterX, setter: setProfileTwitterX },
              ].map(({ label, value, setter }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, width: 100, flexShrink: 0, opacity: 0.7 }}>{label}</span>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setter(e.target.value.replace(/^@/, ""))}
                    placeholder="@username"
                    style={{
                      flex: 1,
                      padding: "7px 10px",
                      borderRadius: 8,
                      border: "1px solid rgba(0,0,0,0.14)",
                      fontSize: 13,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Visibilità */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 800 }}>Visibilità:</label>
              <select
                value={profilePublic ? "public" : "private"}
                onChange={(e) => setProfilePublic(e.target.value === "public")}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(0,0,0,0.14)",
                  fontSize: 13,
                }}
              >
                <option value="public">🌐 Pubblico</option>
                <option value="private">🔒 Privato</option>
              </select>
            </div>

            {/* Errore + Salva */}
            {profileErr && (
              <div className="notice" style={{ fontSize: 13 }}>
                {profileErr}
              </div>
            )}
            <button
              type="button"
              onClick={saveProfile}
              disabled={profileSaving}
              className="btn primary"
              style={{ alignSelf: "flex-start" }}
            >
              {profileSaving ? "Salvataggio..." : profileSaved ? "✅ Salvato!" : "Salva profilo"}
            </button>
          </div>
        )}
      </div>

      {/* ── PROFILO ──────────────────────────────────────────────────────── */}
      <Section
        title="Il mio profilo"
        subtitle="Rewards, streak, livelli e statistiche."
        right={
          <button className="btn" onClick={() => loadAll(true)} disabled={refreshing} style={{ height: 38 }}>
            {refreshing ? "Aggiorno..." : "Aggiorna"}
          </button>
        }
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ fontWeight: 950, fontSize: 16 }}>Utente</div>
            {hasNickname ? (
              <div style={{ opacity: 0.78 }}>
                <b>{nickname}</b>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ opacity: 0.6, fontSize: 13 }}>Scegli il tuo nickname — non potrai cambiarlo in seguito.</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    type="text"
                    placeholder="Il tuo nickname"
                    value={nickInput}
                    onChange={(e) => setNickInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveNickname(); }}
                    maxLength={24}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid rgba(0,0,0,0.15)",
                      fontSize: 16,
                      fontWeight: 800,
                      outline: "none",
                      background: "rgba(255,255,255,0.9)",
                      minWidth: 180,
                    }}
                  />
                  <button
                    className="btn"
                    onClick={saveNickname}
                    disabled={nickSaving || nickInput.trim().length < 2}
                    style={{ height: 36 }}
                  >
                    {nickSaving ? "Salvo..." : "Salva"}
                  </button>
                </div>
                {nickErr ? (
                  <div style={{ fontSize: 13, color: "red", opacity: 0.8 }}>{nickErr}</div>
                ) : null}
              </div>
            )}
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ opacity: 0.7, fontWeight: 900 }}>Punti</div>
            <div style={{ fontSize: 30, fontWeight: 950 }}>{formatInt(points)}</div>
          </div>
        </div>

        {err ? (
          <div className="notice" style={{ padding: 12, borderRadius: 14 }}>
            Errore: {err}
          </div>
        ) : null}
      </Section>

      {/* ── LIVELLO ──────────────────────────────────────────────────────── */}
      <Section title="Livello" subtitle="Progress e prossimo livello.">
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 950, fontSize: 16 }}>
                {levelInfo.current.emoji} {levelInfo.current.name}
              </div>
              <div style={{ opacity: 0.7, marginTop: 4 }}>{levelInfo.current.desc ?? ""}</div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ opacity: 0.7, fontWeight: 900 }}>{levelInfo.next ? "Mancano" : "Top"}</div>
              <div style={{ fontSize: 18, fontWeight: 950 }}>
                {levelInfo.next ? `${formatInt(levelInfo.toNext)} pt` : "✅"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, opacity: 0.8 }}>
            <div style={{ fontWeight: 900 }}>
              {levelInfo.next ? (
                <>
                  Prossimo: <b>{levelInfo.next.emoji} {levelInfo.next.name}</b> (da {formatInt(levelInfo.next.min)} pt)
                </>
              ) : (
                <>Livello massimo raggiunto ✅</>
              )}
            </div>
            <div style={{ fontWeight: 900, whiteSpace: "nowrap" }}>
              {levelInfo.next ? (
                <>
                  {formatInt(points - levelInfo.curMin)}/{formatInt(levelInfo.nextMin - levelInfo.curMin)}
                </>
              ) : (
                "100%"
              )}
            </div>
          </div>

          <div style={{ height: 10, borderRadius: 999, background: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
            <div
              style={{
                width: `${levelInfo.progress}%`,
                height: "100%",
                borderRadius: 999,
                background: "linear-gradient(90deg, #6b7cff, #ff4fb8)",
              }}
            />
          </div>
        </div>
      </Section>

      {/* ── BADGE ────────────────────────────────────────────────────────── */}
      <Section
        title="Badge"
        subtitle="Conquiste ed obiettivi speciali."
        right={
          <div
            style={{
              padding: "8px 10px",
              borderRadius: 999,
              border: "1px solid rgba(0,0,0,0.08)",
              background: "rgba(255,255,255,0.75)",
              fontWeight: 950,
              whiteSpace: "nowrap",
            }}
          >
            🏆 {sbloccati.length}/{BADGE_DEFS.length}
          </div>
        }
      >
        {!s ? (
          <div style={{ opacity: 0.7 }}>Caricamento badge...</div>
        ) : (
          <>
            {/* Vetrina — top 3 rari sbloccati */}
            {showcase.length > 0 && (
              <div>
                <div
                  style={{
                    fontWeight: 900,
                    fontSize: 11,
                    opacity: 0.55,
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                  }}
                >
                  🌟 Vetrina — {showcase.length === 1 ? "miglior badge" : `top ${showcase.length} badge`} sbloccati
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                  {showcase.map((b) => (
                    <ShowcaseBadge key={b.def.id} badge={b.def} unlockedAt={b.unlockedAt} />
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="tabs">
              {[
                { key: "tutti" as const, label: "📋 Tutti", count: BADGE_DEFS.length },
                { key: "sbloccati" as const, label: "✅ Sbloccati", count: sbloccati.length },
                { key: "in_corso" as const, label: "⏳ In Corso", count: inCorso.length },
                {
                  key: "segreti" as const,
                  label: "🔐 Segreti",
                  count: segreti.filter((b) => !b.unlocked).length,
                },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  className={`tab ${badgeTab === key ? "active" : ""}`}
                  onClick={() => setBadgeTab(key)}
                  type="button"
                >
                  {label} <span className="pill">{count}</span>
                </button>
              ))}
            </div>

            {/* Pulsante toggle — solo su mobile */}
            {isMobile && (
              <button
                onClick={toggleBadges}
                style={{
                  width: "100%",
                  padding: "9px 14px",
                  borderRadius: 12,
                  border: "1.5px dashed rgba(99,102,241,0.35)",
                  background: "rgba(99,102,241,0.05)",
                  color: "#4338ca",
                  fontWeight: 900,
                  fontSize: 13,
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                {badgesExpanded ? "Nascondi ▲" : "Mostra tutti i badge ▼"}
              </button>
            )}

            {/* Badge grid — sempre visibile su desktop, collassabile su mobile */}
            {(!isMobile || badgesExpanded) && (
              currentTabBadges.length === 0 ? (
                <div className="notice" style={{ fontSize: 13 }}>
                  {badgeTab === "sbloccati"
                    ? "Nessun badge sbloccato ancora. Inizia a esplorare! 🚀"
                    : badgeTab === "in_corso"
                    ? "Nessun badge in corso. Attivati! 🔥"
                    : "Nessun badge in questa categoria."}
                </div>
              ) : (
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ minWidth: 0 }}>
                  {currentTabBadges.map((b) => (
                    <BadgeCard key={b.def.id} badge={b.def} unlockedAt={b.unlockedAt} s={s} />
                  ))}
                </div>
              )
            )}
          </>
        )}
      </Section>

      {/* ── MISSIONI ─────────────────────────────────────────────────────── */}
      {(() => {
        const attive = missions.filter((m) => !m.completed_at);
        const completate = missions.filter((m) => !!m.completed_at);
        const shown = missionTab === "attive" ? attive : completate;

        return (
          <Section
            title="Missioni"
            subtitle="Obiettivi giornalieri e settimanali da completare."
            right={
              attive.length > 0 ? (
                <div style={{ padding: "4px 10px", borderRadius: 999, background: "rgba(99,102,241,0.1)", color: "#4338ca", fontWeight: 900, fontSize: 12 }}>
                  {attive.length} {attive.length === 1 ? "attiva" : "attive"}
                </div>
              ) : null
            }
          >
            <div className="tabs">
              {[
                { key: "attive" as const, label: "🎯 Attive", count: attive.length },
                { key: "completate" as const, label: "✅ Completate", count: completate.length },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  className={`tab ${missionTab === key ? "active" : ""}`}
                  onClick={() => setMissionTab(key)}
                  type="button"
                >
                  {label} <span className="pill">{count}</span>
                </button>
              ))}
            </div>

            {shown.length === 0 ? (
              <div className="notice" style={{ fontSize: 13 }}>
                {missionTab === "attive"
                  ? "Nessuna missione attiva al momento. Torna domani! 🕐"
                  : "Nessuna missione completata ancora. Inizia ad esplorare! 🚀"}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {shown.map((m) => {
                  const isCompleted = !!m.completed_at;
                  const isSurprise = m.is_surprise_hidden;
                  const typeLabel: Record<string, string> = {
                    daily: "Giornaliera",
                    weekly: "Settimanale",
                    special: "Speciale",
                  };

                  // Calcola scadenza rimanente per missioni attive
                  const expiresIn = !isCompleted ? (() => {
                    const diff = new Date(m.active_until).getTime() - Date.now();
                    if (diff <= 0) return null;
                    const h = Math.floor(diff / 3600000);
                    if (h < 24) return `${h}h rimanenti`;
                    return `${Math.floor(h / 24)}g rimanenti`;
                  })() : null;

                  // Progress bar per checkin_multiple
                  const checkinMultipleProgress = m.mission_type === "checkin_multiple" && !isCompleted
                    ? (() => {
                        const spots = Array.isArray(m.progress.spots) ? (m.progress.spots as string[]).length : 0;
                        return spots;
                      })()
                    : null;

                  return (
                    <div
                      key={m.user_mission_id}
                      style={{
                        borderRadius: 16,
                        border: isCompleted
                          ? "1.5px solid rgba(16,185,129,0.25)"
                          : isSurprise
                          ? "1.5px dashed rgba(245,158,11,0.4)"
                          : "1.5px solid rgba(99,102,241,0.2)",
                        background: isCompleted
                          ? "rgba(16,185,129,0.04)"
                          : isSurprise
                          ? "rgba(245,158,11,0.04)"
                          : "rgba(99,102,241,0.04)",
                        padding: "14px 16px",
                        display: "grid",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                            <span style={{ fontWeight: 950, fontSize: 15 }}>
                              {isSurprise ? "🎁 " : isCompleted ? "✅ " : "🎯 "}
                              {m.title}
                            </span>
                            {m.type && (
                              <span style={{
                                padding: "1px 7px",
                                borderRadius: 999,
                                fontSize: 10,
                                fontWeight: 900,
                                background: m.type === "daily"
                                  ? "rgba(59,130,246,0.1)"
                                  : m.type === "weekly"
                                  ? "rgba(124,58,237,0.1)"
                                  : "rgba(245,158,11,0.1)",
                                color: m.type === "daily" ? "#2563eb" : m.type === "weekly" ? "#7c3aed" : "#b45309",
                              }}>
                                {typeLabel[m.type] ?? m.type}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 13, opacity: 0.72, lineHeight: 1.4, fontStyle: isSurprise ? "italic" : "normal" }}>
                            {isCompleted && m.completion_message ? m.completion_message : m.description}
                          </div>
                        </div>

                        <div style={{
                          flexShrink: 0,
                          textAlign: "right",
                          padding: "6px 10px",
                          borderRadius: 12,
                          background: isCompleted ? "rgba(16,185,129,0.1)" : "rgba(99,102,241,0.08)",
                          fontWeight: 950,
                          fontSize: 14,
                          color: isCompleted ? "#059669" : "#4338ca",
                          whiteSpace: "nowrap",
                        }}>
                          +{isCompleted ? (m.points_awarded ?? m.points_reward) : m.points_reward} pt
                        </div>
                      </div>

                      {/* Barra progresso checkin_multiple */}
                      {checkinMultipleProgress !== null && (m.progress as { spots?: unknown[] }).spots !== undefined && (() => {
                        const current = checkinMultipleProgress;
                        const target = Number((m.progress as Record<string, unknown>).target_count ?? 2);
                        const pct = Math.min(100, Math.round((current / target) * 100));
                        return (
                          <div style={{ display: "grid", gap: 4 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, opacity: 0.65, fontWeight: 900 }}>
                              <span>Progressi</span>
                              <span>{current}/{target} spot</span>
                            </div>
                            <div style={{ height: 6, borderRadius: 999, background: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
                              <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #6b7cff, #a78bfa)" }} />
                            </div>
                          </div>
                        );
                      })()}

                      {/* Footer: scadenza / data completamento */}
                      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                        {isCompleted && m.completed_at ? (
                          <div style={{ fontSize: 11, opacity: 0.55, fontWeight: 700 }}>
                            Completata il {new Date(m.completed_at).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
                          </div>
                        ) : expiresIn ? (
                          <div style={{ fontSize: 11, opacity: 0.55, fontWeight: 700 }}>
                            ⏰ {expiresIn}
                          </div>
                        ) : <div />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        );
      })()}

      {/* ── STATISTICHE ──────────────────────────────────────────────────── */}
      <Section title="Statistiche" subtitle="Le tue attività in sintesi.">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <StatChip label="Presenze oggi" value={s ? s.scans_today : "—"} />
          <StatChip label="Scontrini oggi" value={s ? s.receipts_today : "—"} />
          <StatChip label="Voti oggi" value={s ? s.votes_today : "—"} />
          <StatChip label="Streak" value={s ? `${s.streak_days}g` : "—"} />
          <StatChip label="Best streak" value={s ? `${s.best_streak_days}g` : "—"} />
          <StatChip label="Scan totali" value={s ? s.scans_total : "—"} />
          <StatChip label="Spot visitati" value={s ? s.venues_visited : "—"} />
          <StatChip label="Scontrini totali" value={s ? (s.receipts_total ?? 0) : "—"} />
          <StatChip label="Voti totali" value={s ? (s.votes_total ?? 0) : "—"} />
          <StatChip label="Ultimi 7 giorni" value={s ? `${s.last7_scans} scan • ${s.last7_points} pt` : "—"} />
        </div>
      </Section>

      {/* ── PREMI VINTI ──────────────────────────────────────────────────── */}
      <Section
        title="Premi vinti"
        subtitle="I premi settimanali che hai conquistato."
        right={
          <div style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.08)", fontWeight: 900, fontSize: 13 }}>
            🏆 {prizes.length}
          </div>
        }
      >
        {prizes.length === 0 ? (
          <div style={{ opacity: 0.6, fontSize: 13 }}>
            Nessun premio ancora. Scala la classifica settimanale per vincere! 🚀
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {prizes.map((p) => {
              const expired = p.redemption_code_expires_at
                ? new Date(p.redemption_code_expires_at) < new Date()
                : false;
              const venue = p.venues as { name: string; slug: string | null } | null;
              const weekLabel = (() => {
                try {
                  const d = new Date(p.week_start + "T12:00:00");
                  const end = new Date(d.getTime() + 6 * 24 * 60 * 60 * 1000);
                  const fmt = (dt: Date) => dt.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
                  return `${fmt(d)} – ${fmt(end)}`;
                } catch { return p.week_start; }
              })();

              return (
                <div
                  key={p.id}
                  style={{
                    borderRadius: 16,
                    border: "1.5px solid rgba(245,158,11,0.25)",
                    background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
                    padding: "14px 16px",
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.5, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 }}>
                        🏆 Settimana {weekLabel}
                      </div>
                      <div style={{ fontWeight: 900, fontSize: 15 }}>{p.prize_description}</div>
                      {venue && (
                        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                          da <b>{venue.name}</b>
                        </div>
                      )}
                    </div>
                    <div>
                      {p.redeemed ? (
                        <span style={{ padding: "4px 10px", borderRadius: 999, background: "rgba(16,185,129,0.12)", color: "#059669", fontWeight: 900, fontSize: 12 }}>
                          ✅ Riscattato
                        </span>
                      ) : expired ? (
                        <span style={{ padding: "4px 10px", borderRadius: 999, background: "rgba(239,68,68,0.1)", color: "#dc2626", fontWeight: 900, fontSize: 12 }}>
                          ⏰ Scaduto
                        </span>
                      ) : (
                        <span style={{ padding: "4px 10px", borderRadius: 999, background: "rgba(245,158,11,0.15)", color: "#b45309", fontWeight: 900, fontSize: 12 }}>
                          🎁 Da riscattare
                        </span>
                      )}
                    </div>
                  </div>

                  {p.redemption_code && !p.redeemed && !expired && (
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 900, fontSize: 13 }}>Codice:</div>
                      <div
                        style={{
                          fontFamily: "monospace",
                          fontWeight: 900,
                          fontSize: 18,
                          letterSpacing: 2,
                          padding: "6px 14px",
                          borderRadius: 10,
                          background: "rgba(0,0,0,0.06)",
                          border: "1px dashed rgba(0,0,0,0.15)",
                        }}
                      >
                        {p.redemption_code}
                      </div>
                      {p.redemption_code_expires_at && (
                        <div style={{ fontSize: 11, opacity: 0.6, fontWeight: 700 }}>
                          Scade: {new Date(p.redemption_code_expires_at).toLocaleDateString("it-IT")}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* ── NOTIFICHE ─────────────────────────────────────────────────────────── */}
      <div id="notifiche" />
      <Section
        title="Notifiche"
        subtitle="Avvisi di sistema e premi."
        right={
          unreadCount > 0 ? (
            <div style={{ padding: "4px 10px", borderRadius: 999, background: "rgba(239,68,68,0.12)", color: "#dc2626", fontWeight: 900, fontSize: 12 }}>
              {unreadCount} non {unreadCount === 1 ? "letta" : "lette"}
            </div>
          ) : null
        }
      >
        {notifications.length === 0 ? (
          <div style={{ opacity: 0.6, fontSize: 13 }}>Nessuna notifica ancora.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  borderRadius: 14,
                  border: n.read ? "1px solid rgba(0,0,0,0.07)" : "1.5px solid rgba(99,102,241,0.3)",
                  background: n.read ? "rgba(255,255,255,0.5)" : "rgba(99,102,241,0.05)",
                  padding: "12px 14px",
                  display: "grid",
                  gap: 4,
                  cursor: !n.read ? "pointer" : "default",
                }}
                onClick={() => { if (!n.read) markNotifRead(n.id); }}
                role={!n.read ? "button" : undefined}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 900, fontSize: 14 }}>{n.title}</div>
                  {!n.read && (
                    <div style={{ width: 8, height: 8, borderRadius: 999, background: "#2D1B69", flexShrink: 0, marginTop: 4 }} />
                  )}
                </div>
                {n.body && (
                  <div style={{ fontSize: 13, opacity: 0.75, lineHeight: 1.4 }}>{n.body}</div>
                )}
                <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>
                  {new Date(n.created_at).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── PREFERENZE NOTIFICHE ──────────────────────────────────────────────── */}
      <Section
        title="⚙️ Preferenze notifiche"
        subtitle="Scegli quali tipi di notifica ricevere."
      >
        <div style={{ display: "grid", gap: 8 }}>
          {Object.entries(PREF_LABELS).map(([key, label]) => (
            <div
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.07)",
                background: "rgba(255,255,255,0.6)",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700 }}>{label}</div>
              <button
                onClick={() => togglePref(key)}
                aria-pressed={notifPrefs[key] ?? true}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 999,
                  background: (notifPrefs[key] ?? true)
                    ? "linear-gradient(90deg, #6366f1, #8b5cf6)"
                    : "rgba(0,0,0,0.12)",
                  border: "none",
                  cursor: "pointer",
                  position: "relative",
                  flexShrink: 0,
                  transition: "background 0.2s",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    left: (notifPrefs[key] ?? true) ? 22 : 2,
                    width: 20,
                    height: 20,
                    borderRadius: 999,
                    background: "#fff",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                    transition: "left 0.18s",
                    display: "block",
                  }}
                />
              </button>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getExplorerLevel } from "@/lib/levels";
import { BADGE_DEFS, type BadgeDef } from "@/lib/badges-config";
import ShareProfileButton from "@/components/ShareProfileButton";
import SocialLinks from "@/components/SocialLinks";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

function parseDay(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

function daysDiff(a: string, b: string) {
  return Math.round((parseDay(a).getTime() - parseDay(b).getTime()) / 86400000);
}

function computeStreak(scanDays: string[]) {
  if (!scanDays.length) return 0;
  const sorted = [...scanDays].sort();
  const lastDay = sorted[sorted.length - 1];
  const today = isoDay(new Date());
  const diffToToday = daysDiff(today, lastDay);
  if (diffToToday > 1) return 1;
  let streak = 1;
  for (let i = sorted.length - 2; i >= 0; i--) {
    if (daysDiff(sorted[i + 1]!, sorted[i]!) === 1) streak++;
    else break;
  }
  return streak;
}

const RARITY_ORDER: Record<string, number> = { legendary: 4, epic: 3, rare: 2, common: 1 };

const RARITY_CFG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  common:    { label: "Comune",    bg: "rgba(59,130,246,0.10)",  color: "#1d4ed8", border: "rgba(59,130,246,0.25)"  },
  rare:      { label: "Raro",      bg: "rgba(139,92,246,0.10)", color: "#6d28d9", border: "rgba(139,92,246,0.25)" },
  epic:      { label: "Epico",     bg: "rgba(251,146,60,0.10)", color: "#c2410c", border: "rgba(251,146,60,0.25)" },
  legendary: { label: "Leggendario", bg: "rgba(239,68,68,0.10)",color: "#b91c1c", border: "rgba(239,68,68,0.25)"  },
};

function badgeById(id: string): BadgeDef | undefined {
  return BADGE_DEFS.find((b) => b.id === id);
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function ProfiloPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = createSupabaseAdminClient();

  // 1. Trova utente per username
  const { data: user } = await supabase
    .from("sc_users")
    .select(
      "id,name,points,username,bio,instagram,tiktok,twitter_x,avatar_emoji,profile_color,showcase_badges,is_public,created_at"
    )
    .eq("username", username)
    .maybeSingle();

  if (!user) notFound();

  const uid = user.id;

  // 2. Utente corrente (cookie)
  const cookieStore = await cookies();
  const scUid = cookieStore.get("sc_uid")?.value?.trim() ?? null;
  const isOwnProfile = scUid === uid;

  // 3. Profilo privato
  if (!user.is_public && !isOwnProfile) {
    return (
      <div className="page" style={{ textAlign: "center", paddingTop: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>
          @{user.username}
        </h1>
        <p className="muted">Questo profilo è privato.</p>
        <Link className="btn" href="/" style={{ marginTop: 20, display: "inline-block" }}>
          Torna alla home
        </Link>
      </div>
    );
  }

  // 4. Fetch parallelo
  const [scansResult, badgesResult, prizesResult, weeklyResult, rankResult] = await Promise.all([
    supabase
      .from("user_events")
      .select("venue_id,created_at")
      .eq("user_id", uid)
      .eq("event_type", "scan"),

    supabase
      .from("user_badge_unlocks")
      .select("badge_id,unlocked_at")
      .eq("user_id", uid),

    supabase
      .from("weekly_prizes")
      .select("id,week_start,prize_description,prize_image,spot_id,venues(name,slug)")
      .eq("winner_user_id", uid)
      .order("week_start", { ascending: false }),

    supabase
      .from("v_weekly_leaderboard")
      .select("rank,points_week")
      .eq("user_id", uid)
      .maybeSingle(),

    supabase
      .from("sc_users")
      .select("id", { count: "exact", head: true })
      .gt("points", user.points ?? 0),
  ]);

  const scanRows = scansResult.data ?? [];
  const unlocks = badgesResult.data ?? [];
  const prizes = (prizesResult.data ?? []) as unknown as Array<{
    id: string;
    week_start: string;
    prize_description: string;
    prize_image: string | null;
    spot_id: string | null;
    venues: { name: string; slug: string | null } | null;
  }>;
  const weeklyData = weeklyResult.data;
  const allTimeRank = (rankResult.count ?? 0) + 1;

  // 5. Calcola stats
  const venueSet = new Set<string>();
  const daySet = new Set<string>();
  for (const r of scanRows) {
    if (r.venue_id) venueSet.add(r.venue_id);
    if (r.created_at) daySet.add(isoDay(new Date(r.created_at)));
  }
  const scansTotal = scanRows.length;
  const venuesVisited = venueSet.size;
  const streak = computeStreak([...daySet].sort());

  // 6. Badge in vetrina
  const showcaseIds: string[] = Array.isArray(user.showcase_badges) ? user.showcase_badges : [];
  const unlockedIds = new Set(unlocks.map((u) => u.badge_id));

  let showcaseBadges: BadgeDef[];
  if (showcaseIds.length > 0) {
    showcaseBadges = showcaseIds
      .map((id) => badgeById(id))
      .filter((b): b is BadgeDef => !!b && unlockedIds.has(b.id))
      .slice(0, 3);
  } else {
    showcaseBadges = unlocks
      .slice()
      .sort((a, b) => {
        const ba = badgeById(a.badge_id);
        const bb = badgeById(b.badge_id);
        return (RARITY_ORDER[bb?.rarity ?? "common"] ?? 1) - (RARITY_ORDER[ba?.rarity ?? "common"] ?? 1);
      })
      .slice(0, 3)
      .map((u) => badgeById(u.badge_id))
      .filter((b): b is BadgeDef => !!b);
  }

  // 7. Livello esploratore
  const lvlInfo = getExplorerLevel(user.points ?? 0);
  const avatarEmoji = user.avatar_emoji ?? "🧭";
  const profileColor = user.profile_color ?? "#2D1B69";

  return (
    <div className="page">
      {/* ── HEADER ── */}
      <div className="card" style={{ textAlign: "center", paddingTop: 32, paddingBottom: 28 }}>
        {/* Avatar */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: profileColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 38,
            margin: "0 auto 14px",
            boxShadow: `0 4px 20px ${profileColor}44`,
          }}
        >
          {avatarEmoji}
        </div>

        {/* Username + nome */}
        <div style={{ fontWeight: 900, fontSize: 22, color: "#0f172a", marginBottom: 2 }}>
          @{user.username}
        </div>
        {user.name && user.name !== user.username && (
          <div className="muted" style={{ fontSize: 14, marginBottom: 6 }}>
            {user.name}
          </div>
        )}

        {/* Badge livello */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              padding: "3px 10px",
              borderRadius: 999,
              background: `${profileColor}18`,
              color: profileColor,
              border: `1px solid ${profileColor}33`,
            }}
          >
            {lvlInfo.current.emoji} {lvlInfo.current.name}
          </span>
        </div>

        {/* Bio */}
        {user.bio && (
          <p style={{ fontSize: 14, color: "#374151", maxWidth: 360, margin: "0 auto 12px" }}>
            {user.bio}
          </p>
        )}

        {/* Social links */}
        {(user.instagram || user.tiktok || user.twitter_x) && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
            <SocialLinks
              instagram={user.instagram ?? null}
              tiktok={user.tiktok ?? null}
              twitter_x={user.twitter_x ?? null}
            />
          </div>
        )}

        {/* Own profile banner */}
        {isOwnProfile && (
          <div
            style={{
              marginTop: 14,
              padding: "10px 16px",
              borderRadius: 10,
              background: "rgba(45,27,105,0.06)",
              border: "1px solid rgba(45,27,105,0.15)",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 13, color: "#4b5563" }}>
              Stai visualizzando il tuo profilo pubblico
            </span>
            <Link className="btn" href="/me" style={{ fontSize: 13 }}>
              ✏️ Modifica
            </Link>
            <ShareProfileButton username={user.username!} />
          </div>
        )}
      </div>

      {/* ── STATS GRID ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}
      >
        {[
          { label: "Punti totali", value: (user.points ?? 0).toLocaleString("it"), icon: "⭐" },
          { label: "Check-in totali", value: scansTotal, icon: "📍" },
          { label: "Badge sbloccati", value: unlocks.length, icon: "🏅" },
          { label: "Streak attuale", value: `${streak} gg`, icon: "🔥" },
        ].map((s) => (
          <div
            key={s.label}
            className="card"
            style={{ textAlign: "center", padding: "18px 12px" }}
          >
            <div style={{ fontSize: 28, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>{s.value}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── POSIZIONE ── */}
      <div className="card">
        <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 12 }}>📊 Posizione classifica</h2>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div
            style={{
              flex: 1,
              minWidth: 120,
              padding: "14px 16px",
              borderRadius: 10,
              background: "rgba(45,27,105,0.06)",
              border: "1px solid rgba(45,27,105,0.12)",
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 900, color: "#2D1B69" }}>
              #{allTimeRank}
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
              classifica generale
            </div>
          </div>

          {weeklyData && (
            <div
              style={{
                flex: 1,
                minWidth: 120,
                padding: "14px 16px",
                borderRadius: 10,
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.2)",
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 900, color: "#b45309" }}>
                #{weeklyData.rank}
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                questa settimana · {weeklyData.points_week} pt
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── BADGE IN VETRINA ── */}
      {showcaseBadges.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 14 }}>
            🏆 Badge in vetrina
          </h2>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {showcaseBadges.map((badge) => {
              const cfg = RARITY_CFG[badge.rarity] ?? RARITY_CFG.common!;
              return (
                <div
                  key={badge.id}
                  style={{
                    flex: "1 1 120px",
                    padding: "14px 12px",
                    borderRadius: 12,
                    background: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 30, marginBottom: 6 }}>{badge.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: cfg.color }}>
                    {badge.name}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      marginTop: 3,
                      padding: "1px 7px",
                      borderRadius: 999,
                      display: "inline-block",
                      background: cfg.border,
                      color: cfg.color,
                      fontWeight: 700,
                    }}
                  >
                    {cfg.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── HALL OF FAME ── */}
      {prizes.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 14 }}>
            🥇 Premi vinti
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {prizes.map((p) => {
              const venueData = p.venues as { name: string; slug: string | null } | null;
              const weekLabel = new Date(p.week_start).toLocaleDateString("it-IT", {
                day: "numeric",
                month: "long",
                year: "numeric",
              });
              return (
                <div
                  key={p.id}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "rgba(250,204,21,0.08)",
                    border: "1px solid rgba(250,204,21,0.25)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <div style={{ fontSize: 24, flexShrink: 0 }}>🏅</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>
                      {p.prize_description}
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                      Settimana del {weekLabel}
                      {venueData && <> · {venueData.name}</>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── LINK HOME ── */}
      <div style={{ textAlign: "center", paddingBottom: 8 }}>
        <Link className="btn" href="/">
          ← Classifica
        </Link>
      </div>
    </div>
  );
}

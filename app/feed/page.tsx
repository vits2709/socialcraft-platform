import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type FeedRow = {
  id: string;
  user_id: string;
  event_type: string;
  venue_id: string | null;
  venue_name: string | null;
  user_name: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
  venue_slug: string | null;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "adesso";
  if (mins < 60) return `${mins}m fa`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h fa`;
  const days = Math.floor(hours / 24);
  return `${days}g fa`;
}

function FeedItem({ item }: { item: FeedRow }) {
  const pts = Number(item.meta?.points ?? 0);
  const name = item.user_name ?? "Esploratore";
  const spot = item.venue_name ?? "uno spot";

  let icon = "📍";
  let text: React.ReactNode = null;
  let color = "rgba(99,102,241,0.08)";
  let borderColor = "rgba(99,102,241,0.18)";

  switch (item.event_type) {
    case "checkin":
      icon = "📍";
      text = (
        <>
          <b>{name}</b> ha fatto check-in{" "}
          {item.venue_slug ? (
            <Link href={`/v/${item.venue_slug}`} style={{ color: "#6366f1", fontWeight: 700 }}>
              da {spot}
            </Link>
          ) : (
            <>da <b>{spot}</b></>
          )}
          {pts > 0 && <span style={{ color: "#059669", fontWeight: 700 }}> +{pts} pt</span>}
        </>
      );
      break;

    case "receipt_approved":
      icon = "🧾";
      color = "rgba(16,185,129,0.07)";
      borderColor = "rgba(16,185,129,0.2)";
      const importo = item.meta?.importo as number | null | undefined;
      text = (
        <>
          <b>{name}</b> ha fatto una consumazione{" "}
          {item.venue_slug ? (
            <Link href={`/v/${item.venue_slug}`} style={{ color: "#6366f1", fontWeight: 700 }}>
              da {spot}
            </Link>
          ) : (
            <>da <b>{spot}</b></>
          )}
          {importo != null && <> (€{Number(importo).toFixed(2)})</>}
          <span style={{ color: "#059669", fontWeight: 700 }}> +8 pt</span>
        </>
      );
      break;

    case "badge_unlocked":
      icon = "🏅";
      color = "rgba(245,158,11,0.08)";
      borderColor = "rgba(245,158,11,0.25)";
      const badge = (item.meta?.badge_name as string) ?? "un badge";
      text = (
        <>
          <b>{name}</b> ha sbloccato il badge <b>{badge}</b>!
        </>
      );
      break;

    case "rank_up":
      icon = "🚀";
      color = "rgba(236,72,153,0.07)";
      borderColor = "rgba(236,72,153,0.2)";
      const newRank = item.meta?.new_rank as number | undefined;
      text = (
        <>
          <b>{name}</b> è salito in classifica{newRank != null ? <> → #{newRank}</> : ""}!
        </>
      );
      break;

    default:
      text = <><b>{name}</b> ha fatto qualcosa di epico.</>;
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: "12px 16px",
        borderRadius: 14,
        border: `1px solid ${borderColor}`,
        background: color,
      }}
    >
      <div style={{ fontSize: 22, flexShrink: 0, lineHeight: 1, marginTop: 2 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, lineHeight: 1.45 }}>{text}</div>
        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          {timeAgo(item.created_at)}
        </div>
      </div>
    </div>
  );
}

export default async function FeedPage() {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("v_activity_feed")
    .select("*")
    .limit(60);

  const items = (data ?? []) as FeedRow[];

  return (
    <div className="card">
      <div className="cardHead" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="h1" style={{ marginBottom: 4 }}>Feed attività</h1>
          <p className="muted" style={{ margin: 0 }}>
            Cosa stanno facendo gli esploratori in città
          </p>
        </div>
        <Link className="btn" href="/">← Home</Link>
      </div>

      {error && (
        <div className="notice" style={{ marginBottom: 12, color: "#dc2626" }}>
          Errore: {error.message}
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Assicurati di aver eseguito la migration 003_activity_feed.sql
          </div>
        </div>
      )}

      {items.length === 0 && !error ? (
        <div className="notice" style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌍</div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Nessuna attività ancora</div>
          <p className="muted" style={{ margin: 0 }}>
            Il feed si popolerà non appena gli esploratori faranno check-in e caricheranno scontrini.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {items.map((item) => (
            <FeedItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

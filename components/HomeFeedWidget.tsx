"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

type FeedItem = {
  id: string;
  event_type: string;
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
  return `${Math.floor(hours / 24)}g fa`;
}

function FeedRow({ item, isNew }: { item: FeedItem; isNew: boolean }) {
  const pts = Number(item.meta?.points ?? 0);
  const name = item.user_name ?? "Esploratore";
  const spot = item.venue_name ?? "uno spot";

  let icon = "📍";
  let text: React.ReactNode;
  let bg = "rgba(99,102,241,0.07)";
  let border = "rgba(99,102,241,0.15)";

  switch (item.event_type) {
    case "checkin":
      icon = "📍";
      text = (
        <>
          <b>{name}</b> check-in{" "}
          {item.venue_slug
            ? <Link href={`/v/${item.venue_slug}`} style={{ color: "#2D1B69", fontWeight: 700 }}>da {spot}</Link>
            : <><b>da {spot}</b></>}
          {pts > 0 && <span style={{ color: "#059669", fontWeight: 700 }}> +{pts} pt</span>}
        </>
      );
      break;

    case "receipt_approved": {
      icon = "🧾";
      bg = "rgba(16,185,129,0.07)";
      border = "rgba(16,185,129,0.18)";
      const importo = item.meta?.importo as number | null | undefined;
      text = (
        <>
          <b>{name}</b> consumazione{" "}
          {item.venue_slug
            ? <Link href={`/v/${item.venue_slug}`} style={{ color: "#2D1B69", fontWeight: 700 }}>da {spot}</Link>
            : <><b>da {spot}</b></>}
          {importo != null && <> (€{Number(importo).toFixed(2)})</>}
          <span style={{ color: "#059669", fontWeight: 700 }}> +8 pt</span>
        </>
      );
      break;
    }

    case "badge_unlocked": {
      icon = "🏅";
      bg = "rgba(245,158,11,0.08)";
      border = "rgba(245,158,11,0.22)";
      const badge = (item.meta?.badge_name as string) ?? "un badge";
      text = <><b>{name}</b> ha sbloccato <b>{badge}</b>!</>;
      break;
    }

    case "rank_up": {
      icon = "🚀";
      bg = "rgba(236,72,153,0.07)";
      border = "rgba(236,72,153,0.18)";
      const newRank = item.meta?.new_rank as number | undefined;
      text = <><b>{name}</b> in classifica{newRank != null ? <> → #{newRank}</> : ""}!</>;
      break;
    }

    default:
      text = <><b>{name}</b> ha fatto qualcosa di epico.</>;
  }

  return (
    <div style={{
      display: "flex",
      gap: 9,
      alignItems: "flex-start",
      padding: "8px 10px",
      borderRadius: 11,
      border: `1px solid ${border}`,
      background: bg,
      animation: isNew ? "feedFadeIn 0.4s ease" : undefined,
      transition: "background 0.3s",
    }}>
      <div style={{ fontSize: 17, flexShrink: 0, lineHeight: 1, marginTop: 2 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, lineHeight: 1.4 }}>{text}</div>
        <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>{timeAgo(item.created_at)}</div>
      </div>
    </div>
  );
}

export default function HomeFeedWidget() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const knownIdsRef = useRef<Set<string>>(new Set());

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch("/api/feed", { cache: "no-store" });
      const json = await res.json();
      if (!json.ok) return;

      const fetched: FeedItem[] = json.items ?? [];
      const freshIds = new Set<string>();
      fetched.forEach((item) => {
        if (!knownIdsRef.current.has(item.id)) freshIds.add(item.id);
      });

      knownIdsRef.current = new Set(fetched.map((i) => i.id));
      setItems(fetched);

      if (freshIds.size > 0) {
        setNewIds(freshIds);
        setTimeout(() => setNewIds(new Set()), 2000);
      }
    } catch {
      // ignora errori di rete
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
    const id = setInterval(fetchFeed, 30_000);
    return () => clearInterval(id);
  }, [fetchFeed]);

  return (
    <div style={{
      borderRadius: 18,
      background: "white",
      boxShadow: "0 2px 14px rgba(0,0,0,0.06)",
      border: "1px solid rgba(0,0,0,0.07)",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{
        padding: "12px 14px 10px",
        borderBottom: "1px solid rgba(0,0,0,0.07)",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <div style={{ fontWeight: 900, fontSize: 14 }}>⚡ Live</div>
        <div style={{ flex: 1 }} />
        <div className="muted" style={{ fontSize: 11 }}>aggiorna ogni 30s</div>
      </div>

      <div style={{
        overflowY: "auto",
        padding: "10px 10px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        maxHeight: 400,
        minHeight: 100,
        scrollbarWidth: "thin",
      }}>
        {loading ? (
          <div className="muted" style={{ fontSize: 13, padding: "24px 0", textAlign: "center" }}>
            Caricamento...
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🌍</div>
            <div className="muted" style={{ fontSize: 13 }}>Nessuna attività recente</div>
          </div>
        ) : (
          items.map((item) => (
            <FeedRow key={item.id} item={item} isNew={newIds.has(item.id)} />
          ))
        )}
      </div>
    </div>
  );
}

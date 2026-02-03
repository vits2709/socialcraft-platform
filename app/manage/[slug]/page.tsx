"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

function safeSlug(raw: string) {
  return (raw || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function prettify(slug: string) {
  const s = slug.replace(/-/g, " ").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "Venue";
}

function dayKey(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function readDailyCount(slug: string, d: Date) {
  const k = `dailyCount:${slug}:${dayKey(d)}`;
  return Number(localStorage.getItem(k) || "0");
}

export default function ManageVenuePage({ params }: { params: { slug: string } }) {
  const slug = useMemo(() => safeSlug(params.slug), [params.slug]);
  const venueName = useMemo(() => prettify(slug), [slug]);

  const [ready, setReady] = useState(false);
  const [today, setToday] = useState(0);
  const [last7, setLast7] = useState(0);
  const [last30, setLast30] = useState(0);
  const [series7, setSeries7] = useState<{ day: string; count: number }[]>([]);

  useEffect(() => {
    const now = new Date();

    const t = readDailyCount(slug, now);
    let s7 = 0;
    let s30 = 0;

    const arr7: { day: string; count: number }[] = [];

    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const c = readDailyCount(slug, d);

      s30 += c;
      if (i < 7) {
        s7 += c;
        arr7.push({ day: dayKey(d).slice(5), count: c }); // MM-DD
      }
    }

    arr7.reverse();

    setToday(t);
    setLast7(s7);
    setLast30(s30);
    setSeries7(arr7);
    setReady(true);
  }, [slug]);

  if (!ready) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="rounded-2xl bg-white p-6 shadow w-full max-w-3xl">
          <div className="text-sm font-bold">Caricamento dashboard…</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-orange-600">SOCIALCRAFT • MANAGE</div>
            <h1 className="text-3xl font-extrabold mt-1">{venueName}</h1>
            <div className="text-sm text-slate-600 mt-1">
              Analytics (locale demo) • slug: <span className="font-mono">{slug}</span>
            </div>
          </div>

          <Link
            href={`/v/${encodeURIComponent(slug)}`}
            className="rounded-xl bg-orange-600 text-white font-bold px-4 py-3 hover:opacity-90"
          >
            Apri pagina scan
          </Link>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="text-xs text-slate-500">Oggi</div>
            <div className="text-3xl font-extrabold mt-1">{today}</div>
            <div className="text-xs text-slate-500 mt-2">visite/scans</div>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="text-xs text-slate-500">Ultimi 7 giorni</div>
            <div className="text-3xl font-extrabold mt-1">{last7}</div>
            <div className="text-xs text-slate-500 mt-2">visite/scans</div>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="text-xs text-slate-500">Ultimi 30 giorni</div>
            <div className="text-3xl font-extrabold mt-1">{last30}</div>
            <div className="text-xs text-slate-500 mt-2">visite/scans</div>
          </div>
        </div>

        {/* Trend 7 giorni (semplice e leggibile) */}
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="text-sm font-bold text-slate-900">Trend ultimi 7 giorni</div>
          <div className="mt-4 grid grid-cols-7 gap-2">
            {series7.map((x) => (
              <div key={x.day} className="rounded-xl border border-slate-200 p-3 text-center">
                <div className="text-[11px] text-slate-500">{x.day}</div>
                <div className="text-lg font-extrabold mt-1">{x.count}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs text-slate-500">
            (Demo locale) Domani lo rendiamo reale con DB e grafico vero.
          </div>
        </div>

        {/* Mission & Promo (placeholder) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white p-6 shadow">
            <div className="text-sm font-bold text-slate-900">Missione settimanale</div>
            <div className="text-sm text-slate-600 mt-2">
              Placeholder: “3 visite per ottenere 1 chance premio”.
            </div>
            <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700">
              Stato: attiva ✅ (domani renderemo tutto configurabile)
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow">
            <div className="text-sm font-bold text-slate-900">Promo attiva</div>
            <div className="text-sm text-slate-600 mt-2">
              Placeholder: “10% su cocktail dalle 18 alle 20”.
            </div>
            <div className="mt-4 rounded-xl bg-slate-900 text-white p-4 text-sm">
              Suggerimento: la promo deve spingere lo scan (“Scansiona e mostra in cassa”).
            </div>
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-400">
          build: MANAGE-LOCAL-2026-02-03
        </div>
      </div>
    </main>
  );
}


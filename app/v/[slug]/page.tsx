"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

function formatDayKey(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

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

function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(arr: T[], n: number) {
  return arr[n % arr.length];
}

function guestProfileFromId(id: string) {
  const animals = ["Lupo", "Gatto", "Falco", "Tigre", "Orso", "Volpe", "Leone", "Corvo"];
  const colors = ["Arancione", "Blu", "Verde", "Oro", "Nero", "Rosa", "Viola", "Argento"];
  const avatars = ["🦊", "🐺", "🐯", "🦁", "🦅", "🐻", "🐱", "🐦"];

  const h = hashStr(id);
  const nickname = `${pick(animals, h)} ${pick(colors, h >>> 8)}`;
  const avatar = pick(avatars, h >>> 16);

  return { nickname, avatar };
}

type ScanStatus = "loading" | "counted" | "already";

export default function VenueScanPage({ params }: { params: { slug: string } }) {
  const searchParams = useSearchParams();
  const t = (searchParams.get("t") || "public").toLowerCase();
  const mode: "public" | "cashier" = t === "cashier" ? "cashier" : "public";

  const slug = useMemo(() => safeSlug(params.slug), [params.slug]);
  const venueName = useMemo(() => prettify(slug), [slug]);

  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<ScanStatus>("loading");
  const [guestId, setGuestId] = useState("");
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState("");
  const [todayCount, setTodayCount] = useState(0);

  useEffect(() => {
    setReady(false);
    setStatus("loading");

    const dayKey = formatDayKey();

    // guest id stabile
    const guestKey = "sc_guest_id";
    let g = localStorage.getItem(guestKey);
    if (!g) {
      g = crypto.randomUUID();
      localStorage.setItem(guestKey, g);
    }

    const profile = guestProfileFromId(g);
    setGuestId(g);
    setNickname(profile.nickname);
    setAvatar(profile.avatar);

    // ✅ chiavi diverse per pubblico/cassa
    const visitKey =
      mode === "cashier" ? `cashier:${slug}:${dayKey}` : `visit:${slug}:${dayKey}`;

    const dailyCounterKey =
      mode === "cashier"
        ? `cashierDaily:${slug}:${dayKey}`
        : `dailyCount:${slug}:${dayKey}`;

    const currentDaily = Number(localStorage.getItem(dailyCounterKey) || "0");

    if (localStorage.getItem(visitKey)) {
      setStatus("already");
      setTodayCount(currentDaily);
    } else {
      localStorage.setItem(visitKey, "1");
      const newDaily = currentDaily + 1;
      localStorage.setItem(dailyCounterKey, String(newDaily));
      setStatus("counted");
      setTodayCount(newDaily);
    }

    setReady(true);
  }, [slug, mode]);

  const badge =
    status === "counted"
      ? { text: "VISITA REGISTRATA ✅", cls: "bg-green-100 text-green-700" }
      : { text: "GIÀ REGISTRATA OGGI ✅", cls: "bg-slate-100 text-slate-700" };

  if (!ready) {
    return (
      <main className="min-h-screen bg-orange-50 flex items-center justify-center p-6">
        <div className="rounded-2xl bg-white p-6 shadow w-full max-w-md">
          <div className="text-xs font-semibold text-orange-600">SOCIALCRAFT</div>
          <div className="mt-2 text-lg font-extrabold">Caricamento…</div>
          <div className="mt-2 text-sm text-slate-600">Sto registrando la visita.</div>
          <div className="mt-4 text-xs font-mono text-slate-400">
            build: SCAN-A-2026-02-03
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-orange-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="text-xs font-semibold text-orange-600">SOCIALCRAFT</div>
          <h1 className="text-2xl font-extrabold mt-2">{venueName}</h1>

          <div className="mt-2 text-xs font-semibold text-slate-500">
            Modalità:{" "}
            <span className="font-bold">
              {mode === "cashier" ? "CASSA" : "PUBBLICO"}
            </span>
          </div>

          <div
            className={`mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold ${badge.cls}`}
          >
            {badge.text}
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Il tuo profilo</div>
            <div className="mt-1 flex items-center gap-3">
              <div className="text-2xl">{avatar}</div>
              <div>
                <div className="font-bold text-slate-900">{nickname}</div>
                <div className="text-xs text-slate-500">Oggi sei dentro ✨</div>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 break-all">guest: {guestId}</div>
          </div>

          {/* Mission placeholder */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900">Missione settimanale</div>
                <div className="text-xs text-slate-500">
                  Placeholder (domani la colleghiamo al DB)
                </div>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-orange-100 text-orange-700">
                LIVE
              </span>
            </div>

            <div className="mt-3">
              <div className="text-xs text-slate-600">Progresso</div>
              <div className="mt-2 h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-3 rounded-full bg-orange-500" style={{ width: "33%" }} />
              </div>
              <div className="mt-2 text-xs text-slate-500">1 / 3 visite</div>
            </div>
          </div>

          {/* Promo placeholder */}
          <div className="mt-4 rounded-xl bg-slate-900 text-white p-4">
            <div className="text-xs opacity-80">Promo in venue</div>
            <div className="mt-1 font-bold">Mostra questo screen in cassa</div>
            <div className="mt-2 text-sm opacity-90">
              (Placeholder) Qui comparirà una promo reale con regole.
            </div>
          </div>

          <div className="mt-4 text-xs text-slate-500">
            Oggi (locale): scans {mode === "cashier" ? "cassa" : "pubblico"} su questa
            venue: <b>{todayCount}</b>
          </div>

          <div className="mt-4 text-[11px] font-mono text-slate-400">
            build: SCAN-A-2026-02-03
          </div>
        </div>
      </div>
    </main>
  );
}

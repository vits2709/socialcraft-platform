"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

function prettify(slug: string) {
  const s = slug.replace(/-/g, " ").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "Venue";
}

function formatDayKey(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// QR via servizio pubblico (perfetto per demo). Se vuoi 100% local, poi lo facciamo con una lib.
function qrUrl(data: string, size = 240) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    data
  )}`;
}

export default function Home() {
  const [slug, setSlug] = useState("bar-roma-vasto");

  // ✅ evita hydration mismatch: origin è vuoto su server + primo render client
  const [origin, setOrigin] = useState<string>("");
  const [toolMsg, setToolMsg] = useState<string>("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const publicUrl = useMemo(() => `/v/${encodeURIComponent(slug)}?t=public`, [slug]);
  const cashierUrl = useMemo(() => `/v/${encodeURIComponent(slug)}?t=cashier`, [slug]);

  const absolutePublic = useMemo(
    () => (origin ? `${origin}${publicUrl}` : publicUrl),
    [origin, publicUrl]
  );

  const absoluteCashier = useMemo(
    () => (origin ? `${origin}${cashierUrl}` : cashierUrl),
    [origin, cashierUrl]
  );

  const venueName = prettify(slug);

  // --- DEV TOOLS (reset local demo) ---
  const today = useMemo(() => formatDayKey(), []);
  const keys = useMemo(() => {
    // PUBBLICO
    const publicVisitKey = `visit:${slug}:${today}`;
    const publicDailyCountKey = `dailyCount:${slug}:${today}`;

    // CASSA (ora ufficiali, perché /v/[slug] le usa davvero)
    const cashierVisitKey = `cashier:${slug}:${today}`;
    const cashierDailyKey = `cashierDaily:${slug}:${today}`;

    return {
      publicVisitKey,
      publicDailyCountKey,
      cashierVisitKey,
      cashierDailyKey,
      guestKey: "sc_guest_id",
    };
  }, [slug, today]);

  const toast = (msg: string) => {
    setToolMsg(msg);
    window.clearTimeout((window as any).__sc_toast);
    (window as any).__sc_toast = window.setTimeout(() => setToolMsg(""), 2200);
  };

  const resetPublicToday = () => {
    localStorage.removeItem(keys.publicVisitKey);
    localStorage.removeItem(keys.publicDailyCountKey);
    toast(`Reset OK (PUBBLICO) • ${slug} • ${today}`);
  };

  const resetCashierToday = () => {
    localStorage.removeItem(keys.cashierVisitKey);
    localStorage.removeItem(keys.cashierDailyKey);
    toast(`Reset OK (CASSA) • ${slug} • ${today}`);
  };

  const resetGuest = () => {
    localStorage.removeItem(keys.guestKey);
    toast("Reset OK (guest) — verrà rigenerato al prossimo scan");
  };

  const copyKeys = async () => {
    const txt =
      `PUBBLICO:\n- ${keys.publicVisitKey}\n- ${keys.publicDailyCountKey}\n\n` +
      `CASSA:\n- ${keys.cashierVisitKey}\n- ${keys.cashierDailyKey}\n\n` +
      `GUEST:\n- ${keys.guestKey}\n`;
    await navigator.clipboard.writeText(txt);
    toast("Chiavi copiate ✅");
  };

  return (
    <main className="min-h-screen bg-orange-50 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl space-y-4">
        {/* HERO */}
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-orange-600">SOCIALCRAFT</div>
              <h1 className="text-3xl font-extrabold mt-2">Play • Demo QR doppio</h1>
              <p className="text-slate-600 mt-2">
                Un locale ha <b>due QR</b>: uno per il pubblico (presenza/gioco) e uno
                alla cassa (validazione punti). Questa pagina genera i QR e ti permette
                di simulare il flusso in 30 secondi.
              </p>
            </div>

            {/* ✅ TOOLBOX TEST */}
            <div className="shrink-0 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-bold text-slate-700">Tools (test)</div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  onClick={() => location.reload()}
                  className="rounded-xl bg-blue-600 text-white text-xs font-bold px-3 py-2 hover:bg-blue-700"
                  title="Ricarica la pagina"
                >
                  🔄 Refresh UI
                </button>

                <button
                  onClick={resetGuest}
                  className="rounded-xl bg-slate-900 text-white text-xs font-bold px-3 py-2 hover:opacity-90"
                  title="Reset profilo guest"
                >
                  🗑️ Reset guest
                </button>

                <button
                  onClick={resetPublicToday}
                  className="rounded-xl bg-orange-600 text-white text-xs font-bold px-3 py-2 hover:bg-orange-700"
                  title="Cancella visita + counter di oggi (PUBBLICO)"
                >
                  🧨 Reset oggi (P)
                </button>

                <button
                  onClick={resetCashierToday}
                  className="rounded-xl bg-zinc-800 text-white text-xs font-bold px-3 py-2 hover:bg-zinc-900"
                  title="Cancella visita + counter di oggi (CASSA)"
                >
                  🧨 Reset oggi (C)
                </button>

                <button
                  onClick={copyKeys}
                  className="col-span-2 rounded-xl border border-slate-200 bg-white text-xs font-bold px-3 py-2 hover:bg-slate-100"
                  title="Copia le chiavi localStorage usate nel test"
                >
                  📋 Copia chiavi
                </button>
              </div>

              {toolMsg ? (
                <div className="mt-2 text-[11px] text-slate-600">{toolMsg}</div>
              ) : (
                <div className="mt-2 text-[11px] text-slate-500">
                  Oggi: <b>{today}</b>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">
                Venue slug (es. bar-roma-vasto)
              </label>
              <input
                value={slug}
                onChange={(e) =>
                  setSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/\s+/g, "-")
                      .replace(/[^a-z0-9-]/g, "")
                  )
                }
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-orange-200"
                placeholder="bar-roma-vasto"
              />
              <div className="text-xs text-slate-500 mt-2">
                Nome venue: <b>{venueName}</b>
              </div>
            </div>

            <div className="md:col-span-1">
              <Link
                href={publicUrl}
                className="block text-center rounded-xl bg-orange-600 text-white font-bold py-3 hover:opacity-90"
              >
                Prova come Pubblico
              </Link>
              <Link
                href={cashierUrl}
                className="block text-center rounded-xl bg-slate-900 text-white font-bold py-3 mt-2 hover:opacity-90"
              >
                Prova come Cassa
              </Link>
            </div>
          </div>
        </div>

        {/* QR GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* PUBLIC QR */}
          <div className="rounded-2xl bg-white p-6 shadow">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-slate-900">QR Pubblico</div>
                <div className="text-xs text-slate-500">
                  Registra presenza / gioco (non valida premi)
                </div>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-orange-100 text-orange-700">
                PUBBLICO
              </span>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <img
                src={qrUrl(absolutePublic, 260)}
                alt="QR Pubblico"
                className="rounded-xl border border-slate-200"
                width={260}
                height={260}
              />
              <div className="flex-1 space-y-2">
                <div className="text-xs font-semibold text-slate-700">URL</div>
                <div className="text-xs break-all rounded-xl bg-slate-50 border border-slate-200 p-3 text-slate-700">
                  {absolutePublic}
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                    onClick={async () => {
                      await navigator.clipboard.writeText(absolutePublic);
                      toast("Link pubblico copiato ✅");
                    }}
                  >
                    Copia link
                  </button>
                  <Link
                    href={publicUrl}
                    className="rounded-xl bg-orange-600 text-white px-3 py-2 text-sm font-bold hover:opacity-90"
                  >
                    Apri
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* CASHIER QR */}
          <div className="rounded-2xl bg-white p-6 shadow">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-slate-900">QR Cassa</div>
                <div className="text-xs text-slate-500">
                  Valida punti (max 1 al giorno nella demo)
                </div>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                CASSA
              </span>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <img
                src={qrUrl(absoluteCashier, 260)}
                alt="QR Cassa"
                className="rounded-xl border border-slate-200"
                width={260}
                height={260}
              />
              <div className="flex-1 space-y-2">
                <div className="text-xs font-semibold text-slate-700">URL</div>
                <div className="text-xs break-all rounded-xl bg-slate-50 border border-slate-200 p-3 text-slate-700">
                  {absoluteCashier}
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                    onClick={async () => {
                      await navigator.clipboard.writeText(absoluteCashier);
                      toast("Link cassa copiato ✅");
                    }}
                  >
                    Copia link
                  </button>
                  <Link
                    href={cashierUrl}
                    className="rounded-xl bg-slate-900 text-white px-3 py-2 text-sm font-bold hover:opacity-90"
                  >
                    Apri
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* HOW IT WORKS */}
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="text-sm font-bold text-slate-900">Come usarla (demo)</div>
          <ol className="mt-3 text-sm text-slate-700 space-y-2 list-decimal list-inside">
            <li>Stampa o mostra il <b>QR Pubblico</b> sul tavolo / ingresso.</li>
            <li>Il cliente scansiona: vede “presenza registrata”.</li>
            <li>Dopo consumazione, alla cassa scansionano il <b>QR Cassa</b>.</li>
            <li>La demo consente <b>1 validazione al giorno per venue</b>.</li>
          </ol>
          <div className="text-xs text-slate-500 mt-3">
            Nota: i QR sono generati tramite un servizio esterno solo per questa demo.
          </div>
        </div>
      </div>
    </main>
  );
}

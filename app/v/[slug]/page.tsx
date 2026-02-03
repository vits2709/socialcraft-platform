"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";

type ApiResponse = {
  ok: boolean;
  slug: string;
  scanType: "public" | "cashier";
  weeklyValid: number;
  monthlyValid: number;
  message: string;
};

function prettify(slug: string) {
  const s = slug.replace(/-/g, " ").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "Venue";
}

export default function VenuePage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const slug = String(params.slug);
  const scanType = searchParams.get("t") === "cashier" ? "cashier" : "public";
  const venueName = useMemo(() => prettify(slug), [slug]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);

  const rewardWeekly = 3;
  const progress = data ? Math.min(100, Math.round((data.weeklyValid / rewardWeekly) * 100)) : 0;

  useEffect(() => {
    async function run() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/scan-demo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, scanType }),
        });

        const text = await res.text();
        if (!res.ok) throw new Error(`API ${res.status}: ${text}`);

        setData(JSON.parse(text) as ApiResponse);
      } catch (e: any) {
        setError(e?.message || "Errore imprevisto");
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [slug, scanType]);

  const badge =
    scanType === "cashier"
      ? { label: "CASSA", cls: "bg-slate-900 text-white" }
      : { label: "PUBBLICO", cls: "bg-orange-100 text-orange-700" };

  return (
    <main className="min-h-screen bg-orange-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-4">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-orange-600">SOCIALCRAFT</div>
              <h1 className="text-2xl font-extrabold mt-1">{venueName}</h1>
              <div className="text-xs text-slate-500 mt-1">Slug: {slug}</div>
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${badge.cls}`}>
              {badge.label}
            </span>
          </div>

          <div className="mt-5">
            {loading && <p className="text-slate-500">Caricamento…</p>}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                <div className="font-bold">Qualcosa non va</div>
                <div className="text-sm mt-1 break-words">{error}</div>
              </div>
            )}

            {data && (
              <>
                <div
                  className={`rounded-2xl p-5 ${
                    scanType === "cashier" ? "bg-slate-900 text-white" : "bg-orange-50 text-slate-900"
                  }`}
                >
                  <div className="text-sm font-semibold opacity-80">
                    {scanType === "cashier" ? "Validazione effettuata" : "Presenza registrata"}
                  </div>
                  <div className="text-xl font-extrabold mt-1">{data.message}</div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className={`rounded-xl p-3 ${scanType === "cashier" ? "bg-white/10" : "bg-white"}`}>
                      <div className="opacity-70">Punti validi (settimana)</div>
                      <div className="text-2xl font-extrabold">{data.weeklyValid}</div>
                      <div className="opacity-70 text-xs">Premio a {rewardWeekly} punti</div>
                    </div>
                    <div className={`rounded-xl p-3 ${scanType === "cashier" ? "bg-white/10" : "bg-white"}`}>
                      <div className="opacity-70">Punti validi (mese)</div>
                      <div className="text-2xl font-extrabold">{data.monthlyValid}</div>
                      <div className="opacity-70 text-xs">Demo (memoria in RAM)</div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-xs opacity-80">
                      <span>Progress premio settimanale</span>
                      <span>{progress}%</span>
                    </div>
                    <div className={`mt-2 h-3 rounded-full ${scanType === "cashier" ? "bg-white/20" : "bg-orange-100"}`}>
                      <div
                        className={`h-3 rounded-full ${scanType === "cashier" ? "bg-white" : "bg-orange-500"}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {scanType === "public" && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                    <div className="font-bold">Vuoi i punti validi?</div>
                    <div className="mt-1">
                      Dopo la consumazione, chiedi alla cassa di scansionare il QR dedicato.
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            href="/"
            className="flex-1 text-center rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-800 hover:bg-slate-50"
          >
            Torna alla demo
          </Link>

          <Link
            href={`/v/${encodeURIComponent(slug)}?t=${scanType}`}
            className="flex-1 text-center rounded-xl bg-orange-600 px-4 py-3 font-bold text-white hover:opacity-90"
          >
            Ricarica pagina
          </Link>
        </div>
      </div>
    </main>
  );
}

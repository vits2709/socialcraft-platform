"use client";

import { useEffect, useRef, useState } from "react";

type ScanResult =
  | { ok: true; already: boolean; points_awarded: number; total_points: number; message: string }
  | { ok: false; error: string };

function extractSlugFromQrText(text: string): string | null {
  // Supporta QR con URL tipo:
  // https://app.cityquest.it/checkin/<slug>  ← formato generato dall'admin
  // https://app.cityquest.it/v/<slug>
  // https://app.cityquest.it/scan?slug=<slug>
  // oppure testo "slug:<slug>"
  try {
    if (text.startsWith("slug:")) return text.replace("slug:", "").trim();

    const url = new URL(text);
    const slugParam = url.searchParams.get("slug");
    if (slugParam) return slugParam;

    // Match /checkin/<slug> oppure /v/<slug>
    const m = url.pathname.match(/\/(checkin|v)\/([a-z0-9_-]+)/i);
    if (m?.[2]) return m[2];

    return null;
  } catch {
    // non è un URL valido, cerca comunque slug=... o slug:...
    const m = text.match(/slug[:=]\s*([a-z0-9_-]+)/i);
    return m?.[1] ?? null;
  }
}

export default function HomeScannerCTA() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const qrRef = useRef<any>(null);
  const mountedRef = useRef(false);

  async function callScan(slug: string) {
    setBusy(true);
    setMsg(null);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });

      const data = (await res.json()) as ScanResult;

      if (!data.ok) {
        const friendly =
          data.error === "not_logged"
            ? "Accedi per registrare la presenza."
            : data.error === "venue_not_found"
              ? "Spot non trovato. Controlla il QR."
              : "Errore. Riprova tra poco.";
        setMsg(`❌ ${friendly}`);
        return;
      }

      setMsg(data.message);
      // chiudi dopo un attimo
      setTimeout(() => setOpen(false), 1200);
    } catch (e: any) {
      setMsg(`❌ Errore rete`);
    } finally {
      setBusy(false);
    }
  }

  async function startScanner() {
    setCameraError(null);
    setMsg(null);

    // Import dinamico SOLO client
    const { Html5Qrcode } = await import("html5-qrcode");

    // id del container
    const elementId = "sc-home-qr-reader";

    // Evita doppio start
    if (qrRef.current) return;

    const qr = new Html5Qrcode(elementId);
    qrRef.current = qr;

    try {
      await qr.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 240, height: 240 },
        },
        async (decodedText: string) => {
          const slug = extractSlugFromQrText(decodedText);
          if (!slug) {
            setMsg("QR non valido (manca lo slug).");
            return;
          }

          // stop scanner subito per evitare scans ripetuti
          try {
            await qr.stop();
            await qr.clear();
          } catch {}
          qrRef.current = null;

          await callScan(slug);
        },
        () => {
          // onScanFailure: ignoriamo
        }
      );
    } catch (err: any) {
      // iOS spesso: NotAllowedError se permessi negati
      const m = String(err?.message ?? err ?? "");
      setCameraError(
        m.includes("NotAllowedError")
          ? "Permesso fotocamera negato. Abilitalo nelle impostazioni del browser."
          : "Non riesco ad aprire la fotocamera. Prova con Safari/Chrome e assicurati di essere su HTTPS."
      );

      try {
        await qr.stop();
        await qr.clear();
      } catch {}
      qrRef.current = null;
    }
  }

  async function stopScanner() {
    const qr = qrRef.current;
    if (!qr) return;

    try {
      await qr.stop();
      await qr.clear();
    } catch {}
    qrRef.current = null;
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) {
      stopScanner();
      return;
    }
    // apri scanner quando il modal è visibile
    startScanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <button className="btn" onClick={() => setOpen(true)} type="button">
        📷 Scannerizza per punti
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 50,
          }}
          onClick={() => setOpen(false)}
        >
          <div
            className="card"
            style={{
              width: "min(520px, 100%)",
              padding: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>Scanner QR</div>
                <div className="muted" style={{ marginTop: 4 }}>
                  Inquadra il QR dello Spot
                </div>
              </div>

              <button className="btn" type="button" onClick={() => setOpen(false)}>
                Chiudi
              </button>
            </div>

            <div style={{ marginTop: 12 }}>
              {/* container camera */}
              <div
                id="sc-home-qr-reader"
                style={{
                  width: "100%",
                  borderRadius: 14,
                  overflow: "hidden",
                  background: "#f3f4f6",
                  border: "1px solid rgba(0,0,0,.08)",
                }}
              />
            </div>

            {cameraError ? (
              <div className="notice" style={{ marginTop: 12 }}>
                ❌ {cameraError}
              </div>
            ) : null}

            {msg ? (
              <div className="notice" style={{ marginTop: 12 }}>
                {msg}
              </div>
            ) : (
              <div className="muted" style={{ marginTop: 12 }}>
                {busy ? "Sto registrando la visita..." : "Appena leggo il QR, registro la visita automaticamente."}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

type Props = {
  slug: string;
  venueName: string;
  siteUrl: string;
};

export default function AdminQrDownload({ slug, venueName, siteUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const base = siteUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const checkinUrl = `${base}/checkin/${slug}`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    QRCode.toCanvas(canvas, checkinUrl, {
      width: 256,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    }).then(() => {
      setReady(true);
    });
  }, [checkinUrl]);

  function downloadPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qr-checkin-${slug}.png`;
    a.click();
  }

  function downloadPdf() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");

    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(`<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>QR Check-in — ${venueName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      min-height: 100vh; margin: 0;
      background: #fff; color: #111;
    }
    .box {
      border: 2px solid #e5e7eb; border-radius: 20px;
      padding: 40px; text-align: center; max-width: 380px;
    }
    h1 { font-size: 22px; font-weight: 900; margin: 0 0 6px; }
    p { color: #6b7280; font-size: 14px; margin: 0 0 24px; }
    img { display: block; margin: 0 auto; width: 220px; height: 220px; }
    .url { margin-top: 16px; font-size: 11px; color: #9ca3af; word-break: break-all; }
    .brand { margin-top: 28px; font-size: 12px; color: #6366f1; font-weight: 700; }
    @media print {
      body { background: #fff; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="box">
    <h1>${venueName}</h1>
    <p>Scansiona per registrare la tua presenza e guadagnare punti!</p>
    <img src="${dataUrl}" alt="QR Code check-in ${venueName}" />
    <div class="url">${checkinUrl}</div>
    <div class="brand">CityQuest</div>
  </div>
  <div class="no-print" style="margin-top:24px">
    <button onclick="window.print()" style="
      padding:10px 24px; border-radius:12px; border:none;
      background:#6366f1; color:#fff; font-weight:700;
      font-size:15px; cursor:pointer;
    ">Stampa / Salva PDF</button>
  </div>
</body>
</html>`);
    win.document.close();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12 }}>
      <canvas
        ref={canvasRef}
        style={{
          borderRadius: 12,
          border: "1px solid rgba(0,0,0,0.08)",
          display: "block",
        }}
      />

      {ready && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn" onClick={downloadPng}>
            ⬇️ Scarica PNG
          </button>
          <button className="btn" onClick={downloadPdf}>
            🖨️ Stampa / PDF
          </button>
        </div>
      )}

      <div className="muted" style={{ fontSize: 12, wordBreak: "break-all" }}>
        {checkinUrl}
      </div>
    </div>
  );
}

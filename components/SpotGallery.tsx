"use client";

import { useState } from "react";

export default function SpotGallery({ foto }: { foto: string[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (foto.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 16px",
          borderRadius: 14,
          border: "1px dashed rgba(0,0,0,0.12)",
          background: "rgba(0,0,0,0.02)",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 32, opacity: 0.3 }}>📷</span>
        <span className="muted" style={{ fontSize: 13 }}>Nessuna foto disponibile</span>
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 8,
        }}
      >
        {foto.map((url, i) => (
          <button
            key={url}
            type="button"
            onClick={() => setLightbox(url)}
            style={{
              padding: 0,
              border: "none",
              borderRadius: 12,
              overflow: "hidden",
              cursor: "pointer",
              aspectRatio: "4/3",
              background: "rgba(0,0,0,0.05)",
              gridColumn: i === 0 && foto.length >= 3 ? "span 2" : undefined,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Foto ${i + 1}`}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
            cursor: "zoom-out",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Foto spot"
            style={{
              maxWidth: "100%",
              maxHeight: "90vh",
              borderRadius: 16,
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              objectFit: "contain",
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightbox(null)}
            style={{
              position: "fixed",
              top: 20,
              right: 20,
              background: "rgba(255,255,255,0.15)",
              border: "none",
              borderRadius: "50%",
              width: 44,
              height: 44,
              color: "white",
              fontSize: 22,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(8px)",
            }}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}

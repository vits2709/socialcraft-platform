"use client";

import { useState } from "react";

type Notif = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
};

export default function AdminNotificationsClient({ initial }: { initial: Notif[] }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [history, setHistory] = useState<Notif[]>(initial);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    const b = body.trim();
    if (!t || !b) return;

    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t, body: b }),
      });
      const json = await res.json();
      if (json.ok) {
        setResult(`✅ Inviato a ${json.sent} / ${json.total} utenti`);
        setTitle("");
        setBody("");
        // Ricarica storico
        const histRes = await fetch("/api/admin/notifications");
        const histJson = await histRes.json();
        if (histJson.ok) setHistory(histJson.notifications ?? []);
      } else {
        setResult(`❌ Errore: ${json.error}`);
      }
    } catch (e: unknown) {
      setResult(`❌ ${e instanceof Error ? e.message : "Errore"}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* Form broadcast */}
      <div className="card" style={{ padding: 20, display: "grid", gap: 14 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>📢 Invia broadcast</div>
        <form onSubmit={handleSend} style={{ display: "grid", gap: 10 }}>
          <div>
            <label style={{ display: "block", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
              Titolo
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Es. Promozione speciale oggi!"
              required
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 10,
                border: "1.5px solid rgba(0,0,0,0.12)",
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
              Messaggio
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Es. Visita i nostri partner oggi e guadagna doppi punti!"
              required
              rows={3}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 10,
                border: "1.5px solid rgba(0,0,0,0.12)",
                fontSize: 14,
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="btn"
            style={{ justifySelf: "start" }}
          >
            {sending ? "Invio in corso…" : "Invia a tutti gli utenti"}
          </button>
          {result && (
            <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.85 }}>{result}</div>
          )}
        </form>
      </div>

      {/* Storico */}
      <div className="card" style={{ padding: 20, display: "grid", gap: 12 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>📋 Ultime 20 notifiche</div>
        {history.length === 0 ? (
          <div style={{ opacity: 0.5, fontSize: 13 }}>Nessuna notifica ancora.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {history.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.08)",
                  background: "rgba(255,255,255,0.6)",
                  display: "grid",
                  gap: 4,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 900, fontSize: 14 }}>{n.title}</div>
                  <div style={{ fontSize: 11, opacity: 0.5 }}>
                    {new Date(n.created_at).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })}
                  </div>
                </div>
                {n.body && (
                  <div style={{ fontSize: 13, opacity: 0.75 }}>{n.body}</div>
                )}
                <div style={{ fontSize: 11, opacity: 0.45 }}>
                  Utente: {n.user_id.slice(0, 8)}… · Tipo: {n.type} · {n.read ? "✅ Letta" : "⭕ Non letta"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { deleteUserAction } from "./actions";
import DeleteUserButton from "@/components/DeleteUserButton";

export type UserRow = {
  id: string;
  name: string | null;
  score: number | null;
  meta: string | null;
};

type SortKey = "rank" | "name" | "score";
type SortDir = "asc" | "desc";

function getLevel(score: number): { label: string; color: string; bg: string } {
  if (score >= 2000) return { label: "Leggenda",    color: "#7c3aed", bg: "rgba(124,58,237,0.10)" };
  if (score >= 500)  return { label: "Avventuriero", color: "#2D1B69", bg: "rgba(45,27,105,0.10)" };
  if (score >= 100)  return { label: "Esploratore", color: "#0369a1", bg: "rgba(3,105,161,0.10)" };
  return               { label: "Curioso",      color: "#78716c", bg: "rgba(120,113,108,0.10)" };
}

function fmt(n: number) {
  return Number(n ?? 0).toLocaleString("it-IT");
}

export default function UsersAdminClient({ users }: { users: UserRow[] }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = q
      ? users.filter(
          (u) =>
            (u.name ?? "").toLowerCase().includes(q) ||
            (u.meta ?? "").toLowerCase().includes(q) ||
            u.id.toLowerCase().includes(q)
        )
      : [...users];

    rows.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "rank")  cmp = 0; // maintain original order
      if (sortKey === "name")  cmp = (a.name ?? "").localeCompare(b.name ?? "");
      if (sortKey === "score") cmp = (a.score ?? 0) - (b.score ?? 0);
      return sortDir === "desc" ? -cmp : cmp;
    });

    return rows;
  }, [users, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "score" ? "desc" : "asc");
    }
  }

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <span style={{ opacity: 0.3 }}>↕</span>;
    return sortDir === "asc" ? "↑" : "↓";
  };

  const thStyle = (key: SortKey): React.CSSProperties => ({
    padding: "12px 14px",
    textAlign: "left",
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: "0.3px",
    color: "white",
    whiteSpace: "nowrap",
    textTransform: "uppercase" as const,
    cursor: "pointer",
    userSelect: "none" as const,
    background: sortKey === key ? "rgba(255,255,255,0.1)" : "transparent",
  });

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Search */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <input
          className="input"
          placeholder="🔍  Cerca per username o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 360, fontSize: 14 }}
        />
        <span style={{ color: "rgba(15,23,42,0.45)", fontSize: 13 }}>
          {filtered.length} / {users.length} utenti
        </span>
      </div>

      {/* Table */}
      <div
        style={{
          background: "white",
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "0 2px 14px rgba(0,0,0,0.06)",
          border: "1px solid rgba(0,0,0,0.07)",
          overflowX: "auto",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#2D1B69" }}>
              <th style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700, fontSize: 12, color: "white", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                #
              </th>
              <th onClick={() => toggleSort("name")} style={thStyle("name")}>
                Username / Email {sortIcon("name")}
              </th>
              <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: 12, color: "white", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                Livello
              </th>
              <th onClick={() => toggleSort("score")} style={{ ...thStyle("score"), textAlign: "right" }}>
                Punti totali {sortIcon("score")}
              </th>
              <th style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700, fontSize: 12, color: "white", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                Azioni
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => {
              const level = getLevel(Number(u.score ?? 0));
              const isOdd = i % 2 === 1;
              return (
                <tr
                  key={u.id}
                  style={{ background: isOdd ? "rgba(45,27,105,0.02)" : "white" }}
                >
                  <td style={{ padding: "11px 14px", textAlign: "center", fontWeight: 700, color: "rgba(15,23,42,0.35)", fontSize: 12 }}>
                    {i + 1}
                  </td>

                  <td style={{ padding: "11px 14px" }}>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>
                      {u.name ?? <span style={{ color: "rgba(15,23,42,0.35)" }}>Guest</span>}
                    </div>
                    {u.meta && (
                      <div style={{ fontSize: 11, color: "rgba(15,23,42,0.45)", marginTop: 1 }}>
                        {u.meta}
                      </div>
                    )}
                  </td>

                  <td style={{ padding: "11px 14px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 700,
                        background: level.bg,
                        color: level.color,
                        border: `1px solid ${level.color}22`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {level.label}
                    </span>
                  </td>

                  <td style={{ padding: "11px 14px", textAlign: "right", fontWeight: 700, color: "#2D1B69", fontSize: 14 }}>
                    {fmt(Number(u.score ?? 0))}
                  </td>

                  <td style={{ padding: "11px 14px", textAlign: "right" }}>
                    <form action={deleteUserAction.bind(null, u.id)}>
                      <DeleteUserButton userName={u.name ?? u.id} />
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div style={{ padding: "32px", textAlign: "center", color: "rgba(15,23,42,0.4)" }}>
            {search ? `Nessun utente trovato per "${search}"` : "Nessun utente in classifica."}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";

export default function ShareProfileButton({ username }: { username: string }) {
  const [copied, setCopied] = useState(false);

  function handleClick() {
    const url = `${window.location.origin}/profilo/${username}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleClick}
      className="btn"
      type="button"
      style={{ fontSize: 13 }}
    >
      {copied ? "✅ Copiato!" : "🔗 Condividi profilo"}
    </button>
  );
}

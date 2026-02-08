"use client";

import { useEffect } from "react";

export default function BootstrapUser() {
  useEffect(() => {
    // Chiamiamo sempre: se cookie esiste, l’API risponde ok e non fa nulla
    fetch("/api/bootstrap-user", { method: "POST" }).catch(() => null);
  }, []);

  return null;
}
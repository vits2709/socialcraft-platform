"use client";

import { useEffect } from "react";

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const v = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
  return v ? decodeURIComponent(v) : null;
}

function setCookie(name: string, value: string, days = 365) {
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

function uuidv4() {
  // crypto.randomUUID è supportato nei browser moderni
  // fallback per sicurezza
  // @ts-ignore
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  const s: string[] = [];
  const hex = "0123456789abcdef";
  for (let i = 0; i < 36; i++) s[i] = hex[Math.floor(Math.random() * 16)];
  s[14] = "4";
  // @ts-ignore
  s[19] = hex[(parseInt(s[19], 16) & 0x3) | 0x8];
  s[8] = s[13] = s[18] = s[23] = "-";
  return s.join("");
}

export default function BootstrapUser() {
  useEffect(() => {
    const existing = getCookie("sc_uid");
    if (!existing) {
      const id = uuidv4();
      setCookie("sc_uid", id, 365);
    }
  }, []);

  return null;
}
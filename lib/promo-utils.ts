// Logica condivisa per le promozioni a scheduling.
// Usato da: /api/scan, app/page.tsx, components/HomePromoSection.tsx
// Compatibile con Server Components e Client Components (nessuna dipendenza server-only).

export type PromoSchedule = {
  id: string;
  title: string;
  is_active: boolean;
  bonus_type: "points" | "multiplier";
  bonus_value: number;
  /** 0=Dom 1=Lun 2=Mar 3=Mer 4=Gio 5=Ven 6=Sab */
  days_of_week: number[];
  time_start: string; // "HH:MM:SS" — fuso Europe/Rome
  time_end: string;   // "HH:MM:SS" — fuso Europe/Rome
  date_start: string | null; // "YYYY-MM-DD"
  date_end: string | null;   // "YYYY-MM-DD"
};

/** Ritorna data/ora corrente nel fuso Europe/Rome. */
function getRomeNow(): { dayOfWeek: number; timeStr: string; dateStr: string } {
  const now = new Date();
  // Costruisce una data locale Rome usando toLocaleString
  const rome = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Rome" }));
  const h = String(rome.getHours()).padStart(2, "0");
  const m = String(rome.getMinutes()).padStart(2, "0");
  const s = String(rome.getSeconds()).padStart(2, "0");
  const yr = rome.getFullYear();
  const mo = String(rome.getMonth() + 1).padStart(2, "0");
  const dt = String(rome.getDate()).padStart(2, "0");
  return {
    dayOfWeek: rome.getDay(),
    timeStr: `${h}:${m}:${s}`,
    dateStr: `${yr}-${mo}-${dt}`,
  };
}

/** Ritorna true se la promo è attiva in questo preciso momento. */
export function isPromoActiveNow(promo: PromoSchedule): boolean {
  if (!promo.is_active) return false;

  const { dayOfWeek, timeStr, dateStr } = getRomeNow();

  if (promo.date_start && dateStr < promo.date_start) return false;
  if (promo.date_end && dateStr > promo.date_end) return false;

  const days = Array.isArray(promo.days_of_week) ? promo.days_of_week : [];
  if (days.length > 0 && !days.includes(dayOfWeek)) return false;

  // Normalizza: DB può restituire "HH:MM:SS" o "HH:MM"
  const start = (promo.time_start ?? "00:00:00").slice(0, 8).padEnd(8, ":00");
  const end = (promo.time_end ?? "23:59:59").slice(0, 8).padEnd(8, ":59");

  if (timeStr < start) return false;
  if (timeStr > end) return false;

  return true;
}

/** Applica il bonus della promo ai punti base e ritorna i punti finali. */
export function applyPromoBonus(basePoints: number, promo: PromoSchedule): number {
  if (promo.bonus_type === "multiplier") {
    const factor = Math.min(5, Math.max(1, Number(promo.bonus_value)));
    return Math.round(basePoints * factor);
  }
  return basePoints + Math.max(0, Math.round(Number(promo.bonus_value)));
}

/**
 * Tra più promo attive ora, sceglie quella più vantaggiosa per l'utente.
 * Ritorna null se nessuna è attiva in questo momento.
 */
export function bestActivePromo(
  promos: PromoSchedule[],
  basePoints: number
): PromoSchedule | null {
  const active = promos.filter(isPromoActiveNow);
  if (!active.length) return null;
  return active.reduce((best, p) =>
    applyPromoBonus(basePoints, p) >= applyPromoBonus(basePoints, best) ? p : best
  );
}

/** Formatta il bonus per la UI: "x2 punti" oppure "+3 punti bonus" */
export function formatPromoBonus(
  bonusType: string,
  bonusValue: number
): string {
  if (bonusType === "multiplier") return `x${bonusValue} punti`;
  return `+${bonusValue} pt bonus`;
}

/**
 * Calcola i minuti rimanenti alla fine della promo oggi (in fuso Rome).
 * Usato dal server per passare un valore iniziale al countdown client.
 */
export function minutesUntilPromoEnd(timeEnd: string): number {
  const rome = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Rome" })
  );
  const [h, m] = timeEnd.split(":").map(Number);
  const end = new Date(rome);
  end.setHours(h, m, 0, 0);
  const diff = end.getTime() - rome.getTime();
  return Math.max(0, Math.floor(diff / 60000));
}

/** Etichetta status per lista admin. */
export function promoStatusLabel(
  promo: PromoSchedule & { date_end: string | null }
): "attiva" | "programmata" | "disattivata" | "scaduta" {
  if (!promo.is_active) {
    const { dateStr } = getRomeNow();
    if (promo.date_end && dateStr > promo.date_end) return "scaduta";
    return "disattivata";
  }
  return isPromoActiveNow(promo) ? "attiva" : "programmata";
}

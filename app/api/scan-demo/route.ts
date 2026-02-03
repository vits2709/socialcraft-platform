import { NextResponse } from "next/server";

type ScanType = "public" | "cashier";
type Body = { slug?: string; scanType?: ScanType };

// Stato in RAM (demo). Si resetta al riavvio di `npm run dev`
const memory = new Map<
  string,
  {
    lastCashierDay: string;
    weekly: number;
    monthly: number;
    // per evitare reset multipli nello stesso lunedì
    lastWeeklyResetKey: string;
  }
>();

function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Chiave “settimana” ISO-like semplice (anno + settimana approssimata)
// Per demo basta: anno + numero settimana (lunedì-based) calcolato grezzo
function weekKey() {
  const d = new Date();
  const oneJan = new Date(d.getFullYear(), 0, 1);
  const dayOfYear = Math.floor(
    (d.getTime() - oneJan.getTime()) / 86400000
  ) + 1;

  // settimana grezza (non ISO perfetta), ma ok per demo
  const week = Math.ceil((dayOfYear + oneJan.getDay()) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

async function safeJson(req: Request) {
  try {
    return (await req.json()) as unknown;
  } catch {
    return null;
  }
}

/** ✅ GET = healthcheck per test veloce da browser */
export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "scan-demo",
    note: "Usa POST con { slug, scanType: 'public'|'cashier' }",
  });
}

/** ✅ POST = logica demo */
export async function POST(req: Request) {
  try {
    const raw = await safeJson(req);
    const body = (raw ?? {}) as Body;

    const slug = String(body.slug ?? "").trim();
    const scanType: ScanType = body.scanType === "cashier" ? "cashier" : "public";

    if (!slug) {
      return NextResponse.json({ ok: false, error: "slug mancante" }, { status: 400 });
    }

    const key = `demo:${slug}`;

    const state =
      memory.get(key) ?? {
        lastCashierDay: "",
        weekly: 0,
        monthly: 0,
        lastWeeklyResetKey: "",
      };

    // reset settimanale: 1 volta per settimana
    const wk = weekKey();
    if (state.lastWeeklyResetKey !== wk) {
      state.weekly = 0;
      state.lastWeeklyResetKey = wk;
    }

    const today = todayKey();

    if (scanType === "public") {
      memory.set(key, state);
      return NextResponse.json({
        ok: true,
        slug,
        scanType,
        weeklyValid: state.weekly,
        monthlyValid: state.monthly,
        message: "Giocata registrata 🎮 (per i premi valida alla cassa)",
      });
    }

    // cashier: max 1 volta al giorno per locale
    if (state.lastCashierDay === today) {
      memory.set(key, state);
      return NextResponse.json({
        ok: true,
        slug,
        scanType,
        weeklyValid: state.weekly,
        monthlyValid: state.monthly,
        message: "Punto già validato oggi ✅",
      });
    }

    state.lastCashierDay = today;
    state.weekly += 1;
    state.monthly += 1;

    memory.set(key, state);

    return NextResponse.json({
      ok: true,
      slug,
      scanType,
      weeklyValid: state.weekly,
      monthlyValid: state.monthly,
      message: "Punto valido registrato ✅",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Errore";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

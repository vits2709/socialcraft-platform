// ✅ assegna +8 SOLO quando diventa approved (ed evita doppioni)
const AWARD = 8;

// 1) aggiorna punti reali sc_users
const { data: uRow, error: uErr } = await supabase
  .from("sc_users")
  .select("id, points")
  .eq("id", verification.user_id)
  .maybeSingle();

if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 });
if (!uRow) return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });

const newTotal = Number(uRow.points ?? 0) + AWARD;

const { error: upErr } = await supabase
  .from("sc_users")
  .update({ points: newTotal })
  .eq("id", verification.user_id);

if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

// 2) user_events: event_type deve essere 'receipt'
const { error: ueErr } = await supabase.from("user_events").insert({
  user_id: verification.user_id,
  venue_id: verification.venue_id,
  event_type: "receipt",
  points: AWARD,
  points_delta: AWARD,
});

if (ueErr) return NextResponse.json({ ok: false, error: ueErr.message }, { status: 500 });

// 3) venue_events (solo scan/vote consentiti) -> qui puoi loggare "scan" oppure NON loggare nulla
// Io consiglio: NON loggare, oppure logga scan solo quando fai presenza.
// Se vuoi loggare anche l’evento receipt lato venue, NON puoi: venue_events non accetta 'receipt'.
// Seed missioni template — esegui con: node scripts/seed-missions.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Legge .env.local
const envPath = resolve(__dirname, "../.env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

const ACTIVE_FROM  = "2000-01-01 00:00:00+00";
const ACTIVE_UNTIL = "2000-01-02 00:00:00+00"; // > active_from per soddisfare il check constraint

const missions = [
  // ── GIORNALIERE ──────────────────────────────────────────────────────────
  { type:"daily", emoji:"📍", title:"Esploratore del giorno",       description:"Fai check-in in uno spot oggi",                                          completion_message:"Ottimo! Continua ad esplorare 🗺️",        mission_type:"checkin",               config:{},                                              points_reward:3,  is_surprise:false },
  { type:"daily", emoji:"🧾", title:"Consumatore doc",               description:"Fai check-in e carica uno scontrino oggi",                               completion_message:"Perfetto! Hai guadagnato punti extra 💰",  mission_type:"checkin_receipt",        config:{},                                              points_reward:8,  is_surprise:false },
  { type:"daily", emoji:"💸", title:"Spendaccione",                  description:"Carica uno scontrino di almeno €10",                                     completion_message:"Grande spesa, grandi punti! 🏆",           mission_type:"checkin_receipt_amount", config:{ min_amount:10 },                                points_reward:10, is_surprise:false },
  { type:"daily", emoji:"🤑", title:"Grande serata",                 description:"Carica uno scontrino di almeno €20",                                     completion_message:"Serata di lusso! 🥂",                      mission_type:"checkin_receipt_amount", config:{ min_amount:20 },                                points_reward:15, is_surprise:false },
  { type:"daily", emoji:"☀️", title:"Buongiorno Vasto",              description:"Fai check-in prima delle 10:00",                                         completion_message:"Mattiniero doc! 🌅",                       mission_type:"checkin_timeslot",       config:{ time_start:"06:00", time_end:"10:00" },         points_reward:5,  is_surprise:false },
  { type:"daily", emoji:"🍸", title:"Aperitivo certificato",         description:"Fai check-in tra le 18:00 e le 20:00",                                   completion_message:"Aperitivo perfetto! 🍾",                   mission_type:"checkin_timeslot",       config:{ time_start:"18:00", time_end:"20:00" },         points_reward:5,  is_surprise:false },
  { type:"daily", emoji:"🌙", title:"Nottambulo in erba",            description:"Fai check-in dopo le 22:00",                                             completion_message:"La notte è ancora giovane! 🦉",            mission_type:"checkin_timeslot",       config:{ time_start:"22:00", time_end:"23:59" },         points_reward:6,  is_surprise:false },
  { type:"daily", emoji:"🍽️", title:"Pausa pranzo",                 description:"Fai check-in in un ristorante oggi",                                     completion_message:"Buon appetito! 🍴",                        mission_type:"checkin_category",       config:{ category:"ristorante" },                        points_reward:5,  is_surprise:false },
  { type:"daily", emoji:"💈", title:"Stile del giorno",              description:"Fai check-in in un barbiere oggi",                                       completion_message:"Sempre in forma! ✂️",                     mission_type:"checkin_category",       config:{ category:"barber" },                            points_reward:5,  is_surprise:false },
  { type:"daily", emoji:"💅", title:"Momento relax",                 description:"Fai check-in in una estetica o nail salon oggi",                         completion_message:"Ti meriti del relax! 🧖",                  mission_type:"checkin_category",       config:{ category:"estetica" },                          points_reward:5,  is_surprise:false },
  { type:"daily", emoji:"🆕", title:"Terra incognita",               description:"Visita uno spot che non hai mai visitato",                                completion_message:"Nuovo spot sbloccato! 🗺️",                mission_type:"first_visit",            config:{},                                              points_reward:6,  is_surprise:false },
  { type:"daily", emoji:"👥", title:"In compagnia",                  description:"Fai check-in con almeno un amico usando il codice companion",             completion_message:"Meglio insieme! 🤝",                       mission_type:"checkin_companion",      config:{ min_companions:1 },                             points_reward:7,  is_surprise:false },
  { type:"daily", emoji:"⭐", title:"Critico del giorno",            description:"Vota uno spot oggi",                                                     completion_message:"Grazie per il feedback! ⭐",               mission_type:"vote",                   config:{},                                              points_reward:3,  is_surprise:false },
  { type:"daily", emoji:"🏃", title:"Giro di quartiere",             description:"Visita 2 spot diversi oggi",                                             completion_message:"Instancabile esploratore! 🏅",             mission_type:"checkin_multiple",       config:{ count:2 },                                     points_reward:10, is_surprise:false },
  { type:"daily", emoji:"🔥", title:"Sfida impossibile",             description:"Visita 3 spot diversi oggi",                                             completion_message:"Leggenda della città! 👑",                 mission_type:"checkin_multiple",       config:{ count:3 },                                     points_reward:15, is_surprise:false },
  { type:"daily", emoji:"😤", title:"Chi te lo fa fare",             description:"Fai check-in di domenica prima delle 9:00",                              completion_message:"Domenica mattina. Rispetto! 😂",           mission_type:"checkin_timeslot",       config:{ time_start:"06:00", time_end:"09:00" },         points_reward:8,  is_surprise:true  },
  { type:"daily", emoji:"🎉", title:"TGIF",                          description:"Fai check-in di venerdì sera",                                           completion_message:"È venerdì! 🎊",                            mission_type:"checkin_timeslot",       config:{ time_start:"19:00", time_end:"23:59" },         points_reward:5,  is_surprise:false },
  { type:"daily", emoji:"🥐", title:"Colazione italiana",            description:"Carica uno scontrino in un bar prima delle 10:00",                       completion_message:"La colazione dei campioni! ☕",             mission_type:"checkin_receipt",        config:{ category:"bar", time_start:"06:00", time_end:"10:00" }, points_reward:7, is_surprise:false },
  { type:"daily", emoji:"🍝", title:"Pranzo vero",                   description:"Carica uno scontrino in un ristorante tra le 12:00 e le 14:00",          completion_message:"Pranzo certificato! 🍴",                   mission_type:"checkin_receipt",        config:{ category:"ristorante", time_start:"12:00", time_end:"14:00" }, points_reward:8, is_surprise:false },
  // ── SETTIMANALI ──────────────────────────────────────────────────────────
  { type:"weekly", emoji:"🗺️",       title:"Esploratore della settimana", description:"Visita 5 spot diversi questa settimana",                              completion_message:"Esploratore della settimana! 🏆",          mission_type:"checkin_multiple",       config:{ count:5 },                                     points_reward:25, is_surprise:false },
  { type:"weekly", emoji:"🧾",       title:"Consumatore fedele",          description:"Carica 3 scontrini in 3 giorni diversi questa settimana",             completion_message:"Cliente serio! 💰",                        mission_type:"checkin_receipt",        config:{ count:3, different_days:true },                 points_reward:30, is_surprise:false },
  { type:"weekly", emoji:"💰",       title:"Grande consumatore",          description:"Carica uno scontrino di almeno €30 questa settimana",                 completion_message:"Spesa da campione! 🥇",                    mission_type:"checkin_receipt_amount", config:{ min_amount:30 },                                points_reward:20, is_surprise:false },
  { type:"weekly", emoji:"🌟",       title:"Tutto in una settimana",      description:"Visita almeno una categoria diversa ogni giorno per 3 giorni",        completion_message:"Versatile e instancabile! 🌈",             mission_type:"checkin_category",       config:{ different_categories:3 },                       points_reward:35, is_surprise:false },
  { type:"weekly", emoji:"👨‍👩‍👧", title:"Spirito di gruppo",            description:"Usa il codice companion per 3 check-in di gruppo questa settimana",   completion_message:"La squadra fa la forza! 🤝",               mission_type:"checkin_companion",      config:{ count:3, min_companions:1 },                    points_reward:30, is_surprise:false },
  { type:"weekly", emoji:"🏙️",      title:"Cittadino attivo",            description:"Fai check-in ogni giorno per 5 giorni questa settimana",              completion_message:"Sei il cuore pulsante della città! ❤️",   mission_type:"checkin_multiple",       config:{ count:5, different_days:true },                 points_reward:40, is_surprise:false },
];

async function seed() {
  console.log("Connessione a Supabase...");
  console.log("URL:", env.NEXT_PUBLIC_SUPABASE_URL);

  let inserted = 0;
  let skipped  = 0;

  for (const m of missions) {
    // Controlla se esiste già
    const { count } = await supabase
      .from("missions")
      .select("id", { count: "exact", head: true })
      .eq("title", m.title);

    if ((count ?? 0) > 0) {
      console.log(`  ⏭️  skip: ${m.emoji} ${m.title}`);
      skipped++;
      continue;
    }

    const { error } = await supabase.from("missions").insert({
      ...m,
      is_active:    false,
      active_from:  ACTIVE_FROM,
      active_until: ACTIVE_UNTIL,
    });

    if (error) {
      console.error(`  ❌ errore: ${m.title} —`, error.message);
    } else {
      console.log(`  ✅ inserita: ${m.emoji} ${m.title}`);
      inserted++;
    }
  }

  console.log(`\nDone — inserite: ${inserted}, già presenti: ${skipped}`);
}

seed().catch((e) => { console.error(e); process.exit(1); });

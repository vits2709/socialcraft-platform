-- Seed missioni template
-- is_active = false → template riutilizzabile, non visibile agli utenti
-- L'admin le programa dal pannello creando istanze con date specifiche
-- Idempotente: skip se il seed è già presente

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.missions WHERE title = 'Esploratore del giorno') THEN
    RAISE NOTICE 'Seed missioni già presenti — skip.';
    RETURN;
  END IF;

  INSERT INTO public.missions
    (type, emoji, title, description, completion_message, mission_type, config, points_reward, is_surprise, is_active, active_from, active_until)
  VALUES

  -- ── GIORNALIERE ──────────────────────────────────────────────────────────

  -- Check-in base
  ('daily','📍','Esploratore del giorno',
   'Fai check-in in uno spot oggi',
   'Ottimo! Continua ad esplorare 🗺️',
   'checkin','{}',3,false,false,
   '2000-01-01T00:00:00+00','2000-01-01T00:00:00+00'),

  -- Check-in + scontrino
  ('daily','🧾','Consumatore doc',
   'Fai check-in e carica uno scontrino oggi',
   'Perfetto! Hai guadagnato punti extra 💰',
   'checkin_receipt','{}',8,false,false,
   '2000-01-01T00:00:00+00','2000-01-01T00:00:00+00'),

  -- Scontrino importo minimo €10
  ('daily','💸','Spendaccione',
   'Carica uno scontrino di almeno €10',
   'Grande spesa, grandi punti! 🏆',
   'checkin_receipt_amount','{"min_amount": 10}',10,false,false,
   '2000-01-01T00:00:00+00','2000-01-01T00:00:00+00'),

  -- Scontrino importo minimo €20
  ('daily','🤑','Grande serata',
   'Carica uno scontrino di almeno €20',
   'Serata di lusso! 🥂',
   'checkin_receipt_amount','{"min_amount": 20}',15,false,false,
   '2000-01-01T00:00:00+00','2000-01-01T00:00:00+00'),

  -- Fascia mattina
  ('daily','☀️','Buongiorno Vasto',
   'Fai check-in prima delle 10:00',
   'Mattiniero doc! 🌅',
   'checkin_timeslot','{"time_start": "06:00", "time_end": "10:00"}',5,false,false,
   '2000-01-01T00:00:00+00','2000-01-01T00:00:00+00'),

  -- Aperitivo
  ('daily','🍸','Aperitivo certificato',
   'Fai check-in tra le 18:00 e le 20:00',
   'Aperitivo perfetto! 🍾',
   'checkin_timeslot','{"time_start": "18:00", "time_end": "20:00"}',5,false,false,
   '2000-01-01T00:00:00+00','2000-01-01T00:00:00+00'),

  -- Tarda notte
  ('daily','🌙','Nottambulo in erba',
   'Fai check-in dopo le 22:00',
   'La notte è ancora giovane! 🦉',
   'checkin_timeslot','{"time_start": "22:00", "time_end": "23:59"}',6,false,false,
   '2000-01-01T00:00:00+00','2000-01-01T00:00:00+00'),

  -- Categoria ristorante
  ('daily','🍽️','Pausa pranzo',
   'Fai check-in in un ristorante oggi',
   'Buon appetito! 🍴',
   'checkin_category','{"category": "ristorante"}',5,false,false,
   '2000-01-01T00:00:00+00','2000-01-01T00:00:00+00'),

  -- Categoria barber
  ('daily','💈','Stile del giorno',
   'Fai check-in in un barbiere oggi',
   'Sempre in forma! ✂️',
   'checkin_category','{"category": "barber"}',5,false,false,
   '2000-01-01T00:00:00+00','2000-01-01T00:00:00+00'),

  -- Categoria estetica
  ('daily','💅','Momento relax',
   'Fai check-in in una estetica o nail salon oggi',
   'Ti meriti del relax! 🧖',
   'checkin_category','{"category": "estetica"}',5,false,false,
   '2000-01-01T00:00:00+00','2000-01-01T00:00:00+00'),

  -- Prima visita
  ('daily','🆕','Terra incognita',
   'Visita uno spot che non hai mai visitato',
   'Nuovo spot sbloccato! 🗺️',
   'first_visit','{}',6,false,false,
   '2000-01-01T00:00:00+00','2000-01-01T00:00:00+00'),

  -- Companion
  ('daily','👥','In compagnia',
   'Fai check-in con almeno un amico usando il codice companion',
   'Meglio insieme! 🤝',
   'checkin_companion','{"min_companions": 1}',7,false,false,
   '2000-01-01T00:00:00+00','2000-01-01T00:00:00+00'),

  -- Voto
  ('daily','⭐','Critico del giorno',
   'Vota uno spot oggi',
   'Grazie per il feedback! ⭐',
   'vote','{}',3,false,false,
   '2000-01-01T00:00:00+00','2000-01-01T00:00:00+00'),

  -- Multiple spot x2
  ('daily','🏃','Giro di quartiere',
   'Visita 2 spot diversi oggi',
   'Instancabile esploratore! 🏅',
   'checkin_multiple','{"count": 2}',10,false,false,
   '2000-01-01T00:00:00+00','2000-01-01T00:00:00+00'),

  -- Multiple spot x3
  ('daily','🔥','Sfida impossibile',
   'Visita 3 spot diversi oggi',
   'Leggenda della città! 👑',
   'checkin_multiple','{"count": 3}',15,false,false,
   '2000-01-01T00:00:00+00','2000-01-01T00:00:00+00'),

  -- Sorpresa: domenica mattina presto
  ('daily','😤','Chi te lo fa fare',
   'Fai check-in di domenica prima delle 9:00',
   'Domenica mattina. Rispetto! 😂',
   'checkin_timeslot','{"time_start": "06:00", "time_end": "09:00"}',8,true,false,
   '2000-01-01T00:00:00+00','2000-01-01T00:00:00+00'),

  -- Venerdì sera
  ('daily','🎉','TGIF',
   'Fai check-in di venerdì sera',
   'È venerdì! 🎊',
   'checkin_timeslot','{"time_start": "19:00", "time_end": "23:59"}',5,false,false,
   '2000-01-01T00:00:00+00','2000-01-01T00:00:00+00'),

  -- Colazione in bar
  ('daily','🥐','Colazione italiana',
   'Carica uno scontrino in un bar prima delle 10:00',
   'La colazione dei campioni! ☕',
   'checkin_receipt','{"category": "bar", "time_start": "06:00", "time_end": "10:00"}',7,false,false,
   '2000-01-01T00:00:00+00','2000-01-01T00:00:00+00'),

  -- Pranzo in ristorante
  ('daily','🍝','Pranzo vero',
   'Carica uno scontrino in un ristorante tra le 12:00 e le 14:00',
   'Pranzo certificato! 🍴',
   'checkin_receipt','{"category": "ristorante", "time_start": "12:00", "time_end": "14:00"}',8,false,false,
   '2000-01-01T00:00:00+00','2000-01-01T00:00:00+00'),

  -- ── SETTIMANALI ──────────────────────────────────────────────────────────

  -- 5 spot diversi
  ('weekly','🗺️','Esploratore della settimana',
   'Visita 5 spot diversi questa settimana',
   'Esploratore della settimana! 🏆',
   'checkin_multiple','{"count": 5}',25,false,false,
   '2000-01-01T00:00:00+00','2000-01-01T00:00:00+00'),

  -- 3 scontrini giorni diversi
  ('weekly','🧾','Consumatore fedele',
   'Carica 3 scontrini in 3 giorni diversi questa settimana',
   'Cliente serio! 💰',
   'checkin_receipt','{"count": 3, "different_days": true}',30,false,false,
   '2000-01-01T00:00:00+00','2000-01-01T00:00:00+00'),

  -- Scontrino €30
  ('weekly','💰','Grande consumatore',
   'Carica uno scontrino di almeno €30 questa settimana',
   'Spesa da campione! 🥇',
   'checkin_receipt_amount','{"min_amount": 30}',20,false,false,
   '2000-01-01T00:00:00+00','2000-01-01T00:00:00+00'),

  -- 3 categorie diverse
  ('weekly','🌟','Tutto in una settimana',
   'Visita almeno una categoria diversa ogni giorno per 3 giorni',
   'Versatile e instancabile! 🌈',
   'checkin_category','{"different_categories": 3}',35,false,false,
   '2000-01-01T00:00:00+00','2000-01-01T00:00:00+00'),

  -- 3 check-in di gruppo
  ('weekly','👨‍👩‍👧','Spirito di gruppo',
   'Usa il codice companion per 3 check-in di gruppo questa settimana',
   'La squadra fa la forza! 🤝',
   'checkin_companion','{"count": 3, "min_companions": 1}',30,false,false,
   '2000-01-01T00:00:00+00','2000-01-01T00:00:00+00'),

  -- 5 giorni su 7
  ('weekly','🏙️','Cittadino attivo',
   'Fai check-in ogni giorno per 5 giorni questa settimana',
   'Sei il cuore pulsante della città! ❤️',
   'checkin_multiple','{"count": 5, "different_days": true}',40,false,false,
   '2000-01-01T00:00:00+00','2000-01-01T00:00:00+00');

  RAISE NOTICE 'Seed missioni inserite con successo.';
END $$;

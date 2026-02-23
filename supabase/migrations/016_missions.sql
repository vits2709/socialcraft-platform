-- ══════════════════════════════════════════════════════════════
-- PRIORITÀ 8: Sistema Missioni
-- Tabelle: missions, user_missions
-- ══════════════════════════════════════════════════════════════

-- ── Tabella missioni ───────────────────────────────────────────────────────────
-- Contiene tutte le missioni configurabili dall'admin.
-- Ogni missione ha un tipo (daily/weekly), criteri di completamento
-- e un periodo di validità.

CREATE TABLE IF NOT EXISTS public.missions (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tipo di ciclicità
  type               text        NOT NULL DEFAULT 'daily'
                                 CHECK (type IN ('daily', 'weekly')),

  -- Contenuto visibile all'utente
  title              text        NOT NULL,
  description        text        NOT NULL,
  emoji              text        NOT NULL DEFAULT '🎯',
  completion_message text,

  -- Logica di completamento
  mission_type       text        NOT NULL
                                 CHECK (mission_type IN (
                                   'checkin',
                                   'checkin_receipt',
                                   'checkin_receipt_amount',
                                   'checkin_category',
                                   'checkin_spot',
                                   'checkin_timeslot',
                                   'checkin_companion',
                                   'vote',
                                   'first_visit',
                                   'checkin_weekday',
                                   'checkin_multiple'
                                 )),
  config             jsonb       NOT NULL DEFAULT '{}',

  -- Premi
  points_reward      integer     NOT NULL DEFAULT 5,
  -- badge_reward: uuid opzionale. FK omessa perché non esiste ancora
  --               una tabella badges con PK uuid (i badge usano id text).
  badge_reward       uuid,

  -- Limiti
  max_completions    integer,    -- null = completamento illimitato

  -- Visibilità / sorpresa
  is_surprise        boolean     NOT NULL DEFAULT false,

  -- Periodo di attivazione
  active_from        timestamptz NOT NULL,
  active_until       timestamptz NOT NULL,
  is_active          boolean     NOT NULL DEFAULT true,

  -- Audit
  created_by         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT missions_active_period_check CHECK (active_until > active_from)
);

-- Indici per query frequenti
CREATE INDEX IF NOT EXISTS idx_missions_active
  ON public.missions (is_active, active_from, active_until);

CREATE INDEX IF NOT EXISTS idx_missions_type
  ON public.missions (type, is_active);

CREATE INDEX IF NOT EXISTS idx_missions_mission_type
  ON public.missions (mission_type);

-- ── RLS: missions ──────────────────────────────────────────────────────────────
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

-- Lettura: chiunque può leggere le missioni attive (incluso service_role)
CREATE POLICY "missions_select_all"
  ON public.missions FOR SELECT
  USING (true);

-- Scrittura: solo admin autenticati (tabella admins) o service_role
CREATE POLICY "missions_write_admin"
  ON public.missions FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admins WHERE user_id = auth.uid()
    )
  );

-- ── Tabella progressi utente ───────────────────────────────────────────────────
-- Una riga per coppia (utente, missione).
-- Tiene traccia dell'assegnazione, del progresso e del completamento.

CREATE TABLE IF NOT EXISTS public.user_missions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id    uuid        NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  assigned_at   timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz,
  progress      jsonb       NOT NULL DEFAULT '{}',
  points_awarded integer,

  UNIQUE (user_id, mission_id)
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_user_missions_user
  ON public.user_missions (user_id, completed_at);

CREATE INDEX IF NOT EXISTS idx_user_missions_mission
  ON public.user_missions (mission_id);

-- ── RLS: user_missions ─────────────────────────────────────────────────────────
ALTER TABLE public.user_missions ENABLE ROW LEVEL SECURITY;

-- Lettura: ogni utente vede solo le proprie righe
CREATE POLICY "user_missions_select_own"
  ON public.user_missions FOR SELECT
  USING (auth.uid() = user_id);

-- Scrittura: il sistema inserisce/aggiorna via service_role (bypassa RLS).
-- Non serve policy esplicita per INSERT/UPDATE/DELETE:
-- service_role ignora RLS per definizione.
-- Aggiungiamo comunque una policy permissiva per sicurezza futura.
CREATE POLICY "user_missions_write_service"
  ON public.user_missions FOR ALL
  USING (true);

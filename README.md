# SocialCraft – Venue Rating (QR token monouso 120s) + Login Admin/Venue
Next.js App Router + Supabase (Auth + RLS).

## Cosa fa
- Home: leaderboard venue (media rating 1–5 + numero voti)
- Voto SOLO in presenza: serve QR con token `t=` valido
- Token: monouso + scadenza 120s
- Login: /login (venue + admin)
- Admin: /admin (protetta)
- Venue: /venue (protetta) con bottone "Genera QR voto (2 min)"

## Dipendenze
Nel progetto:
```bash
npm i @supabase/supabase-js @supabase/ssr
```

## Env
Crea `.env.local` (NON committare):
```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## DB
Esegui `supabase/schema.sql` nel Supabase SQL Editor.

## Setup admin
1) Crea utente in Auth (email/password)
2) Copia user id
3) SQL:
```sql
insert into public.admins (user_id) values ('UUID_ADMIN');
```

## Setup venue account
1) Crea utente in Auth (email/password)
2) Inserisci venue collegata:
```sql
insert into public.venues (name, city, owner_user_id)
values ('Mood','Vasto','UUID_UTENTE_VENUE');
```

## Flusso voto
- Staff venue apre /venue → "Genera QR voto (2 min)"
- Mostra il link/QR al banco
- Cliente scansiona → /rate/<venueId>?t=<token>
- Se token scaduto/usato → voto non disponibile

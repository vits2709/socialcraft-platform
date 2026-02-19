# Edge Function: validate-receipt

Valida automaticamente uno scontrino usando Claude AI (claude-haiku-4-5-20251001).

## Deploy

```bash
# 1. Login Supabase CLI
supabase login

# 2. Link al progetto
supabase link --project-ref <PROJECT_REF>

# 3. Imposta la chiave API Anthropic come secret (MAI nel codice!)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# 4. Deploy della funzione
supabase functions deploy validate-receipt --no-verify-jwt
```

## Input

POST con body JSON:
```json
{ "verification_id": "<uuid>" }
```

## Output

```json
{
  "ok": true,
  "status": "approved" | "pending",
  "auto_approved": true | false,
  "extracted": {
    "data": "YYYY-MM-DD",
    "ora": "HH:MM",
    "importo": 12.50,
    "locale": "Nome Locale"
  },
  "reasons": []
}
```

## Regole di auto-approvazione

1. **Importo** ≥ €3
2. **Data** dello scontrino = giorno del check-in dell'utente per quel venue
3. **Nome locale** corrisponde al nome dello spot (fuzzy match, case-insensitive)

Se tutte le regole passano → `status: approved` + +8 punti.
Se qualcosa non va → `status: pending` per revisione manuale admin.

## Variabili d'ambiente

| Secret | Note |
|--------|------|
| `ANTHROPIC_API_KEY` | Chiave API Anthropic — **SOLO nei secrets Supabase** |
| `SUPABASE_URL` | Iniettata automaticamente da Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Iniettata automaticamente da Supabase |

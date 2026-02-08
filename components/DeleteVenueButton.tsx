"use client";

import { useTransition } from "react";

export default function DeleteVenueButton({
  venueName,
}: {
  venueName: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="submit"
      className="btn"
      disabled={pending}
      onClick={(e) => {
        // blocca submit di default
        e.preventDefault();

        const msg =
          `⚠️ ATTENZIONE: stai per eliminare definitivamente la venue "${venueName}".\n\n` +
          `Verranno rimossi anche:\n` +
          `• promo della venue\n` +
          `• eventuali scan/eventi collegati\n` +
          `• record leaderboard\n` +
          `• (opzionale) utente auth proprietario\n\n` +
          `Questa azione è IRREVERSIBILE.\n\n` +
          `Vuoi continuare?`;

        const ok = window.confirm(msg);
        if (!ok) return;

        // se confermi, submit form
        startTransition(() => {
          (e.currentTarget as HTMLButtonElement).form?.requestSubmit();
        });
      }}
    >
      {pending ? "Elimino..." : "Elimina"}
    </button>
  );
}
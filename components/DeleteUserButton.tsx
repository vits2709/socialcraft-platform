"use client";

import { useFormStatus } from "react-dom";

export default function DeleteUserButton({ userName }: { userName: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="btn danger"
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (pending) return;

        const ok = confirm(
          `⚠️ ELIMINAZIONE UTENTE\n\nStai per eliminare: "${userName}".\nVerranno rimossi anche eventi/voti collegati (se l'utente è UUID).\n\nConfermi?`
        );

        if (!ok) e.preventDefault();
      }}
    >
      {pending ? "Elimino..." : "Elimina"}
    </button>
  );
}
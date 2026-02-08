import { Suspense } from "react";
import ScanClient from "./ScanClient";

export const dynamic = "force-dynamic"; // evita prerender/export static e risolve build su Vercel

export default function ScanPage() {
  return (
    <div className="card">
      <div className="cardHead">
        <div>
          <h1 className="h1" style={{ marginBottom: 6 }}>
            Scan
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            Pagina di scan (legge i parametri dall’URL).
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="notice" style={{ marginTop: 12 }}>
            Caricamento…
          </div>
        }
      >
        <ScanClient />
      </Suspense>
    </div>
  );
}
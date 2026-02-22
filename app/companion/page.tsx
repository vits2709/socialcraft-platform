import { Suspense } from "react";
import CompanionClient from "./CompanionClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div style={{ textAlign: "center", padding: 60, fontSize: 32 }}>👥</div>}>
      <CompanionClient />
    </Suspense>
  );
}

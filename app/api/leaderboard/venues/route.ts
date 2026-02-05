import { NextResponse } from "next/server";

export async function GET() {
  const data = [
    { id: "v1", name: "Mood", score: 1280, meta: "Vasto" },
    { id: "v2", name: "CioccoBar", score: 1035, meta: "San Salvo" },
    { id: "v3", name: "Blue Room", score: 980, meta: "Pescara" }
  ].sort((a, b) => b.score - a.score);

  return NextResponse.json(data);
}

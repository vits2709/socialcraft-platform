import { NextResponse } from "next/server";

export async function GET() {
  const data = [
    { id: "u1", name: "Vitale", score: 420, meta: "Founder" },
    { id: "u2", name: "Marco", score: 360, meta: "Top user" },
    { id: "u3", name: "Sara", score: 335, meta: "Contributor" }
  ].sort((a, b) => b.score - a.score);

  return NextResponse.json(data);
}

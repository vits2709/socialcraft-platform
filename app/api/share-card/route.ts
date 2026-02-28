import { NextRequest, NextResponse } from "next/server";
import satori from "satori";
import sharp from "sharp";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { renderShareCard } from "@/lib/share-card-satori";
import type { ShareCardData, ShareCardType, ShareCardFormat } from "@/lib/share-card-types";

export const runtime = "nodejs";

// ─── Font cache (module-level, persists across requests in the same process) ──

let interBold: ArrayBuffer | null = null;
let interBlack: ArrayBuffer | null = null;

async function getFont(weight: 700 | 900): Promise<ArrayBuffer> {
  const filename = weight === 700 ? "Inter-Bold.woff" : "Inter-Black.woff";
  const filepath = join(process.cwd(), "public", "fonts", filename);

  if (existsSync(filepath)) {
    const buf = readFileSync(filepath);
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  }

  // CDN fallback
  const url =
    weight === 700
      ? "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-700-normal.woff"
      : "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-900-normal.woff";
  const res = await fetch(url);
  return res.arrayBuffer();
}

// ─── Emoji cache ──────────────────────────────────────────────────────────────

const emojiCache = new Map<string, string>();

async function loadEmoji(segment: string): Promise<string> {
  if (emojiCache.has(segment)) return emojiCache.get(segment)!;

  const filename = [...segment]
    .filter((c) => c.codePointAt(0) !== 0xfe0f) // strip variation selector
    .map((c) => c.codePointAt(0)!.toString(16))
    .join("-");

  try {
    const res = await fetch(
      `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${filename}.svg`
    );
    if (res.ok) {
      const svg = await res.text();
      const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
      emojiCache.set(segment, dataUrl);
      return dataUrl;
    }
  } catch {
    // ignore, return segment as-is
  }

  return segment;
}

// ─── GET handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const type = searchParams.get("type") as ShareCardType | null;
  const format = searchParams.get("format") as ShareCardFormat | null;
  const dataStr = searchParams.get("data");

  if (!type || !format || !dataStr) {
    return NextResponse.json({ error: "Missing params: type, format, data" }, { status: 400 });
  }

  const validTypes: ShareCardType[] = ["badge", "ranking", "prize", "streak", "mission"];
  const validFormats: ShareCardFormat[] = ["square", "story"];
  if (!validTypes.includes(type) || !validFormats.includes(format)) {
    return NextResponse.json({ error: "Invalid type or format" }, { status: 400 });
  }

  let data: ShareCardData;
  try {
    data = JSON.parse(dataStr);
  } catch {
    return NextResponse.json({ error: "Invalid data JSON" }, { status: 400 });
  }

  const w = 1080;
  const h = format === "story" ? 1920 : 1080;

  // Load fonts (cached after first request)
  if (!interBold) interBold = await getFont(700);
  if (!interBlack) interBlack = await getFont(900);

  const element = renderShareCard(type, data, format);

  const svg = await satori(element, {
    width: w,
    height: h,
    fonts: [
      { name: "Inter", data: interBold,  weight: 700, style: "normal" },
      { name: "Inter", data: interBlack, weight: 900, style: "normal" },
    ],
    loadAdditionalAsset: async (code: string, segment: string) => {
      if (code === "emoji") return loadEmoji(segment);
      return segment;
    },
  });

  const pngBuf = await sharp(Buffer.from(svg)).png().toBuffer();
  // Slice into a concrete ArrayBuffer (TypeScript 5.9+ requires this to satisfy BlobPart)
  const arrayBuffer = pngBuf.buffer.slice(
    pngBuf.byteOffset,
    pngBuf.byteOffset + pngBuf.byteLength
  ) as ArrayBuffer;
  const pngBlob = new Blob([arrayBuffer], { type: "image/png" });

  return new NextResponse(pngBlob, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="cityquest-${type}-${format}.png"`,
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}

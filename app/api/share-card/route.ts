import { NextRequest, NextResponse } from "next/server";
import satori from "satori";
import sharp from "sharp";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { renderShareCard } from "@/lib/share-card-satori";
import type { ShareCardData, ShareCardType, ShareCardFormat } from "@/lib/share-card-types";

export const runtime = "nodejs";

// ─── Font cache ───────────────────────────────────────────────────────────────

type FontCache = { regular: ArrayBuffer | null; semibold: ArrayBuffer | null; bold: ArrayBuffer | null; black: ArrayBuffer | null };
const fonts: FontCache = { regular: null, semibold: null, bold: null, black: null };

const FONT_FILES: Record<keyof FontCache, { file: string; cdnUrl: string }> = {
  regular:  { file: "Inter-Regular.woff",  cdnUrl: "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-400-normal.woff" },
  semibold: { file: "Inter-SemiBold.woff", cdnUrl: "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-600-normal.woff" },
  bold:     { file: "Inter-Bold.woff",     cdnUrl: "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-700-normal.woff" },
  black:    { file: "Inter-Black.woff",    cdnUrl: "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-900-normal.woff" },
};

async function loadFont(key: keyof FontCache): Promise<ArrayBuffer> {
  if (fonts[key]) return fonts[key]!;
  const { file, cdnUrl } = FONT_FILES[key];
  const filepath = join(process.cwd(), "public", "fonts", file);
  let ab: ArrayBuffer;
  if (existsSync(filepath)) {
    const buf = readFileSync(filepath);
    ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  } else {
    const res = await fetch(cdnUrl);
    ab = await res.arrayBuffer();
  }
  fonts[key] = ab;
  return ab;
}

// ─── Emoji cache ──────────────────────────────────────────────────────────────

const emojiCache = new Map<string, string>();

async function loadEmoji(segment: string): Promise<string> {
  if (emojiCache.has(segment)) return emojiCache.get(segment)!;

  const filename = [...segment]
    .filter((c) => c.codePointAt(0) !== 0xfe0f)
    .map((c) => c.codePointAt(0)!.toString(16))
    .join("-");

  try {
    const res = await fetch(`https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${filename}.svg`);
    if (res.ok) {
      const svg = await res.text();
      const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
      emojiCache.set(segment, dataUrl);
      return dataUrl;
    }
  } catch { /* fall through */ }

  return segment;
}

// ─── GET handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const type    = searchParams.get("type")   as ShareCardType   | null;
  const format  = searchParams.get("format") as ShareCardFormat | null;
  const dataStr = searchParams.get("data");

  if (!type || !format || !dataStr) {
    return NextResponse.json({ error: "Missing params: type, format, data" }, { status: 400 });
  }

  const validTypes:   ShareCardType[]   = ["badge", "ranking", "prize", "streak", "mission"];
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

  // Load all four font weights (cached after first request)
  const [regular, semibold, bold, black] = await Promise.all([
    loadFont("regular"),
    loadFont("semibold"),
    loadFont("bold"),
    loadFont("black"),
  ]);

  const element = renderShareCard(type, data, format);

  const svg = await satori(element, {
    width:  1080,
    height: format === "story" ? 1920 : 1080,
    fonts: [
      { name: "Inter", data: regular,  weight: 400, style: "normal" },
      { name: "Inter", data: semibold, weight: 600, style: "normal" },
      { name: "Inter", data: bold,     weight: 700, style: "normal" },
      { name: "Inter", data: black,    weight: 900, style: "normal" },
    ],
    loadAdditionalAsset: async (code: string, segment: string) => {
      if (code === "emoji") return loadEmoji(segment);
      return segment;
    },
  });

  // sharp: flat PNG on dark background (in case card has transparent areas)
  const pngBuf = await sharp(Buffer.from(svg))
    .flatten({ background: { r: 6, g: 2, b: 16 } })
    .png()
    .toBuffer();

  const arrayBuffer = pngBuf.buffer.slice(
    pngBuf.byteOffset,
    pngBuf.byteOffset + pngBuf.byteLength
  ) as ArrayBuffer;

  return new NextResponse(new Blob([arrayBuffer], { type: "image/png" }), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="cityquest-${type}-${format}.png"`,
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}

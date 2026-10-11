import { NextRequest, NextResponse } from "next/server";
import { validateSourcedBrief } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey)
    return NextResponse.json({ error: "Gemini voiceover is not configured." }, { status: 503 });

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid voiceover request." }, { status: 400 });
  }
  const brief = validateSourcedBrief(input);
  if (!brief || brief.mode !== "researched" || brief.scriptReady === false ||
      brief.voiceover.length < 80 || brief.voiceover.length > 1600)
    return NextResponse.json({ error: "A researched, finished script is required." }, { status: 400 });

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-lite-tts:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [{
              text: brief.voiceover,
              speech_metadata: { style: "Friendly, energetic and trustworthy English fintech promo narrator, natural pace. Read the exact words clearly." },
            }],
          }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { voice: "Kore" } },
          },
        }),
        signal: AbortSignal.timeout(50_000),
        cache: "no-store",
      },
    );
    if (!response.ok) {
      const status = response.status === 429 ? 429 : 502;
      return NextResponse.json({
        error: response.status === 429
          ? "Gemini voiceover quota was reached. Try again later."
          : `Gemini voiceover returned ${response.status}.`,
      }, { status });
    }
    const payload = await response.json();
    const encoded: unknown = payload?.candidates?.[0]?.content?.parts?.find(
      (part: { inlineData?: { data?: unknown } }) => part.inlineData?.data,
    )?.inlineData?.data;
    if (typeof encoded !== "string" || encoded.length > 7_000_000)
      return NextResponse.json({ error: "Gemini returned no usable voiceover audio." }, { status: 502 });
    const audio = Buffer.from(encoded, "base64");
    if (audio.length < 44 || audio.length > 4_000_000 || audio.toString("ascii", 0, 4) !== "RIFF")
      return NextResponse.json({ error: "Gemini returned an invalid voiceover file." }, { status: 502 });
    return new NextResponse(new Uint8Array(audio), {
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "no-store",
        "Content-Disposition": "inline; filename=voiceover.wav",
      },
    });
  } catch {
    return NextResponse.json({ error: "Voiceover generation is unavailable. Try again later." }, { status: 502 });
  }
}

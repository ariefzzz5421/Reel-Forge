import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      researchReady: Boolean(process.env.REEL_FORGE_RESEARCH_API_URL || process.env.GEMINI_API_KEY),
      videoReady: Boolean(process.env.REEL_FORGE_VIDEO_API_URL || process.env.GEMINI_API_KEY),
      videoMode: process.env.REEL_FORGE_VIDEO_API_URL ? "provider" : process.env.GEMINI_API_KEY ? "browser" : "none",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

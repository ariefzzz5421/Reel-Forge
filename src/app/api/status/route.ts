import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      researchReady: Boolean(process.env.REEL_FORGE_RESEARCH_API_URL),
      videoReady: Boolean(process.env.REEL_FORGE_VIDEO_API_URL),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

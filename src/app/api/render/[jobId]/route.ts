import { NextRequest, NextResponse } from "next/server";
import { validateRenderJob } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ jobId: string }> },
) {
  const endpoint = process.env.REEL_FORGE_VIDEO_API_URL;
  if (!endpoint)
    return NextResponse.json(
      { error: "Video API is not connected yet." },
      { status: 503 },
    );
  const { jobId } = await context.params;
  if (!/^[\w-]{1,128}$/.test(jobId))
    return NextResponse.json({ error: "Invalid job ID." }, { status: 400 });
  try {
    const response = await fetch(
      `${endpoint.replace(/\/$/, "")}/${encodeURIComponent(jobId)}`,
      {
        headers: process.env.REEL_FORGE_API_KEY
          ? { Authorization: `Bearer ${process.env.REEL_FORGE_API_KEY}` }
          : {},
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      },
    );
    if (!response.ok)
      return NextResponse.json(
        { error: `Video provider returned ${response.status}.` },
        { status: 502 },
      );
    const job = validateRenderJob(await response.json());
    if (!job || job.jobId !== jobId)
      return NextResponse.json(
        { error: "Video provider returned an invalid job." },
        { status: 502 },
      );
    return NextResponse.json(job, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { error: "Could not check render progress." },
      { status: 502 },
    );
  }
}

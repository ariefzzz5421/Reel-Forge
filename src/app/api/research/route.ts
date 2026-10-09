import { NextRequest, NextResponse } from "next/server";
import { validateProject, validateResearchJob, validateSourcedBrief } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const endpoint = process.env.REEL_FORGE_RESEARCH_API_URL;
  if (!endpoint)
    return NextResponse.json(
      { error: "Research API is not connected yet." },
      { status: 503 },
    );
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const project = validateProject(payload);
  if (!project)
    return NextResponse.json(
      { error: "Enter a project name and valid public links (up to four)." },
      { status: 400 },
    );
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.REEL_FORGE_API_KEY
          ? { Authorization: `Bearer ${process.env.REEL_FORGE_API_KEY}` }
          : {}),
      },
      body: JSON.stringify({
        project,
        format: "reel-forge-brief-v1",
        durationSeconds: 60,
        sceneCount: 9,
        style:
          "dark skyline, orange sunset, consistent mascot, kinetic text, phone UI when relevant",
        instruction:
          "Research official/public sources first. Cite every factual claim. Do not invent founders, funding, status, users, product UI or URL. Return 8-10 scenes covering exactly 60 seconds.",
      }),
      signal: AbortSignal.timeout(45_000),
      cache: "no-store",
    });
    if (!response.ok)
      return NextResponse.json(
        { error: `Research provider returned ${response.status}.` },
        { status: 502 },
      );
    const result: unknown = await response.json();
    const brief = validateSourcedBrief(result);
    const job = brief ? null : validateResearchJob(result);
    if (!brief && !job)
      return NextResponse.json(
        { error: "Research provider returned an invalid or unsourced result. Check the API contract." },
        { status: 502 },
      );
    return NextResponse.json(brief ?? job, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Research provider is unavailable. Try again later." },
      { status: 502 },
    );
  }
}

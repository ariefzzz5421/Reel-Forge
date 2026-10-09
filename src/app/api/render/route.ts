import { NextRequest, NextResponse } from "next/server";
import {
  validateBrief,
  validateProject,
  validateRenderJob,
} from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const endpoint = process.env.REEL_FORGE_VIDEO_API_URL;
  if (!endpoint)
    return NextResponse.json(
      { error: "Video API is not connected yet." },
      { status: 503 },
    );
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }
  let projectValue: unknown;
  let briefValue: unknown;
  try {
    projectValue = JSON.parse(String(form.get("project") ?? ""));
    briefValue = JSON.parse(String(form.get("brief") ?? ""));
  } catch {
    return NextResponse.json(
      { error: "Invalid project brief." },
      { status: 400 },
    );
  }
  const project = validateProject(projectValue);
  const brief = validateBrief(briefValue);
  if (
    !project ||
    !brief ||
    (briefValue && (briefValue as { mode?: string }).mode !== "researched")
  )
    return NextResponse.json(
      { error: "A researched brief is required before video rendering." },
      { status: 400 },
    );
  const pfp = form.get("pfp");
  if (
    pfp &&
    (!(pfp instanceof File) ||
      pfp.size > 4 * 1024 * 1024 ||
      !["image/png", "image/jpeg", "image/webp"].includes(pfp.type))
  )
    return NextResponse.json(
      { error: "PFP must be PNG, JPEG, or WebP under 4 MB." },
      { status: 400 },
    );
  try {
    const outgoing = new FormData();
    outgoing.set("project", JSON.stringify(project));
    outgoing.set("brief", JSON.stringify(brief));
    outgoing.set(
      "style",
      "16:9, 60s, dark skyline, orange sunset, kinetic typography, consistent mascot, English voiceover",
    );
    if (pfp instanceof File) outgoing.set("pfp", pfp);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: process.env.REEL_FORGE_API_KEY
        ? { Authorization: `Bearer ${process.env.REEL_FORGE_API_KEY}` }
        : {},
      body: outgoing,
      signal: AbortSignal.timeout(45_000),
      cache: "no-store",
    });
    if (!response.ok)
      return NextResponse.json(
        { error: `Video provider returned ${response.status}.` },
        { status: 502 },
      );
    const job = validateRenderJob(await response.json());
    if (!job)
      return NextResponse.json(
        {
          error:
            "Video provider returned an invalid job. Check the API contract.",
        },
        { status: 502 },
      );
    return NextResponse.json(job, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { error: "Video provider is unavailable. Try again later." },
      { status: 502 },
    );
  }
}

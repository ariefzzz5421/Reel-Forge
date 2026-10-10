import type { Brief, ProjectInput, ResearchJob, RenderJob, Scene, Source } from "./types";

export function publicUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local") ||
      host === "0.0.0.0" ||
      host === "::1"
    )
      return null;
    if (/^(?:10|127|192\.168|169\.254)\./.test(host)) return null;
    if (/^172\.(?:1[6-9]|2\d|3[01])\./.test(host)) return null;
    if (/^100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(host)) return null;
    if (/^(?:fc|fd|fe8|fe9|fea|feb)/.test(host)) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function validateProject(value: unknown): ProjectInput | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const description =
    typeof input.description === "string" ? input.description.trim() : "";
  const rawLinks = Array.isArray(input.links) ? input.links : [];
  if (
    !name ||
    name.length > 100 ||
    description.length > 3000 ||
    rawLinks.length > 4
  )
    return null;
  const links = rawLinks
    .filter(
      (link): link is string => typeof link === "string" && link.trim() !== "",
    )
    .map((link) => publicUrl(link));
  if (links.some((link) => !link)) return null;
  return { name, description, links: links as string[] };
}

export function validateBrief(value: unknown): Brief | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (
    typeof data.title !== "string" ||
    typeof data.summary !== "string" ||
    typeof data.voiceover !== "string"
  )
    return null;
  if (
    !Array.isArray(data.scenes) ||
    data.scenes.length < 8 ||
    data.scenes.length > 10
  )
    return null;
  if (
    data.title.length > 180 ||
    data.summary.length > 3000 ||
    data.voiceover.length > 3000
  )
    return null;
  const scenes: Scene[] = [];
  for (const item of data.scenes) {
    if (!item || typeof item !== "object") return null;
    const scene = item as Record<string, unknown>;
    if (
      ["title", "overlay", "voiceover", "visualPrompt"].some(
        (key) =>
          typeof scene[key] !== "string" ||
          (scene[key] as string).length > 1500,
      )
    )
      return null;
    if (
      typeof scene.start !== "number" ||
      typeof scene.end !== "number" ||
      !Number.isFinite(scene.start) ||
      !Number.isFinite(scene.end) ||
      scene.start < 0 ||
      scene.end > 60 ||
      scene.end <= scene.start
    )
      return null;
    scenes.push(scene as Scene);
  }
  if (
    scenes[0].start !== 0 ||
    scenes.at(-1)?.end !== 60 ||
    scenes.some(
      (scene, index) => index > 0 && scene.start !== scenes[index - 1].end,
    )
  )
    return null;
  const sources: Source[] = Array.isArray(data.sources)
    ? data.sources
        .flatMap((item) => {
          if (!item || typeof item !== "object") return [];
          const source = item as Record<string, unknown>;
          const url = publicUrl(source.url);
          return url && typeof source.title === "string"
            ? [{ title: source.title.slice(0, 180), url }]
            : [];
        })
        .slice(0, 16)
    : [];
  const facts = Array.isArray(data.facts)
    ? data.facts
        .flatMap((item) => {
          if (!item || typeof item !== "object") return [];
          const fact = item as Record<string, unknown>;
          if (typeof fact.label !== "string" || typeof fact.value !== "string")
            return [];
          return [
            {
              label: fact.label.slice(0, 80),
              value: fact.value.slice(0, 400),
              sourceUrl: publicUrl(fact.sourceUrl) ?? undefined,
            },
          ];
        })
        .slice(0, 16)
    : [];
  return {
    mode: "researched",
    scriptReady: data.scriptReady === false ? false : undefined,
    title: data.title,
    summary: data.summary,
    voiceover: data.voiceover,
    sources,
    facts,
    scenes,
    disclaimer:
      typeof data.disclaimer === "string"
        ? data.disclaimer.slice(0, 500)
        : undefined,
    searchSuggestionsHtml:
      typeof data.searchSuggestionsHtml === "string" &&
      data.searchSuggestionsHtml.length <= 30_000
        ? data.searchSuggestionsHtml
        : undefined,
  };
}

export function validateSourcedBrief(value: unknown): Brief | null {
  const brief = validateBrief(value);
  if (!brief || brief.sources.length === 0 || brief.facts.some((fact) => !fact.sourceUrl))
    return null;
  return brief;
}

export function validateResearchJob(value: unknown): ResearchJob | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (typeof data.jobId !== "string" || !/^[\w-]{1,128}$/.test(data.jobId))
    return null;
  if (!["queued", "processing", "completed", "failed"].includes(String(data.status)))
    return null;
  const brief = data.status === "completed" ? validateSourcedBrief(data.brief) : null;
  if (data.status === "completed" && !brief) return null;
  return {
    jobId: data.jobId,
    status: data.status as ResearchJob["status"],
    brief: brief ?? undefined,
    error: typeof data.error === "string" ? data.error.slice(0, 300) : undefined,
  };
}

export function validateRenderJob(value: unknown): RenderJob | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (typeof data.jobId !== "string" || !/^[\w-]{1,128}$/.test(data.jobId))
    return null;
  if (
    !["queued", "processing", "completed", "failed"].includes(
      String(data.status),
    )
  )
    return null;
  const videoUrl = publicUrl(data.videoUrl) ?? undefined;
  if (data.status === "completed" && !videoUrl) return null;
  return {
    jobId: data.jobId,
    status: data.status as RenderJob["status"],
    videoUrl,
    error:
      typeof data.error === "string" ? data.error.slice(0, 300) : undefined,
  };
}

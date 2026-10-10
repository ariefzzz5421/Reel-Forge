import assert from "node:assert/strict";
import { researchWithWebSearch } from "../src/lib/web-research.ts";

const source = "https://example.org/project";
const project = { name: "Example Project", description: "Example creator tool", links: [] };
const times = [0, 6, 13, 20, 27, 34, 41, 48, 54, 60];
const result = {
  title: "Example Project",
  summary: "A sourced introduction.",
  voiceover: "A script.",
  sources: [{ title: "Official", url: source }],
  facts: [{ label: "Product", value: "Creator tool", sourceUrl: source }],
  scenes: times.slice(0, -1).map((start, index) => ({
    title: `Scene ${index + 1}`,
    start,
    end: times[index + 1],
    overlay: `SCENE ${index + 1}`,
    voiceover: "A sentence.",
    visualPrompt: "Mascot and orange city.",
  })),
};
for (const scene of result.scenes)
  scene.voiceover = "Discover this creator tool through verified public details, and explore how artists can make simple clips.";
result.voiceover = result.scenes.map((scene) => scene.voiceover).join(" ");
const webPayload = {
  answer: "Example Project is a creator tool.",
  results: [{ title: "Official example", url: source, content: "Example Project is a creator tool for artists. It makes simple clips." }],
};
let calls = 0;
const brief = await researchWithWebSearch(project, "gemini-key", undefined, async (url, init) => {
  calls++;
  if (calls === 1) {
    assert.equal(url, "https://api.tavily.com/search");
    assert.equal(init.headers["X-Tavily-Access-Mode"], "keyless");
    assert.equal(init.headers.Authorization, undefined);
    return Response.json(webPayload);
  }
  assert.match(url, /gemini-3\.5-flash-lite:generateContent$/);
  assert.equal(init.headers["x-goog-api-key"], "gemini-key");
  assert.equal(JSON.parse(init.body).tools, undefined);
  return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(result) }] } }] });
});
assert.equal(calls, 2);
assert.equal(brief.mode, "researched");
assert.notEqual(brief.scriptReady, false);
assert.equal(brief.facts[0].sourceUrl, source);

const looseTiming = { ...result, sources: [], scenes: result.scenes.map((scene) => ({ ...scene, start: 0, end: 1 })) };
const normalized = await researchWithWebSearch(project, "gemini-key", undefined, async (url) =>
  url.includes("tavily") ? Response.json(webPayload)
    : Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(looseTiming) }] } }] }),
);
assert.notEqual(normalized.scriptReady, false);
assert.equal(normalized.scenes.at(-1).end, 60);
assert.equal(normalized.sources[0].url, source);

const fallback = await researchWithWebSearch(project, "gemini-key", "tavily-key", async (url, init) => {
  if (url.includes("tavily")) {
    assert.equal(init.headers.Authorization, "Bearer tavily-key");
    return Response.json(webPayload);
  }
  return new Response("{}", { status: 503 });
});
assert.match(fallback.disclaimer, /outline/);
assert.equal(fallback.scriptReady, false);
assert.equal(fallback.scenes.length, 9);
assert.equal(fallback.sources[0].url, source);

await assert.rejects(
  researchWithWebSearch(project, "gemini-key", undefined, async () => new Response("{}", { status: 429 })),
  /allowance was reached/,
);
await assert.rejects(
  researchWithWebSearch(project, "gemini-key", undefined, async () => Response.json({
    results: [{ title: "Unrelated", url: "https://other.example/item", content: "A completely different application with no matching project identity." }],
  })),
  /no usable sources/,
);

const wrongSource = { ...result, facts: [{ label: "Funding", value: "Not supported", sourceUrl: "https://other.example/fund" }] };
const unverified = await researchWithWebSearch(project, "gemini-key", undefined, async (url) =>
  url.includes("tavily") ? Response.json(webPayload)
    : Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(wrongSource) }] } }] }),
);
assert.notEqual(unverified.scriptReady, false);
assert.equal(unverified.facts[0].sourceUrl, source);
assert.doesNotMatch(unverified.facts[0].value, /Not supported/);
process.stdout.write("Web search, Gemini writing, source check, outline fallback, and quota checks passed.\n");

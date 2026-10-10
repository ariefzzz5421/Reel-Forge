import assert from "node:assert/strict";
import { researchWithGemini, GeminiResearchError } from "../src/lib/gemini-research.ts";

const times = [0, 6, 13, 20, 27, 34, 41, 48, 54, 60];
const source = "https://example.org/project";
const responseText = JSON.stringify({
  title: "Example Project",
  summary: "A sourced introduction.",
  voiceover: "A complete sixty-second voiceover.",
  sources: [{ title: "Project", url: source }],
  facts: [{ label: "Product", value: "An example", sourceUrl: source }],
  scenes: times.slice(0, -1).map((start, index) => ({
    title: `Scene ${index + 1}`,
    start,
    end: times[index + 1],
    overlay: `SCENE ${index + 1}`,
    voiceover: "A scene voiceover.",
    visualPrompt: "Dark skyline and orange gradient.",
  })),
});
const project = { name: "Example Project", description: "", links: [source] };
const nameOnlyProject = { ...project, links: [] };
const candidate = {
  candidates: [{
    content: { parts: [{ text: responseText }] },
    groundingMetadata: {
      groundingChunks: [{ web: { uri: source, title: "Official project" } }],
      searchEntryPoint: { renderedContent: "<a href='https://google.com'>Search</a>" },
    },
  }],
};
const mock = async (url, init) => {
  assert.match(url, /gemini-2\.5-flash:generateContent$/);
  assert.equal(init.headers["x-goog-api-key"], "test-key");
  assert.deepEqual(JSON.parse(init.body).tools, [{ google_search: {} }]);
  return new Response(JSON.stringify(candidate), { status: 200 });
};
const brief = await researchWithGemini(nameOnlyProject, "test-key", mock);
assert.equal(brief.mode, "researched");
assert.equal(brief.sources[0].url, source);
assert.equal(brief.scenes.length, 9);
assert.match(brief.searchSuggestionsHtml, /Search/);
let calls = 0;
const fallbackBrief = await researchWithGemini(nameOnlyProject, "test-key", async (url, init) => {
  calls += 1;
  if (calls === 1) return new Response("{}", { status: 404 });
  assert.match(url, /gemini-2\.5-flash-lite:generateContent$/);
  return mock("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", init);
});
assert.equal(fallbackBrief.mode, "researched");
assert.equal(calls, 2);
const linkBrief = await researchWithGemini(project, "test-key", async (url, init) => {
  assert.match(url, /gemini-3\.8-flash:generateContent$/);
  assert.deepEqual(JSON.parse(init.body).tools, [{ url_context: {} }]);
  return new Response(JSON.stringify({ candidates: [{
    content: { parts: [{ text: responseText }] },
    urlContextMetadata: { urlMetadata: [{
      retrievedUrl: source,
      urlRetrievalStatus: "URL_RETRIEVAL_STATUS_SUCCESS",
    }] },
  }] }));
});
assert.equal(linkBrief.mode, "researched");
assert.equal(linkBrief.sources[0].url, source);
assert.equal(linkBrief.searchSuggestionsHtml, undefined);
assert.match(linkBrief.disclaimer, /supplied links/);
await assert.rejects(
  researchWithGemini(project, "test-key", async () => new Response("{}", { status: 429 })),
  (error) => error instanceof GeminiResearchError && error.status === 429,
);
const withoutSources = structuredClone(candidate);
withoutSources.candidates[0].groundingMetadata.groundingChunks = [];
await assert.rejects(
  researchWithGemini(nameOnlyProject, "test-key", async () => new Response(JSON.stringify(withoutSources))),
  /verifiable search sources/,
);
process.stdout.write("Gemini request, source gate, and quota error checks passed.\n");

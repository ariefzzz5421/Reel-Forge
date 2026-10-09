import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";

const times = [0, 6, 13, 20, 27, 34, 41, 48, 54, 60];
const sampleBrief = (name) => ({
  title: `${name} — source-backed story`,
  summary: "An example project for a provider contract check.",
  voiceover: "A complete voiceover for a sixty-second project introduction.",
  sources: [{ title: "Official site", url: "https://example.org/" }],
  facts: [{ label: "Status", value: "Example only", sourceUrl: "https://example.org/" }],
  scenes: times.slice(0, -1).map((start, index) => ({
    title: `Scene ${index + 1}`,
    start,
    end: times[index + 1],
    overlay: `SCENE ${index + 1}`,
    voiceover: "A scene voiceover.",
    visualPrompt: "Dark skyline, orange sunset, consistent mascot.",
  })),
});
let researchPolls = 0;

const provider = createServer(async (request, response) => {
  response.setHeader("Content-Type", "application/json");
  if (request.url === "/research" && request.method === "POST") {
    let body = "";
    for await (const part of request) body += part;
    const payload = JSON.parse(body);
    assert.ok(["Example Project", "Async Project"].includes(payload.project.name));
    assert.equal(payload.durationSeconds, 60);
    response.end(JSON.stringify(payload.project.name === "Async Project"
      ? { jobId: "research_123", status: "queued" }
      : sampleBrief(payload.project.name)));
    return;
  }
  if (request.url === "/research/research_123" && request.method === "GET") {
    researchPolls += 1;
    response.end(JSON.stringify(researchPolls === 1
      ? { jobId: "research_123", status: "processing" }
      : { jobId: "research_123", status: "completed", brief: sampleBrief("Async Project") }));
    return;
  }
  if (request.url === "/render" && request.method === "POST") {
    assert.match(request.headers["content-type"] ?? "", /multipart\/form-data/);
    for await (const _part of request) {
      /* Drain the upload. */
    }
    response.end(JSON.stringify({ jobId: "job_123", status: "queued" }));
    return;
  }
  if (request.url === "/render/job_123" && request.method === "GET") {
    response.end(
      JSON.stringify({
        jobId: "job_123",
        status: "completed",
        videoUrl: "https://example.org/video.mp4",
      }),
    );
    return;
  }
  response.statusCode = 404;
  response.end(JSON.stringify({ error: "Not found" }));
});

let app;
try {
  provider.listen(0, "127.0.0.1");
  await once(provider, "listening");
  const providerPort = provider.address().port;
  const appPort = 32740;
  app = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-p", String(appPort)],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        REEL_FORGE_RESEARCH_API_URL: `http://127.0.0.1:${providerPort}/research`,
        REEL_FORGE_VIDEO_API_URL: `http://127.0.0.1:${providerPort}/render`,
        REEL_FORGE_API_KEY: "contract-key",
      },
      stdio: "ignore",
    },
  );
  const base = `http://127.0.0.1:${appPort}`;
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const status = await fetch(`${base}/api/status`);
      if (status.ok) {
        ready = true;
        break;
      }
    } catch {
      /* Wait for Next.js to start. */
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  assert.ok(ready, "Next.js did not start");
  const project = {
    name: "Example Project",
    description: "A fictional project",
    links: ["https://example.org/"],
  };
  const status = await (await fetch(`${base}/api/status`)).json();
  assert.equal(status.researchReady, true);
  assert.equal(status.videoReady, true);
  const invalid = await fetch(`${base}/api/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "", description: "", links: [] }),
  });
  assert.equal(invalid.status, 400);
  const privateLink = await fetch(`${base}/api/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...project, links: ["http://127.0.0.1/private"] }),
  });
  assert.equal(privateLink.status, 400);
  const researched = await fetch(`${base}/api/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(project),
  });
  assert.equal(researched.status, 200);
  const brief = await researched.json();
  assert.equal(brief.mode, "researched");
  assert.equal(brief.scenes.length, 9);
  const queued = await fetch(`${base}/api/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...project, name: "Async Project" }),
  });
  assert.equal(queued.status, 200);
  assert.equal((await queued.json()).status, "queued");
  const processing = await fetch(`${base}/api/research/research_123`);
  assert.equal((await processing.json()).status, "processing");
  const researchComplete = await fetch(`${base}/api/research/research_123`);
  const researchResult = await researchComplete.json();
  assert.equal(researchResult.status, "completed");
  assert.equal(researchResult.brief.mode, "researched");
  const form = new FormData();
  form.set("project", JSON.stringify(project));
  form.set("brief", JSON.stringify(brief));
  form.set(
    "pfp",
    new Blob([Uint8Array.from([137, 80, 78, 71])], { type: "image/png" }),
    "mascot.png",
  );
  const render = await fetch(`${base}/api/render`, {
    method: "POST",
    body: form,
  });
  assert.equal(render.status, 200);
  assert.equal((await render.json()).status, "queued");
  const completed = await fetch(`${base}/api/render/job_123`);
  assert.equal(completed.status, 200);
  assert.equal((await completed.json()).status, "completed");
  process.stdout.write(
    "Synchronous and queued research, validation, upload, render job, and polling contracts passed.\n",
  );
} finally {
  if (app) app.kill();
  provider.close();
}

# Reel-Forge

Reel-Forge is a source-aware creative workbench for 60-second project introduction videos. Users enter a project name, an optional description and up to four reference links, and optionally upload a PFP. The site previews a nine-scene concept immediately. When research and video services are configured, it can request a sourced brief, send the brief and PFP for rendering, track the render job, and show the finished video.

The [original 60-second creative brief](docs/reel-forge-promo-60s.md) remains available as a style reference. It is a concept, not a factual product claim.

Uploaded PFPs are automatically processed in the browser for the storyboard preview: a small on-demand segmentation model removes the background, trims transparent space, and places the character over the skyline. The 4.7 MB [u2netp model](https://github.com/bunn-io/rembg-web/releases/download/base-models/u2netp.onnx) is served by this site and loads only after upload. This does not redraw or animate the PFP. If browser processing fails, the original upload stays visible in its reference frame. When a video provider is connected, the cutout PNG is sent in the existing `pfp` field if available; otherwise the original image is sent. Segmentation is approximate, so detailed hair or busy backgrounds can need a cleaner source image.

## Run locally

Requires Node.js 20.9 or newer.

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

Open `http://localhost:3000`. Without configured services, the site intentionally offers a **draft from user notes**. It does not claim to have researched the project or produced a finished video.

### Direct Gemini research

Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/api-keys), then put this in `.env.local` for local development or in Vercel **Project → Settings → Environment Variables** for Production:

```text
GEMINI_API_KEY=your-gemini-api-key
```

Redeploy after setting the Vercel variable. With one or more supplied links, the research button first uses Gemini 3.8 Flash URL context on the free tier (falling back to 3.5 Flash-Lite if unavailable) to create a storyboard from **only those pages**. If URL reading fails, it searches the broader web using the project name and supplied domains; the returned sources show what was actually used. Without links, it uses [Tavily Search](https://docs.tavily.com/documentation/api-reference/endpoint/search) to find public pages, then asks Gemini 3.5 Flash-Lite to write a sourced script from the returned excerpts. Tavily's [keyless mode](https://github.com/tavily-ai/tavily-python/blob/master/tavily/tavily.py) works without another API key, but has a shared, small allowance. For more reliable testing, create a free [Tavily account](https://www.tavily.com/pricing) and add `TAVILY_API_KEY` to Vercel Production. If Gemini cannot write the script, the site returns a clearly labeled source-led outline rather than claiming a polished script. Searches can still fail or return unrelated pages; check each claim and source before publishing. The PFP is not sent to either research provider. These keys do **not** enable video rendering. `REEL_FORGE_API_KEY` is only for generic adapter authentication; do not put a Gemini key there. If `REEL_FORGE_RESEARCH_API_URL` is also set, the generic research provider takes precedence.

If Gemini 3.5 cannot write a valid sourced script, the site also tries 3.1 Flash-Lite. A source-led outline is visibly marked as script pending and cannot be sent to a video provider. The public research endpoint currently has no account login or durable rate limit. Keep the Gemini and Tavily projects on their free tiers for testing; add authentication and quota controls before connecting paid usage. Project names and descriptions are sent to Tavily for name-only search, and excerpts plus input are sent to Gemini for scriptwriting. Check [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing) and the [data-use terms for unpaid API services](https://ai.google.dev/gemini-api/terms) before accepting sensitive project descriptions.

### Generic provider adapters

Alternatively, set server-side environment variables in `.env.local` for your own research and video services:

```text
REEL_FORGE_RESEARCH_API_URL=https://your-provider.example/research
REEL_FORGE_VIDEO_API_URL=https://your-provider.example/render
REEL_FORGE_API_KEY=your-server-side-key
```

Do not prefix the key with `NEXT_PUBLIC_`. Deployments need the same variables in the hosting platform's server environment. The site does not save projects or PFPs to a database; inputs remain in the browser until sent to the configured services.

## Generic provider contract

The site is provider agnostic. Build an adapter service with these two endpoints, or point the environment variables at an existing service that follows the contract. The server sends `Authorization: Bearer <REEL_FORGE_API_KEY>` when the key is set.

### Research: `POST REEL_FORGE_RESEARCH_API_URL`

JSON request:

```json
{
  "project": {
    "name": "Example Project",
    "description": "Optional user notes",
    "links": ["https://example.org"]
  },
  "format": "reel-forge-brief-v1",
  "durationSeconds": 60,
  "sceneCount": 9,
  "style": "dark skyline, orange sunset, consistent mascot, kinetic text, phone UI when relevant",
  "instruction": "Research official/public sources first..."
}
```

JSON response:

```json
{
  "title": "Example Project — A clearer introduction",
  "summary": "A source-grounded explanation of the project.",
  "voiceover": "The complete English voiceover script...",
  "sources": [{ "title": "Official site", "url": "https://example.org" }],
  "facts": [{ "label": "Status", "value": "Public beta", "sourceUrl": "https://example.org/status" }],
  "scenes": [
    {
      "title": "Intro",
      "start": 0,
      "end": 6,
      "overlay": "A NEW WAY TO BEGIN",
      "voiceover": "Voiceover for this scene.",
      "visualPrompt": "Detailed 16:9 scene direction..."
    }
  ],
  "disclaimer": "Optional uncertainty note."
}
```

Return **8–10 contiguous scenes covering exactly 0–60 seconds**. Every fact must have a public source URL; include at least one source. Prefer official references, distinguish an unverified claim from a confirmed one, and omit facts you cannot support. The app rejects briefs that violate this minimum contract. The PFP is not sent to research; it is sent only to the render provider.

Research may also run as a background job. In that case, `POST` returns `{ "jobId": "research_123", "status": "queued" }`. The site polls `GET REEL_FORGE_RESEARCH_API_URL/{jobId}` every five seconds. Return `queued`, `processing`, `completed`, or `failed`. A completed job must contain the sourced brief in `brief`; a failed job may contain `error`. This avoids making the browser wait for a long research request. The initial `POST` still needs to acknowledge the job within 45 seconds. Research and render jobs must be stored by the provider; the current browser UI does not restore an interrupted job after a reload.

The research service must treat the user's links as untrusted. If it crawls them, block private and local network targets, redirects to private addresses, and non-HTTP protocols. Return source URLs that viewers can open.

### Render: `POST REEL_FORGE_VIDEO_API_URL`

Multipart request fields:

- `project`: JSON string in the same shape as above.
- `brief`: JSON string containing the validated researched brief.
- `style`: requested 16:9 / 60-second visual and voiceover direction.
- `pfp`: optional PNG, JPEG, or WebP file, maximum 4 MB. This keeps the multipart request below Vercel's 4.5 MB function payload limit.

Return a job JSON immediately:

```json
{ "jobId": "job_123", "status": "queued" }
```

The site polls `GET REEL_FORGE_VIDEO_API_URL/{jobId}` every five seconds. Return `queued`, `processing`, `completed`, or `failed`. Completion must include a browser-playable HTTPS video URL:

```json
{ "jobId": "job_123", "status": "completed", "videoUrl": "https://cdn.example.org/job_123.mp4" }
```

Failure can include an `error` string. The provider is responsible for image stylization, narration, music licensing, final composition, media storage, and a playable video URL. The on-page scene stage shows the complete original PFP with gentle CSS movement. It is a visual storyboard preview, not an AI-stylized mascot or the final generated video.

## What a production provider needs

The two URLs above are **adapter endpoints**, not direct drop-in URLs for a model company. The adapter needs to orchestrate these stages:

1. Search public and official sources for the project, cite claims, and write the brief. A search-grounded model can do this, but factual claims still need validation and review.
2. Turn the uploaded PFP into one approved character reference image, then reuse that image in every scene. Preserve recognisable features. Generative video cannot guarantee perfect character consistency.
3. Generate short scene footage. Compose exact overlays, phone UI, transitions, and timing with deterministic motion graphics rather than relying on a video model to render exact text.
4. Generate the narration, select properly licensed music, mix audio, and assemble/export a 16:9 MP4.
5. Run long stages in a durable background job and store PFPs, clips, and final video in media storage. Return a playable HTTPS URL from the render job.

One possible provider stack is [Gemini with Google Search grounding](https://ai.google.dev/gemini-api/docs/google-search/), [Gemini image editing](https://ai.google.dev/gemini-api/docs/image-generation), [Veo video generation](https://ai.google.dev/gemini-api/docs/veo), and [Gemini text-to-speech](https://ai.google.dev/gemini-api/docs/speech-generation), plus a composition worker and storage such as [Vercel Blob](https://vercel.com/docs/vercel-blob). These are examples, not configured dependencies. Check model access, quotas, and current pricing before selecting providers. Keep API credentials on the server. Protect public generation endpoints with authentication, rate limits, and spending limits before enabling paid services.

## Checks

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test:contract
```

The home route and API endpoints are part of the Next.js app. Client input and server responses are bounded and validated. API credentials stay server-side.

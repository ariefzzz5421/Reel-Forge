# Reel-Forge

Reel-Forge is a source-aware creative workbench for 60-second project introduction videos. Users enter a project name, an optional description and up to four reference links, and optionally upload a PFP. The site previews a nine-scene concept immediately. When research and video services are configured, it can request a sourced brief, send the brief and PFP for rendering, track the render job, and show the finished video.

The [original 60-second creative brief](docs/reel-forge-promo-60s.md) remains available as a style reference. It is a concept, not a factual product claim.

## Run locally

Requires Node.js 20.9 or newer.

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

Open `http://localhost:3000`. Without configured services, the site intentionally offers a **draft from user notes**. It does not claim to have researched the project or produced a finished video. Set server-side environment variables in `.env.local` to enable those stages:

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

Failure can include an `error` string. The provider is responsible for image stylization, narration, music licensing, final composition, media storage, and a playable video URL. The on-page scene stage is a visual storyboard preview, not the final generated video.

## Checks

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test:contract
```

The home route and API endpoints are part of the Next.js app. Client input and server responses are bounded and validated. API credentials stay server-side.

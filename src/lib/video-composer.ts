import type { Brief, ProjectInput, Scene } from "./types";

const WIDTH = 1280;
const HEIGHT = 720;
const LENGTH_SECONDS = 60;

type RenderInput = {
  brief: Brief;
  project: ProjectInput;
  mascot: File | null;
  voiceover: Blob | null;
  audioContext: AudioContext | null;
  signal?: AbortSignal;
  onProgress: (percent: number, message: string) => void;
};

function wrapLines(context: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width <= maxWidth || !line) {
      line = next;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const visible = lines.slice(0, maxLines);
    visible[maxLines - 1] = `${visible[maxLines - 1].replace(/\s+\S+$/, "")}…`;
    return visible;
  }
  return lines;
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  context.beginPath();
  context.roundRect(x, y, w, h, r);
}

function drawSkyline(context: CanvasRenderingContext2D, offset: number) {
  context.fillStyle = "#110d0b";
  context.fillRect(0, 614, WIDTH, 106);
  const heights = [51, 85, 39, 72, 105, 49, 69, 31, 96, 57, 47, 112, 63, 83, 38, 75, 98, 45, 66, 36];
  for (let i = -1; i < 23; i++) {
    const x = i * 68 - (offset % 68);
    const h = heights[(i + heights.length) % heights.length];
    context.fillRect(x, 614 - h, 46, h + 3);
    if (i % 4 === 0) context.fillRect(x + 19, 599 - h, 8, 17);
  }
  context.fillStyle = "#f87a18";
  context.fillRect(0, 612, WIDTH, 2);
}

function drawMascot(context: CanvasRenderingContext2D, bitmap: ImageBitmap | null, t: number, besidePhone: boolean) {
  const bob = Math.sin(t * 3) * 7;
  if (bitmap) {
    const maxW = besidePhone ? 215 : 360;
    const maxH = besidePhone ? 300 : 455;
    const scale = Math.min(maxW / bitmap.width, maxH / bitmap.height);
    const width = bitmap.width * scale;
    const height = bitmap.height * scale;
    context.save();
    context.shadowColor = "#18090099";
    context.shadowBlur = 28;
    context.shadowOffsetY = 17;
    context.drawImage(bitmap, (besidePhone ? 1150 : 1030) - width / 2, 614 - height + bob, width, height);
    context.restore();
    return;
  }
  context.save();
  context.translate(besidePhone ? 1150 : 1030, (besidePhone ? 472 : 405) + bob);
  if (besidePhone) context.scale(0.7, 0.7);
  context.fillStyle = "#f77716";
  context.strokeStyle = "#110d0b";
  context.lineWidth = 8;
  context.beginPath();
  context.moveTo(-115, -98);
  context.lineTo(-132, -175);
  context.lineTo(-62, -122);
  context.lineTo(0, -211);
  context.lineTo(42, -125);
  context.lineTo(127, -177);
  context.lineTo(91, -91);
  context.ellipse(0, -23, 130, 147, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = "#1b1513";
  roundedRect(context, -112, 95, 224, 130, 36);
  context.fill();
  context.fillStyle = "#ffe6d1";
  context.beginPath();
  context.ellipse(0, -26, 89, 75, 0, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "#17100d";
  context.lineWidth = 9;
  for (const x of [-43, 48]) {
    context.beginPath();
    context.arc(x, -41, 35, 0, Math.PI * 2);
    context.stroke();
  }
  context.beginPath();
  context.moveTo(-8, -42);
  context.lineTo(10, -42);
  context.stroke();
  context.restore();
}

function drawPhone(context: CanvasRenderingContext2D, scene: Scene, t: number) {
  const x = 875 + Math.sin(t * 1.5) * 8;
  const y = 190 + Math.sin(t * 2) * 5;
  context.save();
  context.translate(x, y);
  context.rotate(-0.07);
  context.fillStyle = "#1b1412";
  context.strokeStyle = "#ff8b31";
  context.lineWidth = 5;
  roundedRect(context, -130, -76, 260, 365, 32);
  context.fill();
  context.stroke();
  const screen = context.createLinearGradient(0, -55, 0, 275);
  screen.addColorStop(0, "#331911");
  screen.addColorStop(1, "#f37516");
  context.fillStyle = screen;
  roundedRect(context, -112, -51, 224, 316, 20);
  context.fill();
  context.fillStyle = "#fff2e5";
  context.font = "700 15px Sora, Arial, sans-serif";
  context.fillText("STORY CONCEPT", -88, -14);
  context.font = "800 24px Sora, Arial, sans-serif";
  wrapLines(context, scene.overlay, 175, 3).forEach((line, index) => context.fillText(line, -88, 42 + index * 31));
  context.fillStyle = "#ffbc80";
  for (let i = 0; i < 3; i++) {
    roundedRect(context, -88, 161 + i * 30, 130 + (i % 2) * 35, 11, 5);
    context.fill();
  }
  context.restore();
}

function drawFrame(context: CanvasRenderingContext2D, brief: Brief, project: ProjectInput, mascot: ImageBitmap | null, seconds: number) {
  const t = Math.min(seconds, LENGTH_SECONDS - 0.001);
  const index = Math.max(0, brief.scenes.findIndex((scene) => t >= scene.start && t < scene.end));
  const scene = brief.scenes[index] ?? brief.scenes.at(-1)!;
  const local = Math.max(0, t - scene.start);
  const sceneLength = scene.end - scene.start;
  const enter = Math.min(1, local / 0.65);
  const leave = Math.min(1, (sceneLength - local) / 0.4);
  const fade = Math.max(0, Math.min(enter, leave));

  const sky = context.createLinearGradient(0, 0, WIDTH, HEIGHT);
  sky.addColorStop(0, "#1b100d");
  sky.addColorStop(0.43, "#713018");
  sky.addColorStop(1, "#ff8b19");
  context.fillStyle = sky;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  const glow = context.createRadialGradient(1040, 500, 45, 1040, 500, 690);
  glow.addColorStop(0, "#ffa13d99");
  glow.addColorStop(1, "#ffa13d00");
  context.fillStyle = glow;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.strokeStyle = "#fff3e122";
  context.lineWidth = 2;
  for (const radius of [330, 490, 650]) {
    context.beginPath();
    context.arc(1080, -70, radius + Math.sin(t / 4) * 8, 0, Math.PI * 2);
    context.stroke();
  }
  context.fillStyle = "#fff2e8";
  context.font = "800 38px Sora, Arial, sans-serif";
  context.fillText("RF.", 90, 99);
  context.textAlign = "right";
  context.font = "700 17px Sora, Arial, sans-serif";
  context.fillText("16:9  /  60 SEC", 1190, 90);
  context.textAlign = "left";

  drawSkyline(context, t * 8);
  const phoneScene = index === 3 || index === 6;
  if (phoneScene) drawPhone(context, scene, t);
  drawMascot(context, mascot, t, phoneScene);

  context.save();
  context.globalAlpha = fade;
  context.translate(0, (1 - enter) * 35);
  context.fillStyle = "#ffe8d5";
  context.font = "700 22px Sora, Arial, sans-serif";
  context.fillText(`SCENE ${String(index + 1).padStart(2, "0")} / ${String(brief.scenes.length).padStart(2, "0")}`, 90, 237);
  context.font = "800 64px Sora, Arial, sans-serif";
  const title = scene.overlay || scene.title || project.name;
  const lines = wrapLines(context, title.toUpperCase(), 670, 4);
  lines.forEach((line, lineIndex) => {
    context.fillStyle = lineIndex === lines.length - 1 ? "#ff9b43" : "#fff2e8";
    context.fillText(line, 90, 328 + lineIndex * 72);
  });
  context.restore();

  context.fillStyle = "#fff4ec";
  context.font = "600 21px DM Sans, Arial, sans-serif";
  const narration = wrapLines(context, scene.voiceover, 960, 2);
  narration.forEach((line, lineIndex) => context.fillText(line, 90, 655 + lineIndex * 29));
  context.fillStyle = "#f77a18";
  context.fillRect(0, 708, WIDTH * (t / LENGTH_SECONDS), 12);
}

export async function renderMotionVideo({ brief, project, mascot, voiceover, audioContext, signal, onProgress }: RenderInput) {
  if (!HTMLCanvasElement.prototype.captureStream || typeof MediaRecorder === "undefined")
    throw new Error("This browser cannot record video. Try the latest Chrome or Edge.");
  if (signal?.aborted) throw new DOMException("Video creation was cancelled.", "AbortError");
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("This browser cannot draw the video.");
  let mascotBitmap: ImageBitmap | null = null;
  if (mascot) {
    try { mascotBitmap = await createImageBitmap(mascot); } catch { /* Use the built-in mascot. */ }
  }
  let source: AudioBufferSourceNode | null = null;
  let destination: MediaStreamAudioDestinationNode | null = null;
  if (voiceover && audioContext) {
    const audio = await audioContext.decodeAudioData(await voiceover.arrayBuffer());
    await audioContext.resume();
    destination = audioContext.createMediaStreamDestination();
    source = audioContext.createBufferSource();
    source.buffer = audio;
    source.playbackRate.value = Math.max(1, audio.duration / 58);
    source.connect(destination);
  }
  if (signal?.aborted) throw new DOMException("Video creation was cancelled.", "AbortError");
  drawFrame(context, brief, project, mascotBitmap, 0);
  const stream = new MediaStream([
    ...canvas.captureStream(24).getVideoTracks(),
    ...(destination?.stream.getAudioTracks() ?? []),
  ]);
  const mimeType = (source ? [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ] : [
    "video/mp4;codecs=avc1.42E01E",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ]).find((candidate) => MediaRecorder.isTypeSupported(candidate));
  if (!mimeType) throw new Error("This browser cannot export MP4 or WebM video.");

  try {
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_500_000 });
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error("This browser could not start the video recorder. Try the latest Chrome or Edge.");
    }
    const chunks: BlobPart[] = [];
    const result = await new Promise<Blob>((resolve, reject) => {
      let finished = false;
      let frameTimer = 0;
      let stopTimer = 0;
      let lastReportedSecond = -1;
      const started = performance.now();
      const cleanup = () => {
        window.clearInterval(frameTimer);
        window.clearTimeout(stopTimer);
        signal?.removeEventListener("abort", abort);
        document.removeEventListener("visibilitychange", visibility);
        stream.getTracks().forEach((track) => track.stop());
        try { source?.stop(); } catch { /* Already finished. */ }
      };
      const fail = (message: string) => {
        if (finished) return;
        finished = true;
        cleanup();
        if (recorder.state !== "inactive") recorder.stop();
        reject(new Error(message));
      };
      const abort = () => fail("Video creation was cancelled.");
      const visibility = () => {
        if (document.hidden) fail("Keep the tab visible while recording, then try again.");
      };
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => fail("The browser stopped recording. Try again.");
      recorder.onstop = () => {
        if (finished) return;
        finished = true;
        cleanup();
        const blob = new Blob(chunks, { type: mimeType });
        if (blob.size < 100_000) reject(new Error("The video file was incomplete. Try again."));
        else resolve(blob);
      };
      signal?.addEventListener("abort", abort, { once: true });
      document.addEventListener("visibilitychange", visibility);
      if (signal?.aborted) {
        abort();
        return;
      }
      try {
        recorder.start(1000);
      } catch {
        fail("This browser could not start recording the video. Try again.");
        return;
      }
      if (source && audioContext) source.start(audioContext.currentTime + 0.05);
      frameTimer = window.setInterval(() => {
        const elapsed = Math.min(LENGTH_SECONDS, (performance.now() - started) / 1000);
        drawFrame(context, brief, project, mascotBitmap, elapsed);
        const second = Math.floor(elapsed);
        if (second !== lastReportedSecond) {
          lastReportedSecond = second;
          onProgress(Math.min(99, Math.round((elapsed / LENGTH_SECONDS) * 100)),
            `Recording scene ${Math.min(brief.scenes.length, brief.scenes.findIndex((scene) => elapsed < scene.end) + 1 || brief.scenes.length)} of ${brief.scenes.length}…`);
        }
      }, 1000 / 24);
      stopTimer = window.setTimeout(() => {
        drawFrame(context, brief, project, mascotBitmap, LENGTH_SECONDS - 0.001);
        recorder.stop();
      }, LENGTH_SECONDS * 1000);
    });
    onProgress(100, "Video ready to download.");
    return { blob: result, extension: mimeType.startsWith("video/mp4") ? "mp4" : "webm" };
  } finally {
    mascotBitmap?.close();
  }
}

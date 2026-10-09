"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clapperboard,
  Clock3,
  Copy,
  Download,
  FileText,
  Film,
  Link2,
  LoaderCircle,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { createDraft } from "@/lib/draft";
import type { Brief, ProjectInput, ResearchJob, RenderJob } from "@/lib/types";

type ServiceStatus = { researchReady: boolean; videoReady: boolean };
const emptyProject: ProjectInput = { name: "", description: "", links: [""] };

function Mascot({ image }: { image: string | null }) {
  return (
    <div
      className={`mascot-wrap${image ? " mascot-wrap--reference" : ""}`}
      aria-label={
        image
          ? "Full uploaded profile picture in the animated storyboard preview"
          : "Reel-Forge orange mascot"
      }
      role="img"
    >
      {image ? (
        <div className="mascot-reference">
          <img src={image} alt="" />
          <span>ORIGINAL PFP</span>
        </div>
      ) : (
      <svg className="mascot-shape" viewBox="0 0 190 210" aria-hidden="true">
        <path
          d="M58 61 32 13 83 44 95 5l15 38 48-27-22 48c26 21 38 47 36 77-2 37-35 62-75 62-47 0-79-27-79-68 0-31 13-56 40-74Z"
          fill="var(--color-accent)"
          stroke="var(--color-ink)"
          strokeWidth="4"
        />
        <path d="M54 161c22-13 65-17 92 0l12 37H42Z" fill="var(--color-ink)" />
        <path d="M99 162v35" stroke="var(--color-fog)" strokeWidth="3" />
        <rect
          x="115"
          y="173"
          width="11"
          height="6"
          rx="2"
          fill="var(--color-metal)"
        />
        <ellipse cx="96" cy="112" rx="56" ry="46" fill="var(--color-cream)" />
        <path
          d="M76 124q20 15 40 0"
          stroke="var(--color-ink)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="69" cy="103" r="4" fill="var(--color-ink)" />
        <circle cx="121" cy="103" r="4" fill="var(--color-ink)" />
        <path
          d="M59 83q15-8 29 0M103 83q15-8 29 0"
          stroke="var(--color-ink)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M52 95c8-13 27-17 42-7M99 88c15-10 34-6 42 7"
          stroke="var(--color-ink)"
          strokeWidth="4"
          fill="none"
        />
        <circle
          cx="72"
          cy="104"
          r="22"
          stroke="var(--color-ink)"
          strokeWidth="5"
          fill="none"
        />
        <circle
          cx="118"
          cy="104"
          r="22"
          stroke="var(--color-ink)"
          strokeWidth="5"
          fill="none"
        />
        <path
          d="M94 101q3-5 7 0"
          stroke="var(--color-ink)"
          strokeWidth="5"
          fill="none"
        />
      </svg>
      )}
    </div>
  );
}

function SceneStage({
  brief,
  projectName,
  image,
  selectedScene,
}: {
  brief: Brief | null;
  projectName: string;
  image: string | null;
  selectedScene: number;
}) {
  const scene = brief?.scenes[selectedScene];
  const overlay =
    scene?.overlay ||
    (projectName
      ? `MEET ${projectName.toUpperCase()}`
      : "YOUR STORY STARTS HERE");
  const parts = overlay.split(" ");
  const last = parts.pop() ?? "HERE";
  return (
    <div className="scene-stage" aria-label="16 by 9 storyboard preview">
      <div className="stage-grain" />
      <div className="stage-orbit stage-orbit-a" />
      <div className="stage-orbit stage-orbit-b" />
      <div className="stage-top">
        <span className="stage-mark">
          RF<span className="stage-mark-dot">.</span>
        </span>
        <span className="stage-format">16:9 / 60 SEC</span>
      </div>
      <div className="stage-content">
        <div className="stage-overline">A STORY WORTH TELLING</div>
        <div className="stage-headline">
          {parts.join(" ")} <span>{last}</span>
        </div>
        <div className="stage-subline">
          {brief
            ? `SCENE ${String(selectedScene + 1).padStart(2, "0")} / ${String(brief.scenes.length).padStart(2, "0")}`
            : "CRAFTED FOR THE NEXT BIG INTRO"}
        </div>
      </div>
      <Mascot image={image} />
      <svg
        className="skyline"
        viewBox="0 0 1200 220"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0 220V145h52v-24h30v24h54V96h22V64h18v32h24v47h41V74h25v70h37v-21h40v21h38V97h19V61h20v36h23v47h28V83h50v61h26v-26h46v26h28V74h13V47h14v27h24v70h43v-38h52v38h34V91h17V53h18v38h26v53h36v-19h38v19h46V99h24V79h23v65h29V59h16V31h13v28h29v85h39V98h26v46h37V82h38v62h44V115h56v29h53V220Z"
          fill="var(--color-skyline)"
        />
        <path
          d="M0 184h1200"
          stroke="var(--color-stage-line)"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}

export default function ForgeStudio() {
  const [project, setProject] = useState<ProjectInput>(emptyProject);
  const [pfp, setPfp] = useState<File | null>(null);
  const [pfpUrl, setPfpUrl] = useState<string | null>(null);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [researchJob, setResearchJob] = useState<ResearchJob | null>(null);
  const [selectedScene, setSelectedScene] = useState(0);
  const [service, setService] = useState<ServiceStatus | null>(null);
  const [busy, setBusy] = useState<"research" | "render" | null>(null);
  const [job, setJob] = useState<RenderJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/status", { cache: "no-store" })
      .then((response) => response.json())
      .then(setService)
      .catch(() => setService({ researchReady: false, videoReady: false }));
  }, []);
  useEffect(() => {
    setBrief(null);
    setResearchJob(null);
    setJob(null);
    setSelectedScene(0);
  }, [project]);
  useEffect(() => {
    if (!researchJob || !["queued", "processing"].includes(researchJob.status))
      return;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(
          `/api/research/${encodeURIComponent(researchJob.jobId)}`,
          { cache: "no-store" },
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Could not check research progress.");
        const next = data as ResearchJob;
        if (next.status === "completed" && next.brief) {
          setBrief(next.brief);
          setSelectedScene(0);
          setResearchJob(null);
          document
            .getElementById("preview")
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          setResearchJob(next);
          if (next.status === "failed")
            setError(next.error || "Research failed. Please try again.");
        }
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not check research progress.",
        );
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [researchJob?.jobId, researchJob?.status]);
  useEffect(() => {
    if (!pfp) {
      setPfpUrl(null);
      return;
    }
    const url = URL.createObjectURL(pfp);
    setPfpUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pfp]);
  useEffect(() => {
    if (!job || !["queued", "processing"].includes(job.status)) return;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(
          `/api/render/${encodeURIComponent(job.jobId)}`,
          { cache: "no-store" },
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Could not check render progress.");
        setJob(data as RenderJob);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not check render progress.",
        );
        window.clearInterval(timer);
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [job?.jobId, job?.status]);

  const researchPending =
    researchJob?.status === "queued" || researchJob?.status === "processing";
  const canSubmit = project.name.trim().length > 0 && !busy && !researchPending;
  const validLinks = useMemo(
    () =>
      project.links
        .filter((value) => value.trim())
        .every((value) => {
          try {
            const url = new URL(value);
            return url.protocol === "http:" || url.protocol === "https:";
          } catch {
            return false;
          }
        }),
    [project.links],
  );
  function setLink(index: number, value: string) {
    setProject((current) => ({
      ...current,
      links: current.links.map((link, at) => (at === index ? value : link)),
    }));
  }
  function currentProject(): ProjectInput {
    return {
      ...project,
      name: project.name.trim(),
      links: project.links.map((link) => link.trim()).filter(Boolean),
    };
  }
  function prepareDraft() {
    if (!canSubmit || !validLinks) {
      setError("Add a project name and check the reference links.");
      return;
    }
    setBrief(createDraft(currentProject()));
    setSelectedScene(0);
    setJob(null);
    setError(null);
    document
      .getElementById("preview")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  async function research() {
    if (!canSubmit || !validLinks) {
      setError("Add a project name and check the reference links.");
      return;
    }
    setBusy("research");
    setError(null);
    setResearchJob(null);
    setJob(null);
    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentProject()),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Research did not finish.");
      if (data.jobId && data.status !== "completed") {
        const next = data as ResearchJob;
        setResearchJob(next);
        if (next.status === "failed")
          setError(next.error || "Research failed. Please try again.");
      } else {
        setBrief(data.jobId ? (data as ResearchJob).brief ?? null : data as Brief);
        setSelectedScene(0);
        document
          .getElementById("preview")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Research did not finish.",
      );
    } finally {
      setBusy(null);
    }
  }
  async function renderVideo() {
    if (!brief || brief.mode !== "researched") return;
    setBusy("render");
    setError(null);
    try {
      const form = new FormData();
      form.set("project", JSON.stringify(currentProject()));
      const briefForRender = { ...brief };
      delete briefForRender.searchSuggestionsHtml;
      form.set("brief", JSON.stringify(briefForRender));
      if (pfp) form.set("pfp", pfp);
      const response = await fetch("/api/render", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not start rendering.");
      setJob(data as RenderJob);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not start rendering.",
      );
    } finally {
      setBusy(null);
    }
  }
  async function copyScript() {
    if (!brief) return;
    try {
      await navigator.clipboard.writeText(brief.voiceover);
      setCopyState(true);
      window.setTimeout(() => setCopyState(false), 1800);
    } catch {
      setError("Could not copy the script. Try selecting it manually.");
    }
  }
  function downloadBrief() {
    if (!brief) return;
    const briefForDownload = { ...brief };
    delete briefForDownload.searchSuggestionsHtml;
    const blob = new Blob(
      [JSON.stringify({ project: currentProject(), brief: briefForDownload }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${
      project.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-") || "reel-forge"
    }-brief.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function reset() {
    setProject(emptyProject);
    setPfp(null);
    setBrief(null);
    setResearchJob(null);
    setSelectedScene(0);
    setJob(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Reel-Forge home">
          <span className="brand-symbol">
            <Clapperboard size={20} strokeWidth={2.5} />
          </span>
          <span>
            REEL<span className="brand-dash">—</span>FORGE
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#studio">Studio</a>
          <a href="#process">How it works</a>
          <a
            className="nav-repo"
            href="https://github.com/ariefzzz5421/Reel-Forge"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub <ArrowUpRight size={14} />
          </a>
        </nav>
      </header>
      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="hero-kicker">
              <span className="live-dot" />
              THE CREATIVE STUDIO FOR PROJECT STORIES
            </div>
            <h1 id="hero-title">
              Give your project
              <br />
              <span>a story worth watching.</span>
            </h1>
            <p>
              Shape a 60-second story from your project details and mascot.
              Connect your research and video services when you’re ready for the
              final film.
            </p>
            <a className="hero-link" href="#studio">
              Start forging <ArrowDown size={17} />
            </a>
          </div>
          <div className="hero-meta">
            <span>01 / BRIEF</span>
            <span>02 / RESEARCH</span>
            <span>03 / FILM</span>
          </div>
        </section>
        <section
          id="studio"
          className="studio-section"
          aria-label="Reel-Forge studio"
        >
          <div className="studio-heading">
            <div>
              <span className="eyebrow">THE WORKBENCH</span>
              <h2>
                Make something
                <br />
                <span>they remember.</span>
              </h2>
            </div>
            <p>
              Bring the raw material. Reel-Forge turns it into a clear story
              flow, with factual claims tied to sources when research is
              connected.
            </p>
          </div>
          <div className="studio-grid">
            <div className="input-panel">
              <div className="panel-topline">
                <span className="panel-index">01 / YOUR MATERIAL</span>
                <span className="panel-state">
                  {service?.researchReady
                    ? "RESEARCH CONNECTED"
                    : "RESEARCH API PENDING"}
                </span>
              </div>
              <div className="panel-intro">
                <h3>Tell us what you’re building.</h3>
                <p>Start with a name. Add the context that matters.</p>
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (service?.researchReady) void research();
                  else prepareDraft();
                }}
                noValidate
              >
                <label className="field">
                  <span>
                    Project name <b>*</b>
                  </span>
                  <input
                    required
                    maxLength={100}
                    value={project.name}
                    onChange={(event) =>
                      setProject({ ...project, name: event.target.value })
                    }
                    placeholder="e.g. Your next big idea"
                    autoComplete="off"
                  />
                </label>
                <label className="field">
                  <span>
                    What does it do? <small>OPTIONAL</small>
                  </span>
                  <textarea
                    maxLength={3000}
                    rows={4}
                    value={project.description}
                    onChange={(event) =>
                      setProject({
                        ...project,
                        description: event.target.value,
                      })
                    }
                    placeholder="A few sentences about the product, the audience, and what makes it different."
                  />
                </label>
                <div className="field">
                  <div className="field-heading">
                    <span>
                      Reference links <small>UP TO FOUR</small>
                    </span>
                    <Link2 size={16} />
                  </div>
                  <p className="field-help">
                    Official site, docs, X profile, or launch post. These will
                    be sent to your research API.
                  </p>
                  <div className="link-list">
                    {project.links.map((link, index) => (
                      <div className="link-row" key={index}>
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <input
                          type="url"
                          aria-label={`Reference link ${index + 1}`}
                          value={link}
                          onChange={(event) =>
                            setLink(index, event.target.value)
                          }
                          placeholder="https://"
                        />
                        {project.links.length > 1 && (
                          <button
                            type="button"
                            className="icon-button"
                            aria-label={`Remove reference link ${index + 1}`}
                            onClick={() =>
                              setProject((current) => ({
                                ...current,
                                links: current.links.filter(
                                  (_, at) => at !== index,
                                ),
                              }))
                            }
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {project.links.length < 4 && (
                    <button
                      type="button"
                      className="text-button"
                      onClick={() =>
                        setProject((current) => ({
                          ...current,
                          links: [...current.links, ""],
                        }))
                      }
                    >
                      + Add another link
                    </button>
                  )}
                </div>
                <div className="field">
                  <div className="field-heading">
                    <span>
                      Profile picture / mascot <small>OPTIONAL</small>
                    </span>
                    <span className="field-file-note">
                      PNG, JPG, WEBP · MAX 4 MB
                    </span>
                  </div>
                  <input
                    ref={fileRef}
                    className="visually-hidden"
                    id="pfp-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      if (
                        file &&
                        (file.size > 4 * 1024 * 1024 ||
                          !["image/png", "image/jpeg", "image/webp"].includes(
                            file.type,
                          ))
                      ) {
                        setError("PFP must be PNG, JPEG, or WebP under 4 MB.");
                        event.target.value = "";
                        return;
                      }
                      setPfp(file);
                      setError(null);
                    }}
                  />
                  <label htmlFor="pfp-upload" className="upload-box">
                    <span className="upload-icon">
                      {pfpUrl ? (
                        <img src={pfpUrl} alt="" />
                      ) : (
                        <UploadCloud size={23} />
                      )}
                    </span>
                    <span>
                      <strong>
                        {pfp ? pfp.name : "Choose the face of your story"}
                      </strong>
                      <small>
                        {pfp
                          ? "Click to replace this image"
                          : "See the full PFP here; AI stylization needs a connected provider"}
                      </small>
                    </span>
                    <ArrowUpRight size={17} />
                  </label>
                  {pfp && (
                    <button
                      type="button"
                      className="text-button remove-upload"
                      onClick={() => {
                        setPfp(null);
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                    >
                      Remove image
                    </button>
                  )}
                </div>
                <p
                  className="form-error"
                  role={error ? "alert" : undefined}
                  aria-live="polite"
                >
                  {error || "\u00a0"}
                </p>
                <div className="form-actions">
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={!canSubmit || !validLinks}
                  >
                    {busy === "research" || researchPending ? (
                      <>
                        <LoaderCircle size={18} className="spin" /> Researching…
                      </>
                    ) : service?.researchReady ? (
                      <>
                        <Search size={18} /> Research project{" "}
                        <ArrowRight size={18} />
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} /> Preview from my notes{" "}
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                  <span aria-live="polite">
                    {researchPending
                      ? "Research is running · this can take several minutes"
                      : service?.researchReady
                      ? "Checks sources before writing the film"
                      : "Draft preview · no AI research yet"}
                  </span>
                </div>
              </form>
            </div>
            <div className="preview-panel" id="preview">
              <div className="preview-bar">
                <span className="panel-index">02 / LIVE PREVIEW</span>
                <span className="preview-live">
                  <span /> STORYBOARD VIEW
                </span>
              </div>
              <SceneStage
                brief={brief}
                projectName={project.name}
                image={pfpUrl}
                selectedScene={selectedScene}
              />
              <div className="stage-footer">
                <div>
                  <span className="eyebrow">NOW SHOWING</span>
                  <h3>
                    {brief
                      ? brief.scenes[selectedScene].title
                      : "Your next opening scene"}
                  </h3>
                  <p>
                    {brief
                      ? brief.scenes[selectedScene].voiceover
                      : "Add your project to see how its story could take shape."}
                  </p>
                </div>
                <div className="stage-time">
                  <Clock3 size={17} />
                  {brief
                    ? `${brief.scenes[selectedScene].start}–${brief.scenes[selectedScene].end}s`
                    : "60s"}
                </div>
              </div>
              <div className="preview-meta">
                <div>
                  <Film size={17} />
                  <span>16:9 LANDSCAPE</span>
                </div>
                <div>
                  <Clapperboard size={17} />
                  <span>9 SCENES</span>
                </div>
                <div>
                  <ShieldCheck size={17} />
                  <span>SOURCE-AWARE</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section id="process" className="process-section">
          <div className="process-head">
            <div>
              <span className="eyebrow">FROM SPARK TO SCREEN</span>
              <h2>
                One clear path
                <br />
                from idea to film.
              </h2>
            </div>
            <p>
              The creative steps are ready. Connect your own providers when you
              want sourced research and finished video generation.
            </p>
          </div>
          <div className="process-rail">
            <div>
              <span>01</span>
              <h3>Research the truth</h3>
              <p>Gather the project background and attach sources to claims.</p>
            </div>
            <div>
              <span>02</span>
              <h3>Shape the story</h3>
              <p>Review a timed voiceover and a scene-by-scene visual plan.</p>
            </div>
            <div>
              <span>03</span>
              <h3>Render the moment</h3>
              <p>Send the approved brief and PFP to your video provider.</p>
            </div>
          </div>
        </section>
        {brief && (
          <section className="result-section" aria-label="Generated storyboard">
            <div className="result-heading">
              <div>
                <span className="eyebrow">YOUR STORYBOARD</span>
                <h2>{brief.title}</h2>
                <p>{brief.summary}</p>
              </div>
              <div
                className={`mode-pill ${brief.mode === "researched" ? "mode-researched" : ""}`}
              >
                {brief.mode === "researched" ? (
                  <Check size={16} />
                ) : (
                  <FileText size={16} />
                )}{" "}
                {brief.mode === "researched"
                  ? "SOURCE-BACKED RESEARCH"
                  : "DRAFT FROM YOUR NOTES"}
              </div>
            </div>
            {brief.disclaimer && (
              <p className="brief-disclaimer">{brief.disclaimer}</p>
            )}
            <div className="result-grid">
              <div className="timeline">
                <div className="result-subhead">
                  <h3>Scene timeline</h3>
                  <span>60 SEC / {brief.scenes.length} BEATS</span>
                </div>
                <div className="scene-list">
                  {brief.scenes.map((scene, index) => (
                    <button
                      key={`${scene.start}-${scene.title}`}
                      type="button"
                      className={`scene-row ${index === selectedScene ? "active" : ""}`}
                      onClick={() => {
                        setSelectedScene(index);
                        document
                          .getElementById("preview")
                          ?.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                      }}
                    >
                      <span className="scene-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="scene-row-main">
                        <strong>{scene.title}</strong>
                        <small>{scene.overlay}</small>
                      </span>
                      <span className="scene-duration">
                        {scene.start}–{scene.end}s
                      </span>
                      <ArrowUpRight size={16} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="script-panel">
                <div className="result-subhead">
                  <h3>Voiceover script</h3>
                  <button
                    type="button"
                    className="mini-action"
                    onClick={copyScript}
                  >
                    {copyState ? <Check size={15} /> : <Copy size={15} />}{" "}
                    {copyState ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="script-copy">{brief.voiceover}</p>
                <div className="script-divider" />
                <h4>Scene direction</h4>
                <p className="direction-copy">
                  {brief.scenes[selectedScene].visualPrompt}
                </p>
                <div className="script-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={downloadBrief}
                  >
                    <Download size={17} /> Download brief
                  </button>
                  <button
                    type="button"
                    className="quiet-button"
                    onClick={reset}
                  >
                    Start another project
                  </button>
                </div>
              </div>
            </div>
            {brief.mode === "researched" && (
              <div className="sources-section">
                <div>
                  <h3>Research notes</h3>
                  <p>Review every source before publishing the final film.</p>
                </div>
                <div>
                  {brief.facts.map((fact, index) => (
                    <div className="fact-row" key={index}>
                      <strong>{fact.label}</strong>
                      <span>{fact.value}</span>
                      {fact.sourceUrl && (
                        <a
                          href={fact.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Source for ${fact.label}`}
                        >
                          <ArrowUpRight size={16} />
                        </a>
                      )}
                    </div>
                  ))}
                  <div className="source-links">
                    {brief.sources.map((source) => (
                      <a
                        key={source.url}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {source.title}
                        <ArrowUpRight size={14} />
                      </a>
                    ))}
                  </div>
                  {brief.searchSuggestionsHtml && (
                    <iframe
                      className="search-suggestions"
                      title="Google Search suggestions for this research"
                      srcDoc={brief.searchSuggestionsHtml}
                      sandbox="allow-popups allow-popups-to-escape-sandbox"
                    />
                  )}
                </div>
              </div>
            )}
            <div className="render-panel">
              <div>
                <span className="eyebrow">FINAL CUT</span>
                <h3>
                  {job?.status === "completed"
                    ? "Your film is ready."
                    : job?.status === "failed"
                      ? "Render failed."
                      : job
                        ? "Your film is being forged."
                        : "Ready for the final cut?"}
                </h3>
                <p>
                  {job?.status === "failed"
                    ? job.error || "Try starting another render."
                    : job?.status === "completed"
                      ? "Watch and download your finished video."
                      : job
                        ? "The video provider is working. This page checks the job every five seconds."
                        : !service?.videoReady
                          ? "Connect a video API to turn your researched brief into a finished film."
                          : brief.mode !== "researched"
                            ? "Run source-backed research before rendering a video."
                            : "Your sourced brief and PFP will be sent securely to the video provider."}
                </p>
              </div>
              <div className="render-action">
                {job?.status === "completed" && job.videoUrl ? (
                  <a
                    className="primary-button"
                    href={job.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download size={18} /> Open video <ArrowUpRight size={18} />
                  </a>
                ) : (
                  <button
                    className="primary-button"
                    type="button"
                    disabled={
                      !service?.videoReady ||
                      brief.mode !== "researched" ||
                      Boolean(busy) ||
                      (job !== null && job.status !== "failed")
                    }
                    onClick={() => void renderVideo()}
                  >
                    {busy === "render" ||
                    (job && ["queued", "processing"].includes(job.status)) ? (
                      <>
                        <LoaderCircle size={18} className="spin" />{" "}
                        {busy === "render" ? "Starting…" : "Rendering…"}
                      </>
                    ) : (
                      <>
                        <Play size={18} /> Generate video{" "}
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                )}
                <span>
                  {service?.videoReady
                    ? "Video API connected"
                    : "Video API not connected yet"}
                </span>
              </div>
            </div>
            {job?.status === "completed" && job.videoUrl && (
              <video
                className="finished-video"
                src={job.videoUrl}
                controls
                playsInline
                preload="metadata"
              />
            )}
          </section>
        )}
      </main>
      <footer className="site-footer">
        <a className="brand" href="#top">
          <span className="brand-symbol">
            <Clapperboard size={18} />
          </span>
          <span>
            REEL<span className="brand-dash">—</span>FORGE
          </span>
        </a>
        <p>Make the introduction count.</p>
        <a
          href="https://github.com/ariefzzz5421/Reel-Forge"
          target="_blank"
          rel="noopener noreferrer"
        >
          View the project <ArrowUpRight size={15} />
        </a>
      </footer>
    </div>
  );
}

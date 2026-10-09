import type { Brief, ProjectInput, Scene } from "./types";

const beats = [
  {
    title: "The spark",
    overlay: "EVERY IDEA STARTS SOMEWHERE",
    voiceover: "Every idea starts with a spark.",
  },
  {
    title: "The challenge",
    overlay: "MAKE IT CLEAR",
    voiceover: "The challenge is making that idea easy to understand.",
  },
  {
    title: "The name",
    overlay: "MEET THE PROJECT",
    voiceover: "Meet the project behind the story.",
  },
  {
    title: "The brief",
    overlay: "START WITH THE FACTS",
    voiceover: "Start with what the team can actually show and verify.",
  },
  {
    title: "The story",
    overlay: "ONE BEAT AT A TIME",
    voiceover: "Then shape the message one beat at a time.",
  },
  {
    title: "The product",
    overlay: "SHOW THE EXPERIENCE",
    voiceover: "Show the experience with clear, focused visuals.",
  },
  {
    title: "The takeaway",
    overlay: "WHAT MATTERS MOST",
    voiceover: "Give the audience one useful point to remember.",
  },
  {
    title: "The community",
    overlay: "A STORY TO SHARE",
    voiceover: "Make it a story people want to share.",
  },
  {
    title: "The invitation",
    overlay: "FOLLOW THE STORY",
    voiceover: "Follow the project to see what comes next.",
  },
];
const times = [0, 6, 13, 20, 27, 34, 41, 48, 54, 60];

export function createDraft(project: ProjectInput): Brief {
  const name = project.name;
  const scenes: Scene[] = beats.map((beat, index) => ({
    title: beat.title,
    start: times[index],
    end: times[index + 1],
    overlay:
      index === 2
        ? `MEET ${name.toUpperCase()}`
        : index === 8
          ? `FOLLOW ${name.toUpperCase()}`
          : beat.overlay,
    voiceover:
      index === 2
        ? `Meet ${name}, the project behind the story.`
        : beat.voiceover,
    visualPrompt: `16:9 premium motion graphics. Dark city skyline silhouette along the bottom, orange sunset gradient sky, consistent friendly mascot based on the uploaded PFP if provided. Exact overlay: "${index === 2 ? `MEET ${name.toUpperCase()}` : index === 8 ? `FOLLOW ${name.toUpperCase()}` : beat.overlay}". ${index === 5 ? "Use an illustrative phone UI, not a product screenshot. " : ""}Use clean kinetic typography, gentle camera movement and a short transition. Keep claims generic until sources are verified.`,
  }));
  return {
    mode: "draft",
    title: `${name} — a story in motion`,
    summary: project.description
      ? `Draft direction from your notes: ${project.description}`
      : `A concept direction for ${name}. Add a project description and verified sources for a more specific story.`,
    voiceover: scenes.map((scene) => scene.voiceover).join(" "),
    sources: project.links.map((url, index) => ({
      title: `Reference link ${index + 1} — not reviewed`,
      url,
    })),
    facts: [],
    scenes,
    disclaimer:
      "This is a draft from your inputs. No AI research or fact verification has run.",
  };
}

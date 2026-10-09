export type ProjectInput = {
  name: string;
  description: string;
  links: string[];
};

export type Source = { title: string; url: string };
export type Fact = { label: string; value: string; sourceUrl?: string };
export type Scene = {
  title: string;
  start: number;
  end: number;
  overlay: string;
  voiceover: string;
  visualPrompt: string;
};
export type Brief = {
  mode: "researched" | "draft";
  title: string;
  summary: string;
  voiceover: string;
  sources: Source[];
  facts: Fact[];
  scenes: Scene[];
  disclaimer?: string;
  searchSuggestionsHtml?: string;
};

export type ResearchJob = {
  jobId: string;
  status: "queued" | "processing" | "completed" | "failed";
  brief?: Brief;
  error?: string;
};

export type RenderJob = {
  jobId: string;
  status: "queued" | "processing" | "completed" | "failed";
  videoUrl?: string;
  error?: string;
};

/**
 * The entrypoint for the action.
 */
import * as core from "@actions/core";
import * as github from "@actions/github";
import * as io from "@actions/io";
import { writeFile } from "fs";
import * as path from "path";
import { promisify } from "util";

type Label = {
  name: string;
};

type SourcePayload = {
  action?: string;
  discussion?: {
    body?: string;
    created_at?: string;
    labels?: Label[];
    title: string;
  };
  issue?: {
    body?: string;
    closed_at?: string;
    labels?: Label[];
    title: string;
  };
};

type OutputPath = {
  outputFolder: string;
  outputPath: string;
};

type PostSource = {
  body?: string;
  labels?: Label[];
  publishedAt: string;
  title: string;
};

type GenerateContentOptions = {
  defaultTags?: string[];
};

const extractImage = /^!\[(.+)\]\((.+)\)(.*)/s;
const extractMediaDirective = /^!(?!\[)[^\S\r\n]*(\S+)(?:[^\S\r\n]*(?:\r?\n|\r)([\s\S]*))?$/;
const youtubeUrl =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?(?:[^#\s]*&)?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
const writeFileAsync = promisify(writeFile);

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const sources = splitInput(core.getInput("sources")).map((source) => source.toLowerCase());
    const postSource = sourceFromPayload(github.context.payload as SourcePayload, sources);

    if (!postSource) {
      return;
    }

    const contentFolder = core.getInput("contentFolder");
    const { outputFolder, outputPath } = pathsForPostSource(contentFolder, postSource);
    const content = generateContent(postSource, {
      defaultTags: splitInput(core.getInput("defaultTags")),
    });

    core.info(`outputPath: ${outputPath}`);
    core.info(`content: ${content}`);

    await io.mkdirP(outputFolder);

    await writeFileAsync(outputPath, content);

    core.setOutput("path", outputPath);
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
}

export function pathsForPostSource(contentFolder: string, source: PostSource): OutputPath {
  const published = new Date(source.publishedAt);
  const outputFolder = path.join(contentFolder, datePath(published));
  const outputPath = path.join(outputFolder, `${slugFromTitle(source.title)}.md`);

  return { outputFolder, outputPath };
}

export function generateContent(source: PostSource, options: GenerateContentOptions = {}): string {
  let imageAlt = undefined;
  let image = undefined;
  let imageUrl = undefined;
  let lead = undefined;
  let title = undefined;
  let youtube = undefined;

  if (source.body) {
    const mediaMatches = source.body.match(extractMediaDirective);
    if (mediaMatches) {
      const mediaUrl = mediaMatches[1];
      const youtubeMatches = mediaUrl.match(youtubeUrl);
      if (youtubeMatches) {
        youtube = youtubeMatches[1];
      } else if (isRemoteUrl(mediaUrl)) {
        imageUrl = mediaUrl;
      } else {
        image = mediaUrl;
      }

      lead = mediaMatches[2]?.trim();
    } else {
      const matches = source.body.match(extractImage);
      if (matches) {
        imageAlt = matches[1];
        if (isRemoteUrl(matches[2])) {
          imageUrl = matches[2];
        } else {
          image = matches[2];
        }
        lead = matches[3]?.trim();
      } else {
        lead = source.body.trim();
      }
    }
  }

  if (lead && !youtube) {
    const matches = lead.match(youtubeUrl);
    if (matches) {
      youtube = matches[1];
      lead = lead.replace(matches[0], "").trim();
    }
  }

  // If the lead was NOT provided via the body, then use the source title as the lead
  if (!lead) {
    lead = source.title;
  } else {
    // use the source title as the title
    title = source.title;
  }

  const frontmatterTitle = title ? `title: ${JSON.stringify(title)}\r\n` : "";

  const frontmatterLead = `lead: ${JSON.stringify(lead)}\r\n`;

  const frontmatterImage = image ? `image: ${JSON.stringify(image)}\r\n` : "";

  const frontmatterImageUrl = imageUrl ? `imageUrl: ${JSON.stringify(imageUrl)}\r\n` : "";

  const frontmatterImageAlt = imageAlt ? `imageAlt: ${JSON.stringify(imageAlt)}\r\n` : "";

  const frontmatterDate = `date: ${formatDate(source.publishedAt)}\r\n`;

  const labels = source.labels;
  const tags =
    labels && labels.length ? labels.map((label) => label.name) : options.defaultTags || [];

  const frontmatterTags = tags.length ? `tags: ${formatTags(tags)}\r\n` : "";

  const frontmatterYoutube = youtube ? `youtube: ${youtube}\r\n` : "";

  return `---\r\n${frontmatterTitle}${frontmatterLead}${frontmatterImage}${frontmatterImageUrl}${frontmatterImageAlt}${frontmatterDate}${frontmatterTags}${frontmatterYoutube}---\r\n`;
}

export function sourceFromPayload(
  payload: SourcePayload,
  sources: string[],
): PostSource | undefined {
  const enabledSources = sources.length ? sources : ["issues"];

  if (sourceEnabled(enabledSources, "issues") && payload.issue?.closed_at) {
    return postSourceFromIssue(payload.issue);
  }

  if (
    sourceEnabled(enabledSources, "discussions") &&
    payload.action === "created" &&
    payload.discussion?.created_at
  ) {
    return postSourceFromDiscussion(payload.discussion);
  }

  return undefined;
}

function postSourceFromIssue(
  issue: NonNullable<SourcePayload["issue"]> & { closed_at: string },
): PostSource {
  return {
    body: issue.body,
    labels: issue.labels,
    publishedAt: issue.closed_at,
    title: issue.title,
  };
}

function sourceEnabled(sources: string[], source: "issues" | "discussions"): boolean {
  const singular = source.replace(/s$/, "");
  return sources.includes(source) || sources.includes(singular);
}

function postSourceFromDiscussion(
  discussion: NonNullable<SourcePayload["discussion"]> & { created_at: string },
): PostSource {
  return {
    body: discussion.body,
    labels: discussion.labels,
    publishedAt: discussion.created_at,
    title: discussion.title,
  };
}

function datePath(utcDate: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(utcDate);
  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;
  return `${year}/${month}/${day}`;
}

function formatDate(date: string): string {
  return date.replace("T", " ").replace(/\.\d+Z$/, "Z");
}

function formatTags(tags: string[]): string {
  return tags.length === 1 ? tags[0] : JSON.stringify(tags);
}

function isRemoteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function slugFromTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "post";
}

function splitInput(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
run();

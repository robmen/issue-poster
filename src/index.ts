/**
 * The entrypoint for the action.
 */
import type { WebhookPayload } from "@actions/github/lib/interfaces";
import * as core from "@actions/core";
import * as github from "@actions/github";
import * as io from "@actions/io";
import { writeFile } from "fs";
import * as path from "path";
import { promisify } from "util";

type Label = {
  name: string;
};

type OutputPath = {
  outputFolder: string;
  outputPath: string;
};

type GenerateContentOptions = {
  defaultTags?: string[];
};

const extractImage = /^!\[(.+)\]\((.+)\)(.*)/s;
const youtubeUrl =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?(?:[^#\s]*&)?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
const writeFileAsync = promisify(writeFile);

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const issue = github.context.payload.issue;

    // Only process closed issues
    if (!issue || !issue.closed_at) {
      return;
    }

    const contentFolder = core.getInput("contentFolder");
    const { outputFolder, outputPath } = pathsForIssue(contentFolder, issue);
    const content = generateContent(issue, {
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

export function pathsForIssue(contentFolder: string, issue: WebhookPayload): OutputPath {
  const closed = new Date(issue.closed_at);
  const outputFolder = path.join(contentFolder, datePath(closed));
  const outputPath = path.join(outputFolder, `${slugFromTitle(issue.title)}.md`);

  return { outputFolder, outputPath };
}

export function generateContent(
  issue: WebhookPayload,
  options: GenerateContentOptions = {},
): string {
  let imageAlt = undefined;
  let image = undefined;
  let lead = undefined;
  let title = undefined;
  let youtube = undefined;

  if (issue.body) {
    const matches = issue.body.match(extractImage);
    if (matches) {
      imageAlt = matches[1];
      image = matches[2];
      lead = matches[3]?.trim();
    } else {
      lead = issue.body.trim();
    }
  }

  if (lead) {
    const matches = lead.match(youtubeUrl);
    if (matches) {
      youtube = matches[1];
      lead = lead.replace(matches[0], "").trim();
    }
  }

  // If the lead was NOT provided via the body, then use the issue title as the lead
  if (!lead) {
    lead = issue.title;
  } else {
    // use the issue title as the title
    title = issue.title;
  }

  const frontmatterTitle = title ? `title: ${JSON.stringify(title)}\r\n` : "";

  const frontmatterLead = `lead: ${JSON.stringify(lead)}\r\n`;

  const frontmatterImage = image ? `image: ${JSON.stringify(image)}\r\n` : "";

  const frontmatterImageAlt = imageAlt ? `imageAlt: ${JSON.stringify(imageAlt)}\r\n` : "";

  const frontmatterDate = `date: ${formatDate(issue.closed_at)}\r\n`;

  const labels = issue.labels as Label[];
  const tags =
    labels && labels.length ? labels.map((label) => label.name) : options.defaultTags || [];

  const frontmatterTags = tags.length ? `tags: ${formatTags(tags)}\r\n` : "";

  const frontmatterYoutube = youtube ? `youtube: ${youtube}\r\n` : "";

  return `---\r\n${frontmatterTitle}${frontmatterLead}${frontmatterImage}${frontmatterImageAlt}${frontmatterDate}${frontmatterTags}${frontmatterYoutube}---\r\n`;
}

function datePath(utcDate: Date): string {
  const date = new Date(utcDate.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
}

function formatDate(date: string): string {
  return date.replace("T", " ").replace(/\.\d+Z$/, "Z");
}

function formatTags(tags: string[]): string {
  return tags.length === 1 ? tags[0] : JSON.stringify(tags);
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

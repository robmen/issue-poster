/**
 * The entrypoint for the action.
 */
import type { WebhookPayload } from '@actions/github/lib/interfaces';
import * as core from '@actions/core';
import * as github from '@actions/github';
import * as io from '@actions/io';
import { writeFile } from 'fs';
import * as path from 'path';
import { promisify } from 'util';

type Label = {
  name: string;
};

type OutputPath = {
  outputFolder: string;
  outputPath: string;
};

const extractImage = /^!\[(.+)\]\((.+)\)(.*)/s;
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

    const contentFolder = core.getInput('contentFolder');
    const { outputFolder, outputPath } = pathsForIssue(contentFolder, issue);
    const content = generateContent(issue);

    core.info(`outputPath: ${outputPath}`);
    core.info(`content: ${content}`);

    await io.mkdirP(outputFolder);

    await writeFileAsync(outputPath, content);

    core.setOutput('path', outputPath);
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
}

export function pathsForIssue(
  contentFolder: string,
  issue: WebhookPayload
): OutputPath {
  const closed = new Date(issue.closed_at);
  const outputFolder = path.join(contentFolder, datePath(closed));
  const outputPath = path.join(outputFolder, `${issue.number}.md`);

  return { outputFolder, outputPath };
}

export function generateContent(issue: WebhookPayload): string {
  let imageAlt = undefined;
  let image = undefined;
  let lead = undefined;
  let title = undefined;

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

  // If the lead was NOT provided via the body, then use the issue title as the lead
  if (!lead) {
    lead = issue.title;
  } else {
    // use the issue title as the title
    title = issue.title;
  }

  const frontmatterTitle = title ? `title: ${JSON.stringify(title)}\r\n` : '';

  const frontmatterLead = `lead: ${JSON.stringify(lead)}\r\n`;

  const frontmatterImage = image ? `image: ${JSON.stringify(image)}\r\n` : '';

  const frontmatterImageAlt = imageAlt
    ? `imageAlt: ${JSON.stringify(imageAlt)}\r\n`
    : '';

  const frontmatterDate = `date: ${issue.closed_at}\r\n`;

  const labels = issue.labels as Label[];

  const frontmatterTags =
    labels && labels.length
      ? `tags: ${JSON.stringify(labels.map(label => label.name))}\r\n`
      : '';

  return `---\r\n${frontmatterTitle}${frontmatterLead}${frontmatterImage}${frontmatterImageAlt}${frontmatterDate}${frontmatterTags}---\r\n`;
}

function datePath(utcDate: Date): string {
  const date = new Date(
    utcDate.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })
  );
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
run();

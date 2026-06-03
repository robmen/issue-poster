/**
 * Unit tests for the action's main functionality, src/index.ts
 */

import * as main from "../src/index";
import { join as joinPath } from "path";
import { describe, expect, it } from "vitest";

describe("action", () => {
  it("canGetPathFromTitleSlug", () => {
    const issue = {
      number: 123,
      title: "Albert Rusnak: The Movie!",
      closed_at: "2023-12-02T01:20:26Z",
      labels: [
        {
          name: "personal",
        },
      ],
    };

    const contentFolder = "src/content/blog";
    const { outputFolder, outputPath } = main.pathsForIssue(contentFolder, issue);
    expect(outputFolder).toEqual(joinPath("src", "content", "blog", "2023", "12", "01"));
    expect(outputPath).toEqual(
      joinPath("src", "content", "blog", "2023", "12", "01", "albert-rusnak-the-movie.md"),
    );
  });

  it("hasBody", () => {
    const issue = {
      number: 123,
      title: "Issue title",
      closed_at: "2023-12-02T01:20:26Z",
      body: "# This is the body",
      labels: [
        {
          name: "personal",
        },
      ],
    };

    const expected = [
      "---",
      'title: "Issue title"',
      'lead: "# This is the body"',
      "date: 2023-12-02 01:20:26Z",
      "tags: personal",
      "---",
      "",
    ].join("\r\n");

    const content = main.generateContent(issue);
    expect(content).toEqual(expected);
  });

  it("usesTitleAsLeadForShortPost", () => {
    const issue = {
      number: 123,
      title: "Albert Rusnak The Movie. This is really cool from the Sounders.",
      closed_at: "2024-02-11T22:38:15Z",
    };

    const expected = [
      "---",
      'lead: "Albert Rusnak The Movie. This is really cool from the Sounders."',
      "date: 2024-02-11 22:38:15Z",
      "tags: personal",
      "---",
      "",
    ].join("\r\n");

    const content = main.generateContent(issue, { defaultTags: ["personal"] });
    expect(content).toEqual(expected);
  });

  it("extractsYoutubeUrlFromShortPostBody", () => {
    const issue = {
      number: 123,
      title: "Albert Rusnak The Movie. This is really cool from the Sounders.",
      closed_at: "2024-02-11T22:38:15Z",
      body: "https://youtu.be/I1XJYdg3kWQ",
    };

    const expected = [
      "---",
      'lead: "Albert Rusnak The Movie. This is really cool from the Sounders."',
      "date: 2024-02-11 22:38:15Z",
      "tags: personal",
      "youtube: I1XJYdg3kWQ",
      "---",
      "",
    ].join("\r\n");

    const content = main.generateContent(issue, { defaultTags: ["personal"] });
    expect(content).toEqual(expected);
  });

  it("extractsYoutubeFromFirstLineMediaDirective", () => {
    const issue = {
      number: 123,
      title: "Albert Rusnak The Movie. This is really cool from the Sounders.",
      closed_at: "2024-02-11T22:38:15Z",
      body: "! https://youtu.be/I1XJYdg3kWQ",
    };

    const expected = [
      "---",
      'lead: "Albert Rusnak The Movie. This is really cool from the Sounders."',
      "date: 2024-02-11 22:38:15Z",
      "tags: personal",
      "youtube: I1XJYdg3kWQ",
      "---",
      "",
    ].join("\r\n");

    const content = main.generateContent(issue, { defaultTags: ["personal"] });
    expect(content).toEqual(expected);
  });

  it("extractsYoutubeFromFullUrlFirstLineMediaDirective", () => {
    const issue = {
      number: 123,
      title: "Albert Rusnak The Movie. This is really cool from the Sounders.",
      closed_at: "2024-02-11T22:38:15Z",
      body: "!https://www.youtube.com/watch?v=I1XJYdg3kWQ",
    };

    const expected = [
      "---",
      'lead: "Albert Rusnak The Movie. This is really cool from the Sounders."',
      "date: 2024-02-11 22:38:15Z",
      "tags: personal",
      "youtube: I1XJYdg3kWQ",
      "---",
      "",
    ].join("\r\n");

    const content = main.generateContent(issue, { defaultTags: ["personal"] });
    expect(content).toEqual(expected);
  });

  it("extractsYoutubeFromFullUrlInShortPostBody", () => {
    const issue = {
      number: 123,
      title: "Albert Rusnak The Movie. This is really cool from the Sounders.",
      closed_at: "2024-02-11T22:38:15Z",
      body: "https://www.youtube.com/watch?v=I1XJYdg3kWQ",
    };

    const expected = [
      "---",
      'lead: "Albert Rusnak The Movie. This is really cool from the Sounders."',
      "date: 2024-02-11 22:38:15Z",
      "tags: personal",
      "youtube: I1XJYdg3kWQ",
      "---",
      "",
    ].join("\r\n");

    const content = main.generateContent(issue, { defaultTags: ["personal"] });
    expect(content).toEqual(expected);
  });

  it("extractsImageFromFirstLineMediaDirective", () => {
    const issue = {
      number: 123,
      title: "Issue title",
      closed_at: "2023-12-02T01:20:26Z",
      body: "! https://example.com/post-image.png\r\n\r\nThis is the post text.",
      labels: [
        {
          name: "personal",
        },
      ],
    };

    const expected = [
      "---",
      'title: "Issue title"',
      'lead: "This is the post text."',
      'imageUrl: "https://example.com/post-image.png"',
      "date: 2023-12-02 01:20:26Z",
      "tags: personal",
      "---",
      "",
    ].join("\r\n");

    const content = main.generateContent(issue);
    expect(content).toEqual(expected);
  });

  it("extractsImageFromFirstLineMediaDirectiveWithoutSpace", () => {
    const issue = {
      number: 123,
      title: "Issue title",
      closed_at: "2023-12-02T01:20:26Z",
      body: "!https://example.com/post-image.png\r\n\r\nThis is the post text.",
      labels: [
        {
          name: "personal",
        },
      ],
    };

    const expected = [
      "---",
      'title: "Issue title"',
      'lead: "This is the post text."',
      'imageUrl: "https://example.com/post-image.png"',
      "date: 2023-12-02 01:20:26Z",
      "tags: personal",
      "---",
      "",
    ].join("\r\n");

    const content = main.generateContent(issue);
    expect(content).toEqual(expected);
  });

  it("extractsLocalImageFromFirstLineMediaDirective", () => {
    const issue = {
      number: 123,
      title: "Issue title",
      closed_at: "2023-12-02T01:20:26Z",
      body: "! ./post-image.png\r\n\r\nThis is the post text.",
      labels: [
        {
          name: "personal",
        },
      ],
    };

    const expected = [
      "---",
      'title: "Issue title"',
      'lead: "This is the post text."',
      'image: "./post-image.png"',
      "date: 2023-12-02 01:20:26Z",
      "tags: personal",
      "---",
      "",
    ].join("\r\n");

    const content = main.generateContent(issue);
    expect(content).toEqual(expected);
  });

  it("hasImageWithBody", () => {
    const issue = {
      number: 123,
      title: "Issue title",
      closed_at: "2023-12-02T01:20:26Z",
      body: "![hw-wix](https://github.com/robmen/test-blog/assets/131904/c259667c-9317-4207-8c94-24a5c984aa35)\r\n\r\n#This is the cool amount of text I can add here. What do you think? Is it good?",
      labels: [
        {
          name: "wix",
        },
        {
          name: "setup",
        },
      ],
    };

    const expected = [
      "---",
      'title: "Issue title"',
      'lead: "#This is the cool amount of text I can add here. What do you think? Is it good?"',
      'imageUrl: "https://github.com/robmen/test-blog/assets/131904/c259667c-9317-4207-8c94-24a5c984aa35"',
      'imageAlt: "hw-wix"',
      "date: 2023-12-02 01:20:26Z",
      'tags: ["wix","setup"]',
      "---",
      "",
    ].join("\r\n");

    const content = main.generateContent(issue);
    expect(content).toEqual(expected);
  });

  it("hasImageWithoutBody", () => {
    const issue = {
      number: 123,
      title: "Issue title",
      closed_at: "2023-12-02T01:20:26Z",
      body: "![hw-wix](https://github.com/robmen/test-blog/assets/131904/c259667c-9317-4207-8c94-24a5c984aa35)\r\n",
      labels: [
        {
          name: "personal",
        },
      ],
    };

    const expected = [
      "---",
      'lead: "Issue title"',
      'imageUrl: "https://github.com/robmen/test-blog/assets/131904/c259667c-9317-4207-8c94-24a5c984aa35"',
      'imageAlt: "hw-wix"',
      "date: 2023-12-02 01:20:26Z",
      "tags: personal",
      "---",
      "",
    ].join("\r\n");

    const content = main.generateContent(issue);
    expect(content).toEqual(expected);
  });
});

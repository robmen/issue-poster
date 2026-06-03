/**
 * Unit tests for the action's main functionality, src/index.ts
 */

import * as main from "../src/index";
import { join as joinPath } from "path";
import { describe, expect, it } from "vitest";

describe("action", () => {
  it("canGetPathFromTitleSlug", () => {
    const source = {
      title: "Albert Rusnak: The Movie!",
      publishedAt: "2023-12-02T01:20:26Z",
      labels: [
        {
          name: "personal",
        },
      ],
    };

    const contentFolder = "src/content/blog";
    const { outputFolder, outputPath } = main.pathsForPostSource(contentFolder, source);
    expect(outputFolder).toEqual(joinPath("src", "content", "blog", "2023", "12", "01"));
    expect(outputPath).toEqual(
      joinPath("src", "content", "blog", "2023", "12", "01", "albert-rusnak-the-movie.md"),
    );
  });

  it("canGetPathFromDiscussionCreatedDate", () => {
    const discussion = {
      title: "Fast post from a discussion!",
      publishedAt: "2023-12-02T01:20:26Z",
    };

    const contentFolder = "src/content/blog";
    const { outputFolder, outputPath } = main.pathsForPostSource(contentFolder, discussion);
    expect(outputFolder).toEqual(joinPath("src", "content", "blog", "2023", "12", "01"));
    expect(outputPath).toEqual(
      joinPath("src", "content", "blog", "2023", "12", "01", "fast-post-from-a-discussion.md"),
    );
  });

  it("createsPostSourceFromCreatedDiscussionWhenEnabled", () => {
    const payload = {
      action: "created",
      discussion: {
        title: "Fast post from a discussion!",
        body: "!https://example.com/post-image.png\r\n\r\nThis is the post text.",
        created_at: "2023-12-02T01:20:26Z",
        labels: [
          {
            name: "personal",
          },
        ],
      },
    };

    const source = main.sourceFromPayload(payload, ["discussions"]);

    expect(source).toEqual({
      title: "Fast post from a discussion!",
      body: "!https://example.com/post-image.png\r\n\r\nThis is the post text.",
      publishedAt: "2023-12-02T01:20:26Z",
      labels: [
        {
          name: "personal",
        },
      ],
    });
  });

  it("ignoresCreatedDiscussionWhenDiscussionsAreDisabled", () => {
    const payload = {
      action: "created",
      discussion: {
        title: "Fast post from a discussion!",
        created_at: "2023-12-02T01:20:26Z",
      },
    };

    const source = main.sourceFromPayload(payload, ["issues"]);

    expect(source).toBeUndefined();
  });

  it("ignoresEditedDiscussion", () => {
    const payload = {
      action: "edited",
      discussion: {
        title: "Fast post from a discussion!",
        created_at: "2023-12-02T01:20:26Z",
      },
    };

    const source = main.sourceFromPayload(payload, ["discussions"]);

    expect(source).toBeUndefined();
  });

  it("createsPostSourceFromClosedIssueWhenEnabled", () => {
    const payload = {
      issue: {
        title: "Issue title",
        body: "Issue body",
        closed_at: "2023-12-02T01:20:26Z",
        labels: [
          {
            name: "personal",
          },
        ],
      },
    };

    const source = main.sourceFromPayload(payload, ["issues"]);

    expect(source).toEqual({
      title: "Issue title",
      body: "Issue body",
      publishedAt: "2023-12-02T01:20:26Z",
      labels: [
        {
          name: "personal",
        },
      ],
    });
  });

  it("ignoresClosedIssueWhenIssuesAreDisabled", () => {
    const payload = {
      issue: {
        title: "Issue title",
        closed_at: "2023-12-02T01:20:26Z",
      },
    };

    const source = main.sourceFromPayload(payload, ["discussions"]);

    expect(source).toBeUndefined();
  });

  it("hasBody", () => {
    const issue = {
      title: "Issue title",
      publishedAt: "2023-12-02T01:20:26Z",
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
      title: "Albert Rusnak The Movie. This is really cool from the Sounders.",
      publishedAt: "2024-02-11T22:38:15Z",
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
      title: "Albert Rusnak The Movie. This is really cool from the Sounders.",
      publishedAt: "2024-02-11T22:38:15Z",
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
      title: "Albert Rusnak The Movie. This is really cool from the Sounders.",
      publishedAt: "2024-02-11T22:38:15Z",
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
      title: "Albert Rusnak The Movie. This is really cool from the Sounders.",
      publishedAt: "2024-02-11T22:38:15Z",
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
      title: "Albert Rusnak The Movie. This is really cool from the Sounders.",
      publishedAt: "2024-02-11T22:38:15Z",
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
      title: "Issue title",
      publishedAt: "2023-12-02T01:20:26Z",
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
      title: "Issue title",
      publishedAt: "2023-12-02T01:20:26Z",
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
      title: "Issue title",
      publishedAt: "2023-12-02T01:20:26Z",
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
      title: "Issue title",
      publishedAt: "2023-12-02T01:20:26Z",
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
      title: "Issue title",
      publishedAt: "2023-12-02T01:20:26Z",
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

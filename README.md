# Issue Poster

Issue Poster is a GitHub Action that turns closed GitHub issues into content
files. It is useful for lightweight publishing workflows where an issue is the
drafting interface and closing the issue means "publish this as a post."

When the action runs on an issue payload, it:

1. Ignores the event unless the issue is closed.
1. Builds a Markdown file containing YAML-style frontmatter.
1. Writes the file under a date-based folder inside the configured content
   folder.
1. Exposes the created file path as the `path` output.

The action does not commit the generated file by itself. If you want the post to
be saved back to the repository, add a separate commit step after this action.

## Generated Files

For an issue closed at `2023-12-02T01:20:26Z`, the output folder is calculated
in the `America/Los_Angeles` timezone. That timestamp is December 1 in Los
Angeles, so an issue titled `Albert Rusnak: The Movie!` with the default content
folder is written to:

```text
src/content/blog/2023/12/01/albert-rusnak-the-movie.md
```

The file contains frontmatter only:

```yaml
---
title: "Issue title"
lead: "Issue body"
image: "https://example.com/image.png"
imageAlt: "Image alt text"
date: 2023-12-02 01:20:26Z
tags: ["label-one","label-two"]
youtube: I1XJYdg3kWQ
---
```

Fields are generated from the issue like this:

- `lead`: The issue body, trimmed. If the body is empty, the issue title is used.
- `title`: The issue title, but only when the issue body provided the `lead`.
- `image`: The URL from a leading Markdown image in the issue body.
- `imageAlt`: The alt text from a leading Markdown image in the issue body.
- `date`: The issue `closed_at` timestamp.
- `tags`: The issue label names. If the issue has no labels, `defaultTags` is used.
- `youtube`: The video ID from a YouTube URL in the issue body.

If the issue body starts with a Markdown image, the image is removed from the
lead and stored separately:

```markdown
![Post image](https://example.com/post-image.png)

This becomes the lead text.
```

For a short post, leave the body empty and put the whole post in the issue
title. The generated file will use the title as the `lead` and omit `title`:

```yaml
---
lead: Albert Rusnak The Movie. This is really cool from the Sounders.
date: 2024-02-11 22:38:15Z
tags: personal
---
```

If a short post needs a YouTube embed, put the YouTube URL in the issue body.
The URL is removed from `lead` and stored as `youtube`.

## Posting Short Updates

From GitHub CLI:

```bash
gh issue create --title "Albert Rusnak The Movie. This is really cool from the Sounders." --label personal
```

Then close the issue to publish it:

```bash
gh issue close <issue-number>
```

From the GitHub mobile app, create an issue with the short update as the title,
apply labels if needed, then close the issue when it is ready to publish.

## Usage

Add the action to a workflow that runs when issues are closed:

```yaml
name: Publish closed issues

on:
  issues:
    types: [closed]

permissions:
  contents: write
  issues: read

jobs:
  publish:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Create post from issue
        id: issue-poster
        uses: robmen/issue-poster@v1
        with:
          contentFolder: src/content/blog

      - name: Commit generated post
        if: steps.issue-poster.outputs.path != ''
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: Add post from issue
          file_pattern: ${{ steps.issue-poster.outputs.path }}
```

For local testing from this repository, use the local action reference:

```yaml
- name: Create post from issue
  id: issue-poster
  uses: ./
  with:
    contentFolder: src/content/blog
```

## Inputs

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `contentFolder` | Yes | `src/content/blog` | Root folder where generated posts are written. |
| `defaultTags` | No | `personal` | Comma-separated tags to use when the issue has no labels. |

## Outputs

| Name | Description |
| --- | --- |
| `path` | Path to the generated Markdown file. Empty when the event was not for a closed issue. |

## Development

This action is written in TypeScript and runs on Node.js 20.

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Check formatting:

```bash
npm run format:check
```

Build the distributable action with VITE+:

```bash
npm run package
```

Before publishing changes to the action implementation, rebuild `dist/index.js`
so workflows that consume the repository get the updated bundled code:

```bash
npm run bundle
```

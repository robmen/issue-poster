# Issue Poster

Issue Poster is a GitHub Action that turns closed GitHub issues or new GitHub
Discussions into content files. It is useful for lightweight publishing
workflows where Issues are draftable posts and Discussions are fast posts.

When the action runs on a configured source payload, it:

1. Ignores the event unless the configured source is publishable.
1. Builds a Markdown file containing YAML-style frontmatter.
1. Writes the file under a date-based folder inside the configured content
   folder.
1. Exposes the created file path as the `path` output.

The action does not commit the generated file by itself. If you want the post to
be saved back to the repository, add a separate commit step after this action.

## Generated Files

For an issue closed or discussion created at `2023-12-02T01:20:26Z`, the output
folder is calculated in the `America/Los_Angeles` timezone. That timestamp is
December 1 in Los Angeles, so a source titled `Albert Rusnak: The Movie!` with
the default content folder is written to:

```text
src/content/blog/2023/12/01/albert-rusnak-the-movie.md
```

The file contains frontmatter only:

```yaml
---
title: "Issue title"
lead: "Issue body"
image: "https://example.com/image.png"
imageUrl: "https://example.com/image.png"
imageAlt: "Image alt text"
date: 2023-12-02 01:20:26Z
tags: ["label-one", "label-two"]
youtube: I1XJYdg3kWQ
---
```

Fields are generated from the source like this:

- `lead`: The source body, trimmed. If the body is empty, the source title is used.
- `title`: The source title, but only when the source body provided the `lead`.
- `image`: The local image path from a leading Markdown image or media directive.
- `imageUrl`: The remote HTTP image URL from a leading Markdown image or media directive.
- `imageAlt`: The alt text from a leading Markdown image in the issue body.
- `date`: The issue `closed_at` timestamp or discussion `created_at` timestamp.
- `tags`: The source label names. If the source has no labels, `defaultTags` is used.
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

You can also put a media URL on the first line by prefixing it with `!`. The
space after `!` is optional:

```text
!https://youtu.be/I1XJYdg3kWQ
This becomes the lead text.
```

YouTube URLs become `youtube` frontmatter. Other HTTP URLs become `imageUrl`
frontmatter. Local image paths become `image` frontmatter.

## Posting Short Updates

Issues are draftable. Create an issue, revise it as needed, then close it to
publish:

```bash
gh issue create --title "Albert Rusnak The Movie. This is really cool from the Sounders." --label personal
gh issue close <issue-number>
```

Discussions publish immediately when created. The GitHub CLI does not currently
include a built-in `gh discussion create` command, so use the GitHub web or
mobile UI for fast Discussion posts. A future script can use `gh api graphql`
for command-line Discussion creation.

From the GitHub mobile app, create an issue when you want a draftable post or a
discussion when you want to publish immediately.

## Usage

Add the action to a workflow that runs when issues are closed and discussions
are created. Pin the action to a full commit SHA instead of a tag because tags
can move:

```yaml
name: Publish quick post

on:
  issues:
    types: [closed]
  discussion:
    types: [created]

permissions:
  contents: write
  discussions: read
  issues: read

jobs:
  publish:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Create post from GitHub source
        id: issue-poster
        uses: robmen/issue-poster@<full-commit-sha>
        with:
          contentFolder: src/content/blog
          sources: issues,discussions

      - name: Commit generated post
        if: steps.issue-poster.outputs.path != ''
        run: |
          number="${{ github.event.issue.number || github.event.discussion.number }}"
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add "${{ steps.issue-poster.outputs.path }}"
          git commit -m "Add post from GitHub source #${number}"
          git push
```

For local testing from this repository, use the local action reference:

```yaml
- name: Create post from GitHub source
  id: issue-poster
  uses: ./
  with:
    contentFolder: src/content/blog
```

## Inputs

| Name            | Required | Default            | Description                                                           |
| --------------- | -------- | ------------------ | --------------------------------------------------------------------- |
| `contentFolder` | Yes      | `src/content/blog` | Root folder where generated posts are written.                        |
| `defaultTags`   | No       | `personal`         | Comma-separated tags to use when the source has no labels.            |
| `sources`       | No       | `issues`           | Comma-separated sources to process: `issues`, `discussions`, or both. |

## Outputs

| Name   | Description                                                                    |
| ------ | ------------------------------------------------------------------------------ |
| `path` | Path to the generated Markdown file. Empty when the event was not publishable. |

## Development

This action is written in TypeScript and runs on Node.js 20.19 or later.
Development commands use VITE+, so install `vp` before running the scripts.

Install dependencies:

```bash
vp install
```

Run tests:

```bash
npm run test
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

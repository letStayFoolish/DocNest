---
title: Getting Started with DocNest
description: Learn how to add documents, organize them with frontmatter, and deploy your personal library.
tags: [setup, guide, introduction]
category: Guide
date: 2024-01-15
---

## Introduction

**DocNest** is your personal documentation hub — a single place for all your notes, references, and guides. It auto-discovers every `.md` file you drop into the `docs/` folder and builds a clean, searchable library.

No backend, no database. Just markdown files and a fast Next.js frontend.

## Adding New Documents

Create any `.md` file inside the `docs/` folder at the project root. After rebuilding (or redeploying), it will automatically appear on the home page.

```
docs/
├── getting-started.md   ← this file
├── my-new-note.md       ← just create it here
└── any-name-you-want.md
```

### Frontmatter

Every document can have optional YAML frontmatter at the top:

```yaml
---
title: Your Document Title
description: A short summary shown on the card.
tags: [tag1, tag2, tag3]
category: Guide
date: 2024-01-15
---
```

| Field         | Type     | Description                                   |
| ------------- | -------- | --------------------------------------------- |
| `title`       | string   | Display name (falls back to filename if missing) |
| `description` | string   | Short summary shown in the card               |
| `tags`        | string[] | Keywords — searchable, shown as pills         |
| `category`    | string   | Used for the category filter                  |
| `date`        | string   | ISO date — used for sorting (newest first)    |

## Categories

Each category gets its own colour indicator:

- **Guide** — Emerald green
- **Reference** — Blue
- **JavaScript** — Yellow
- **React** — Cyan
- **CSS** — Pink
- **Git** — Orange
- **General** — Violet (default)

## Searching and Filtering

The home page has a live search bar that matches document **titles**, **descriptions**, and **tags**. Use the category pills to filter by type. Both filters work together.

## Deploying to Vercel

1. Push the project to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and click **Add New Project**
3. Import your GitHub repo — Vercel detects Next.js automatically
4. Click **Deploy**

Every time you push new `.md` files to the repo, Vercel rebuilds and the new docs appear live within seconds.

## Keyboard Tips

- Use `/` to focus the search bar (you can add this shortcut yourself)
- The sidebar TOC on a doc page tracks your scroll position
- The theme toggle in the top-right switches between dark and light mode

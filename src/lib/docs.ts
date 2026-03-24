import fs from "fs";
import path from "path";
import matter from "gray-matter";

const docsDirectory = path.join(process.cwd(), "docs");

export interface DocMeta {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  category: string;
  date: string;
  readTime: number;
}

export interface Doc extends DocMeta {
  content: string;
}

export interface Heading {
  id: string;
  text: string;
  level: number;
}

/** Slugify a heading text the same way rehype-slug does */
function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

/** Extract h1–h3 headings from raw markdown content */
export function extractHeadings(content: string): Heading[] {
  const headingRegex = /^(#{1,3})\s+(.+)$/gm;
  const headings: Heading[] = [];
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    // Strip inline markdown from heading text
    const rawText = match[2]
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/`(.+?)`/g, "$1")
      .replace(/\[(.+?)\]\(.+?\)/g, "$1");

    headings.push({
      id: slugifyHeading(rawText),
      text: rawText,
      level,
    });
  }

  return headings;
}

export function getAllDocs(): DocMeta[] {
  if (!fs.existsSync(docsDirectory)) return [];

  const fileNames = fs.readdirSync(docsDirectory);

  const docs = fileNames
    .filter((name) => name.endsWith(".md"))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, "");
      const fullPath = path.join(docsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, "utf8");
      const { data, content } = matter(fileContents);

      const words = content.trim().split(/\s+/).length;
      const readTime = Math.max(1, Math.ceil(words / 200));

      return {
        slug,
        title: data.title ?? slug,
        description: data.description ?? "",
        tags: Array.isArray(data.tags) ? data.tags : [],
        category: data.category ?? "General",
        date: data.date ? String(data.date) : "",
        readTime,
      };
    });

  return docs.sort((a, b) => {
    if (a.date && b.date) {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    return 0;
  });
}

export function getDocBySlug(slug: string): Doc | null {
  const fullPath = path.join(docsDirectory, `${slug}.md`);
  if (!fs.existsSync(fullPath)) return null;

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  const words = content.trim().split(/\s+/).length;
  const readTime = Math.max(1, Math.ceil(words / 200));

  return {
    slug,
    title: data.title ?? slug,
    description: data.description ?? "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    category: data.category ?? "General",
    date: data.date ? String(data.date) : "",
    readTime,
    content,
  };
}

export function getAllSlugs(): string[] {
  if (!fs.existsSync(docsDirectory)) return [];

  return fs
    .readdirSync(docsDirectory)
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.replace(/\.md$/, ""));
}

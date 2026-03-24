import { notFound } from "next/navigation";
import { getDocBySlug, getAllSlugs, extractHeadings } from "@/lib/docs";
import { DocPageContent } from "@/components/DocPageContent";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  if (!doc) return {};
  return {
    title: `${doc.title} — DocNest`,
    description: doc.description || undefined,
  };
}

export default async function DocPage({ params }: Props) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);

  if (!doc) notFound();

  const headings = extractHeadings(doc.content);

  return <DocPageContent doc={doc} headings={headings} />;
}

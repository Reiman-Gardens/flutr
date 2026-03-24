import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { institution_news } from "@/lib/schema";

export async function listNewsForTenant(institutionId: number) {
  return db
    .select()
    .from(institution_news)
    .where(eq(institution_news.institution_id, institutionId))
    .orderBy(desc(institution_news.created_at));
}

export async function getNewsEntryById(institutionId: number, id: number) {
  const [row] = await db
    .select()
    .from(institution_news)
    .where(and(eq(institution_news.institution_id, institutionId), eq(institution_news.id, id)))
    .limit(1);

  return row ?? null;
}

export async function createNewsEntry(
  institutionId: number,
  data: { title: string; content: string; image_url?: string; is_active?: boolean },
) {
  const [row] = await db
    .insert(institution_news)
    .values({
      institution_id: institutionId,
      title: data.title,
      content: data.content,
      image_url: data.image_url,
      is_active: data.is_active ?? true,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning();

  return row ?? null;
}

export async function updateNewsEntry(
  institutionId: number,
  id: number,
  data: Partial<{ title: string; content: string; image_url: string; is_active: boolean }>,
) {
  const [row] = await db
    .update(institution_news)
    .set({ ...data, updated_at: new Date() })
    .where(and(eq(institution_news.institution_id, institutionId), eq(institution_news.id, id)))
    .returning();

  return row ?? null;
}

export async function deleteNewsEntry(institutionId: number, id: number) {
  const [row] = await db
    .delete(institution_news)
    .where(and(eq(institution_news.institution_id, institutionId), eq(institution_news.id, id)))
    .returning();

  return row ?? null;
}

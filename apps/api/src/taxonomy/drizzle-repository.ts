import { and, asc, eq, ilike, or } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { categories, jobTitles, languages, skills, subcategories } from '../db/schema.js';
import type { TaxonomyItem, TaxonomyRepository } from './repository.js';

function mapItem(row: { id: string; code: string; nameEn: string; nameAr: string }): TaxonomyItem {
  return row;
}

export class DrizzleTaxonomyRepository implements TaxonomyRepository {
  constructor(private readonly db: Database) {}

  async listCategories(): Promise<TaxonomyItem[]> {
    const rows = await this.db
      .select({ id: categories.id, code: categories.code, nameEn: categories.nameEn, nameAr: categories.nameAr })
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.nameEn));
    return rows.map(mapItem);
  }

  async listSubcategories(categoryId: string): Promise<TaxonomyItem[]> {
    const rows = await this.db
      .select({
        id: subcategories.id,
        code: subcategories.code,
        nameEn: subcategories.nameEn,
        nameAr: subcategories.nameAr,
      })
      .from(subcategories)
      .where(and(eq(subcategories.categoryId, categoryId), eq(subcategories.isActive, true)))
      .orderBy(asc(subcategories.nameEn));
    return rows.map(mapItem);
  }

  async listJobTitles(query: string | undefined, limit: number): Promise<TaxonomyItem[]> {
    const condition = query
      ? and(
          eq(jobTitles.isActive, true),
          or(ilike(jobTitles.nameEn, `%${query}%`), ilike(jobTitles.nameAr, `%${query}%`), ilike(jobTitles.code, `%${query}%`)),
        )
      : eq(jobTitles.isActive, true);
    const rows = await this.db
      .select({ id: jobTitles.id, code: jobTitles.code, nameEn: jobTitles.nameEn, nameAr: jobTitles.nameAr })
      .from(jobTitles)
      .where(condition)
      .orderBy(asc(jobTitles.nameEn))
      .limit(limit);
    return rows.map(mapItem);
  }

  async listSkills(query: string | undefined, limit: number): Promise<TaxonomyItem[]> {
    const condition = query
      ? and(
          eq(skills.isActive, true),
          or(ilike(skills.nameEn, `%${query}%`), ilike(skills.nameAr, `%${query}%`), ilike(skills.code, `%${query}%`)),
        )
      : eq(skills.isActive, true);
    const rows = await this.db
      .select({ id: skills.id, code: skills.code, nameEn: skills.nameEn, nameAr: skills.nameAr })
      .from(skills)
      .where(condition)
      .orderBy(asc(skills.nameEn))
      .limit(limit);
    return rows.map(mapItem);
  }

  async listLanguages(): Promise<TaxonomyItem[]> {
    const rows = await this.db
      .select({ id: languages.id, code: languages.code, nameEn: languages.nameEn, nameAr: languages.nameAr })
      .from(languages)
      .where(eq(languages.isActive, true))
      .orderBy(asc(languages.nameEn));
    return rows.map(mapItem);
  }
}

import { and, asc, eq, exists, ilike, inArray, or } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { categories, jobTitleAliases, jobTitles, jobTitleSkills, languages, skills, subcategories } from '../db/schema.js';
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
      .orderBy(asc(categories.displayOrder), asc(categories.nameEn));
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
      .orderBy(asc(subcategories.displayOrder), asc(subcategories.nameEn));
    return rows.map(mapItem);
  }

  async listJobTitles(query: string | undefined, limit: number, subcategoryId?: string): Promise<TaxonomyItem[]> {
    const condition = and(
      eq(jobTitles.isActive, true),
      subcategoryId ? eq(jobTitles.primarySubcategoryId, subcategoryId) : undefined,
      query
        ? or(
            ilike(jobTitles.nameEn, `%${query}%`),
            ilike(jobTitles.nameAr, `%${query}%`),
            ilike(jobTitles.code, `%${query}%`),
            exists(
              this.db
                .select({ id: jobTitleAliases.id })
                .from(jobTitleAliases)
                .where(and(
                  eq(jobTitleAliases.jobTitleId, jobTitles.id),
                  eq(jobTitleAliases.isActive, true),
                  or(ilike(jobTitleAliases.aliasEn, `%${query}%`), ilike(jobTitleAliases.aliasAr, `%${query}%`)),
                )),
            ),
          )
        : undefined,
    );
    const rows = await this.db
      .select({ id: jobTitles.id, code: jobTitles.code, nameEn: jobTitles.nameEn, nameAr: jobTitles.nameAr })
      .from(jobTitles)
      .where(condition)
      .orderBy(asc(jobTitles.nameEn))
      .limit(limit);
    return rows.map(mapItem);
  }

  async listSkills(query: string | undefined, limit: number, jobTitleIds?: string[]): Promise<TaxonomyItem[]> {
    const condition = and(
      eq(skills.isActive, true),
      query
        ? or(ilike(skills.nameEn, `%${query}%`), ilike(skills.nameAr, `%${query}%`), ilike(skills.code, `%${query}%`))
        : undefined,
      jobTitleIds?.length
        ? exists(
            this.db
              .select({ skillId: jobTitleSkills.skillId })
              .from(jobTitleSkills)
              .where(and(eq(jobTitleSkills.skillId, skills.id), inArray(jobTitleSkills.jobTitleId, jobTitleIds))),
          )
        : undefined,
    );
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

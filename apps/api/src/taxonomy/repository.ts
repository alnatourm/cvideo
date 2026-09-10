export interface TaxonomyItem {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
}

export interface TaxonomyRepository {
  listCategories(): Promise<TaxonomyItem[]>;
  listSubcategories(categoryId: string): Promise<TaxonomyItem[]>;
  listJobTitles(query: string | undefined, limit: number): Promise<TaxonomyItem[]>;
  listSkills(query: string | undefined, limit: number): Promise<TaxonomyItem[]>;
  listLanguages(): Promise<TaxonomyItem[]>;
}

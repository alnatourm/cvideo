import { z } from 'zod';
import type { TaxonomyRepository } from './repository.js';

const idSchema = z.string().uuid();
const searchSchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export class TaxonomyService {
  constructor(private readonly repository: TaxonomyRepository) {}

  listCategories() {
    return this.repository.listCategories();
  }

  listSubcategories(categoryId: unknown) {
    return this.repository.listSubcategories(idSchema.parse(categoryId));
  }

  listJobTitles(input: unknown) {
    const value = searchSchema.parse(input);
    return this.repository.listJobTitles(value.q, value.limit);
  }

  listSkills(input: unknown) {
    const value = searchSchema.parse(input);
    return this.repository.listSkills(value.q, value.limit);
  }

  listLanguages() {
    return this.repository.listLanguages();
  }
}

import { z } from 'zod';
import type { TaxonomyRepository } from './repository.js';

const idSchema = z.string().uuid();
const searchSchema = z.object({
  q: z.preprocess(
    (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string().trim().min(1).max(120).optional(),
  ),
  limit: z.coerce.number().int().min(1).max(1500).optional(),
  subcategoryId: z.string().uuid().optional(),
  jobTitleIds: z.array(z.string().uuid()).max(5).optional(),
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
    return this.repository.listJobTitles(value.q, value.limit ?? (value.q ? 50 : 1500), value.subcategoryId);
  }

  listSkills(input: unknown) {
    const value = searchSchema.parse(input);
    return this.repository.listSkills(value.q, value.limit ?? (value.q ? 50 : 1500), value.jobTitleIds);
  }

  listLanguages() {
    return this.repository.listLanguages();
  }
}

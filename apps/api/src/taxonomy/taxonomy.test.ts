import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import type { TaxonomyRepository } from './repository.js';
import { TaxonomyService } from './service.js';

class MemoryTaxonomyRepository implements TaxonomyRepository {
  async listCategories() {
    return [{ id: '11111111-1111-4111-8111-111111111111', code: 'sales', nameEn: 'Sales', nameAr: 'المبيعات' }];
  }

  async listSubcategories(_categoryId: string) {
    return [{ id: '22222222-2222-4222-8222-222222222222', code: 'b2b', nameEn: 'B2B Sales', nameAr: 'مبيعات الشركات' }];
  }

  async listJobTitles(query: string | undefined, _limit: number) {
    return query
      ? [{ id: '33333333-3333-4333-8333-333333333333', code: 'sales-manager', nameEn: 'Sales Manager', nameAr: 'مدير مبيعات' }]
      : [];
  }

  async listSkills(query: string | undefined, _limit: number) {
    return query
      ? [{ id: '44444444-4444-4444-8444-444444444444', code: 'negotiation', nameEn: 'Negotiation', nameAr: 'التفاوض' }]
      : [];
  }

  async listLanguages() {
    return [{ id: '55555555-5555-4555-8555-555555555555', code: 'ar', nameEn: 'Arabic', nameAr: 'العربية' }];
  }
}

describe('CVIDEO taxonomy API', () => {
  const app = createApp({ taxonomyService: new TaxonomyService(new MemoryTaxonomyRepository()) });

  it('returns bilingual category data without authentication', async () => {
    const response = await request(app).get('/api/v1/taxonomy/categories');
    expect(response.status).toBe(200);
    expect(response.body.data[0]).toMatchObject({ code: 'sales', nameEn: 'Sales', nameAr: 'المبيعات' });
  });

  it('validates category IDs and supports bounded job-title search', async () => {
    const invalid = await request(app).get('/api/v1/taxonomy/categories/not-a-uuid/subcategories');
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');

    const search = await request(app).get('/api/v1/taxonomy/job-titles?q=sales&limit=10');
    expect(search.status).toBe(200);
    expect(search.body.data[0].nameAr).toBe('مدير مبيعات');
  });
});

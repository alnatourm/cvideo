import { describe, expect, it } from 'vitest';
import { direction, t } from './i18n';

describe('localization foundation', () => {
  it('uses RTL for Arabic and LTR for English', () => {
    expect(direction('ar')).toBe('rtl');
    expect(direction('en')).toBe('ltr');
  });

  it('keeps canonical CVIDEO terminology', () => {
    expect(t('en', 'savedLists')).toBe('Saved Lists');
    expect(t('en', 'introVideo')).toBe('30s Introduction Video');
    expect(t('ar', 'messages')).toBe('الرسائل');
  });
});

import { describe, expect, it } from 'vitest';
import { direction, landingFlowSteps, t } from './i18n';

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

  it('localizes every landing journey title and description', () => {
    const english = landingFlowSteps('en');
    const arabic = landingFlowSteps('ar');

    expect(english).toHaveLength(5);
    expect(arabic).toHaveLength(5);
    expect(english.map((step) => step[1])).toEqual(['Search', 'Watch', 'Save', 'Chat', 'Interview']);
    expect(arabic.map((step) => step[1])).toEqual(['ابحث', 'شاهد', 'احفظ', 'تحدث', 'قابل']);
    expect(arabic.every((step) => /[\u0600-\u06ff]/.test(step[2]))).toBe(true);
  });
});

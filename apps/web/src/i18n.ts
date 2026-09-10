export type Locale = 'en' | 'ar';

const messages = {
  en: {
    brand: 'CVIDEO',
    heroTitle: 'Meet the person before the CV.',
    heroBody: 'Companies search talent, watch 30-second introduction videos, save candidates, start conversations, and request interviews.',
    findTalent: 'Find Talent',
    createProfile: 'Create Your Profile',
    candidateHome: 'Candidate Home',
    recruiterSearch: 'Recruiter Search',
    savedLists: 'Saved Lists',
    messages: 'Messages',
    companyAccount: 'Company Account',
    profile: 'Profile',
    requestInterview: 'Request Interview',
    introVideo: '30s Introduction Video',
  },
  ar: {
    brand: 'CVIDEO',
    heroTitle: 'تعرّف على الشخص قبل السيرة الذاتية.',
    heroBody: 'تبحث الشركات عن المواهب، وتشاهد فيديو تعريفيًا مدته 30 ثانية، وتحفظ المرشحين، وتبدأ المحادثات، وتطلب المقابلات.',
    findTalent: 'ابحث عن المواهب',
    createProfile: 'أنشئ ملفك',
    candidateHome: 'الرئيسية',
    recruiterSearch: 'البحث',
    savedLists: 'القوائم المحفوظة',
    messages: 'الرسائل',
    companyAccount: 'حساب الشركة',
    profile: 'الملف الشخصي',
    requestInterview: 'طلب مقابلة',
    introVideo: 'فيديو تعريفي 30 ثانية',
  },
} as const;

export function t(locale: Locale, key: keyof typeof messages.en): string {
  return messages[locale][key];
}

export function direction(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

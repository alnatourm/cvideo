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

const flowSteps = {
  en: [
    ['01', 'Search', 'Search professional profiles by role, skill, experience and location.'],
    ['02', 'Watch', 'See the person through a concise 30-second Introduction Video.'],
    ['03', 'Save', 'Organize promising people in company Saved Lists.'],
    ['04', 'Chat', 'The company starts the first professional conversation.'],
    ['05', 'Interview', 'Send an interview request and let the candidate respond.'],
  ],
  ar: [
    ['01', 'ابحث', 'ابحث في الملفات المهنية حسب الدور والمهارة والخبرة والموقع.'],
    ['02', 'شاهد', 'تعرّف على الشخص عبر فيديو تعريفي مهني مدته 30 ثانية.'],
    ['03', 'احفظ', 'نظّم المرشحين المناسبين في قوائم الشركة المحفوظة.'],
    ['04', 'تحدث', 'تبدأ الشركة أول محادثة مهنية مع المرشح.'],
    ['05', 'قابل', 'أرسل طلب مقابلة ودع المرشح يختار الرد المناسب.'],
  ],
} as const;

export function landingFlowSteps(locale: Locale) {
  return flowSteps[locale];
}

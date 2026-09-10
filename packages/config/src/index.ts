export const CVIDEO = {
  apiPrefix: '/api/v1',
  introVideoSeconds: 30,
  maxVideoDeliveryHeight: 720,
  locales: ['ar', 'en'] as const,
  defaultLocale: 'ar' as const,
} as const;

export const candidateNavigation = ['Home', 'Messages', 'Profile'] as const;
export const recruiterNavigation = ['Search', 'Saved Lists', 'Messages', 'Company Account'] as const;

export type Lang = 'en' | 'ar';

export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'ar', label: 'ع' },
];

type Dict = Record<string, string>;

/** Maps English prayer names (as stored by the backend) to Arabic. */
export const PRAYER_NAMES_AR: Record<string, string> = {
  Fajr: 'الفجر',
  Zuhr: 'الظهر',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Maghrib: 'المغرب',
  Isha: 'العشاء',
};

/** Returns the prayer name in the active language, falling back to the input. */
export function localizePrayerName(name: string, lang: Lang): string {
  if (lang === 'ar') return PRAYER_NAMES_AR[name] ?? name;
  return name;
}

export const translations: Record<Lang, Dict> = {
  en: {
    // ── Brand / shell ──
    'brand.name': 'Estaقِm',
    'nav.dashboard': 'Dashboard',
    'nav.friends': 'Friends',
    'nav.logout': 'Log out',
    'nav.login': 'Log in',
    'nav.signup': 'Sign up',
    'footer.brand': 'Estaقِm',
    'footer.privacy': 'Your camera data stays on your device.',

    // ── Home ──
    'home.eyebrow': 'Private, client-side pose detection',
    'home.title': 'Build a clearer picture of your prayer practice.',
    'home.subtitle':
      'Get real-time guidance on your device, then review your progress and recurring movement mistakes over time.',
    'home.ctaStart': 'Get started',
    'home.ctaDashboard': 'Open dashboard',

    // ── Login ──
    'login.eyebrow': 'Welcome back',
    'login.title': 'Log in',
    'login.subtitle': 'Continue tracking your prayer practice and improvements.',
    'login.submit': 'Log in',
    'login.submitting': 'Logging in...',
    'login.switch': 'New to Estaقِm?',
    'login.switchLink': 'Create an account',

    // ── Signup ──
    'signup.eyebrow': 'Start your journey',
    'signup.title': 'Create an account',
    'signup.subtitle': 'Track your prayer sessions and see your progress over time.',
    'signup.submit': 'Create account',
    'signup.submitting': 'Creating account...',
    'signup.switch': 'Already have an account?',
    'signup.switchLink': 'Log in',

    // ── Auth fields ──
    'field.name': 'Name',
    'field.email': 'Email',
    'field.password': 'Password',
    'field.confirmPassword': 'Confirm password',

    // ── Dashboard ──
    'dash.eyebrow': 'Your dashboard',
    'dash.welcome': 'Welcome back, {name}',
    'dash.subtitle': 'Track your prayer sessions and improve over time.',
    'dash.loading': 'Loading…',
    'dash.emptyTitle': 'No sessions yet — complete your first prayer to see stats here.',
    'dash.startSession': 'Start Prayer Session',
    'dash.overview': 'Overview',
    'dash.totalSessions': 'Total Sessions',
    'dash.totalSessionsSub': 'prayers recorded',
    'dash.avgAccuracy': 'Avg Accuracy',
    'dash.avgAccuracySub': 'across all sessions',
    'dash.totalMistakes': 'Total Mistakes',
    'dash.totalMistakesSub': 'detected movements',
    'dash.avgDuration': 'Avg Duration',
    'dash.avgDurationSub': 'per session',
    'dash.min': 'min',
    'dash.insights': 'Insights',
    'dash.mostMistakenPrayer': 'Most mistaken prayer',
    'dash.mostMistakenMove': 'Most mistaken movement',
    'dash.accuracyProgress': 'Accuracy Progress',
    'dash.accuracyPerSession': 'Accuracy per session (oldest → newest)',
    'dash.accuracy': 'Accuracy',
    'dash.perPrayer': 'Per-Prayer Breakdown',
    'dash.colPrayer': 'Prayer',
    'dash.colSessions': 'Sessions',
    'dash.colAvgAccuracy': 'Avg Accuracy',
    'dash.recentSessions': 'Recent Sessions',
    'dash.rakasUnit': "rak'as",
    'dash.mistakesUnit': 'mistakes',
    'dash.loadError': 'Failed to load sessions',
    'dash.prev': 'Previous',
    'dash.next': 'Next',
    'dash.pageInfo': 'Page {page} of {total}',

    // ── Prayer setup ──
    'setup.logo': 'Prayer',
    'setup.sub': 'Estaقِm — Real-Time Guidance',
    'setup.rakas': "{n} rak'as",
    'setup.begin': 'Begin Prayer',
    'setup.tips':
      'Stand 2–3 meters from your device in a well-lit space. Your full body should be visible. Camera permission is required.',

    // ── Session ──
    'session.raka': "Rak'a",
    'session.end': 'End Prayer',
    'session.recentMistakes': 'Recent Mistakes',
    'session.detected': 'Detected',
    'session.expected': 'Expected',
    'session.getReady': 'Get ready…',
    'session.detecting': 'Detecting…',

    // ── Report ──
    'report.title': 'Prayer Report',
    'report.rakasCompleted': "Rak'as Completed",
    'report.mistakesDetected': 'Mistakes Detected',
    'report.accuracyScore': 'Accuracy Score',
    'report.videoLabel': 'Your prayer recording – review your mistakes',
    'report.mistakeLog': 'Mistake Log',
    'report.noMistakes': 'No mistakes detected — excellent prayer!',
    'report.rakaShort': "Rak'a {n}",
    'report.detectedAt': 'Detected: {pose} at ~{time}s',
    'report.prayAgain': 'Pray Again',

    // ── 404 ──
    'notFound.eyebrow': 'Page not found',
    'notFound.title': 'Lost your way?',
    'notFound.subtitle': "The page you're looking for doesn't exist or may have been moved.",
    'notFound.cta': 'Back to home',
  },

  ar: {
    // ── Brand / shell ──
    'brand.name': 'إِسْتَقِمْ',
    'nav.dashboard': 'لوحة المتابعة',
    'nav.friends': 'الأصدقاء',
    'nav.logout': 'تسجيل الخروج',
    'nav.login': 'تسجيل الدخول',
    'nav.signup': 'إنشاء حساب',
    'footer.brand': 'إِسْتَقِمْ',
    'footer.privacy': 'بيانات الكاميرا بتاعتك بتفضل على جهازك.',

    // ── Home ──
    'home.eyebrow': 'كشف الحركات يتم على جهازك بخصوصية تامة',
    'home.title': 'كوّن صورة أوضح عن أدائك في الصلاة.',
    'home.subtitle':
      'إرشاد لحظي على جهازك، وبعدها تراجع تقدّمك والأخطاء المتكررة في حركاتك مع الوقت.',
    'home.ctaStart': 'ابدأ الآن',
    'home.ctaDashboard': 'افتح لوحة المتابعة',

    // ── Login ──
    'login.eyebrow': 'أهلاً بعودتك',
    'login.title': 'تسجيل الدخول',
    'login.subtitle': 'كمّل متابعة أدائك في الصلاة وتطوّرك.',
    'login.submit': 'تسجيل الدخول',
    'login.submitting': 'جارٍ الدخول...',
    'login.switch': 'جديد على إِسْتَقِمْ؟',
    'login.switchLink': 'أنشئ حساباً',

    // ── Signup ──
    'signup.eyebrow': 'ابدأ رحلتك',
    'signup.title': 'إنشاء حساب',
    'signup.subtitle': 'تابع جلسات صلاتك وشوف تقدّمك مع الوقت.',
    'signup.submit': 'إنشاء حساب',
    'signup.submitting': 'جارٍ إنشاء الحساب...',
    'signup.switch': 'عندك حساب بالفعل؟',
    'signup.switchLink': 'تسجيل الدخول',

    // ── Auth fields ──
    'field.name': 'الاسم',
    'field.email': 'البريد الإلكتروني',
    'field.password': 'كلمة المرور',
    'field.confirmPassword': 'تأكيد كلمة المرور',

    // ── Dashboard ──
    'dash.eyebrow': 'لوحة المتابعة',
    'dash.welcome': 'أهلاً بعودتك، {name}',
    'dash.subtitle': 'تابع جلسات صلاتك وطوّر أداءك مع الوقت.',
    'dash.loading': 'جارٍ التحميل…',
    'dash.emptyTitle': 'لسه مفيش جلسات — صلِّ أول صلاة عشان تظهر إحصائياتك هنا.',
    'dash.startSession': 'ابدأ جلسة صلاة',
    'dash.overview': 'نظرة عامة',
    'dash.totalSessions': 'إجمالي الجلسات',
    'dash.totalSessionsSub': 'صلاة مسجّلة',
    'dash.avgAccuracy': 'متوسط الدقة',
    'dash.avgAccuracySub': 'عبر كل الجلسات',
    'dash.totalMistakes': 'إجمالي الأخطاء',
    'dash.totalMistakesSub': 'حركات مكتشَفة',
    'dash.avgDuration': 'متوسط المدة',
    'dash.avgDurationSub': 'لكل جلسة',
    'dash.min': 'دقيقة',
    'dash.insights': 'ملاحظات',
    'dash.mostMistakenPrayer': 'أكتر صلاة فيها أخطاء',
    'dash.mostMistakenMove': 'أكتر حركة فيها أخطاء',
    'dash.accuracyProgress': 'تطوّر الدقة',
    'dash.accuracyPerSession': 'الدقة لكل جلسة (الأقدم ← الأحدث)',
    'dash.accuracy': 'الدقة',
    'dash.perPrayer': 'تفصيل حسب الصلاة',
    'dash.colPrayer': 'الصلاة',
    'dash.colSessions': 'الجلسات',
    'dash.colAvgAccuracy': 'متوسط الدقة',
    'dash.recentSessions': 'آخر الجلسات',
    'dash.rakasUnit': 'ركعات',
    'dash.mistakesUnit': 'أخطاء',
    'dash.loadError': 'تعذّر تحميل الجلسات',
    'dash.prev': 'السابق',
    'dash.next': 'التالي',
    'dash.pageInfo': 'صفحة {page} من {total}',

    // ── Prayer setup ──
    'setup.logo': 'الصلاة',
    'setup.sub': 'مُعلِّم الصلاة — إرشاد لحظي',
    'setup.rakas': '{n} ركعات',
    'setup.begin': 'ابدأ الصلاة',
    'setup.tips':
      'قف على بُعد ٢–٣ أمتار من جهازك في مكان جيد الإضاءة. لازم جسمك كامل يكون ظاهر. إذن الكاميرا مطلوب.',

    // ── Session ──
    'session.raka': 'ركعة',
    'session.end': 'إنهاء الصلاة',
    'session.recentMistakes': 'آخر الأخطاء',
    'session.detected': 'المكتشَف',
    'session.expected': 'المطلوب',
    'session.getReady': 'استعد…',
    'session.detecting': 'جارٍ الكشف…',

    // ── Report ──
    'report.title': 'تقرير الصلاة',
    'report.rakasCompleted': 'ركعات مكتملة',
    'report.mistakesDetected': 'أخطاء مكتشَفة',
    'report.accuracyScore': 'درجة الدقة',
    'report.videoLabel': 'تسجيل صلاتك – راجع أخطاءك',
    'report.mistakeLog': 'سجل الأخطاء',
    'report.noMistakes': 'مفيش أخطاء — صلاة ممتازة!',
    'report.rakaShort': 'ركعة {n}',
    'report.detectedAt': 'اتكشف: {pose} عند ~{time} ث',
    'report.prayAgain': 'صلِّ مرة أخرى',

    // ── 404 ──
    'notFound.eyebrow': 'الصفحة غير موجودة',
    'notFound.title': 'ضُعْتَ في الطريق؟',
    'notFound.subtitle': 'الصفحة اللي بتدور عليها مش موجودة أو اتنقلت.',
    'notFound.cta': 'ارجع للرئيسية',
  },
};

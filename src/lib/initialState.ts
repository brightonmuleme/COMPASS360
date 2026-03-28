import { 
    EnrolledStudent, 
    Service, 
    Bursary, 
    Programme, 
    DocumentTemplate, 
    PromotionBatch, 
    Billing, 
    Payment, 
    NewsItem, 
    Advert, 
    StaffAccount,
    TutorContent,
    Tutor,
    TutorSettings,
    TutorSubscription,
    Requisition,
    InQueueItem,
    PaymentIntegration,
    ManualPaymentMethod,
    ResultPageConfig,
    AppUpdate,
    AppOffer,
    LandingPageRoleContent,
    DeveloperSettings,
    FeaturedSchool,
    Suggestion
} from './store';

// 📦 SHARED INITIAL STATE (Extracted to prevent LSP crashes)

export const INITIAL_STUDENTS: EnrolledStudent[] = [];
export const INITIAL_SERVICES: Service[] = [];
export const INITIAL_BURSARIES: Bursary[] = [];
export const INITIAL_PROGRAMMES: Programme[] = [];
export const INITIAL_TEMPLATES: DocumentTemplate[] = [];
export const INITIAL_PROMOTION_BATCHES: PromotionBatch[] = [];
export const INITIAL_BILLINGS: Billing[] = [];
export const INITIAL_PAYMENTS: Payment[] = [];
export const INITIAL_NEWS: NewsItem[] = [];
export const INITIAL_ADVERTS: Advert[] = [];
export const INITIAL_STAFF_ACCOUNTS: StaffAccount[] = [];
export const INITIAL_TUTOR_CONTENTS: TutorContent[] = [];
export const INITIAL_TUTORS: Tutor[] = [];
export const INITIAL_TUTOR_SETTINGS: TutorSettings[] = [];
export const INITIAL_TUTOR_SUBSCRIPTIONS: TutorSubscription[] = [];
export const INITIAL_REQUISITIONS: Requisition[] = [];
export const INITIAL_REQUISITION_DRAFT: any = {};
export const INITIAL_PAYMENT_INTEGRATIONS: PaymentIntegration[] = [
    {
        id: 'sp_1',
        provider: 'SchoolPay',
        name: 'SchoolPay',
        description: 'Real-time student fee collection with automated reconcile.',
        status: 'inactive'
    },
    {
        id: 'pp_1',
        provider: 'PegPay',
        name: 'PegPay',
        description: 'Automated payments for utility and tuition collection.',
        status: 'inactive'
    }
];
export const INITIAL_MANUAL_PAYMENT_METHODS: ManualPaymentMethod[] = [];
export const INITIAL_RESULT_PAGE_CONFIGS: ResultPageConfig[] = [];
export const INITIAL_COURSE_UNITS: any[] = [];
export const INITIAL_APP_UPDATES: AppUpdate[] = [];
export const INITIAL_APP_OFFERS: AppOffer[] = [];
export const INITIAL_LANDING_CONTENT: LandingPageRoleContent[] = [
    {
        id: 'student',
        title: 'Student Portal',
        tagline: 'Your Academic Journey Starts Here.',
        image: '/images/student.png',
        theme: '#8b5cf6',
        description: 'Access your learning materials, track your grades, and stay connected with your tutors in real-time.',
        features: ['Personalized Dashboard', 'Offline Note Access', 'Direct Tutor Support', 'Academic Performance Tracking']
    },
    {
        id: 'tutor',
        title: 'Tutor Portal',
        tagline: 'Inspire. Create. Earn.',
        image: '/images/tutor.png',
        theme: '#10b981',
        description: 'Share your knowledge with thousands of students. Upload courses, manage subscriptions, and grow your teaching brand.',
        features: ['Content Management', 'Analytics Dashboard', 'Revenue Tracking', 'Direct Student Interaction']
    },
    {
        id: 'school',
        title: 'School Portal',
        tagline: 'Master Your Institution.',
        image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800',
        theme: '#3b82f6',
        description: 'Complete institutional governance. Manage staff, oversee finances, and track student enrollment across all programmes.',
        features: ['Institutional Oversight', 'Financial Management', 'Staff Administration', 'Real-time Reporting']
    },
    {
        id: 'accountant',
        title: 'Management Portal',
        tagline: 'Financial Integrity First.',
        image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800',
        theme: '#f59e0b',
        description: 'Precision financial tracking. Manage billing, process payments, and generate comprehensive school financial reports.',
        features: ['Automated Billing', 'Fee Collection', 'Budget Tracking', 'Digital Receipts']
    }
];
export const INITIAL_DEVELOPER_SETTINGS: DeveloperSettings = { 
    maintenanceMode: false,
    allowNewRegistrations: true,
    showMockData: false,
    wallpapers: [
        'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&q=80&w=1920',
        'https://images.unsplash.com/photo-1523050335102-c32241c80f6a?auto=format&fit=crop&q=80&w=1920',
        'https://images.unsplash.com/photo-1541339907198-e08756ebafe3?auto=format&fit=crop&q=80&w=1920',
        'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=1920'
    ],
    subscriptionFees: [
        { portal: 'student', amount: 50000, currency: 'UGX', interval: 'monthly' },
        { portal: 'tutor', amount: 30000, currency: 'UGX', interval: 'monthly' },
        { portal: 'school', amount: 150000, currency: 'UGX', interval: 'monthly' }
    ]
};
export const INITIAL_FEATURED_SCHOOLS: FeaturedSchool[] = [];
export const INITIAL_SUGGESTIONS: Suggestion[] = [];
export const INITIAL_EXPENSE_CATEGORIES: any[] = [
    { id: 'ec_1', name: 'Transport', subcategories: ['Fuel', 'Fares', 'Maintenance'] },
    { id: 'ec_2', name: 'Food', subcategories: ['Staff Meals', 'Student Meals', 'Ingredients'] },
    { id: 'ec_3', name: 'Utilities', subcategories: ['Electricity', 'Water', 'Internet'] },
    { id: 'ec_4', name: 'Maintenance', subcategories: ['Repairs', 'Cleaning', 'Compound'] },
    { id: 'ec_5', name: 'Salaries', subcategories: ['Teaching Staff', 'Support Staff'] },
    { id: 'ec_6', name: 'Miscellaneous', subcategories: [] },
    { id: 'ec_7', name: 'School Clinic', subcategories: [] },
    { id: 'ec_8', name: 'Security Department', subcategories: ['Rain Coat', 'Torch and Cable', 'Security Cards'] },
];

export const INITIAL_INCOME_CATEGORIES: any[] = [
    { id: 'ic_1', name: 'Fees', subcategories: ['Tuition', 'Registration'] },
    { id: 'ic_2', name: 'Grants', subcategories: ['Government', 'Private'] },
    { id: 'ic_3', name: 'Sales', subcategories: ['Uniforms', 'Stationery'] },
    { id: 'ic_4', name: 'Donations', subcategories: [] },
];

export const INITIAL_CALENDAR_EVENTS = [];

export const INITIAL_FINANCIAL_SETTINGS = {
    currency: 'UGX',
    fiscalYearStart: '2024-01-01',
    taxRate: 0,
    allowPartialPayments: true,
    clearancePct: 100,
    probationPct: 80,
    compulsoryFees: []
};

export const INITIAL_REGISTRAR_STUDENTS: any[] = [
    {
        id: 'reg_1', name: 'PATIENT ZERO', dob: '2005-04-12', gender: 'Female',
        parentName: 'JOHN ZERO', parentContact: '0772123456',
        secondParentName: 'MARY ZERO', secondParentContact: '0702123456',
        previousSchool: 'Hillside Primary', entryClass: 'Year 1', admissionDate: '2024-01-10', status: 'Enrolled',
        country: 'Uganda', district: 'Kampala', placeOfOrigin: 'Ntinda', schoolPayCode: 'PAY-001', programme: 'Bachelor of Medicine & Surgery'
    }
];

export const INITIAL_PORTAL_BRANDING = {
    schoolName: "SAMI HEALTH SCIENCE INSTITUTE",
    tagline: "HEALTH IS PRIORITY",
    primaryColor: "#22c55e"
};

export const INITIAL_TRANSACTIONS = [];
export const INITIAL_GENERAL_TRANSACTIONS = [];

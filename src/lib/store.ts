"use client";
import React, { useState, useEffect, createContext, useContext, ReactNode, useMemo } from 'react';
import { usePathname } from 'next/navigation';

// ... (existing code)

const SchoolContext = createContext<ReturnType<typeof useSchoolDataInternal> | null>(null);
const SchoolContextProvider = SchoolContext.Provider;

export function useSchoolData() {
    const context = useContext(SchoolContext);
    if (!context) {
        throw new Error("useSchoolData must be used within a SchoolProvider");
    }
    return context;
}

export function SchoolProvider({ children }: { children: ReactNode }) {
    const data = useSchoolDataInternal();
    return React.createElement(SchoolContext.Provider, { value: data }, children);
}

// --- TYPES ---

export interface PhysicalRequirement {
    name: string;
    required: number;
    brought: number;
    color: string;
    entries?: { id: string, date: string, quantity: number, change?: number, action?: string }[];
}

export type DocumentType = 'ADMISSION_LETTER' | 'RECEIPT' | 'FEE_STRUCTURE' | 'CLEARANCE' | 'OTHER';

export interface DocumentSection {
    id: string;
    type: 'header' | 'body' | 'footer' | 'table';
    content: string;
    order: number;
    isEditable?: boolean;
}

export interface DocumentTemplate {
    id: string;
    name: string;
    type: DocumentType;
    sections: DocumentSection[];
    programmeId?: string;
    isDefault?: boolean; // Added for global templates
    updatedAt: string;
}

export interface FeeStructureItem {
    level: string; // e.g. "Year 1"
    tuitionFee: number;
    compulsoryServices: string[];
    requirements: { name: string, quantity: number }[];
    // New Fields for Programme Setup
    timetable?: ClassSession[];
    requiredDocuments?: { name: string, description?: string, mandatory: boolean }[];
}

export interface ClassSession {
    id: string;
    courseUnitId: string;
    day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
    startTime: string; // "08:00"
    endTime: string;   // "10:00"
    room: string;
    lecturer?: string; // Legacy field, keeping for backward compat
    tutorId?: string;  // New linked field
}

export interface Tutor {
    id: string;
    name: string;
    email: string;
    phone: string;
    staffId?: string;
    type: 'Full-time' | 'Part-time' | 'Visiting';
    programmeIds: string[]; // Linked programmes
    status: 'Active' | 'Inactive';
    // Extended Profile for Student Portal
    department?: string;
    specialization?: string;
    bio?: string;
    stats?: {
        subscribers: number;
        views: number;
        uploads: number;
    };
    subscriptionDaysLeft?: number;
    password?: string;
}

export interface StaffAccount {
    id: string;
    username: string;
    password: string;
    role: AccountantRole;
    name: string;
    transactionPin?: string;
}

export interface ProgrammeDocuments {
    admissionLetter?: { content: string; logo?: string };
    receipt?: { logo?: string };
}

export interface Programme {
    id: string; // Internal ID / Slug
    code: string; // Display Code e.g. BSCS
    name: string;
    type: 'Degree' | 'Diploma' | 'Certificate' | 'Masters';
    duration: string; // e.g. "3 Years"
    description?: string;
    feeStructure?: FeeStructureItem[];
    documents?: ProgrammeDocuments;
    levels?: string[]; // Custom ordered levels
    origin?: 'bursar' | 'registrar'; // Isolated origin
}

export interface ServiceMetadata {
    [serviceId: string]: { date: string, quantity: number }
}

export interface DocumentRecord {
    id: string;
    name: string;
    type: string;
    status: 'submitted' | 'returned';
    submittedBy?: string;
    receivedBy?: string;
    submissionDate?: string;
    returnedBy?: string;
    returnedTo?: string;
    returnDate?: string;
    returnReason?: string;
    fileUrl?: string; // Optional photo
}

export interface EnrolledStudent {
    id: number;
    name: string;
    origin?: 'bursar' | 'registrar'; // Tag as Bursar or Registrar Enrollment
    payCode: string;
    programme: string;
    level: string; // Year 1, Year 2, etc.
    semester: string;
    balance: number;
    totalFees: number;
    services: string[]; // IDs of subscribed services
    serviceMetadata?: ServiceMetadata;
    bursary: string; // ID of bursary scheme
    previousBalance: number;
    status: 'active' | 'deactivated' | 'graduated' | 'enrolled' | 'suspended';
    accountStatus?: 'clearance' | 'defaulter' | 'probation';
    tuitionStatus?: 'cleared' | 'probation' | 'defaulter';
    enrollmentDate?: string;
    documentHistory?: DocumentRecord[];
    physicalRequirements?: PhysicalRequirement[];
    notifications?: number;
    subscriptionExpiry?: string;
    subscriptionDaysLeft?: number;
    lastPosted?: string;
    postHistory?: string[];
    lastBilledTerm?: string;
    marketingAgent?: string;
    promotionHistory?: {
        date: string;
        fromSemester: string;
        toSemester: string;
        previousBalance: number;
        newBalance: number;
        requirementsSnapshot?: PhysicalRequirement[];
        bursarySnapshot?: string; // Snapshot of bursary ID
        servicesSnapshot?: string[]; // Snapshot of service IDs
        snapshotArrears?: number; // Snapshot of arrears at time of promotion
        initialPreviousBalance?: number; // The previousBalance at the START of this semester (before wipe)
    }[];
    clearanceHistory?: {
        date: string;
        status: 'cleared' | 'probation' | 'defaulter';
        reason: string;
        user?: string;
    }[];
    // Bio Data (Migrated from Registrar)
    dob?: string;
    gender?: 'Male' | 'Female';
    parentName?: string;
    parentContact?: string;
    secondParentName?: string;
    secondParentContact?: string;
    previousSchool?: string;
    country?: string;
    district?: string;
    placeOfOrigin?: string; // Residence

    compassNumber?: string; // Unique Compass Number e.g. "001"
    profilePic?: string; // Base64 or URL
    password?: string; // Added for customized login
    email?: string; // Added for authentication consistency
    phoneNumber?: string; // Added for contact consistency
}

export interface Service {
    id: string;
    name: string;
    cost: number;
}

export interface Bursary {
    id: string;
    name: string;
    value: number; // Fixed amount covered
}

export type TransactionStatus = 'Pending' | 'Partially Paid' | 'Paid' | 'Void';
export type TransactionType = 'Income' | 'Expense' | 'Transfer';
export type TransactionCategory = string; // Changed to string to allow dynamic categories
export type PaymentMode = string; // Was: 'Cash' | 'Bank Transfer' | 'Card' | 'Mobile Money' | 'Cheque' | 'Manual' | 'manual' | 'Other';

export interface TransactionCategoryItem {
    id: string;
    name: string;
    subcategories: string[];
}

export interface GeneralTransaction {
    id: string;
    date: string;
    amount: number;
    type: TransactionType;
    category: string;
    description: string;
    mode: PaymentMode; // reusing PaymentMode
    method: PaymentMode; // duplicate to handle potential legacy usage
    recordedBy: string;
    attachments?: string[]; // Array of image URLs (base64 or remote)
    longDescription?: string;
    requisitionId?: string; // Optional link to source requisition
    paidBy?: string; // Optional field for who paid/received if relevant
    fromAccount?: string;
    toAccount?: string;
    transferGroupId?: string;
    isFlagged?: boolean;
    riskLevel?: 'Low' | 'Medium' | 'High';
    resolved?: boolean;
}

export interface Budget {
    id: string;
    category: string;
    amount: number;
    year: number;
    type: 'Income' | 'Expense';
}

export interface TransactionSettings {
    carryOver: boolean;
}

export interface AuditLog {
    id: string;
    action: string;
    details: string;
    user: string;
    timestamp: string;
}

export interface InventoryList {
    id: string;
    name: string;
}

export interface InventoryGroup {
    id: string;
    name: string;
    listId: string;
}

export interface InventoryItem {
    id: string;
    name: string;
    groupId: string;
    quantity: number;
    units: string; // e.g., 'kgs', 'pcs', 'litres'
    minStock?: number; // Warning level
    color: string;
    lastUpdated: string;
}

export interface InventoryLog {
    id: string;
    itemId: string;
    itemName: string;
    action: 'add' | 'reduce' | 'set' | 'transfer_in' | 'transfer_out';
    quantityChange: number;
    newQuantity: number;
    comment: string;
    date: string;
    user: string;
}

export interface InventorySettings {
    quickAction: 'add' | 'reduce';
}

export interface InventoryTransfer {
    id: string;
    type: 'in' | 'out';
    items: { itemId: string; name: string; quantity: number }[];
    source: string;
    destination: string;
    status: 'draft' | 'in-transit' | 'completed' | 'approved' | 'rejected' | 'reversed';
    date: string;
    notes: string;
    approvedBy?: string;
    rejectionReason?: string;
}

export interface AppUpdate {
    id: string;
    title: string;
    content: string;
    date: string;
    type: 'Update' | 'Alert' | 'Offer' | 'News';
    color: string;
}

export interface AppOffer {
    id: string;
    title: string;
    description: string;
    code: string;
    expiry: string;
}

export interface NewsItem {
    id: string;
    title: string;
    content: string;
    date: string;
    author: string;
    category: 'General' | 'Academic' | 'Sports' | 'Events';
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
    schoolId?: string; // Filter by school
}

export interface Advert {
    id: string;
    title: string;
    content: string; // Description or tagline
    schoolName: string;
    imageUrl?: string;
    linkUrl?: string; // Optional call-to-action link
}

export interface TutorContent {
    id: string;
    tutorId: string;
    type: 'Note' | 'Video' | 'Question';
    title: string;
    description: string;
    url?: string; // File URL or Video Link
    programmeIds?: string[]; // Multiple Programmes
    levels?: string[]; // Multiple Levels
    courseUnitIds?: string[]; // Multiple Course Units
    // Deprecated (Backward Compatibility)
    programmeId?: string;
    level?: string;
    courseUnitId?: string;
    status?: 'Published' | 'Draft'; // New field for Drafts
    thumbnailUrl?: string; // Cover Image / Thumbnail
    uploadDate: string;
    likes?: number; // New: Like count
    views?: number; // New: View count
    isFeatured?: boolean; // New: Pinned/Featured status
}

export interface TutorSettings {
    tutorId: string;
    subscriptionPrice: number;
    durationMonths: number;
    isEnabled: boolean;
    taughtCourseUnitIds?: string[]; // IDs of Course Units the tutor teaches
}

export interface TutorSubscription {
    id: string;
    studentId: string;
    tutorId: string;
    startDate: string;
    expiryDate: string;
    status: 'Active' | 'Expired';
    amount: number;
}

export interface Suggestion {
    id: string;
    studentId?: string; // Optional if anonymous?
    studentName?: string;
    title: string;
    content: string;
    date: string;
    status: 'Pending' | 'Reviewing' | 'Resolved';
    likes?: number;
    schoolId?: string; // Filter by school
}

export interface StudentProfile {
    id: string;
    name: string; // Display name
    email: string;
    phoneNumber?: string; // Add phoneNumber
    payCode?: string; // Add payCode to student profile
    schoolId?: string; // Add schoolId
    linkedStudentCode?: string; // Link to EnrolledStudent.payCode or ID
    likedContentIds: string[];
    subscribedTutorIds: string[];
    subscriptionStatus: 'active' | 'expired' | 'trial';
    subscriptionEndDate: string;
}

export interface TutorProfile {
    id: string;
    name: string;
    email: string;
    role: 'Tutor';
    subscriptionDaysLeft?: number;
}

export interface DeveloperProfile {
    id: string;
    name: string;
    role: 'Developer';
}

export interface RegistrarStudent {
    id: string; // Using string ID for academic records
    name: string;
    dob: string;
    gender: 'Male' | 'Female';
    parentName: string;
    parentContact: string; // Phone/Email

    previousSchool?: string;
    entryClass: string; // e.g. "Year 1"
    programme?: string;
    admissionDate: string;
    status: 'Applied' | 'Admitted' | 'Rejected' | 'Enrolled' | 'active' | 'deactivated' | 'graduated'; // Expanded status to fix TS errors
    // New Fields
    schoolPayCode: string; // Compulsory Pay Code
    country: string;
    district: string;
    placeOfOrigin: string; // Residence
    secondParentName?: string;
    secondParentContact?: string;
    documents?: { id: string; type: string; fileName?: string; fileUrl?: string; }[];
    marketingAgent?: string;
    email?: string;
    studentContact?: string; // New Optional Field
    digitalPaymentMethod?: string[]; // Legacy/Simple
    paymentDetails?: { method: string; code: string }[]; // New Structured Data
    origin?: 'bursar' | 'registrar'; // New Field: To distinguish source

    // Legacy / UI Helpers
    course?: string;
    entryLevel?: string;
    payCode?: string;
}


export interface AdmissionFormData {
    firstName: string;
    lastName: string;
    schoolPayCode: string; // Legacy: Maps to primary code
    dob: string;
    gender: 'Male' | 'Female';
    nationality: string;
    course: string;
    entryLevel: string;
    admissionDate: string;
    marketingAgent: string;
    parentName: string;
    parentContact: string;
    email: string;
    digitalPaymentMethod: string[]; // Legacy
    paymentDetails: { method: string; code: string }[]; // New Structured Data
}

export interface CourseUnit {
    id: string;
    code: string;
    name: string;
    creditUnits: number;
    type: 'Core' | 'Elective'; // New field
    programmeId: string;
    level: string; // "Year 1"
    semester: string; // "Semester 1"
    defaultGrading?: 'percentage' | 'number' | 'letter'; // Override default page grading logic
}

export interface ResultPageConfig {
    id: string;
    programmeId: string;
    level: string; // "Year 1"
    name: string; // "Internals", "Externals"
    courseUnitIds: string[];
    isDefault?: boolean;
    markingScheme?: 'percentage' | 'number' | 'letter';
    passMark?: number; // Threshold for highlighting failed marks
    overallScoreSystem?: 'gpa' | 'average' | 'points' | 'other'; // New field
}

export interface StudentResult {
    id: string; // unique ID
    studentId: number;
    courseUnitId: string;
    pageConfigId?: string; // New: Scope result to a specific page (e.g. Internals vs Externals)
    marks: string | number;
    isPosted: boolean;
    updatedAt: string;
}

export interface StudentPageSummary {
    id: string; // unique ID
    studentId: number;
    pageConfigId: string; // Link to the specific results page
    overallScore: string;
    comment?: string;
    postedAt?: string; // ISO Timestamp of last post
    updatedAt: string;
}

export interface PostHistoryItem {
    id: string;
    date: string;
    count: number;
    students: string[]; // Names of students (Legacy/Display)
    studentIds: number[]; // IDs for Revert Logic
    pageName: string;
    pageConfigId?: string; // ID for Revert Logic
}



export interface ResultArchive {
    id: string;
    name: string;
    date: string;
    pageConfigId: string;
    data: {
        results: StudentResult[];
        summaries: StudentPageSummary[];
        postHistory: PostHistoryItem[];
    };
}

export interface SchoolProfile {
    name: string;
    motto: string;
    type: string;
    poBox: string;
    city: string;
    phone: string;
    email: string;
    logo?: string;
    principal: string;
    administrator: string;
    accountantPassword?: string;
    tin?: string;
    website?: string;
}

// --- BUDGET SETTINGS MODELS ---
export interface BudgetSubcategory {
    id: string;
    name: string;
    amount: number;
}

export interface BudgetCategoryLimit {
    id: string;
    categoryId: string; // Links to expenseCategories
    baseAmount: number;
    allowSubcategories: boolean;
    subcategories: BudgetSubcategory[];
}

export interface BudgetPeriod {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: 'Draft' | 'Active' | 'Archived';
    budgetCategories: BudgetCategoryLimit[]; // Expenses
    budgetIncomeCategories?: BudgetCategoryLimit[]; // Income
}

// --- REQUISITION SYSTEM ---

export interface RequisitionItem {
    id: string;
    category: string;
    name: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    isManual?: boolean;
    isPriority?: boolean;
}

export interface InQueueItem {
    id: string;
    originalRequisitionId?: string;
    itemData: RequisitionItem;
    dateRemoved: string;
}

export interface Requisition {
    id: string;
    readableId?: string; // e.g. REQ-001
    title: string;
    date: string;
    account: string;
    status: 'Draft' | 'Pending Approval' | 'Submitted' | 'Approved' | 'Rejected';
    items: RequisitionItem[];
    notes: string;
    priority?: 'Low' | 'Medium' | 'High';
    queueSnapshot?: InQueueItem[]; // Access locked queue at approval
    rejectionReason?: string;
}

export interface CompulsoryFee {
    id: string;
    name: string; // e.g. "Guild Fee", "Development Fee"
    amount: number; // Required amount to be considered "Paid"
    type: 'clearance' | 'probation'; // New field: Required for which status?
    category?: 'monetary' | 'physical'; // Distinguished monetary vs physical checks
}

export interface FinancialSettings {
    clearancePct: number; // Replaces clearanceMax
    probationPct: number; // Replaces probationMax
    compulsoryFees: CompulsoryFee[]; // New field
}

export interface LandingPageRoleContent {
    id: string;
    title: string;
    tagline: string;
    image: string;
    theme: string;
    description: string;
    features: string[];
}

export interface DeveloperSettings {
    maintenanceMode: boolean;
    allowNewRegistrations: boolean;
    globalAnnouncement?: string;
    subscriptionFees: {
        portal: 'student' | 'tutor' | 'school';
        amount: number;
        currency: string;
        interval: 'monthly' | 'yearly';
    }[];
}

export interface FeaturedSchool {
    id: string;
    name: string;
    category: string;
    image: string;
    logo?: string;
    tagline: string;
    description: string;
    contact?: string;
    email?: string;
    location?: string;
}

export interface SchoolApplication {
    id: string;
    schoolId: string;
    schoolName: string;
    applicantName: string;
    applicantEmail: string;
    applicantPhone: string;

    // New Detailed Fields
    firstName?: string;
    middleName?: string;
    lastName?: string;
    dob?: string;
    gender?: string;
    nationality?: string;
    address?: string;

    programmes?: string;
    entryLevel?: string;
    modeOfStudy?: string;

    highestQualification?: string;
    lastInstitution?: string;
    completionYear?: string;
    examBody?: string;
    indexNumber?: string;

    sourceOfInfo?: string;
    sourceOrgName?: string;
    sourceFriendName?: string;
    sourceOther?: string;

    nokName?: string;
    nokRelationship?: string;
    nokPhone?: string;
    nokAddress?: string;

    profilePhoto?: string;
    academicResults?: string;

    // Form control fields
    email?: string;
    phone?: string;
    agreed?: boolean;

    status: 'pending' | 'viewed' | 'contacted';
    submittedAt: string;
    message?: string;
}

export const INITIAL_LANDING_CONTENT: LandingPageRoleContent[] = [
    {
        id: 'student',
        title: 'Student Portal',
        tagline: 'Your academic life. Simplified.',
        image: '/landing/student.png',
        theme: '#a855f7',
        description: 'Access grades, track fees, and stay updated with school news - all in one beautiful app.',
        features: ['Real-time Grade Tracking', 'Instant Fee Statements', 'Digital Library Access', 'School Announcements']
    },
    {
        id: 'tutor',
        title: 'Tutor Portal',
        tagline: 'Inspire. Create. Earn.',
        image: '/landing/tutor.png',
        theme: '#3b82f6',
        description: 'Upload content, manage your classes, and grow your subscriber base with powerful analytics.',
        features: ['Video Content Management', 'Subscriber Analytics', 'Assignment Grading', 'Live Class Sheduling']
    },
    {
        id: 'school',
        title: 'School Portal',
        tagline: 'The Command Center.',
        image: '/landing/school.png',
        theme: '#f59e0b',
        description: 'Oversee entire operations, from admissions to inventory, in one unified dashboard.',
        features: ['Staff Management', 'Inventory Control', 'Admissions Processing', 'Global Settings']
    }
];

export const INITIAL_DEVELOPER_SETTINGS: DeveloperSettings = {
    maintenanceMode: false,
    allowNewRegistrations: true,
    subscriptionFees: [
        { portal: 'student', amount: 50000, currency: 'UGX', interval: 'monthly' },
        { portal: 'tutor', amount: 30000, currency: 'UGX', interval: 'monthly' },
        { portal: 'school', amount: 150000, currency: 'UGX', interval: 'monthly' }
    ]
};

export const INITIAL_FEATURED_SCHOOLS: FeaturedSchool[] = [
    {
        id: '1',
        name: 'Aurora Scitech Academy',
        category: 'Science & Technology',
        image: '/schools/1.png',
        logo: '/schools/1_logo.png',
        tagline: 'Innovating the future, today.',
        description: 'A world-class facility dedicated to STEM education with state-of-the-art labs.',
        contact: '+256 700 000001',
        email: 'info@aurora.sc.ug',
        location: 'Kira Road, Kampala'
    },
    {
        id: '2',
        name: 'The Summit International',
        category: 'International Boarding',
        image: '/schools/2.png',
        logo: '/schools/2_logo.png',
        tagline: 'Global Leaders in the making.',
        description: 'Experience a diverse culture and competitive sports on our expansive campus.',
        contact: '+256 700 000002',
        email: 'admissions@summit.intl',
        location: 'Entebbe'
    },
    {
        id: '3',
        name: 'St. Kingsbury College',
        category: 'Traditional Heritage',
        image: '/schools/3.png',
        logo: '/schools/3_logo.png',
        tagline: 'Excellence since 1895.',
        description: 'A prestigious institution with a rich history of academic discipline and character building.',
        contact: '+256 700 000003',
        email: 'hello@kingsbury.edu',
        location: 'Mukono'
    },
    {
        id: '4',
        name: 'Future Foundry',
        category: 'Vocational Engineering',
        image: '/schools/4.png',
        logo: '/schools/4_logo.png',
        tagline: 'Hands-on Engineering.',
        description: 'Advanced robotics and engineering programs for practical skill development.',
        contact: '+256 700 000004',
        email: 'desk@futurefoundry.ug',
        location: 'Nakawa'
    }
];

export interface BankAccount {
    id: string;
    name: string;
    group: 'Cash' | 'Accounts' | 'Bank Accounts' | 'Card';
    type: 'Asset' | 'Liability';
    currency: string;
    balance: number;
    accountNumber?: string;
    bankName?: string;
}

export const INITIAL_FINANCIAL_SETTINGS: FinancialSettings = {
    clearancePct: 100,
    probationPct: 80,
    compulsoryFees: []
};

export const determineStudentStatus = (student: EnrolledStudent, settings: FinancialSettings = INITIAL_FINANCIAL_SETTINGS): 'cleared' | 'probation' | 'defaulter' => {
    // Percentage Logic
    // If totalFees is 0 (e.g. not synced), treat as 100% paid (cleared) or 0%?
    // Usually if totalFees is 0, they owe nothing, so 'cleared'.
    if (student.totalFees <= 0) return 'cleared';

    const paid = student.totalFees - student.balance;
    const pct = (paid / student.totalFees) * 100;

    // Logic: 
    // Cleared: >= clearancePct (e.g. 100)
    // Probation: >= probationPct (e.g. 80)
    // Else: Defaulter
    if (pct >= settings.clearancePct) return 'cleared';
    if (pct >= settings.probationPct) return 'probation';
    return 'defaulter';
};

export interface Billing {
    id: string;
    studentId: number;
    programmeId: string;
    level: string; // "Year 1"
    term: string; // "Semester 1"
    type: string; // "Tuition", "Library Fee"
    description: string;
    amount: number;
    paidAmount: number;
    balance: number;
    date: string; // ISO
    dueDate?: string;
    status: TransactionStatus;
    history: AuditLog[];
    isBroughtForward?: boolean; // New Flag for debt integrity
    metadata?: {
        serviceId?: string;
        [key: string]: any;
    };
}

export interface Payment {
    id: string;
    studentId: number;
    billingId?: string; // Optional link to specific bill
    amount: number;
    date: string;
    method: PaymentMode;
    reference: string; // Bank Ref / Slip No
    receiptNumber: string;
    recordedBy: string;
    allocations?: Record<string, number>; // Breakdown of payment e.g. { "Tuition": 500000, "Medical": 20000 }
    description?: string;
    term?: string; // "Semester 1" - Context of payment
    attachments?: string[]; // URLs or Base64 strings of proof
    status?: 'pending' | 'approved' | 'rejected'; // Approval Workflow
    history: AuditLog[];
    type?: 'payment' | 'adjustment'; // New Flag for auditing
}

// --- CALENDAR MANAGEMENT ---

export type EventType = 'academic' | 'administrative' | 'activity' | 'timetable';
export type EventStatus = 'draft' | 'published';
export type EventVisibility = 'all' | 'specific' | 'staff';

export interface CalendarEvent {
    id: string;
    title: string;
    description: string;
    startDate: string; // ISO Date String (YYYY-MM-DD)
    endDate?: string;  // ISO Date String (YYYY-MM-DD)
    startTime?: string; // "HH:mm"
    endTime?: string;   // "HH:mm"
    type: EventType;
    status: EventStatus;

    // Visibility Rules
    visibility: EventVisibility;
    targetProgrammes?: string[]; // IDs of programmes if specific
    targetLevels?: string[];     // e.g. ["Year 1"] if specific

    createdAt: string;
    updatedAt: string;
}

// --- MANAGE ROLES ---
export type AccountantRole = 'Bursar' | 'Expense Manager' | 'Estate Manager' | 'Registrar' | 'School News Coordinator' | 'Director' | null;

// --- PAYMENT CONFIGURATION ---
export interface PaymentIntegration {
    id: string;
    provider: 'SchoolPay' | 'PegPay';
    name: string;
    description: string;
    logo?: string;
    status: 'active' | 'inactive' | 'error';
    merchantId?: string;
    apiKey?: string;
    clientSecret?: string;
    lastSync?: string;
}

export interface ManualPaymentMethod {
    id: string;
    name: string; // e.g. "Bursary Cash Desk", "Direct Bank Deposit"
    mappedAccountId?: string; // ID of the internal BankAccount (For Cash)
    category: 'cash' | 'digital_fallback'; // New field to distinguish sections
    providerId?: string; // If fallback, link to PaymentIntegration ID
    status: 'active' | 'inactive';
    description?: string;
}

export const INITIAL_PAYMENT_INTEGRATIONS: PaymentIntegration[] = [
    { id: 'pi_1', provider: 'SchoolPay', name: 'SchoolPay', description: 'Real-time student fee collection via Mobile Money & Banks.', status: 'inactive' },
    { id: 'pi_2', provider: 'PegPay', name: 'PegPay', description: 'Integrated payments for utility and tuition collection.', status: 'inactive' }
];

export const INITIAL_MANUAL_PAYMENT_METHODS: ManualPaymentMethod[] = [
    { id: 'mp_1', name: 'Direct Cash', mappedAccountId: 'acc_1', category: 'cash', status: 'active', description: 'Cash collected at the Bursar office' },
    { id: 'mp_2', name: 'Manual SchoolPay Entry', providerId: 'pi_1', category: 'digital_fallback', status: 'active', description: 'For correcting missed SchoolPay transactions' },
    { id: 'mp_3', name: 'Manual PegPay Entry', providerId: 'pi_2', category: 'digital_fallback', status: 'active', description: 'For correcting missed PegPay transactions' }
];

// --- INITIAL MOCK DATA ---

const INITIAL_EXPENSE_CATEGORIES: TransactionCategoryItem[] = [
    { id: 'ec_1', name: 'Transport', subcategories: ['Fuel', 'Fares', 'Maintenance'] },
    { id: 'ec_2', name: 'Food', subcategories: ['Staff Meals', 'Student Meals', 'Ingredients'] },
    { id: 'ec_3', name: 'Utilities', subcategories: ['Electricity', 'Water', 'Internet'] },
    { id: 'ec_4', name: 'Maintenance', subcategories: ['Repairs', 'Cleaning', 'Compound'] },
    { id: 'ec_5', name: 'Salaries', subcategories: ['Teaching Staff', 'Support Staff'] },
    { id: 'ec_6', name: 'Miscellaneous', subcategories: [] },
    { id: 'ec_7', name: 'School Clinic', subcategories: [] },
    { id: 'ec_8', name: 'Security Department', subcategories: ['Rain Coat', 'Torch and Cable', 'Security Cards'] },
];

const INITIAL_INCOME_CATEGORIES: TransactionCategoryItem[] = [
    { id: 'ic_1', name: 'Fees', subcategories: ['Tuition', 'Registration'] },
    { id: 'ic_2', name: 'Grants', subcategories: ['Government', 'Private'] },
    { id: 'ic_3', name: 'Sales', subcategories: ['Uniforms', 'Stationery'] },
    { id: 'ic_4', name: 'Donations', subcategories: [] },
];

export const INITIAL_SERVICES: Service[] = [
    { id: 'transport', name: 'School Transport', cost: 150000 },
    { id: 'meals', name: 'Lunch Program', cost: 200000 },
    { id: 'uniform', name: 'Extra Uniform Set', cost: 100000 },
    { id: 'trip', name: 'Study Trip Fund', cost: 50000 },
];

export const INITIAL_BURSARIES: Bursary[] = [
    { id: 'none', name: 'None (Standard Payer)', value: 0 },
    { id: 'half', name: 'Half Bursary', value: 950000 },
    { id: 'full', name: 'Full Bursary', value: 1900000 },
    { id: 'sports', name: 'Sports Scheme', value: 500000 },
    { id: 'staff', name: 'Staff Child', value: 600000 },
];

export const INITIAL_REQUISITION_DRAFT: Requisition = {
    id: 'draft',
    title: 'New Requisition',
    date: new Date().toISOString().split('T')[0],
    account: 'Cash',
    status: 'Draft',
    items: [],
    notes: ''
};

export const INITIAL_NEWS: NewsItem[] = [
    { id: '1', title: 'Welcome to Term 1', content: 'We are excited to welcome all students back for the new academic year.', date: '2024-02-05', author: 'Principal', category: 'General' },
    { id: '2', title: 'Sports Day Postponed', content: 'Due to heavy rains, sports day is moved to next Friday.', date: '2024-03-10', author: 'Sports Dept', category: 'Sports' }
];

export const INITIAL_ADVERTS: Advert[] = [
    { id: 'ad1', title: 'Admissions Open 2026', content: 'Join the leading medical institute in the region.', schoolName: 'VINE Medical Institute', linkUrl: '#' },
    { id: 'ad2', title: 'Nursing Scholarship', content: 'Apply for the new merit-based nursing scholarship.', schoolName: 'Global Health Academy', linkUrl: '#' }
];

export const INITIAL_REGISTRAR_STUDENTS: RegistrarStudent[] = [
    {
        id: 'reg_1', name: 'PATIENT ZERO', dob: '2005-04-12', gender: 'Female',
        parentName: 'JOHN ZERO', parentContact: '0772123456',
        secondParentName: 'MARY ZERO', secondParentContact: '0702123456',
        previousSchool: 'Hillside Primary', entryClass: 'Year 1', admissionDate: '2024-01-10', status: 'Enrolled',
        country: 'Uganda', district: 'Kampala', placeOfOrigin: 'Ntinda', schoolPayCode: 'PAY-001', programme: 'Bachelor of Medicine & Surgery'
    }
];

// ... (skipping templates for brevity if not modifying) ...

// SCROLL DOWN TO INITIAL_STUDENTS to fix lint error
// Wait, I can't skip multiple blocks easily with one replacement chunk if they are far apart.
// I will just add INITIAL_ADVERTS here and do a SEPARATE replacement for INITIAL_STUDENTS to capture the lint fix properly.

// Actually, I'll just do the INITIAL_ADVERTS now.

export const INITIAL_TEMPLATES: DocumentTemplate[] = [
    {
        id: 'tmpl_admission',
        name: 'Admission Letter',
        type: 'ADMISSION_LETTER',
        updatedAt: new Date().toISOString(),
        sections: [
            { id: 's1', type: 'header', order: 0, content: '<div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">{{programme_logo}}<h1>{{institution_name}}</h1><p>{{institution_address}}</p><p>{{institution_email}} | {{institution_contact}}</p></div>', isEditable: true },
            { id: 's2', type: 'body', order: 1, content: '<p>Date: {{current_date}}</p><p><strong>Dear {{student_name}},</strong></p><p>We are pleased to inform you that you have been admitted to the <strong>{{programme_name}}</strong> programme at {{institution_name}}.</p><p>Please report on {{reporting_date}} with your admission documents.</p>', isEditable: true },
            { id: 's3', type: 'footer', order: 2, content: '<div style="margin-top: 40px; border-top: 1px solid #ccc; padding-top: 10px;"><p>Authorized Signature: __________________________</p><p>{{bursar_name}}</p></div>', isEditable: true }
        ]
    },
    {
        id: 'tmpl_receipt',
        name: 'Official Receipt',
        type: 'RECEIPT',
        updatedAt: new Date().toISOString(),
        sections: [
            { id: 'r1', type: 'header', order: 0, content: '<div style="text-align: center;">{{programme_logo}}<h2>VALID RECEIPT</h2><h3>{{institution_name}}</h3><p>{{institution_address}}</p><p>{{institution_contact}}</p><p>{{institution_email}}</p></div>', isEditable: true },
            { id: 'r2', type: 'body', order: 1, content: '<table style="width: 100%; margin: 20px 0;"><tr><td>Receipt No: <strong>{{receipt_number}}</strong></td><td>Date: {{transaction_date}}</td></tr><tr><td>Student: <strong>{{student_name}}</strong></td><td>Ref: {{student_code}}</td></tr></table>', isEditable: true },
            { id: 'r3', type: 'table', order: 2, content: '<table style="width: 100%; border-collapse: collapse; margin: 20px 0;" border="1"><thead><tr><th style="padding: 8px;">Particulars</th><th style="padding: 8px;">Amount</th></tr></thead><tbody><tr><td style="padding: 8px;">{{transaction_particulars}}</td><td style="padding: 8px;">{{transaction_amount}}</td></tr></tbody><tfoot><tr><td style="padding: 8px; font-weight: bold;">TOTAL PAID</td><td style="padding: 8px; font-weight: bold;">{{transaction_amount}}</td></tr></tfoot></table>', isEditable: false },
            { id: 'r4', type: 'footer', order: 3, content: '<p>Amount in words: {{amount_in_words}}</p><p style="margin-top: 20px;">Received By: {{user_name}}</p>', isEditable: true }
        ]
    }
];



export const INITIAL_COURSE_UNITS: CourseUnit[] = [
    // Year 1 Semester 1 Common
    { id: 'cu_1', code: 'CS101', name: 'Intro to Programming', creditUnits: 4, type: 'Core', programmeId: 'mbchb', level: 'Year 1', semester: 'Semester 1' },
    { id: 'cu_2', code: 'KV102', name: 'Kinyavudavidology', creditUnits: 3, type: 'Core', programmeId: 'mbchb', level: 'Year 1', semester: 'Semester 1' },
    { id: 'cu_3', code: 'MTH101', name: 'Calculus I', creditUnits: 4, type: 'Core', programmeId: 'mbchb', level: 'Year 1', semester: 'Semester 1' },
    // Year 1 Semester 2
    { id: 'cu_4', code: 'CS104', name: 'Data Structures', creditUnits: 4, type: 'Core', programmeId: 'mbchb', level: 'Year 1', semester: 'Semester 2' },
];

export const INITIAL_RESULT_PAGE_CONFIGS: ResultPageConfig[] = [
    {
        id: 'rpc_1',
        programmeId: 'mbchb',
        level: 'Year 1',
        name: 'Internals',
        courseUnitIds: ['cu_1', 'cu_2', 'cu_3'],
        isDefault: true
    },
    {
        id: 'rpc_2',
        programmeId: 'mbchb',
        level: 'Year 1',
        name: 'Externals',
        courseUnitIds: ['cu_1', 'cu_3'],
        isDefault: true
    }
];

const INITIAL_PROGRAMMES: Programme[] = [
    {
        id: 'mbchb', code: 'MBChB', name: 'Bachelor of Medicine & Surgery', type: 'Degree', duration: '5 Years',
        feeStructure: [], documents: {}, levels: ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5']
    },
    {
        id: 'pharm', code: 'BPHARM', name: 'Bachelor of Pharmacy', type: 'Degree', duration: '4 Years',
        feeStructure: [], documents: {}, levels: ['Year 1', 'Year 2', 'Year 3', 'Year 4']
    },
    {
        id: 'nurs', code: 'BNS', name: 'Bachelor of Nursing Science', type: 'Degree', duration: '4 Years',
        feeStructure: [], documents: {}, levels: ['Year 1', 'Year 2', 'Year 3', 'Year 4']
    },
    {
        id: 'mid', code: 'DCM', name: 'Diploma in Midwifery', type: 'Diploma', duration: '2 Years',
        feeStructure: [], documents: {}, levels: ['Year 1', 'Year 2']
    },
    {
        id: 'clin', code: 'DCM', name: 'Diploma in Clinical Medicine', type: 'Diploma', duration: '3 Years',
        feeStructure: [], documents: {}, levels: ['Year 1', 'Year 2', 'Year 3']
    }
];

export interface PromotionChange {
    studentId: number;
    studentName: string;
    fromLevel: string;
    toLevel: string;
    actionType: 'promote' | 'repeat' | 'deactivate' | 'graduate';
}

export interface PromotionBatch {
    id: string;
    name: string; // e.g. "Term 3 2025 Promotions"
    programmeId: string;
    programmeName: string;
    status: 'draft' | 'committed';
    origin?: 'bursar' | 'registrar';
    createdAt: string;
    changes: PromotionChange[];
}

export const INITIAL_PROMOTION_BATCHES: PromotionBatch[] = [];

export const INITIAL_APP_UPDATES: AppUpdate[] = [
    {
        id: 'app-n1',
        title: 'New Feature: Tutor Marketplace',
        content: 'You can now browse and subscribe to top-rated tutors directly from the app. Improve your grades with expert help!',
        date: '2026-01-28',
        type: 'Update',
        color: '#8b5cf6'
    },
    {
        id: 'app-n2',
        title: 'Maintenance Scheduled',
        content: 'VINE will be undergoing scheduled maintenance on Saturday (3am - 5am). Apologies for any inconvenience.',
        date: '2026-01-25',
        type: 'Alert',
        color: '#f59e0b'
    },
    {
        id: 'app-n3',
        title: 'Win a Laptop!',
        content: 'Participate in the annual VINE Scholar quiz and stand a chance to win a brand new MacBook Air.',
        date: '2026-01-20',
        type: 'Offer',
        color: '#ec4899'
    }
];

export const INITIAL_APP_OFFERS: AppOffer[] = [
    {
        id: 'off-1',
        title: '50% OFF Premium',
        description: 'Upgrade to VINE Gold for half the price this month.',
        code: 'GOLD50',
        expiry: '2 days left'
    },
    {
        id: 'off-2',
        title: 'Free Data Bundle',
        description: 'Get 5GB data for research when you complete 5 quizzes.',
        code: 'DATA5GB',
        expiry: 'Expires soon'
    }
];


export const INITIAL_BILLINGS: Billing[] = [];
export const INITIAL_PAYMENTS: Payment[] = [];

export const INITIAL_STUDENTS: EnrolledStudent[] = [
    {
        id: 101, name: "JOHN KAMAU", payCode: "8821-099", programme: "Diploma in Clinical Medicine", level: "Year 1", semester: "Year 1, Semester 1", balance: 500000, totalFees: 2500000, services: ['meals'], bursary: 'none', previousBalance: 0, status: 'active', origin: 'bursar',
        physicalRequirements: [
            { name: "Ream of Paper", required: 2, brought: 2, color: "#3b82f6", entries: [{ id: '1', date: '2024-01-15', quantity: 2 }] },
            { name: "Scrub Suits", required: 2, brought: 1, color: "#8b5cf6", entries: [{ id: '2', date: '2024-01-20', quantity: 1 }] }
        ],
        subscriptionExpiry: "2026-02-28T23:59:59"
    },
    {
        id: 102, name: "ALICE MUTESI", payCode: "PAY-001", programme: "Bachelor of Medicine & Surgery", level: "Year 1", semester: "Year 1, Semester 1",
        balance: 0, totalFees: 3000000, services: [], bursary: 'none', previousBalance: 0, status: 'active', tuitionStatus: 'cleared', origin: 'bursar'
    },
    {
        id: 103, name: "DAVID OPIO", payCode: "PAY-002", programme: "Bachelor of Medicine & Surgery", level: "Year 1", semester: "Year 1, Semester 1",
        balance: 500000, totalFees: 3000000, services: [], bursary: 'none', previousBalance: 0, status: 'active', tuitionStatus: 'probation', origin: 'bursar'
    }
];

export const INITIAL_CALENDAR_EVENTS: CalendarEvent[] = [
    {
        id: 'evt_1',
        title: 'Term 1 Begins',
        description: 'Official start of the new academic year.',
        startDate: '2024-02-05',
        type: 'academic',
        status: 'published',
        visibility: 'all',
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z'
    },
    {
        id: 'evt_2',
        title: 'Staff Meeting',
        description: 'Review of curriculum updates.',
        startDate: '2024-02-10',
        type: 'administrative',
        status: 'published',
        visibility: 'all', // Staff only ideally, but 'all' for now
        createdAt: '2024-01-05T10:00:00Z',
        updatedAt: '2024-01-05T10:00:00Z'
    },
    {
        id: 'evt_3',
        title: 'Freshers Ball',
        description: 'Welcome party for Year 1 students.',
        startDate: '2024-03-01',
        type: 'activity',
        status: 'draft',
        visibility: 'specific',
        targetLevels: ['Year 1'],
        createdAt: '2024-01-10T10:00:00Z',
        updatedAt: '2024-01-10T10:00:00Z'
    }
];

export const INITIAL_STAFF_ACCOUNTS: StaffAccount[] = [
    { id: 'staff_1', username: 'director', password: 'password123', role: 'Director', name: 'Dr. John Doe' },
    { id: 'staff_2', username: 'registrar', password: 'password123', role: 'Registrar', name: 'Ms. Alice' },
    { id: 'staff_3', username: 'news', password: 'password123', role: 'School News Coordinator', name: 'Mr. News' },
    { id: 'staff_4', username: 'expense', password: 'password123', role: 'Expense Manager', name: 'Mr. Expense' },
    { id: 'staff_5', username: 'estate', password: 'password123', role: 'Estate Manager', name: 'Mr. Estate' },
    { id: 'staff_6', username: 'bursar', password: 'password123', role: 'Bursar', name: 'Ms. Jane Smith' },
];

export const INITIAL_TUTORS: Tutor[] = [
    {
        id: 'system',
        name: 'System Administrator',
        email: 'system@vine.ac.ug',
        phone: '+256 000 000000',
        type: 'Full-time',
        status: 'Active',
        programmeIds: [],
        department: 'Information Technology',
        bio: 'Automated system account for maintaining platform resources.'
    },
    {
        id: 'tutor_1',
        name: 'Dr. Sarah N',
        email: 'sarah.n@vine.ac.ug',
        phone: '+256 700 000001',
        type: 'Full-time',
        status: 'Active',
        programmeIds: ['mbchb', 'pharm'],
        department: 'Department of Anatomy',
        specialization: 'Human Anatomy & Physiology',
        bio: 'Senior lecturer with over 10 years of experience in teaching gross anatomy.',
        stats: { subscribers: 142, views: 5600, uploads: 24 },
        password: 'password123'
    },
    {
        id: 'tutor_2',
        name: 'Prof. James O',
        email: 'james.o@vine.ac.ug',
        phone: '+256 700 000002',
        type: 'Full-time',
        status: 'Active',
        programmeIds: ['nurs', 'mbchb'],
        department: 'School of Nursing',
        specialization: 'Clinical Nursing',
        bio: 'Expert in critical care nursing and patient safety protocols.',
        stats: { subscribers: 89, views: 2300, uploads: 15 },
        password: 'password123'
    },
    {
        id: 'tutor_3',
        name: 'Ms. Mary K',
        email: 'mary.k@vine.ac.ug',
        phone: '+256 700 000003',
        type: 'Part-time',
        status: 'Active',
        programmeIds: ['clin', 'mbchb', 'nurs'],
        department: 'Public Health',
        specialization: 'Community Health',
        bio: 'Passionate about preventive medicine and community outreach programs.',
        stats: { subscribers: 210, views: 8900, uploads: 42 },
        password: 'password123'
    }
];
export const INITIAL_TUTOR_CONTENTS: TutorContent[] = [
    {
        id: 'tc1',
        tutorId: 'tutor_1',
        type: 'Video',
        title: 'Introduction to Anatomy: The Skeletal System',
        description: 'Comprehensive overview of the human skeletal system, including bone types, structure, and functions.',
        url: 'https://cdn.pixabay.com/vimeo/342186989/muscle-22666.mp4?width=1280&hash=d3f237330722361093121111623126',
        programmeIds: ['mbchb', 'clin'],
        levels: ['Year 1'],
        courseUnitIds: ['cu_1'],
        uploadDate: '2024-03-10',
        views: 1250,
        likes: 104,
        thumbnailUrl: '/thumbnails/anatomy_mock_exam_cover_1769205840654.png'
    },
    {
        id: 'tc2',
        tutorId: 'tutor_1',
        type: 'Note',
        title: 'Lecture Notes: Cardiovascular Physiology',
        description: 'Detailed lecture notes including diagrams of the heart, cardiac cycle phases, and blood pressure regulation mechanisms. Includes practice questions at the end.',
        url: '#',
        programmeIds: ['mbchb'],
        levels: ['Year 1'],
        courseUnitIds: ['cu_1'],
        uploadDate: '2024-03-15',
        views: 340,
        likes: 12,
        thumbnailUrl: '/thumbnails/lecture_notes_cardio_cover_1769205808641.png'
    },
    {
        id: 'tc3',
        tutorId: 'tutor_2',
        type: 'Video',
        title: 'Advanced Surgical Techniques: Suturing',
        description: 'Watch a demonstration of various suturing techniques used in emergency medicine. Includes simple interrupted, vertical mattress, and subcuticular stitches.',
        url: 'https://cdn.pixabay.com/vimeo/342186989/muscle-22666.mp4?width=1280&hash=d3f237330722361093121111623126',
        programmeIds: ['mbchb'],
        levels: ['Year 2'],
        courseUnitIds: ['cu_2'],
        uploadDate: '2024-03-20',
        views: 890,
        likes: 67,
        thumbnailUrl: '/thumbnails/public_health_cover_1769205876252.png'
    },
    {
        id: 'tc4',
        tutorId: 'tutor_1',
        type: 'Question',
        title: 'Q&A Session: Pathology Finals Prep',
        description: 'Recorded Q&A session addressing common misconceptions in general pathology. Topics include inflammation, tissue repair, and hemodynamic disorders.',
        url: '#',
        programmeIds: ['mbchb'],
        levels: ['Year 2'],
        courseUnitIds: ['cu_2'],
        uploadDate: '2024-03-25',
        views: 560,
        likes: 23,
        thumbnailUrl: '/thumbnails/pathology_exam_cover_1769205824868.png'
    },
    {
        id: 'tc5',
        tutorId: 'tutor_3',
        type: 'Video',
        title: 'Community Hygiene Fundamentals',
        description: 'Basics of sanitation and hygiene in rural communities. Field demonstration included.',
        url: 'https://cdn.pixabay.com/vimeo/342186989/muscle-22666.mp4?width=1280&hash=d3f237330722361093121111623126',
        programmeIds: ['clin', 'mbchb'], // Shared
        levels: ['Year 1'],
        courseUnitIds: [],
        uploadDate: '2024-04-10',
        views: 410,
        likes: 30,
        thumbnailUrl: '/thumbnails/public_health_cover_1769205876252.png'
    },
    {
        id: 'tc6',
        tutorId: 'tutor_1',
        type: 'Question',
        title: 'Anatomy Mock Exam 1',
        description: 'Practice questions for the upcoming skeletal system CA.',
        url: '#',
        programmeIds: ['mbchb'],
        levels: ['Year 1'],
        courseUnitIds: ['cu_1'],
        uploadDate: '2024-04-12',
        views: 200,
        likes: 15,
        thumbnailUrl: '/thumbnails/anatomy_mock_exam_cover_1769205840654.png'
    },
    {
        id: 'tc7',
        tutorId: 'tutor_2',
        type: 'Video',
        title: 'Patient Care Ethics',
        description: 'Understanding the core principles of nursing ethics and patient rights.',
        url: 'https://cdn.pixabay.com/vimeo/342186989/muscle-22666.mp4?width=1280&hash=d3f237330722361093121111623126',
        programmeIds: ['mbchb', 'nurs'],
        levels: ['Year 1'],
        courseUnitIds: [],
        uploadDate: '2024-04-15',
        views: 600,
        likes: 55,
        thumbnailUrl: '/thumbnails/pathology_exam_cover_1769205824868.png'
    },
    {
        id: 'tc8',
        tutorId: 'tutor_3',
        type: 'Note',
        title: 'Public Health Policy 101',
        description: 'Introduction to national health policies and their implementation.',
        url: '#',
        programmeIds: ['clin'],
        levels: ['Year 2'],
        courseUnitIds: [],
        uploadDate: '2024-04-18',
        views: 120,
        likes: 8,
        thumbnailUrl: '/thumbnails/public_health_cover_1769205876252.png'
    },
    {
        id: 'tc9',
        tutorId: 'tutor_2',
        type: 'Note',
        title: 'Nursing Fundamentals: Vital Signs',
        description: 'Guide to measuring and interpreting vital signs accurately.',
        url: '#',
        programmeIds: ['nurs'],
        levels: ['Year 1'],
        courseUnitIds: [],
        uploadDate: '2024-04-20',
        views: 150,
        likes: 22,
        thumbnailUrl: '/thumbnails/public_health_cover_1769205876252.png'
    },
    {
        id: 'tc10',
        tutorId: 'tutor_3',
        type: 'Question',
        title: 'Clinical Rotations Quiz',
        description: 'Test your readiness for the first clinical rotation.',
        url: '#',
        programmeIds: ['clin'],
        levels: ['Year 2'],
        courseUnitIds: [],
        uploadDate: '2024-04-22',
        views: 90,
        likes: 5,
        thumbnailUrl: '/thumbnails/pathology_exam_cover_1769205824868.png'
    },
    {
        id: 'tc11',
        tutorId: 'tutor_1',
        type: 'Video',
        title: 'Pharmacology Basics: Pharmacokinetics',
        description: 'How drugs move through the body: Absorption, Distribution, Metabolism, Excretion.',
        url: 'https://cdn.pixabay.com/vimeo/342186989/muscle-22666.mp4?width=1280&hash=d3f237330722361093121111623126',
        programmeIds: ['pharm', 'mbchb'],
        levels: ['Year 1'],
        courseUnitIds: [],
        uploadDate: '2024-04-25',
        views: 310,
        likes: 40,
        thumbnailUrl: '/thumbnails/lecture_notes_cardio_cover_1769205808641.png'
    },
    {
        id: 'tc12',
        tutorId: 'tutor_1',
        type: 'Note',
        title: 'Common Drug Interactions',
        description: 'A reference sheet for common drug-drug and drug-food interactions.',
        url: '#',
        programmeIds: ['pharm'],
        levels: ['Year 2'],
        courseUnitIds: [],
        uploadDate: '2024-04-28',
        views: 205,
        likes: 18,
        thumbnailUrl: '/thumbnails/pathology_exam_cover_1769205824868.png'
    }
];
export const INITIAL_TUTOR_SETTINGS: TutorSettings[] = [];
export const INITIAL_TUTOR_SUBSCRIPTIONS: TutorSubscription[] = [];

export const INITIAL_TRANSACTIONS: GeneralTransaction[] = [];
export const INITIAL_GENERAL_TRANSACTIONS: GeneralTransaction[] = []; // Alias if needed

// --- HOOK FOR GLOBAL STATE ---



function useSchoolDataInternal() {
    const pathname = usePathname() || "";
    const isBursarPortal = pathname.startsWith('/bursar');
    const isRegistrarPortal = pathname.startsWith('/admin');

    const [hydrated, setHydrated] = useState(false);

    const loadFromStorage = (key: string, initial: any) => {
        if (typeof window === 'undefined') return initial;
        try {
            const saved = localStorage.getItem(key);
            if (!saved) return initial;

            const parsed = JSON.parse(saved);
            // Validation: ensure we didn't load garbage
            if (Array.isArray(initial) && !Array.isArray(parsed)) {
                console.warn(`Data corruption detected for ${key}. Resetting to default.`);
                return initial;
            }
            return parsed;
        } catch (e) {
            console.error(`Failed to load ${key} from storage`, e);
            return initial;
        }
    };

    const [students, setStudents] = useState<EnrolledStudent[]>(INITIAL_STUDENTS);
    const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);
    const [bursaries, setBursaries] = useState<Bursary[]>(INITIAL_BURSARIES);
    const [programmes, setProgrammes] = useState<Programme[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_programmes_v1');
            return saved ? JSON.parse(saved) : INITIAL_PROGRAMMES;
        }
        return INITIAL_PROGRAMMES;
    });
    const [documentTemplates, setDocumentTemplates] = useState<DocumentTemplate[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_templates_v1');
            return saved ? JSON.parse(saved) : INITIAL_TEMPLATES;
        }
        return INITIAL_TEMPLATES;
    });
    const [promotionBatches, setPromotionBatches] = useState<PromotionBatch[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_promotion_batches_v1');
            return saved ? JSON.parse(saved) : INITIAL_PROMOTION_BATCHES;
        }
        return INITIAL_PROMOTION_BATCHES;
    });
    const [billings, setBillings] = useState<Billing[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_billings_v1');
            return saved ? JSON.parse(saved) : INITIAL_BILLINGS;
        }
        return INITIAL_BILLINGS;
    });

    const [deletedBillings, setDeletedBillings] = useState<Billing[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_deleted_billings_v1');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });
    const [unclaimedPayments, setUnclaimedPayments] = useState<Payment[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_unclaimed_payments_v1');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });
    const [deletedPayments, setDeletedPayments] = useState<Payment[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_deleted_payments_v1');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });
    const [payments, setPayments] = useState<Payment[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_payments_v1');
            return saved ? JSON.parse(saved) : INITIAL_PAYMENTS;
        }
        return INITIAL_PAYMENTS;
    });
    const [news, setNews] = useState<NewsItem[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_news_v1');
            return saved ? JSON.parse(saved) : INITIAL_NEWS;
        }
        return INITIAL_NEWS;
    });

    const [adverts, setAdverts] = useState<Advert[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_adverts_v1');
            return saved ? JSON.parse(saved) : INITIAL_ADVERTS;
        }
        return INITIAL_ADVERTS;
    });

    const [generalTransactions, setGeneralTransactions] = useState<GeneralTransaction[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_general_transactions_v1');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });

    const [portalData, setPortalData] = useState<Record<number, EnrolledStudent>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_portal_data_v1');
            return saved ? JSON.parse(saved) : {};
        }
        return {};
    });

    useEffect(() => {
        if (hydrated) safeSetItem('school_portal_data_v1', portalData);
    }, [portalData, hydrated]);

    // Cross-Tab Synchronization for Portal Data
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'school_portal_data_v1' && e.newValue) {
                try {
                    const newData = JSON.parse(e.newValue);
                    setPortalData(newData);
                } catch (err) {
                    console.error("Failed to sync portal data across tabs", err);
                }
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const updatePortalData = (student: EnrolledStudent) => {
        setPortalData(prev => ({ ...prev, [student.id]: student }));
    };

    // Categories initialized with defaults if empty
    const [expenseCategories, setExpenseCategories] = useState<TransactionCategoryItem[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_expense_categories_v1');
            return saved ? JSON.parse(saved) : INITIAL_EXPENSE_CATEGORIES;
        }
        return INITIAL_EXPENSE_CATEGORIES;
    });

    const [incomeCategories, setIncomeCategories] = useState<TransactionCategoryItem[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_income_categories_v1');
            return saved ? JSON.parse(saved) : INITIAL_INCOME_CATEGORIES;
        }
        return INITIAL_INCOME_CATEGORIES;
    });

    const [globalAuditLogs, setGlobalAuditLogs] = useState<AuditLog[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_global_audit_logs_v1');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });

    const [isProcessingPromotion, setIsProcessingPromotion] = useState(false);

    useEffect(() => {
        if (hydrated) safeSetItem('school_global_audit_logs_v1', globalAuditLogs);
    }, [globalAuditLogs, hydrated]);

    const [serverTimeOffset, setServerTimeOffset] = useState(0);

    useEffect(() => {
        const syncTime = async () => {
            try {
                const start = Date.now();
                const res = await fetch('https://worldtimeapi.org/api/ip');
                if (!res.ok) throw new Error('Time API failed');
                const data = await res.json();
                const serverTime = new Date(data.utc_datetime).getTime();
                const end = Date.now();
                const latency = (end - start) / 2;
                setServerTimeOffset(serverTime - (end - latency));
            } catch (e) {
                console.warn("Time sync failed, using local clock", e);
            }
        };
        syncTime();
    }, []);

    const getSyncedDate = () => new Date(Date.now() + serverTimeOffset);

    const logGlobalAction = (action: string, details: string) => {
        const newLog: AuditLog = {
            id: crypto.randomUUID(),
            action,
            details,
            user: activeRole || 'System',
            timestamp: getSyncedDate().toISOString()
        };
        setGlobalAuditLogs(prev => [newLog, ...prev].slice(0, 200)); // Pruned: Keep last 200 logs
    };

    const [registrarStudents, setRegistrarStudents] = useState<RegistrarStudent[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_registrar_students_v1');
            return saved ? JSON.parse(saved) : INITIAL_REGISTRAR_STUDENTS;
        }
        return INITIAL_REGISTRAR_STUDENTS;
    });

    const [tutors, setTutors] = useState<Tutor[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_tutors_v2');
            return saved ? JSON.parse(saved) : INITIAL_TUTORS;
        }
        return INITIAL_TUTORS;
    });

    const [tutorContents, setTutorContents] = useState<TutorContent[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_tutor_contents_v1');
            return saved ? JSON.parse(saved) : INITIAL_TUTOR_CONTENTS;
        }
        return INITIAL_TUTOR_CONTENTS;
    });

    const [tutorSettings, setTutorSettings] = useState<TutorSettings[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_tutor_settings_v1');
            return saved ? JSON.parse(saved) : INITIAL_TUTOR_SETTINGS;
        }
        return INITIAL_TUTOR_SETTINGS;
    });
    const [tutorSubscriptions, setTutorSubscriptions] = useState<TutorSubscription[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_tutor_subscriptions_v1');
            return saved ? JSON.parse(saved) : INITIAL_TUTOR_SUBSCRIPTIONS;
        }
        return INITIAL_TUTOR_SUBSCRIPTIONS;
    });

    const [requisitions, setRequisitions] = useState<Requisition[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_requisitions_v1');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });

    const [requisitionQueue, setRequisitionQueue] = useState<InQueueItem[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_requisition_queue_v1');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });

    const [requisitionDraft, setRequisitionDraftState] = useState<Requisition>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_requisition_draft_v1');
            return saved ? JSON.parse(saved) : INITIAL_REQUISITION_DRAFT;
        }
        return INITIAL_REQUISITION_DRAFT;
    });

    const [admissionFormData, setAdmissionFormData] = useState<AdmissionFormData>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_admission_form_data_v1');
            return saved ? JSON.parse(saved) : {
                firstName: '', lastName: '', schoolPayCode: '', dob: '', gender: 'Male', nationality: 'Ugandan',
                course: '', entryLevel: 'Year 1, Semester 1', admissionDate: new Date().toISOString().split('T')[0],
                marketingAgent: '', parentName: '', parentContact: '', email: ''
            };
        }
        return {
            firstName: '', lastName: '', schoolPayCode: '', dob: '', gender: 'Male', nationality: 'Ugandan',
            course: '', entryLevel: 'Year 1, Semester 1', admissionDate: new Date().toISOString().split('T')[0],
            marketingAgent: '', parentName: '', parentContact: '', email: ''
        };
    });

    const [paymentIntegrations, setPaymentIntegrations] = useState<PaymentIntegration[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_payment_integrations_v1');
            return saved ? JSON.parse(saved) : INITIAL_PAYMENT_INTEGRATIONS;
        }
        return INITIAL_PAYMENT_INTEGRATIONS;
    });

    const [manualPaymentMethods, setManualPaymentMethods] = useState<ManualPaymentMethod[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_manual_payment_methods_v1');
            return saved ? JSON.parse(saved) : INITIAL_MANUAL_PAYMENT_METHODS;
        }
        return INITIAL_MANUAL_PAYMENT_METHODS;
    });

    // --- EFFECTS FOR PERSISTENCE ---


    // Budgets State (Fixing "No value exists in scope")
    const [budgets, setBudgets] = useState<Budget[]>([]);


    // RESULTS MANAGEMENT STATE
    const [courseUnits, setCourseUnits] = useState<CourseUnit[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_course_units_v1');
            return saved ? JSON.parse(saved) : INITIAL_COURSE_UNITS;
        }
        return INITIAL_COURSE_UNITS;
    });

    const [resultPageConfigs, setResultPageConfigs] = useState<ResultPageConfig[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_result_page_configs_v1');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    // AUTO-REPAIR: Deduplicate to fix infinite loop corruption
                    const unique = new Map();
                    // We assume the earlier entries are the valid ones
                    parsed.forEach((c: ResultPageConfig) => {
                        const key = `${c.programmeId}-${c.level}-${c.name}`;
                        if (!unique.has(key)) unique.set(key, c);
                    });
                    const cleaned = Array.from(unique.values()) as ResultPageConfig[];

                    // Force save back immediately if corruption was found requires useEffect, 
                    // but State initialization is enough for the render cycle.
                    return cleaned;
                } catch (e) {
                    console.error("Failed to parse result configs", e);
                    return INITIAL_RESULT_PAGE_CONFIGS;
                }
            }
            return INITIAL_RESULT_PAGE_CONFIGS;
        }
        return INITIAL_RESULT_PAGE_CONFIGS;
    });

    const [studentResults, setStudentResults] = useState<StudentResult[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_student_results_v1');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });

    const [studentPageSummaries, setStudentPageSummaries] = useState<StudentPageSummary[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_student_page_summaries_v1');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });



    const [resultArchives, setResultArchives] = useState<ResultArchive[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_result_archives_v1');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });



    const [appUpdates, setAppUpdates] = useState<AppUpdate[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_app_updates_v1');
            return saved ? JSON.parse(saved) : INITIAL_APP_UPDATES;
        }
        return INITIAL_APP_UPDATES;
    });

    const [appOffers, setAppOffers] = useState<AppOffer[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_app_offers_v1');
            return saved ? JSON.parse(saved) : INITIAL_APP_OFFERS;
        }
        return INITIAL_APP_OFFERS;
    });

    useEffect(() => {
        if (hydrated) {
            localStorage.setItem('school_app_updates_v1', JSON.stringify(appUpdates));
            localStorage.setItem('school_app_offers_v1', JSON.stringify(appOffers));
        }
    }, [appUpdates, appOffers, hydrated]);

    const addAppUpdate = (item: AppUpdate) => setAppUpdates(prev => [item, ...prev]);
    const updateAppUpdate = (item: AppUpdate) => setAppUpdates(prev => prev.map(u => u.id === item.id ? item : u));
    const deleteAppUpdate = (id: string) => setAppUpdates(prev => prev.filter(u => u.id !== id));

    const addAppOffer = (item: AppOffer) => setAppOffers(prev => [item, ...prev]);
    const updateAppOffer = (item: AppOffer) => setAppOffers(prev => prev.map(o => o.id === item.id ? item : o));
    const deleteAppOffer = (id: string) => setAppOffers(prev => prev.filter(o => o.id !== id));

    const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_staff_accounts_v1');
            return saved ? JSON.parse(saved) : INITIAL_STAFF_ACCOUNTS;
        }
        return INITIAL_STAFF_ACCOUNTS;
    });

    useEffect(() => {
        if (hydrated) safeSetItem('school_staff_accounts_v1', staffAccounts);
    }, [staffAccounts, hydrated]);

    const updateStaffPassword = (accountId: string, newPassword: string) => {
        setStaffAccounts(prev => prev.map(acc => acc.id === accountId ? { ...acc, password: newPassword } : acc));
    };

    // PERSISTENCE EFFECT FOR ARCHIVES
    useEffect(() => {
        if (hydrated) localStorage.setItem('school_result_archives_v1', JSON.stringify(resultArchives));
    }, [resultArchives, hydrated]);

    // CALENDAR STATE (Moved here to access hydrated)
    const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_calendar_events_v1');
            return saved ? JSON.parse(saved) : INITIAL_CALENDAR_EVENTS;
        }
        return INITIAL_CALENDAR_EVENTS;
    });


    // TRANSACTION SETTINGS
    const [transactionSettings, setTransactionSettings] = useState<TransactionSettings>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_transaction_settings_v1');
            return saved ? JSON.parse(saved) : { carryOver: false };
        }
        return { carryOver: false };
    });

    const [suggestions, setSuggestions] = useState<Suggestion[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_suggestions_v1');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });

    const [studentProfile, setStudentProfile] = useState<StudentProfile>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_student_profile_v1');
            return saved ? JSON.parse(saved) : {
                id: 'std_user_1',
                name: 'Student User',
                email: 'student@vine.ac.ug',
                likedContentIds: [],
                subscribedTutorIds: []
            };
        }
        return {
            id: 'std_user_1',
            name: 'Student User',
            email: 'student@vine.ac.ug',
            likedContentIds: [],
            subscribedTutorIds: []
        };
    });

    const [tutorProfile, setTutorProfile] = useState<TutorProfile | null>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_tutor_profile_v1');
            return saved ? JSON.parse(saved) : null;
        }
        return null;
    });

    const [developerProfile, setDeveloperProfile] = useState<DeveloperProfile | null>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_developer_profile_v1');
            return saved ? JSON.parse(saved) : null;
        }
        return null;
    });



    useEffect(() => {
        if (hydrated) localStorage.setItem('school_transaction_settings_v1', JSON.stringify(transactionSettings));
    }, [transactionSettings, hydrated]);

    // --- INVENTORY STATE ---
    const [inventoryLists, setInventoryLists] = useState<InventoryList[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_inventory_lists_v1');
            return saved ? JSON.parse(saved) : [
                { id: 'l1', name: 'Supplies & Materials' },
                { id: 'l2', name: 'Furniture & Equipment' }
            ];
        }
        return [];
    });

    const [inventoryGroups, setInventoryGroups] = useState<InventoryGroup[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_inventory_groups_v1');
            return saved ? JSON.parse(saved) : [
                { id: 'g1', name: 'Default Group', listId: 'l1' },
                { id: 'g2', name: 'Only Staff', listId: 'l1' }
            ];
        }
        return [];
    });

    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_inventory_items_v1');
            return saved ? JSON.parse(saved) : [
                { id: 'i1', name: 'Electricity pipes', groupId: 'g1', quantity: 5, units: 'pcs', minStock: 2, color: '#8d6e63', lastUpdated: new Date().toISOString() },
                { id: 'i2', name: 'Iron sheets', groupId: 'g1', quantity: 4, units: 'pcs', minStock: 10, color: '#66bb6a', lastUpdated: new Date().toISOString() },
                { id: 'i3', name: 'Glasses', groupId: 'g1', quantity: 2, units: 'pairs', color: '#26a69a', lastUpdated: new Date().toISOString() }
            ];
        }
        return [];
    });

    const [inventorySettings, setInventorySettings] = useState<InventorySettings>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_inventory_settings_v1');
            return saved ? JSON.parse(saved) : { quickAction: 'reduce' };
        }
        return { quickAction: 'reduce' };
    });

    const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_inventory_logs_v1');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });

    const [inventoryTransfers, setInventoryTransfers] = useState<InventoryTransfer[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_inventory_transfers_v1');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });

    const [inventoryLocations, setInventoryLocations] = useState<string[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_inventory_locations_v1');
            return saved ? JSON.parse(saved) : ['Main Store', 'Kitchen', 'Library', 'Science Lab', 'Office', 'Site A', 'Site B'];
        }
        return ['Main Store', 'Kitchen', 'Library', 'Science Lab', 'Office', 'Site A', 'Site B'];
    });

    useEffect(() => {
        if (!hydrated) return;
        try {
            localStorage.setItem('school_inventory_lists_v1', JSON.stringify(inventoryLists));
            localStorage.setItem('school_inventory_groups_v1', JSON.stringify(inventoryGroups));
            localStorage.setItem('school_inventory_items_v1', JSON.stringify(inventoryItems));
            localStorage.setItem('school_inventory_logs_v1', JSON.stringify(inventoryLogs));
        } catch (e) {
            console.error('Failed to save to localStorage', e);
        }
    }, [inventoryLists, inventoryGroups, inventoryItems, inventoryLogs, hydrated]);

    useEffect(() => {
        if (hydrated) {
            try {
                localStorage.setItem('school_inventory_settings_v1', JSON.stringify(inventorySettings));
            } catch (e) { console.error(e); }
        }
    }, [inventorySettings, hydrated]);

    useEffect(() => {
        if (hydrated) {
            try {
                localStorage.setItem('school_inventory_transfers_v1', JSON.stringify(inventoryTransfers));
            } catch (e) { console.error(e); }
        }
    }, [inventoryTransfers, hydrated]);

    useEffect(() => {
        if (hydrated) {
            try {
                localStorage.setItem('school_inventory_locations_v1', JSON.stringify(inventoryLocations));
            } catch (e) { console.error(e); }
        }
    }, [inventoryLocations, hydrated]);

    useEffect(() => {
        if (hydrated) {
            try {
                localStorage.setItem('school_calendar_events_v1', JSON.stringify(calendarEvents));
                localStorage.setItem('school_tutor_contents_v1', JSON.stringify(tutorContents));
                localStorage.setItem('school_tutor_settings_v1', JSON.stringify(tutorSettings));
                localStorage.setItem('school_tutor_subscriptions_v1', JSON.stringify(tutorSubscriptions));
            } catch (e) { console.error(e); }
        }
    }, [calendarEvents, hydrated, tutorContents, tutorSettings, tutorSubscriptions]);

    useEffect(() => {
        if (hydrated) {
            try {
                localStorage.setItem('school_app_updates_v1', JSON.stringify(appUpdates));
                localStorage.setItem('school_app_offers_v1', JSON.stringify(appOffers));
                localStorage.setItem('school_tutor_contents_v1', JSON.stringify(tutorContents));
                localStorage.setItem('school_suggestions_v1', JSON.stringify(suggestions));
                localStorage.setItem('school_student_profile_v1', JSON.stringify(studentProfile));
                if (tutorProfile) {
                    localStorage.setItem('school_tutor_profile_v1', JSON.stringify(tutorProfile));
                } else {
                    localStorage.removeItem('school_tutor_profile_v1');
                }
                if (developerProfile) {
                    localStorage.setItem('school_developer_profile_v1', JSON.stringify(developerProfile));
                } else {
                    localStorage.removeItem('school_developer_profile_v1');
                }
            } catch (e) { console.error(e); }
        }
    }, [appUpdates, appOffers, tutorContents, suggestions, studentProfile, tutorProfile, developerProfile, hydrated]);

    const addSuggestion = (suggestion: Suggestion) => setSuggestions(prev => [suggestion, ...prev]);
    const updateStudentProfile = (profile: Partial<StudentProfile>) => setStudentProfile(prev => ({ ...prev, ...profile }));

    const toggleStudentLike = (contentId: string) => {
        setStudentProfile(prev => {
            const isLiked = prev.likedContentIds.includes(contentId);
            const newLikes = isLiked
                ? prev.likedContentIds.filter(id => id !== contentId)
                : [...prev.likedContentIds, contentId];
            return { ...prev, likedContentIds: newLikes };
        });

        // Also update the content view/like count implicitly if desired, 
        // but typically like count is derived from aggregation. 
        // For this local-first app, we'll manually increment/decrement the content's like count too.
        setTutorContents(prev => prev.map(c => {
            if (c.id === contentId) {
                const currentLikes = c.likes || 0;
                // Check if we are liking or unliking based on previous state calculation (simplified here)
                // Actually, we need to know the 'isLiked' state from BEFORE.
                // It's safer to just let the UI call a separate 'incrementLike' on content if needed.
                // But for sync:
                const wasLiked = studentProfile.likedContentIds.includes(contentId);
                return { ...c, likes: wasLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1 };
            }
            return c;
        }));
    };

    const toggleTutorSubscription = (tutorId: string) => {
        setStudentProfile(prev => {
            const isSub = prev.subscribedTutorIds.includes(tutorId);
            return {
                ...prev,
                subscribedTutorIds: isSub ? prev.subscribedTutorIds.filter(id => id !== tutorId) : [...prev.subscribedTutorIds, tutorId]
            };
        });
    };

    const addCalendarEvent = (event: CalendarEvent) => setCalendarEvents(prev => [...prev, event]);
    const updateCalendarEvent = (event: CalendarEvent) => setCalendarEvents(prev => prev.map(e => e.id === event.id ? event : e));
    const deleteCalendarEvent = (id: string) => setCalendarEvents(prev => prev.filter(e => e.id !== id));

    const verifySensitiveAction = (pin: string): boolean => {
        // Find current staff account
        const currentStaff = staffAccounts.find(s => s.username === activeRole || s.name === activeRole);
        if (!currentStaff) return false;

        // If they haven't set a pin, check password as fallback
        if (!currentStaff.transactionPin) {
            return currentStaff.password === pin;
        }
        return currentStaff.transactionPin === pin;
    };

    const [schoolProfile, setSchoolProfile] = useState<SchoolProfile>({
        name: 'VINE INTERNATIONAL SCHOOL',
        motto: 'Excellence in All Things',
        type: 'Secondary',
        poBox: 'P.O. Box 1234, Kampala',
        city: 'Kampala',
        phone: '+256 700 000000',
        email: 'info@vine.ac.ug',
        principal: 'Dr. John Doe',
        administrator: 'Ms. Jane Smith'
    });
    const [activeRole, setActiveRole] = useState<AccountantRole>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_active_role');
            if (saved) {
                try {
                    // Simple obfuscation decode
                    const decoded = window.atob(saved);
                    return decoded as AccountantRole;
                } catch (e) {
                    return saved as AccountantRole;
                }
            }
        }
        return null;
    });

    const [activeAccountId, setActiveAccountId] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_active_account_id');
            return saved || null;
        }
        return null;
    });

    // Logout Helper
    const logout = () => {
        setActiveRole(null);
        setActiveAccountId(null);
        setTutorProfile(null);
        setDeveloperProfile(null);
        if (typeof window !== 'undefined') {
            localStorage.removeItem('school_active_role');
            localStorage.removeItem('school_active_account_id');
            localStorage.removeItem('school_tutor_profile_v1');
            localStorage.removeItem('school_developer_profile_v1');
            localStorage.removeItem('school_active_student_id');
        }
    };

    // Load once on mount
    useEffect(() => {
        const loadedStudents = loadFromStorage('school_students', INITIAL_STUDENTS);

        // MIGRATION / DATA REPAIR:
        // Ensure all students have a 'level' property. Old data might miss it.
        const migratedStudents = loadedStudents.map((s: EnrolledStudent) => {
            if (!s.level) {
                // Attempt to derive from semester e.g. "Year 1, Semester 1" -> "Year 1"
                const derived = s.semester ? s.semester.split(',')[0].trim() : 'Year 1';
                return { ...s, level: derived, origin: s.origin || 'bursar' }; // Default origin to 'bursar' if missing
            }
            if (!s.origin) return { ...s, origin: 'bursar' }; // Ensure origin exists
            return s;
        });

        // SEEDING NEW MOCKS (MBChB)
        // Ensure our new demo students exist even if local storage has old data
        // FORCE UPDATE: We now overwrite these specific IDs to ensure schema updates (like subscriptionExpiry) are applied.
        const demoIds = [101, 102, 103, 201, 202, 203, 204];

        // Remove old versions of these students from storage
        const nonDemoStudents = migratedStudents.filter((s: EnrolledStudent) => !demoIds.includes(s.id));

        // Get fresh versions from INITIAL_STUDENTS
        const freshDemos = INITIAL_STUDENTS.filter(s => demoIds.includes(s.id));

        const finalStudents = [...nonDemoStudents, ...freshDemos];

        // If we made changes, save them back effectively immediately via state update
        setStudents(finalStudents);

        // TEMPLATE REPAIR & MIGRATION
        // This runs on every mount to ensure templates have all required fields.
        setDocumentTemplates(prev => {
            return prev.map(t => {
                // Apply fixes to Receipt and Admission templates
                if (['tmpl_receipt', 'tmpl_admission'].includes(t.id)) {
                    const updatedSections = t.sections.map(s => {
                        let content = s.content;

                        if (s.type === 'header') {
                            // 1. Inject Logo if missing
                            if (!content.includes('{{programme_logo}}')) {
                                content = content.replace(/(<h[1-6]>)/i, '{{programme_logo}}$1');
                            }

                            // 2. Inject Email & Contact if missing
                            // Use a single line layout: Email | Contact
                            if (!content.includes('{{institution_email}}') && !content.includes('{{institution_contact}}')) {
                                const contactHtml = '<p>{{institution_email}} | {{institution_contact}}</p>';
                                // Append after address or just before closing
                                if (content.includes('{{institution_address}}</p>')) {
                                    content = content.replace('{{institution_address}}</p>', '{{institution_address}}</p>' + contactHtml);
                                } else {
                                    content = content.replace('</div>', contactHtml + '</div>');
                                }
                            }
                        }

                        // 3. Fix Typos (Receipt specific)
                        if (t.id === 'tmpl_receipt' && s.id === 'r3') {
                            content = content
                                .replace(/{{transaction_desc}}/g, '{{transaction_particulars}}')
                                .replace(/>Description<\/th>/g, '>Particulars</th>')
                                .replace(/TOTAL PAIS/g, 'TOTAL PAID');
                        }

                        return { ...s, content };
                    });

                    // Only return new object if content actually changed (avoid infinite loops if strict equality used elsewhere, though React state set handles it)
                    // For simplicity, just return new structure.
                    return { ...t, sections: updatedSections };
                }
                return t;
            });
        });


        setServices(prev => {
            const loaded = loadFromStorage('school_services', INITIAL_SERVICES);
            // DEDUPLICATE SERVICES
            const unique = new Map();
            loaded.forEach((s: Service) => {
                if (!unique.has(s.id)) unique.set(s.id, s);
            });
            return Array.from(unique.values());
        });
        setBursaries(loadFromStorage('school_bursaries_v1', INITIAL_BURSARIES));
        setProgrammes(loadFromStorage('school_programmes_v1', INITIAL_PROGRAMMES));
        setBillings(loadFromStorage('school_billings_v1', INITIAL_BILLINGS));
        setDeletedBillings(loadFromStorage('school_deleted_billings_v1', []));
        setDeletedPayments(loadFromStorage('school_deleted_payments_v1', []));
        setUnclaimedPayments(loadFromStorage('school_unclaimed_payments_v1', []));
        setPayments(loadFromStorage('school_payments_v1', INITIAL_PAYMENTS));
        setNews(loadFromStorage('school_news_v1', INITIAL_NEWS));
        setGeneralTransactions(loadFromStorage('school_general_transactions_v1', INITIAL_TRANSACTIONS));
        setPromotionBatches(loadFromStorage('school_promotion_batches_v1', INITIAL_PROMOTION_BATCHES));

        // Load Profile (Logo persistence)
        setSchoolProfile(loadFromStorage('school_profile_v1', {
            name: 'VINE INTERNATIONAL SCHOOL',
            motto: 'Excellence in All Things',
            type: 'Secondary',
            poBox: 'P.O. Box 1234, Kampala',
            city: 'Kampala',
            phone: '+256 700 000000',
            email: 'info@vine.ac.ug',
            principal: 'Dr. John Doe',
            administrator: 'Ms. Jane Smith'
        }));

        setHydrated(true);
    }, []);

    // DATA INTEGRITY & REPAIR EFFECT
    // This runs once after hydration to ensure 'Overall Scores' survived the deduplication
    useEffect(() => {
        if (!hydrated) return;

        // 1. Map existing Page Configs (Cleaned)
        const validConfigMap = new Map(); // key -> configId
        resultPageConfigs.forEach(c => {
            const key = `${c.programmeId}-${c.level}-${c.name}`;
            validConfigMap.set(key, c.id);
        });

        // 2. Scan Summaries for "Orphaned" entries (pointing to deleted duplicates)
        let hasChanges = false;
        const RepairedSummaries = studentPageSummaries.map(summary => {
            // If config exists, it's fine
            if (resultPageConfigs.find(c => c.id === summary.pageConfigId)) return summary;

            // It's orphaned. Let's try to find its "Step-Parent"
            // We need to know what 'key' the old config had.
            // We can't know for sure without the old object.
            // However, for the specific bug case (Internals), we can guess.

            // ... Actually, the deduplication in `useState` might have been too aggressive if we lost the mapping.
            // But let's assume the user just refreshed. 
            // The State Initializer ran, deleted duplicates.
            // NOW we are here. 
            // We don't have the old configs anymore.

            return summary;
        });

        // Better approach: Since we can't recover the Mapping from deleted objects, 
        // we should rely on the *User's Action* to re-save. 
        // OR, we check if `studentResults` (marks) align with a config.

        // Wait, if I deleted the config, the ID is gone. The summary points to a ghost ID.
        // The Mark points to a Course Unit ID. Effect:
        // ResultCard for "Internals" (ID A) renders.
        // It asks for Marks for CUs in ID A. (These work if CUs are shared).
        // It asks for Summary for ID A. (This fails if summary points to ID B).

        // AUTO-MIGRATE SUMMARIES
        // If we find a summary for a student that points to a non-existent config,
        // and that student ONLY matches 1 valid config for that level/programme... matches?
        // Let's try to rescue them.
        const activeStudents = students;
        const validConfigs = resultPageConfigs;

        const rescuedSummaries = studentPageSummaries.map(s => {
            const configExists = validConfigs.find(c => c.id === s.pageConfigId);
            if (configExists) return s;

            // Orphan found. Find the student.
            const student = activeStudents.find(st => st.id === s.studentId);
            if (!student) return s; // Can't help

            // Find valid configs for this student
            const studentConfigs = validConfigs.filter(c =>
                c.programmeId === (programmes.find(p => p.name === student.programme)?.id) &&
                c.level === student.level
            );

            // If only 1 config exists (e.g. Internals), move the score there?
            // Or if name matches? (We can't know the old name).
            // But usually "Internals" is the first one.
            if (studentConfigs.length > 0) {
                // Heuristic: Assign to the first available config (usually Internals)
                // This is risky but better than data loss.
                // Only do it if we are sure.
                const target = studentConfigs[0];
                console.log(`Rescuing orphaned score [${s.overallScore}] for ${student.name} -> ${target.name}`);
                hasChanges = true;
                return { ...s, pageConfigId: target.id };
            }
            return s;
        });

        if (hasChanges) {
            setStudentPageSummaries(rescuedSummaries);
            console.log("Data Repair: Rescued orphaned scores.");
        }

    }, [hydrated, resultPageConfigs.length]); // Run when configs change (e.g. after cleanup)
    const safeSetItem = (key: string, value: any) => {
        if (!hydrated) return;

        let valueToSave = value;

        // PROACTIVE PRUNING: Before any quota error, strip heavy snapshots older than 2 years
        if (key === 'school_active_role' && value) {
            // Simple obfuscation encode
            localStorage.setItem(key, window.btoa(value as string));
            return;
        }

        if (key === 'school_students') {
            const oneYearAgo = getSyncedDate();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

            valueToSave = (value as EnrolledStudent[]).map(s => ({
                ...s,
                promotionHistory: s.promotionHistory?.map(h => {
                    const hDate = new Date(h.date);
                    // Strip heavy snapshots from older history items to save space
                    if (!isNaN(hDate.getTime()) && hDate < oneYearAgo) {
                        return { ...h, requirementsSnapshot: undefined, servicesSnapshot: undefined };
                    }
                    return h;
                }).slice(-5) // Only keep last 5 promotions in active state
            }));
        }

        try {
            localStorage.setItem(key, JSON.stringify(valueToSave));
        } catch (e) {
            if (e instanceof Error && e.name === 'QuotaExceededError') {
                console.warn(`Storage Quota Exceeded for ${key}. Attempting to save with emergency optimizations...`);

                let emergencyValue = valueToSave;

                // Strip Heavy Fields based on key
                if (key === 'school_students') {
                    emergencyValue = (valueToSave as EnrolledStudent[]).map(s => ({
                        ...s,
                        profilePic: s.profilePic ? "[STRIPPED]" : undefined,
                        promotionHistory: s.promotionHistory?.map(h => ({
                            ...h,
                            requirementsSnapshot: undefined // Strip ALL snapshots to save massive space
                        }))
                    }));
                } else if (key === 'school_payments_v1' || key === 'school_general_transactions_v1' || key === 'school_deleted_payments_v1') {
                    emergencyValue = (value as any[]).map(t => ({
                        ...t,
                        attachments: undefined // Strip proof images
                    }));
                } else if (key === 'app_school_applications_v1') {
                    emergencyValue = (value as SchoolApplication[]).map(app => ({
                        ...app,
                        profilePhoto: undefined,
                        academicResults: undefined
                    }));
                } else if (key === 'school_tutor_contents_v1') {
                    emergencyValue = (value as TutorContent[]).map(c => ({
                        ...c,
                        thumbnailUrl: undefined // Strip thumbnails
                    }));
                } else if (key === 'school_news_v1') {
                    emergencyValue = (value as NewsItem[]).map(n => ({
                        ...n,
                        mediaUrl: undefined // Strip images
                    }));
                }

                try {
                    localStorage.setItem(key, JSON.stringify(emergencyValue));
                    console.log(`Successfully saved ${key} with emergency optimizations.`);
                    return;
                } catch (e2) {
                    console.error(`Even with optimizations, storage failed for ${key}.`, e2);
                }
            }
            console.warn(`Storage Failure for ${key}:`, e);
        }
    };

    useEffect(() => {
        safeSetItem('school_students', students);
    }, [students, hydrated]);

    useEffect(() => {
        safeSetItem('school_services', services);
    }, [services, hydrated]);

    useEffect(() => {
        safeSetItem('school_programmes_v1', programmes);
    }, [programmes, hydrated]);

    useEffect(() => {
        safeSetItem('school_templates_v1', documentTemplates);
    }, [documentTemplates, hydrated]);

    useEffect(() => {
        safeSetItem('school_billings_v1', billings);
    }, [billings, hydrated]);

    useEffect(() => {
        safeSetItem('school_deleted_billings_v1', deletedBillings);
    }, [deletedBillings, hydrated]);

    useEffect(() => {
        safeSetItem('school_deleted_payments_v1', deletedPayments);
    }, [deletedPayments, hydrated]);

    useEffect(() => {
        safeSetItem('school_unclaimed_payments_v1', unclaimedPayments);
    }, [unclaimedPayments, hydrated]);

    useEffect(() => {
        if (hydrated) safeSetItem('school_active_role', activeRole || '');
    }, [activeRole, hydrated]);

    useEffect(() => {
        safeSetItem('school_profile_v1', schoolProfile);
    }, [schoolProfile, hydrated]);

    useEffect(() => {
        safeSetItem('school_payments_v1', payments);
    }, [payments, hydrated]);

    useEffect(() => {
        safeSetItem('school_news_v1', news);
    }, [news, hydrated]);

    useEffect(() => {
        safeSetItem('school_general_transactions_v1', generalTransactions);
    }, [generalTransactions, hydrated]);

    useEffect(() => {
        safeSetItem('school_expense_categories_v1', expenseCategories);
    }, [expenseCategories, hydrated]);

    useEffect(() => {
        safeSetItem('school_income_categories_v1', incomeCategories);
    }, [incomeCategories, hydrated]);

    useEffect(() => {
        safeSetItem('school_registrar_students_v1', registrarStudents);
    }, [registrarStudents, hydrated]);

    useEffect(() => {
        safeSetItem('school_tutors_v2', tutors);
    }, [tutors, hydrated]);

    useEffect(() => {
        safeSetItem('school_course_units_v1', courseUnits);
    }, [courseUnits, hydrated]);

    useEffect(() => {
        safeSetItem('school_result_page_configs_v1', resultPageConfigs);
    }, [resultPageConfigs, hydrated]);

    useEffect(() => {
        safeSetItem('school_student_results_v1', studentResults);
    }, [studentResults, hydrated]);

    useEffect(() => {
        safeSetItem('school_requisitions_v1', requisitions);
    }, [requisitions, hydrated]);

    useEffect(() => {
        safeSetItem('school_requisition_queue_v1', requisitionQueue);
    }, [requisitionQueue, hydrated]);

    useEffect(() => {
        if (hydrated) safeSetItem('school_requisition_draft_v1', requisitionDraft);
    }, [requisitionDraft, hydrated]);

    useEffect(() => {
        safeSetItem('school_payment_integrations_v1', paymentIntegrations);
    }, [paymentIntegrations, hydrated]);

    useEffect(() => {
        safeSetItem('school_manual_payment_methods_v1', manualPaymentMethods);
    }, [manualPaymentMethods, hydrated]);

    useEffect(() => {
        safeSetItem('school_student_page_summaries_v1', studentPageSummaries);
    }, [studentPageSummaries, hydrated]);

    useEffect(() => {
        safeSetItem('school_admission_form_data_v1', admissionFormData);
    }, [admissionFormData, hydrated]);

    // --- DEVELOPER / ADMIN PORTAL STATE ---
    const [landingPageContent, setLandingPageContent] = useState<LandingPageRoleContent[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('app_landing_content_v1');
            return saved ? JSON.parse(saved) : INITIAL_LANDING_CONTENT;
        }
        return INITIAL_LANDING_CONTENT;
    });

    const [developerSettings, setDeveloperSettings] = useState<DeveloperSettings>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('app_developer_settings_v1');
            return saved ? JSON.parse(saved) : INITIAL_DEVELOPER_SETTINGS;
        }
        return INITIAL_DEVELOPER_SETTINGS;
    });

    const [featuredSchools, setFeaturedSchools] = useState<FeaturedSchool[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('app_featured_schools_v1');
            return saved ? JSON.parse(saved) : INITIAL_FEATURED_SCHOOLS;
        }
        return INITIAL_FEATURED_SCHOOLS;
    });

    useEffect(() => {
        safeSetItem('app_landing_content_v1', landingPageContent);
        safeSetItem('app_developer_settings_v1', developerSettings);
        safeSetItem('app_featured_schools_v1', featuredSchools);
    }, [landingPageContent, developerSettings, featuredSchools, hydrated]);

    const updateLandingPageContent = (content: LandingPageRoleContent[]) => setLandingPageContent(content);
    const updateDeveloperSettings = (settings: DeveloperSettings) => setDeveloperSettings(settings);
    const updateFeaturedSchools = (schools: FeaturedSchool[]) => setFeaturedSchools(schools);

    const [schoolApplications, setSchoolApplications] = useState<SchoolApplication[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('app_school_applications_v1');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });

    useEffect(() => {
        safeSetItem('app_school_applications_v1', schoolApplications);
    }, [schoolApplications, hydrated]);

    // Cross-Tab Synchronization
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'app_school_applications_v1' && e.newValue) {
                try {
                    const newData = JSON.parse(e.newValue);
                    setSchoolApplications(newData);
                } catch (err) {
                    console.error("Failed to sync applications across tabs", err);
                }
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const addSchoolApplication = (app: Omit<SchoolApplication, 'id' | 'status' | 'submittedAt'>) => {
        const newApp: SchoolApplication = {
            ...app,
            id: crypto.randomUUID(),
            status: 'pending',
            submittedAt: new Date().toISOString()
        };
        setSchoolApplications(prev => [newApp, ...prev]);
    };

    const updateSchoolApplicationStatus = (id: string, status: SchoolApplication['status']) => {
        setSchoolApplications(prev => prev.map(app => app.id === id ? { ...app, status } : app));
    };

    const [postHistory, setPostHistory] = useState<PostHistoryItem[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_post_history_v1');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });

    useEffect(() => {
        safeSetItem('school_post_history_v1', postHistory);
    }, [postHistory, hydrated]);

    const addPostHistory = (item: PostHistoryItem) => {
        setPostHistory(prev => [item, ...prev]);
    };

    const deletePostHistory = (id: string) => {
        setPostHistory(prev => prev.filter(i => i.id !== id));
    };



    useEffect(() => {
        safeSetItem('school_bursaries_v1', bursaries);
    }, [bursaries, hydrated]);

    useEffect(() => {
        if (hydrated) safeSetItem('school_tutor_contents_v1', tutorContents);
    }, [tutorContents, hydrated]);

    useEffect(() => {
        safeSetItem('school_tutor_settings_v1', tutorSettings);
    }, [tutorSettings, hydrated]);

    useEffect(() => {
        safeSetItem('school_requisition_draft_v1', requisitionDraft);
    }, [requisitionDraft, hydrated]);



    const addProgramme = (p: Programme) => {
        const origin = (activeRole === 'Registrar' || activeRole === 'School News Coordinator') ? 'registrar' : 'bursar';
        setProgrammes(prev => [...prev, { ...p, origin }]);
    };
    const updateProgramme = (p: Programme) => setProgrammes(prev => prev.map(prog => prog.id === p.id ? p : prog));
    const deleteProgramme = (id: string) => {
        setProgrammes(prev => prev.filter(p => p.id !== id));
        // Cleanup Logic: loop through tutors and remove programme ID
        setTutors(prev => prev.map(tutor => ({
            ...tutor,
            programmeIds: (tutor.programmeIds || []).filter(pid => pid !== id)
        })));
    };

    const updateStudent = (s: EnrolledStudent) => setStudents(prev => prev.map(st => st.id === s.id ? s : st));

    const batchUpdateStudents = (updatedStudents: EnrolledStudent[], logAction?: string, logDetails?: string) => {
        if (updatedStudents.length === 0) return;

        const updatesMap = new Map<number, EnrolledStudent>();
        updatedStudents.forEach(s => updatesMap.set(s.id, s));

        setStudents(prev => prev.map(s => {
            if (updatesMap.has(s.id)) {
                return updatesMap.get(s.id)!;
            }
            return s;
        }));

        if (logAction) {
            logGlobalAction(logAction, logDetails || `Batch update of ${updatedStudents.length} students`);
        }
    };

    const batchUpdateData = (updates: {
        students?: EnrolledStudent[],
        billings?: Billing[],
        payments?: Payment[],
        logAction?: string,
        logDetails?: string
    }) => {
        const { students: uStudents = [], billings: uBillings = [], payments: uPayments = [], logAction, logDetails } = updates;

        if (uStudents.length > 0) {
            const studentMap = new Map(uStudents.map(s => [s.id, s]));
            setStudents(prev => prev.map(s => studentMap.get(s.id) || s));
        }

        if (uBillings.length > 0) {
            const billingMap = new Map(uBillings.map(b => [b.id, b]));
            setBillings(prev => {
                const existingIds = new Set(prev.map(b => b.id));
                const newOnly = uBillings.filter(b => !existingIds.has(b.id));
                const updated = prev.map(b => billingMap.get(b.id) || b);
                return [...updated, ...newOnly];
            });
        }

        if (uPayments.length > 0) {
            const paymentMap = new Map(uPayments.map(p => [p.id, p]));
            setPayments(prev => {
                const existingIds = new Set(prev.map(p => p.id));
                const newOnly = uPayments.filter(p => !existingIds.has(p.id));
                const updated = prev.map(p => paymentMap.get(p.id) || p);
                return [...updated, ...newOnly];
            });
        }

        if (logAction) {
            logGlobalAction(logAction, logDetails || "Atomic data refresh");
        }
    };

    const updateTemplate = (t: DocumentTemplate) => {
        setDocumentTemplates(prev => {
            const exists = prev.find(p => p.id === t.id);
            if (exists) return prev.map(p => p.id === t.id ? t : p);
            return [...prev, t];
        });
    };
    const deleteTemplate = (id: string) => setDocumentTemplates(prev => prev.filter(t => t.id !== id));


    useEffect(() => {
        if (hydrated) safeSetItem('school_promotion_batches_v1', promotionBatches);
    }, [promotionBatches, hydrated]);

    const addPromotionBatch = (b: PromotionBatch) => setPromotionBatches(prev => [...prev, b]);
    const updatePromotionBatch = (b: PromotionBatch) => setPromotionBatches(prev => prev.map(old => old.id === b.id ? b : old));
    const deletePromotionBatch = (id: string) => setPromotionBatches(prev => prev.filter(b => b.id !== id));


    const addBilling = (b: Billing) => {
        setBillings(prev => [...prev, b]);
        setStudents(prev => prev.map(s => {
            if (s.id === b.studentId) {
                return { ...s, totalFees: s.totalFees + b.amount, balance: s.balance + b.amount };
            }
            return s;
        }));
    };

    const updateBilling = (b: Billing) => setBillings(prev => prev.map(old => old.id === b.id ? b : old));

    const deleteBilling = (id: string, reason: string = 'Moved to Trash') => {
        const bill = billings.find(b => b.id === id);
        if (!bill) return;

        // 1. Move to Trash (Soft Delete)
        const deletedBill = {
            ...bill,
            status: 'Void' as TransactionStatus,
            history: [...bill.history, {
                id: crypto.randomUUID(),
                action: 'Deleted',
                details: reason,
                user: 'Bursar',
                timestamp: new Date().toISOString()
            }]
        };
        // Append to deletedBillings (Newest Deleted at End -> Sorted to Top by View)
        setDeletedBillings(prev => [...prev, deletedBill]);

        // 2. Remove from Active Billings
        setBillings(prev => prev.filter(b => b.id !== id));

        // 3. Revert Student Balance (Crucial Fix)
        setStudents(prev => prev.map(s => {
            if (s.id === bill.studentId) {
                return {
                    ...s,
                    totalFees: s.totalFees - bill.amount,
                    balance: s.balance - bill.amount
                };
            }
            return s;
        }));

        logGlobalAction('Billing Deleted', `Deleted billing "${bill.description}" for student ID ${bill.studentId}. Reason: ${reason}`);
    };

    const addPayment = (p: Payment) => {
        setPayments(prev => [...prev, p]);
        setStudents(prev => prev.map(s => {
            if (s.id === p.studentId) {
                return { ...s, balance: s.balance - p.amount };
            }
            return s;
        }));
    };

    const updatePayment = (p: Payment) => setPayments(prev => prev.map(old => old.id === p.id ? p : old));

    const deletePayment = (id: string, reason: string) => {
        const payment = payments.find(p => p.id === id);
        if (!payment) return;

        // 1. Soft Delete - Move to Trash
        const deletedPayment: Payment = {
            ...payment,
            status: 'rejected', // Mark as rejected/void
            history: [...(payment.history || []), {
                id: crypto.randomUUID(),
                action: 'Deleted',
                details: reason,
                user: 'Bursar', // Should be dynamic
                timestamp: new Date().toISOString()
            }]
        };
        // Add custom field for convenience if not in type (We will rely on history for reason)
        // Or better yet, we can attach the reason property if we cast or if we add it to the type.
        // For safely, relying on history is best, but for the UI table 'deleteReason' field
        // I'll augment it in the view or here if I can.
        // To match what I did in the mock, I will try to add it.
        (deletedPayment as any).deleteReason = reason;

        setDeletedPayments(prev => [deletedPayment, ...prev]);

        // 2. Remove from Active
        setPayments(prev => prev.filter(p => p.id !== id));

        // 3. Reverse Balance
        setStudents(prev => prev.map(s => {
            if (s.id === payment.studentId) {
                return { ...s, balance: s.balance + payment.amount };
            }
            return s;
        }));

        logGlobalAction('Payment Deleted', `Deleted payment "${payment.description}" (Amount: ${payment.amount}) for student ID ${payment.studentId}. Reason: ${reason}`);
    };

    const restoreBilling = (id: string) => {
        const bill = deletedBillings.find(b => b.id === id);
        if (!bill) return;

        // 1. Move back to Active Billings
        setBillings(prev => [...prev, { ...bill, status: 'Pending' }]); // Restore as Pending
        setDeletedBillings(prev => prev.filter(b => b.id !== id));

        // 2. Re-apply Student Balance
        setStudents(prev => prev.map(s => {
            if (s.id === bill.studentId) {
                return {
                    ...s,
                    totalFees: s.totalFees + bill.amount,
                    balance: (s.balance || 0) + bill.amount
                };
            }
            return s;
        }));

        logGlobalAction('Billing Restored', `Restored billing "${bill.description}" for student ID ${bill.studentId}.`);
    };

    const restorePayment = (id: string) => {
        const payment = deletedPayments.find(p => p.id === id);
        if (!payment) return;

        // 1. Move back to Active Payments
        setPayments(prev => [{ ...payment, status: 'approved' }, ...prev]);
        setDeletedPayments(prev => prev.filter(p => p.id !== id));

        // 2. Re-apply Student Balance
        setStudents(prev => prev.map(s => {
            if (s.id === payment.studentId) {
                return {
                    ...s,
                    balance: (s.balance || 0) - payment.amount
                };
            }
            return s;
        }));

        logGlobalAction('Payment Restored', `Restored payment for student ID ${payment.studentId}.`);
    };

    const deleteStudent = (studentId: number) => deleteStudents([studentId]);

    const deleteStudents = (studentIds: number[]) => {
        if (studentIds.length === 0) return;

        // 1. COLLECT PAYMENT ACTIONS (Batch)
        const paymentIdsToRemove = new Set<string>();
        const newUnclaimed: Payment[] = [];
        const newDeletedPayments: Payment[] = [];

        // Iterate updates
        payments.forEach(p => {
            if (studentIds.includes(p.studentId)) {
                paymentIdsToRemove.add(p.id);

                const methodLower = (p.method || '').toLowerCase().replace(/\s/g, '');
                const isDigital = ['schoolpay', 'pegpay'].includes(methodLower) || methodLower.includes('schoolpay') || methodLower.includes('pegpay');

                if (isDigital) {
                    // MOVE TO UNCLAIMED
                    newUnclaimed.push({
                        ...p,
                        studentId: 0, // Detach
                        billingId: undefined, // Detach billing
                        description: `Unclaimed: ${p.description} (Was linked to deleted student ${p.studentId})`,
                        term: undefined
                    });
                } else {
                    // MOVE TO TRASH
                    newDeletedPayments.push({
                        ...p,
                        status: 'rejected',
                        history: [...(p.history || []), {
                            id: crypto.randomUUID(),
                            action: 'Deleted',
                            details: "Student Account Deleted (Batch)",
                            user: 'Bursar',
                            timestamp: new Date().toISOString()
                        }]
                    });
                }
            }
        });

        // 2. COLLECT BILLING ACTIONS (Batch)
        const billingIdsToRemove = new Set<string>();
        const newDeletedBillings: Billing[] = [];

        billings.forEach(b => {
            if (studentIds.includes(b.studentId)) {
                billingIdsToRemove.add(b.id);
                newDeletedBillings.push({
                    ...b,
                    status: 'Void', // Mark void
                    history: [...(b.history || []), {
                        id: crypto.randomUUID(),
                        action: 'Deleted',
                        details: "Student Account Deleted (Batch)",
                        user: 'Bursar',
                        timestamp: new Date().toISOString()
                    }]
                });
            }
        });

        // 3. APPLY UPDATES (Batch)
        // Payments
        if (newUnclaimed.length > 0) setUnclaimedPayments(prev => [...newUnclaimed, ...prev]);
        if (newDeletedPayments.length > 0) setDeletedPayments(prev => [...newDeletedPayments, ...prev]);
        if (paymentIdsToRemove.size > 0) setPayments(prev => prev.filter(p => !paymentIdsToRemove.has(p.id)));

        // Billings
        if (newDeletedBillings.length > 0) setDeletedBillings(prev => [...newDeletedBillings, ...prev]);
        if (billingIdsToRemove.size > 0) setBillings(prev => prev.filter(b => !billingIdsToRemove.has(b.id)));

        // Students
        setStudents(prev => prev.filter(s => !studentIds.includes(s.id)));
        setRegistrarStudents(prev => prev.filter(s => !studentIds.includes(Number(s.schoolPayCode || s.id)))); // Cast safely

        logGlobalAction('Students Deleted (Batch)', `Deleted ${studentIds.length} students. IDs: ${studentIds.join(', ')}`);
    };

    const syncRequirementToInventory = (studentId: number, reqName: string, changeAmount: number) => {
        const student = students.find(s => s.id === studentId);
        if (!student) return;

        // Find the 'Requirements' list and its primary group
        const reqList = inventoryLists.find(l => l.name === 'Requirements');
        if (!reqList) return;

        const reqItems = inventoryItems.filter(i => i.name === reqName);
        // Find item that belongs to a group in this list
        const item = reqItems.find(i => inventoryGroups.some(g => g.id === i.groupId && g.listId === reqList.id));

        if (item) {
            const newQty = item.quantity + changeAmount;
            const updatedItem = {
                ...item,
                quantity: newQty,
                lastUpdated: getSyncedDate().toISOString()
            };
            updateInventoryItem(updatedItem);

            addInventoryLog({
                id: crypto.randomUUID(),
                itemId: item.id,
                itemName: item.name,
                action: changeAmount >= 0 ? 'add' : 'reduce',
                quantityChange: Math.abs(changeAmount),
                newQuantity: newQty,
                comment: `Sync from ${student.name} requirement submission`,
                date: getSyncedDate().toISOString(),
                user: activeRole || 'System'
            });
        }
    };

    // --- AUTOMATIC BILLING GENERATION ---
    const generateAutomaticBillings = (student: EnrolledStudent) => {
        // Find the student's programme
        const programme = programmes.find(p => p.name === student.programme || p.id === student.programme);
        if (!programme || !programme.feeStructure || programme.feeStructure.length === 0) {
            console.warn(`No fee structure found for programme: ${student.programme}`);
            return;
        }

        // Find the fee configuration for the student's level
        const levelConfig = programme.feeStructure.find(fs => fs.level === student.level);
        if (!levelConfig) {
            console.warn(`No fee configuration found for level: ${student.level} in programme: ${student.programme}`);
            return;
        }

        // Check if billings already exist for this student and semester (duplicate prevention)
        const existingBillings = billings.filter(
            b => b.studentId === student.id && b.term === student.semester
        );

        if (existingBillings.length > 0) {
            console.log(`Billings already exist for student ${student.name} in ${student.semester}. Skipping automatic generation.`);
            return;
        }

        const newBillings: Billing[] = [];
        const currentDate = new Date().toISOString();

        // 1. Generate Tuition Billing
        if (levelConfig.tuitionFee && levelConfig.tuitionFee > 0) {
            const tuitionBilling: Billing = {
                id: crypto.randomUUID(),
                studentId: student.id,
                programmeId: programme.id,
                level: student.level,
                term: student.semester,
                type: 'Tuition',
                description: `Tuition Fee - ${student.level}, ${student.semester}`,
                amount: levelConfig.tuitionFee,
                paidAmount: 0,
                balance: levelConfig.tuitionFee,
                date: currentDate,
                status: 'Pending',
                history: [{
                    id: crypto.randomUUID(),
                    action: 'Created',
                    details: 'Automatic billing generated upon enrollment',
                    user: 'System',
                    timestamp: currentDate
                }],
                metadata: { serviceId: 'tuition' }
            };
            newBillings.push(tuitionBilling);
        }

        // 2. Generate Service Billings (only for services the student is enrolled in)
        if (student.services && student.services.length > 0) {
            student.services.forEach(serviceId => {
                const service = services.find(s => s.id === serviceId);
                if (!service) {
                    console.warn(`Service not found: ${serviceId}`);
                    return;
                }

                const serviceBilling: Billing = {
                    id: crypto.randomUUID(),
                    studentId: student.id,
                    programmeId: programme.id,
                    level: student.level,
                    term: student.semester,
                    type: 'Service',
                    description: `${service.name} - ${student.semester}`,
                    amount: (student.serviceMetadata?.[serviceId]?.quantity || 1) * service.cost,
                    paidAmount: 0,
                    balance: (student.serviceMetadata?.[serviceId]?.quantity || 1) * service.cost,
                    date: currentDate,
                    status: 'Pending',
                    history: [{
                        id: crypto.randomUUID(),
                        action: 'Created',
                        details: 'Automatic service billing generated',
                        user: 'System',
                        timestamp: currentDate
                    }],
                    metadata: { serviceId }
                };
                newBillings.push(serviceBilling);
            });
        }

        // 3. Add all billings to state
        if (newBillings.length > 0) {
            setBillings(prev => [...prev, ...newBillings]);

            // 4. Update student's totalFees and balance
            const totalAmount = newBillings.reduce((sum, b) => sum + b.amount, 0);
            setStudents(prev => prev.map(s => {
                if (s.id === student.id) {
                    return {
                        ...s,
                        totalFees: s.totalFees + totalAmount,
                        balance: s.balance + totalAmount
                    };
                }
                return s;
            }));

            console.log(`Generated ${newBillings.length} automatic billings for ${student.name} totaling UGX ${totalAmount.toLocaleString()}`);
        }
    };


    const [financialSettings, setFinancialSettings] = useState<FinancialSettings>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_financial_settings');
            return saved ? JSON.parse(saved) : INITIAL_FINANCIAL_SETTINGS;
        }
        return INITIAL_FINANCIAL_SETTINGS;
    });

    useEffect(() => {
        safeSetItem('school_financial_settings', financialSettings);
    }, [financialSettings, hydrated]);

    const updateFinancialSettings = (s: FinancialSettings) => setFinancialSettings(s);

    const updateSchoolProfile = (profile: SchoolProfile) => {
        setSchoolProfile(profile);
    };

    const addNews = (item: NewsItem) => setNews(prev => [item, ...prev]);
    const updateNews = (item: NewsItem) => setNews(prev => prev.map(n => n.id === item.id ? item : n));
    const deleteNews = (id: string) => setNews(prev => prev.filter(n => n.id !== id));

    const addRegistrarStudent = (s: RegistrarStudent) => {
        const origin = (activeRole === 'Registrar' || activeRole === 'School News Coordinator') ? 'registrar' : 'bursar';
        setRegistrarStudents(prev => [{ ...s, origin }, ...prev]);
    };
    const updateRegistrarStudent = (s: RegistrarStudent) => setRegistrarStudents(prev => prev.map(old => old.id === s.id ? s : old));
    const deleteRegistrarStudent = (id: string) => setRegistrarStudents(prev => prev.filter(s => s.id !== id));

    // Tutor Actions
    const addTutor = (tutor: Tutor) => setTutors(prev => [...prev, tutor]);
    const updateTutor = (updatedTutor: Tutor) => setTutors(prev => prev.map(t => t.id === updatedTutor.id ? updatedTutor : t));
    const deleteTutor = (id: string) => {
        setTutors(prev => prev.filter(t => t.id !== id));
        // Reassign orphaned content to 'system' to preserve resources
        setTutorContents(prev => prev.map(c => c.tutorId === id ? { ...c, tutorId: 'system' } : c));
    };

    const addStudent = (s: EnrolledStudent) => {
        const origin = (activeRole === 'Registrar' || activeRole === 'School News Coordinator') ? 'registrar' : 'bursar';
        setStudents(prev => [...prev, { ...s, origin }]);
    };
    const addStaffAccount = (s: StaffAccount) => setStaffAccounts(prev => [...prev, s]);

    // TUTOR CONTENT ACTIONS


    const addTutorContent = (content: TutorContent) => {
        setTutorContents(prev => [...prev, content]);
    };

    const deleteTutorContent = (id: string) => {
        const content = tutorContents.find(c => c.id === id);
        if (!content) return;

        // Ownership Enforcement
        const canDelete = developerProfile || (tutorProfile && content.tutorId === tutorProfile.id);
        if (!canDelete) {
            console.error("Permission denied: You can only delete your own content.");
            return;
        }

        setTutorContents(prev => prev.filter(c => c.id !== id));
    };

    const updateTutorContent = (content: TutorContent) => {
        const existing = tutorContents.find(c => c.id === content.id);
        if (!existing) return;

        // Ownership Enforcement
        const canUpdate = developerProfile || (tutorProfile && existing.tutorId === tutorProfile.id);
        if (!canUpdate) {
            console.error("Permission denied: You can only update your own content.");
            return;
        }

        setTutorContents(prev => prev.map(c => c.id === content.id ? content : c));
    };

    const updateTutorSettings = (settings: TutorSettings) => {
        setTutorSettings(prev => {
            const exists = prev.find(s => s.tutorId === settings.tutorId);
            if (exists) return prev.map(s => s.tutorId === settings.tutorId ? settings : s);
            return [...prev, settings];
        });
    };

    const updateSuggestionStatus = (id: string, status: Suggestion['status']) => {
        setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    };

    // RESULTS ACTIONS
    const addCourseUnit = (cu: CourseUnit) => setCourseUnits([...courseUnits, cu]);
    const updateCourseUnit = (cu: CourseUnit) => setCourseUnits(courseUnits.map(c => c.id === cu.id ? cu : c));
    const deleteCourseUnit = (id: string) => setCourseUnits(courseUnits.filter(c => c.id !== id));

    const addResultPageConfig = (config: ResultPageConfig) => setResultPageConfigs([...resultPageConfigs, config]);
    const updateResultPageConfig = (config: ResultPageConfig) => setResultPageConfigs(resultPageConfigs.map(c => c.id === config.id ? config : c));
    const deleteResultPageConfig = (id: string) => setResultPageConfigs(resultPageConfigs.filter(c => c.id !== id));

    const deleteStudentResult = (studentId: number, courseUnitId: string, pageConfigId?: string) => {
        setStudentResults(prev => prev.filter(r =>
            !(r.studentId === studentId && r.courseUnitId === courseUnitId && (pageConfigId ? r.pageConfigId === pageConfigId : true))
        ));
    };

    const saveStudentResult = (result: StudentResult) => {
        // Robust Save: Remove any conflicting records first, then add the new one.
        setStudentResults(prev => {
            // Remove duplicates for this student/course unit AND pageConfigId (if present)
            const clean = prev.filter(r => {
                const sameStudent = r.studentId === result.studentId;
                const sameCU = r.courseUnitId === result.courseUnitId;

                if (!sameStudent || !sameCU) return true; // Keep unrelated records

                // If existing record has pageConfigId, and new one does too, check equality
                if (result.pageConfigId && r.pageConfigId) {
                    return r.pageConfigId !== result.pageConfigId;
                }

                // If one has pageConfigId and other doesn't, treat as different?
                // Legacy support: If existing has NO pageConfigId, it was "global".
                // If we are saving a "scoped" result, we might want to keep the global one?
                // Or migrate? Let's treat scoped vs unscoped as different keys.
                if (!!result.pageConfigId !== !!r.pageConfigId) return true;

                // If neither has ID, valid collision.
                return false;
            });
            return [...clean, result];
        });
    };

    const saveStudentPageSummary = (summary: StudentPageSummary) => {
        const existingIndex = studentPageSummaries.findIndex(s =>
            s.studentId === summary.studentId && s.pageConfigId === summary.pageConfigId

        );

        if (existingIndex >= 0) {
            const updated = [...studentPageSummaries];
            updated[existingIndex] = { ...summary, id: updated[existingIndex].id }; // Keep existing ID
            setStudentPageSummaries(updated);
        } else {
            setStudentPageSummaries([...studentPageSummaries, summary]);
        }
    };

    // --- REQUISITION ACTIONS ---

    const addRequisition = (req: Requisition) => {
        // Generate Human Readable ID if not present
        const nextId = `REQ-${(requisitions.length + 1).toString().padStart(3, '0')}`;
        const newReq = { ...req, readableId: nextId };
        setRequisitions(prev => [newReq, ...prev]);
    };

    const updateRequisition = (updatedReq: Requisition) => {
        setRequisitions(prev => prev.map(r => r.id === updatedReq.id ? updatedReq : r));
    };

    const setRequisitionDraft = (draft: Partial<Requisition> | ((prev: Requisition) => Requisition)) => {
        if (typeof draft === 'function') {
            setRequisitionDraftState(draft);
        } else {
            setRequisitionDraftState(prev => ({ ...prev, ...draft }));
        }
    };

    const resetRequisitionDraft = () => setRequisitionDraftState(INITIAL_REQUISITION_DRAFT);

    const deleteRequisition = (id: string) => {
        setRequisitions(prev => prev.filter(r => r.id !== id));
    };

    // --- BUDGET SETTINGS ---
    const [budgetPeriods, setBudgetPeriods] = useState<BudgetPeriod[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_budget_periods_v1');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });

    useEffect(() => {
        safeSetItem('school_budget_periods_v1', budgetPeriods);
    }, [budgetPeriods, hydrated]);

    const addToQueue = (item: InQueueItem) => {
        setRequisitionQueue(prev => [item, ...prev]);
    };

    const removeFromQueue = (id: string) => {
        setRequisitionQueue(prev => prev.filter(i => i.id !== id));
    };

    const clearQueue = () => {
        setRequisitionQueue([]);
    };

    // --- ACCOUNTS ---
    const [accounts, setAccounts] = useState<BankAccount[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_accounts_v1');
            return saved ? JSON.parse(saved) : [
                { id: '1', name: 'Cash', group: 'Cash', type: 'Asset', currency: 'USh', balance: 5432.00 },
                { id: '2', name: 'Petty Cash', group: 'Cash', type: 'Asset', currency: 'USh', balance: 10000.00 },
                { id: '3', name: 'Centenary Bank', group: 'Bank Accounts', type: 'Asset', currency: 'USh', balance: 0.00 },
                { id: '4', name: 'Equity Bank', group: 'Bank Accounts', type: 'Asset', currency: 'USh', balance: 0.00 },
                { id: '5', name: 'Corporate Card', group: 'Card', type: 'Liability', currency: 'USh', balance: 5432.00 },
            ];
        }
        return [];
    });

    useEffect(() => {
        safeSetItem('school_accounts_v1', accounts);
    }, [accounts, hydrated]);

    const addAccount = (account: Omit<BankAccount, 'id'>) => {
        const newAccount = { ...account, id: Math.random().toString(36).substr(2, 9) };
        setAccounts(prev => [...prev, newAccount]);
    };

    const updateAccount = (updated: BankAccount) => {
        setAccounts(prev => prev.map(a => a.id === updated.id ? updated : a));
    };

    const deleteAccount = (id: string) => {
        setAccounts(prev => prev.filter(a => a.id !== id));
    };

    // --- ACCOUNT GROUPS ---
    const [accountGroups, setAccountGroups] = useState<string[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_account_groups_v1');
            return saved ? JSON.parse(saved) : ['Cash', 'Bank Accounts', 'Accounts', 'Card'];
        }
        return ['Cash', 'Bank Accounts', 'Accounts', 'Card'];
    });

    useEffect(() => {
        safeSetItem('school_account_groups_v1', accountGroups);
    }, [accountGroups, hydrated]);

    const addAccountGroup = (group: string) => {
        if (!accountGroups.includes(group)) {
            setAccountGroups(prev => [...prev, group]);
        }
    };

    const deleteAccountGroup = (group: string) => {
        setAccountGroups(prev => prev.filter(g => g !== group));
    };


    const approveRequisition = (id: string) => {
        const req = requisitions.find(r => r.id === id);
        if (!req || req.status === 'Approved') return;

        // 1. Update Status
        const approvedReq: Requisition = {
            ...req,
            status: 'Approved',
            queueSnapshot: [...requisitionQueue]
        };
        updateRequisition(approvedReq);

        // 2. Create Expenses & Calculate Total
        let totalDeduction = 0;
        const newTransactions: GeneralTransaction[] = req.items.map(item => {
            const amount = Number(item.amount);
            totalDeduction += amount;
            return {
                id: crypto.randomUUID(),
                date: req.date,
                amount: amount,
                type: 'Expense',
                category: item.category,
                method: req.account as any,
                mode: req.account as any,
                recordedBy: 'Director',
                description: item.name,
                requisitionId: req.readableId,
                longDescription: `Requisition: ${req.title} (${req.readableId})`
            };
        });

        setGeneralTransactions(prev => [...newTransactions, ...prev]);

        // 3. Deduct from Account
        setAccounts(prev => prev.map(acc => {
            if (acc.name === req.account) {
                return { ...acc, balance: acc.balance - totalDeduction };
            }
            return acc;
        }));
    };

    // NUCLEAR OPTION: Deep Data Repair
    const performDeepRepair = () => {
        if (typeof window === 'undefined') return;

        console.log("STARTING DEEP REPAIR...");
        const backupKey = `backup_${Date.now()}`;
        localStorage.setItem(backupKey + '_results', JSON.stringify(studentResults));
        localStorage.setItem(backupKey + '_configs', JSON.stringify(resultPageConfigs));
        localStorage.setItem(backupKey + '_cus', JSON.stringify(courseUnits));

        // 1. DEDUPLICATE COURSE UNITS
        // Group by Code + Prog + Level
        const cuMap = new Map<string, CourseUnit>(); // Key "CODE-PROG-LEVEL" -> Master CU
        const cuReplacementMap = new Map<string, string>(); // OldID -> NewID

        const cleanCUs: CourseUnit[] = [];

        courseUnits.forEach(cu => {
            const key = `${cu.code.trim().toUpperCase()}-${cu.programmeId}-${cu.level}`;
            if (cuMap.has(key)) {
                // Duplicate found
                const master = cuMap.get(key)!;
                cuReplacementMap.set(cu.id, master.id);
            } else {
                // New Unique Found
                cuMap.set(key, cu);
                cleanCUs.push(cu);
            }
        });

        console.log(`Consolidated CUs: ${courseUnits.length} -> ${cleanCUs.length}`);
        setCourseUnits(cleanCUs);

        // 2. REMAP RESULTS (MARKS)
        const cleanResults = studentResults.map(res => {
            const newCuId = cuReplacementMap.get(res.courseUnitId);
            if (newCuId) {
                return { ...res, courseUnitId: newCuId };
            }
            return res;
        });
        // Deduplicate Results (if merging caused double entries for same student+cu)
        const uniqueResultsMap = new Map<string, StudentResult>();
        cleanResults.forEach(r => {
            const key = `${r.studentId}-${r.courseUnitId}`;
            // If duplicate, overwrite (assuming latest is best, or keep first? latest at end of array usually)
            uniqueResultsMap.set(key, r);
        });
        const finalResults = Array.from(uniqueResultsMap.values());
        console.log(`Consolidated Results: ${studentResults.length} -> ${finalResults.length}`);
        setStudentResults(finalResults);

        // 3. DEDUPLICATE PAGE CONFIGS (FROM RAW STORAGE)
        // We must read RAW storage because 'resultPageConfigs' state might have already hidden the duplicates via the useState initializer
        const rawConfigsJson = localStorage.getItem('school_result_page_configs_v1');
        const allConfigs: ResultPageConfig[] = rawConfigsJson ? JSON.parse(rawConfigsJson) : resultPageConfigs;

        const configMap = new Map<string, ResultPageConfig>();
        const configReplacementMap = new Map<string, string>();
        const cleanConfigs: ResultPageConfig[] = [];

        allConfigs.forEach(conf => {
            const key = `${conf.programmeId}-${conf.level}-${conf.name.trim()}`;
            if (configMap.has(key)) {
                const master = configMap.get(key)!;
                configReplacementMap.set(conf.id, master.id);
            } else {
                configMap.set(key, conf);
                cleanConfigs.push(conf);
            }
        });

        // Remap CUs inside Configs
        const finalConfigs = cleanConfigs.map(conf => {
            const newIds = conf.courseUnitIds.map(oldId => cuReplacementMap.get(oldId) || oldId);
            const uniqueIds = Array.from(new Set(newIds)); // Dedupe
            return { ...conf, courseUnitIds: uniqueIds };
        });

        console.log(`Consolidated Configs (Raw): ${allConfigs.length} -> ${finalConfigs.length}`);
        setResultPageConfigs(finalConfigs);

        // 4. REMAP SUMMARIES
        // We also need to be careful about "studentPageSummaries" state vs raw?
        // State should be fine as it doesn't auto-dedupe on init.
        const finalSummaries = studentPageSummaries.map(s => {
            const newConfigId = configReplacementMap.get(s.pageConfigId);
            if (newConfigId) {
                // Determine if we should merge?
                // If a summary already exists for (student + masterConfig), we technically have a collision.
                // We should probably keep the one with a value?
                // Let's just use the last one mapped (usually latest).
                return { ...s, pageConfigId: newConfigId };
            }
            return s;
        });

        // Dedupe Summaries (Resolve Collisions)
        // If we have two summaries for same student+config, pick the one with a higher score or latest update?
        // Let's just use the last one mapped (usually latest).
        const uniqueSummariesMap = new Map<string, StudentPageSummary>();
        finalSummaries.forEach(s => {
            const key = `${s.studentId}-${s.pageConfigId}`;
            if (uniqueSummariesMap.has(key)) {
                const existing = uniqueSummariesMap.get(key)!;
                // Optimization: Update if new one has score and existing doesn't, or simply overwrite.
                // overwriting is simplest.
            }
            uniqueSummariesMap.set(key, s);
        });
        setStudentPageSummaries(Array.from(uniqueSummariesMap.values()));

        alert(`Repair Config V2 Complete.\n\nRecovered from ${allConfigs.length} raw entries.\nPage will reload.`);
        window.location.reload();
    };

    const updateInventoryItem = (item: InventoryItem) => {
        setInventoryItems(prev => prev.map(i => i.id === item.id ? item : i));
    };

    const deleteInventoryItem = (id: string) => {
        setInventoryItems(prev => prev.filter(i => i.id !== id));
        // Remove logs? Keep for history.
    };

    const updateInventorySettings = (settings: InventorySettings) => {
        setInventorySettings(settings);
    };

    const addInventoryLog = (log: InventoryLog) => {
        setInventoryLogs(prev => [log, ...prev]);
    };

    const updateInventoryLog = (log: InventoryLog) => {
        setInventoryLogs(prev => prev.map(l => l.id === log.id ? log : l));
    };

    const deleteInventoryLog = (id: string) => {
        setInventoryLogs(prev => prev.filter(l => l.id !== id));
    };

    const addInventoryTransfer = (transfer: InventoryTransfer) => {
        setInventoryTransfers(prev => [transfer, ...prev]);
    };

    const updateInventoryTransfer = (transfer: InventoryTransfer) => {
        setInventoryTransfers(prev => prev.map(t => t.id === transfer.id ? transfer : t));
    };

    const addInventoryLocation = (location: string) => {
        if (!inventoryLocations.includes(location)) {
            setInventoryLocations(prev => [...prev, location]);
        }
    };

    const addAdvert = (ad: Advert) => setAdverts(prev => [ad, ...prev]);
    const updateAdvert = (ad: Advert) => setAdverts(prev => prev.map(a => a.id === ad.id ? ad : a));
    const deleteAdvert = (id: string) => setAdverts(prev => prev.filter(a => a.id !== id));

    const filteredRegistrarStudents = useMemo(() => {
        if (isBursarPortal) return registrarStudents.filter(s => s.origin === 'bursar');
        if (isRegistrarPortal) return registrarStudents.filter(s => s.origin === 'registrar' || !s.origin);
        return registrarStudents;
    }, [registrarStudents, isBursarPortal, isRegistrarPortal]);

    const filteredStudents = useMemo(() => {
        if (isBursarPortal) return students.filter(s => s.origin === 'bursar' || !s.origin);
        if (isRegistrarPortal) return students; // Bug Fix: Registrar sees all students in Enrollments
        return students;
    }, [students, isBursarPortal, isRegistrarPortal]);

    const filteredProgrammes = useMemo(() => {
        if (isBursarPortal) return programmes.filter(p => p.origin === 'bursar' || !p.origin);
        if (isRegistrarPortal) return programmes.filter(p => p.origin === 'registrar' || !p.origin); // Show all programmes including those without origin
        return programmes;
    }, [programmes, isBursarPortal, isRegistrarPortal]);

    const filteredBillings = useMemo(() => {
        if (!isBursarPortal && !isRegistrarPortal) return billings;
        const studentIds = new Set(filteredStudents.map(s => s.id));
        return billings.filter(b => studentIds.has(b.studentId));
    }, [billings, filteredStudents, isBursarPortal, isRegistrarPortal]);

    const filteredPayments = useMemo(() => {
        if (!isBursarPortal && !isRegistrarPortal) return payments;
        const studentIds = new Set(filteredStudents.map(s => s.id));
        return payments.filter(p => studentIds.has(p.studentId));
    }, [payments, filteredStudents, isBursarPortal, isRegistrarPortal]);

    const filteredDeletedBillings = useMemo(() => {
        if (!isBursarPortal && !isRegistrarPortal) return deletedBillings;
        const studentIds = new Set(filteredStudents.map(s => s.id));
        return deletedBillings.filter(b => studentIds.has(b.studentId));
    }, [deletedBillings, filteredStudents, isBursarPortal, isRegistrarPortal]);

    const filteredDeletedPayments = useMemo(() => {
        if (!isBursarPortal && !isRegistrarPortal) return deletedPayments;
        const studentIds = new Set(filteredStudents.map(s => s.id));
        return deletedPayments.filter(p => studentIds.has(p.studentId));
    }, [deletedPayments, filteredStudents, isBursarPortal, isRegistrarPortal]);

    const filteredUnclaimedPayments = useMemo(() => {
        if (!isBursarPortal && !isRegistrarPortal) return unclaimedPayments;
        if (isRegistrarPortal) return [];
        return unclaimedPayments;
    }, [unclaimedPayments, isBursarPortal, isRegistrarPortal]);

    const calculateStudentInitialFinancials = (programmeId: string, level: string) => {
        const prog = programmes.find(p => p.id === programmeId || p.name === programmeId);
        const feeStruct = prog?.feeStructure?.find(fs => fs.level === level) || prog?.feeStructure?.[0];

        const tuition = feeStruct?.tuitionFee || 0;
        let compulsoryTotal = 0;
        if (feeStruct?.compulsoryServices) {
            compulsoryTotal = services
                .filter(srv => feeStruct.compulsoryServices.includes(srv.id))
                .reduce((sum, srv) => sum + srv.cost, 0);
        }

        const physicalRequirements = (feeStruct?.requirements || []).map(r => ({
            name: r.name,
            required: r.quantity,
            brought: 0,
            color: '#3b82f6'
        }));

        const totalFees = tuition + compulsoryTotal;

        return {
            totalFees,
            balance: totalFees,
            physicalRequirements,
            compulsoryServices: feeStruct?.compulsoryServices || []
        };
    };

    const studentRequirements = useMemo(() => {
        const totals: Record<string, number> = {};
        students.forEach(s => {
            s.physicalRequirements?.forEach(r => {
                if (r.brought > 0) {
                    totals[r.name] = (totals[r.name] || 0) + r.brought;
                }
            });
        });
        return totals;
    }, [students]);

    return {
        // Results Exports
        courseUnits, addCourseUnit, updateCourseUnit, deleteCourseUnit,
        resultPageConfigs, addResultPageConfig, updateResultPageConfig, deleteResultPageConfig,
        studentResults, saveStudentResult,
        studentPageSummaries, saveStudentPageSummary,

        requisitions,
        addRequisition,
        updateRequisition,
        deleteRequisition,
        approveRequisition,

        requisitionQueue,
        addToQueue,
        removeFromQueue,
        clearQueue,

        students,
        studentRequirements,
        filteredStudents,

        filteredProgrammes,
        filteredRegistrarStudents,
        services,
        financialSettings,
        updateFinancialSettings,
        schoolProfile,
        activeRole,
        setActiveRole,
        activeAccountId,
        setActiveAccountId,
        updateSchoolProfile,
        bursaries,
        programmes,
        documentTemplates,
        billings,
        filteredBillings,
        payments,
        filteredPayments,
        hydrated,
        addProgramme,
        updateProgramme,
        deleteProgramme,
        updateStudent,
        batchUpdateStudents,
        batchUpdateData,
        isProcessingPromotion,
        setIsProcessingPromotion,
        setStudents, // Exposing raw setter for flexibility in complex pages
        setServices, // Exposing raw setter
        setBursaries, // Exposing raw setter
        postHistory, addPostHistory, deletePostHistory, // New Actions
        updateTemplate,
        addBilling,
        updateBilling,
        deleteBilling,
        restoreBilling,
        addPayment,
        updatePayment,
        deletePayment,
        restorePayment,
        deletedBillings,
        filteredDeletedBillings,
        deletedPayments, // Added this line
        filteredDeletedPayments,
        deleteStudent, // New
        deleteStudents, // New Bulk
        unclaimedPayments, // New
        filteredUnclaimedPayments,
        setUnclaimedPayments, // Helper
        generateAutomaticBillings, // New: Auto-generate billings for students
        news,
        addNews,
        updateNews,
        deleteNews,
        adverts,
        addAdvert,
        updateAdvert,
        deleteAdvert,
        registrarStudents,
        addRegistrarStudent,
        updateRegistrarStudent,
        deleteRegistrarStudent,
        deleteStudentResult,
        performDeepRepair,

        promotionBatches,
        requisitionDraft,
        setRequisitionDraft,
        resetRequisitionDraft,
        addPromotionBatch,
        updatePromotionBatch,
        deletePromotionBatch,

        calendarEvents,
        addCalendarEvent,
        updateCalendarEvent,
        deleteCalendarEvent,

        // Student Portal
        suggestions, addSuggestion, updateSuggestionStatus,
        studentProfile, setStudentProfile, updateStudentProfile, toggleStudentLike,
        toggleTutorSubscription, // Renamed from subscribeToTutor

        // Tutor Portal
        tutorProfile, setTutorProfile,
        developerProfile, setDeveloperProfile,
        safeSetItem,
        tutorContents, setTutorContents,
        // Published content only (filters out drafts for student portal)
        publishedTutorContents: tutorContents.filter(c => c.status !== 'Draft'),

        logout,

        // Accounts
        accounts,
        addAccount,
        updateAccount,
        deleteAccount,

        accountGroups,
        addAccountGroup,
        deleteAccountGroup,

        // Logging
        globalAuditLogs,
        logGlobalAction,

        // Tutors
        tutors,
        addTutor,
        updateTutor,
        deleteTutor,
        tutorSettings,
        tutorSubscriptions,
        generalTransactions,
        budgets, // Added budgets
        addTutorContent,
        deleteTutorContent,
        updateTutorContent,
        updateTutorSettings,

        // Developer / Admin
        landingPageContent,
        updateLandingPageContent,
        developerSettings,
        updateDeveloperSettings,
        featuredSchools,
        updateFeaturedSchools,
        schoolApplications,
        addSchoolApplication,
        updateSchoolApplicationStatus,
        addStudent,
        addStaffAccount,

        // Results
        addGeneralTransaction: (tx: GeneralTransaction) => setGeneralTransactions(prev => [tx, ...prev]),
        updateGeneralTransaction: (tx: GeneralTransaction) => {
            setGeneralTransactions(prev => prev.map(t => t.id === tx.id ? tx : t));
        },
        deleteGeneralTransaction: (id: string) => {
            setGeneralTransactions(prev => prev.filter(t => t.id !== id));
        },
        updateBudget: (budget: Budget) => { // Added updateBudget action
            setBudgets(prev => {
                const existingIndex = prev.findIndex(b => b.id === budget.id);
                if (existingIndex >= 0) {
                    const updated = [...prev];
                    updated[existingIndex] = budget;
                    return updated;
                }
                return [...prev, budget];
            });
        },

        expenseCategories,
        incomeCategories,

        // Specific Actions for Full Object Updates (Fixes Edit Modal & Page Requirements)
        addExpenseCategory: (cat: TransactionCategoryItem) => setExpenseCategories(prev => [...prev, { ...cat, id: cat.id || `exp_${Date.now()}` }]),
        updateExpenseCategory: (cat: TransactionCategoryItem) => setExpenseCategories(prev => prev.map(c => c.id === cat.id ? cat : c)),
        deleteExpenseCategory: (id: string) => setExpenseCategories(prev => prev.filter(c => c.id !== id)),

        addIncomeCategory: (cat: TransactionCategoryItem) => setIncomeCategories(prev => [...prev, { ...cat, id: cat.id || `inc_${Date.now()}` }]),
        updateIncomeCategory: (cat: TransactionCategoryItem) => setIncomeCategories(prev => prev.map(c => c.id === cat.id ? cat : c)),
        deleteIncomeCategory: (id: string) => setIncomeCategories(prev => prev.filter(c => c.id !== id)),

        addCategory: (type: string, name: string) => {
            const newItem = { id: `${type.toLowerCase()}_${Date.now()}`, name, subcategories: [] };
            if (type === 'Expense') setExpenseCategories(prev => [...prev, newItem]);
            else setIncomeCategories(prev => [...prev, newItem]);
        },
        updateCategory: (type: string, id: string, name: string) => {
            // Legacy/Simple update support
            const updater = (prev: TransactionCategoryItem[]) => prev.map(c => c.id === id ? { ...c, name } : c);
            if (type === 'Expense') setExpenseCategories(updater);
            else setIncomeCategories(updater);
        },
        deleteCategory: (type: string, id: string) => {
            const updater = (prev: TransactionCategoryItem[]) => prev.filter(c => c.id !== id);
            if (type === 'Expense') setExpenseCategories(updater);
            else setIncomeCategories(updater);
        },
        addSubcategory: (type: string, catId: string, subName: string) => {
            const updater = (prev: TransactionCategoryItem[]) => prev.map(c => c.id === catId ? { ...c, subcategories: [...(c.subcategories || []), subName] } : c);
            if (type === 'Expense') setExpenseCategories(updater);
            else setIncomeCategories(updater);
        },
        updateSubcategory: (type: string, catId: string, oldSub: string, newSub: string) => {
            const updater = (prev: TransactionCategoryItem[]) => prev.map(c => c.id === catId ? { ...c, subcategories: (c.subcategories || []).map(s => s === oldSub ? newSub : s) } : c);
            if (type === 'Expense') setExpenseCategories(updater);
            else setIncomeCategories(updater);
        },
        deleteSubcategory: (type: string, catId: string, subName: string) => {
            const updater = (prev: TransactionCategoryItem[]) => prev.map(c => c.id === catId ? { ...c, subcategories: (c.subcategories || []).filter(s => s !== subName) } : c);
            if (type === 'Expense') setExpenseCategories(updater);
            else setIncomeCategories(updater);
        },

        // --- BUDGET ACTIONS ---
        budgetPeriods,
        addBudgetPeriod: (period: BudgetPeriod) => setBudgetPeriods(prev => [...prev, period]),
        updateBudgetPeriod: (period: BudgetPeriod) => setBudgetPeriods(prev => prev.map(p => p.id === period.id ? period : p)),
        deleteBudgetPeriod: (id: string) => setBudgetPeriods(prev => prev.filter(p => p.id !== id)),

        transactionSettings,
        updateTransactionSettings: (settings: Partial<TransactionSettings>) => setTransactionSettings(prev => ({ ...prev, ...settings })),

        // Inventory Exports
        inventoryLists,
        addInventoryList: (l: InventoryList) => setInventoryLists(prev => [...prev, l]),
        deleteInventoryList: (id: string) => setInventoryLists(prev => prev.filter(p => p.id !== id)),

        inventoryGroups,
        addInventoryGroup: (g: InventoryGroup) => setInventoryGroups(prev => [...prev, g]),
        updateInventoryGroup: (g: InventoryGroup) => setInventoryGroups(prev => prev.map(p => p.id === g.id ? g : p)),
        deleteInventoryGroup: (id: string) => setInventoryGroups(prev => prev.filter(p => p.id !== id)),

        inventoryItems,
        addInventoryItem: (i: InventoryItem) => setInventoryItems(prev => [...prev, i]),
        updateInventoryItem,
        deleteInventoryItem,

        inventorySettings,
        updateInventorySettings,

        inventoryLogs,
        addInventoryLog,
        updateInventoryLog,
        deleteInventoryLog,

        inventoryTransfers,
        addInventoryTransfer,
        updateInventoryTransfer,

        inventoryLocations,
        addInventoryLocation,

        admissionFormData,
        setAdmissionFormData,

        // Payment Modes
        paymentIntegrations,
        updatePaymentIntegration: (integration: PaymentIntegration) => setPaymentIntegrations(prev => prev.map(p => p.id === integration.id ? integration : p)),

        manualPaymentMethods,
        addManualPaymentMethod: (method: ManualPaymentMethod) => setManualPaymentMethods(prev => [...prev, method]),
        updateManualPaymentMethod: (method: ManualPaymentMethod) => setManualPaymentMethods(prev => prev.map(p => p.id === method.id ? method : p)),
        deleteManualPaymentMethod: (id: string) => setManualPaymentMethods(prev => prev.filter(p => p.id !== id)),

        appUpdates, addAppUpdate, updateAppUpdate, deleteAppUpdate,
        appOffers, addAppOffer, updateAppOffer, deleteAppOffer,

        // Result Archives
        resultArchives,
        addResultArchive: (a: ResultArchive) => setResultArchives(prev => [...prev, a]),
        deleteResultsByPageConfig: (pageConfigId: string) => {
            setStudentResults(prev => prev.filter(r => r.pageConfigId !== pageConfigId));
            setStudentPageSummaries(prev => prev.filter(s => s.pageConfigId !== pageConfigId));
            setPostHistory(prev => prev.filter(h => h.pageConfigId !== pageConfigId));
        },

        staffAccounts,
        updateStaffPassword,
        setCourseUnits,
        setTutors,
        setProgrammes,

        // Portal Sync
        portalData,
        updatePortalData,
        verifySensitiveAction,

        // Time Utilities
        getSyncedDate,
        serverTimeOffset,

        // Sync Bridge
        syncRequirementToInventory
    };
}



// --- HELPERS ---
export const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
        style: 'currency',
        currency: 'UGX',
        minimumFractionDigits: 0
    }).format(amount);
};

// --- HELPER: calculateClearancePercentage ---
// Centralized logic for Bursar/Registrar consistency with Pay Code Mirroring
export const calculateClearancePercentage = (
    student: EnrolledStudent,
    billings: Billing[],
    payments: Payment[],
    bursaries: Bursary[],
    targetTerm?: string,
    overridePrevBal?: number,
    allStudents?: EnrolledStudent[] // NEW: Pass all students for Pay Code lookup
): number => {
    if (!student) return 0;

    // FINANCIAL MIRRORING: If this is a Registrar student, find the Bursar's financial record
    let financialAuthority = student;
    if (student.origin === 'registrar' && student.payCode && allStudents) {
        const bursarRecord = allStudents.find(s =>
            s.origin === 'bursar' &&
            s.payCode === student.payCode
        );

        // If Bursar record exists, use it as the financial authority
        if (bursarRecord) {
            financialAuthority = bursarRecord;
        } else {
            // No Bursar record = No financial setup yet
            return 0;
        }
    }

    const term = targetTerm || financialAuthority.semester;
    const isCurrent = term === financialAuthority.semester;

    // 1. Tuition Bill (using financial authority's ID)
    const tuitionBillings = billings.filter(b =>
        b.studentId === financialAuthority.id &&
        b.type === 'Tuition' &&
        b.term === term
    );
    const totalTuitionBilled = tuitionBillings.reduce((sum, b) => sum + b.amount, 0);

    // 2. Bursaries (using financial authority's bursary)
    const bursaryValue = financialAuthority.bursary && financialAuthority.bursary !== 'none'
        ? (bursaries.find(b => b.id === financialAuthority.bursary)?.value || 0)
        : 0;

    // 3. Tuition Payments (using financial authority's ID)
    const studentPayments = payments.filter(p =>
        p.studentId === financialAuthority.id &&
        (p.term === term || (!p.term && isCurrent))
    );

    const totalTuitionPaid = studentPayments.reduce((acc, p) => {
        if (p.allocations) {
            const tuitionKey = Object.keys(p.allocations).find(k => k.toLowerCase().includes('tuition'));
            return acc + (tuitionKey ? (p.allocations[tuitionKey] || 0) : 0);
        } else {
            return acc + p.amount;
        }
    }, 0);

    // 4. Previous Balance (using financial authority's balance)
    const hasBFBill = billings.some(b => b.studentId === financialAuthority.id && b.term === term && b.description.includes('Balance Brought Forward'));
    const startPrevBal = overridePrevBal !== undefined ? overridePrevBal : (financialAuthority.previousBalance || 0);
    const effectivePrev = hasBFBill ? 0 : startPrevBal;

    const denominator = totalTuitionBilled + effectivePrev - bursaryValue;
    if (denominator <= 0) return 100;

    const pct = (totalTuitionPaid / denominator) * 100;
    return Math.max(0, Math.min(100, pct));
};

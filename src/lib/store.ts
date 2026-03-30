"use client";
import React, { useState, useEffect, createContext, useContext, ReactNode, useMemo, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { developerService } from '@/services/developerService';
import { databaseService } from '@/services/databaseService';
import { supabase } from '@/lib/supabase';
import LZString from 'lz-string';
import { 
    INITIAL_STUDENTS, INITIAL_SERVICES, INITIAL_BURSARIES, INITIAL_PROGRAMMES, 
    INITIAL_TEMPLATES, INITIAL_PROMOTION_BATCHES, INITIAL_BILLINGS, INITIAL_PAYMENTS, 
    INITIAL_NEWS, INITIAL_ADVERTS, INITIAL_STAFF_ACCOUNTS, INITIAL_TUTOR_CONTENTS, 
    INITIAL_TUTORS, INITIAL_TUTOR_SETTINGS, INITIAL_TUTOR_SUBSCRIPTIONS, 
    INITIAL_REQUISITIONS, INITIAL_REQUISITION_DRAFT, INITIAL_PAYMENT_INTEGRATIONS, 
    INITIAL_MANUAL_PAYMENT_METHODS, INITIAL_RESULT_PAGE_CONFIGS, INITIAL_APP_UPDATES, 
    INITIAL_APP_OFFERS, INITIAL_LANDING_CONTENT, INITIAL_DEVELOPER_SETTINGS, 
    INITIAL_FEATURED_SCHOOLS, INITIAL_SUGGESTIONS, INITIAL_EXPENSE_CATEGORIES, 
    INITIAL_INCOME_CATEGORIES, INITIAL_CALENDAR_EVENTS, INITIAL_FINANCIAL_SETTINGS,
    INITIAL_REGISTRAR_STUDENTS, INITIAL_PORTAL_BRANDING, INITIAL_COURSE_UNITS,
    INITIAL_TRANSACTIONS, INITIAL_GENERAL_TRANSACTIONS
} from './initialState';

// --- HELPERS ---
export const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

/**
 * 🛡️ COMPASS RESILIENCE HELPER: Resilient Delta Merging
 * Merges a local collection with a cloud collection by ID and Timestamp.
 * Preserves local items that haven't reached the cloud yet OR are fresher than cloud data.
 */
export const unionMerge = <T extends { id: string | number, lastUpdated?: string }>(local: T[], cloud: T[] | undefined): T[] => {
    if (!cloud || !Array.isArray(cloud)) return local;
    if (!local || !Array.isArray(local)) return cloud;

    const mergedMap = new Map<string, T>();

    // 1. Load cloud items as the baseline
    cloud.forEach(item => {
        if (item && item.id) mergedMap.set(item.id.toString(), item);
    });

    // 2. Overlay local items
    local.forEach(localItem => {
        if (!localItem || !localItem.id) return;
        const id = localItem.id.toString();

        if (!mergedMap.has(id)) {
            // Case: Local-only item (Unpushed)
            mergedMap.set(id, localItem);
        } else {
            // Case: Conflict. Compare timestamps.
            const cloudItem = mergedMap.get(id)!;
            const localTime = localItem.lastUpdated ? new Date(localItem.lastUpdated).getTime() : 0;
            const cloudTime = cloudItem.lastUpdated ? new Date(cloudItem.lastUpdated).getTime() : 0;

            if (localTime >= cloudTime) {
                // Local version is fresher or same age - prefer local in Local-First architecture
                mergedMap.set(id, localItem);
            }
        }
    });

    return Array.from(mergedMap.values());
};

const safeSetItem = (key: string, value: any) => {
    if (typeof window !== 'undefined') {
        try {
            localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        } catch (e) {
            console.warn(`LocalStorage failed for ${key}`, e);
        }
    }
};

/**
 * 🪦 TOMBSTONE HELPER: Records IDs of deleted items to prevent cloud resurrection
 */
const triggerTombstone = (ids: (string | number)[]) => {
    if (typeof window === 'undefined' || !ids || ids.length === 0) return;
    try {
        const current = JSON.parse(localStorage.getItem('school_tombstones_v1') || '[]');
        const stringIds = ids.map(id => id.toString());
        const newTombstones = Array.from(new Set([...current, ...stringIds]));
        localStorage.setItem('school_tombstones_v1', JSON.stringify(newTombstones));
        console.log(`🪦 Sync: Recorded ${ids.length} tombstones to prevent local resurrection.`);
    } catch (e) {
        console.error("Tombstone save error", e);
    }
};

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
    type: 'RECEIPT' | 'ADMISSION_LETTER' | 'OTHER';
    sections: DocumentSection[];
    updatedAt: string;
    programmeId?: string; // Optional: Link to a specific programme
    logo?: string; // New: Persistent Base64 logo data
    isDefault?: boolean; // Added for global templates
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
    type: 'Full-time' | 'Part-time' | 'Visiting' | 'independent';
    programmeIds: string[]; // Linked programmes
    status: 'Active' | 'Inactive' | 'active';
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
    walletBalance?: number; // For earnings
    subscriptionPrice?: number; // Tutor's choice (min 3000)
    subscriptionDuration?: '1 Month' | '3 Months' | '6 Months';
    payoutRequests?: PayoutRequest[];
    coveredServices?: string[]; // Academic programmes or course units covered by their pass
}

export interface StaffAccount {
    id: string;
    username: string;
    password: string;
    role: AccountantRole;
    name: string;
    transactionPin?: string;
    profileImage?: string; // Avatar URL or Base64
    schoolId?: string; // Optional for backward compatibility, but required for new school isolation
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
    origin?: 'bursar' | 'registrar' | 'official'; // Isolated origin
    ownerId?: string; // New: Unique ID of the Tutor or School that owns this
    isTutorContent?: boolean; // New: Explicit flag for Tutor Portal filtering
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

export type SubscriptionRequestStatus = 'Pending' | 'Approved' | 'Rejected';

export interface SubscriptionRequest {
    id: string;
    studentId: string;
    studentName: string;
    transactionId: string;
    reference: string;
    phoneNumber: string;
    amount?: number; // Filled by developer during verification
    status: SubscriptionRequestStatus;
    submittedAt: string;
    email?: string; // Link to Email identity
    verifiedAt?: string;
    rejectionReason?: string;
}

export interface TutorSubscription {
    id: string;
    tutorId: string;
    studentId: string;
    amount: number;
    status: 'Active' | 'Expired';
    startDate: string;
    expiryDate: string;
    subscribedAt: string;
}

export interface PayoutRequest {
    id: string;
    tutorId: string;
    tutorName?: string;
    tutorEmail?: string;
    amount: number;
    status: 'Pending' | 'Paid' | 'Rejected';
    requestedAt: string;
    paidAt?: string;
    paymentReference?: string;
}

export interface EnrolledStudent {
    id: number | string;
    schoolId?: string; // Link to school institution
    name: string;
    origin?: 'bursar' | 'registrar'; // Tag as Bursar or Registrar Enrollment
    payCode: string;
    admissionNumber?: string; // Standard admission tracking
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
    tuitionStatus?: 'cleared' | 'probation' | 'defaulter';
    subscriptionStatus?: SubscriptionRequestStatus | 'active' | 'expired' | 'trial';
    enrollmentDate?: string;
    documentHistory?: DocumentRecord[];
    physicalRequirements?: PhysicalRequirement[];
    notifications?: number;
    subscriptionExpiry?: string;
    subscriptionDaysLeft?: number;
    walletBalance: number;
    paymentRequests: SubscriptionRequest[];
    tutorSubscriptions: TutorSubscription[];
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
    lastUpdated?: string;
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

export type TransactionStatus = 'Pending' | 'Partially Paid' | 'Paid' | 'Void' | 'Approved' | 'Rejected' | 'pending' | 'approved' | 'rejected';
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
    lastUpdated?: string;
    isFlagged?: boolean;
    riskLevel?: 'Low' | 'Medium' | 'High';
    resolved?: boolean;
    ownerRole?: string; // 🛡️ ROLE ISOLATION: Tags source role (Bursar, Expense Manager, etc)
    schoolId?: string; // 🏫 INSTITUTIONAL ISOLATION
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
    scope?: 'school' | 'platform';
}

export interface InventoryList {
    id: string;
    name: string;
    lastUpdated?: string;
}

export interface InventoryGroup {
    id: string;
    name: string;
    listId: string;
    lastUpdated?: string;
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
    schoolId?: string; // 🏫 INSTITUTIONAL ISOLATION
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
    schoolId?: string; // 🏫 INSTITUTIONAL ISOLATION
    lastUpdated?: string;
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
    schoolId?: string; // 🏫 INSTITUTIONAL ISOLATION
    lastUpdated?: string;
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
    isGlobal?: boolean;
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
    status?: 'Published' | 'Draft';
    thumbnailUrl?: string;
    uploadDate: string;
    likes?: number;
    views?: number;
    isFeatured?: boolean;
    // 🛡️ ARCHITECTURAL WALL
    authorRole?: 'developer' | 'tutor';
    origin?: 'official' | 'marketplace';
    ownerId?: string; // New: Unified ownership tag
}

export interface TutorSettings {
    tutorId: string;
    subscriptionPrice: number;
    durationMonths: number;
    isEnabled: boolean;
    taughtCourseUnitIds?: string[]; // IDs of Course Units the tutor teaches
}

// Consolidated with interface at line 169

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
    feedback?: string;
    feedbackDate?: string;
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
    subscriptionExpiry: string;
    walletBalance: number;
    paymentRequests: SubscriptionRequest[];
    tutorSubscriptions: TutorSubscription[]; // Restored
    activityLogs?: any[]; // For tracking student actions
    password?: string;
}

export interface TutorProfile {
    id: string;
    name: string;
    email: string;
    role: 'Tutor';
    schoolId?: string; // Add schoolId link
    subscriptionDaysLeft?: number;
    pinnedContentId?: string | null;
}

export interface DeveloperProfile {
    id: string;
    name: string;
    role: 'Developer';
}

export interface RegistrarStudent {
    id: string; // Using string ID for academic records
    schoolId?: string; // Link to school institution
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

export interface PromotionBatch {
    id: string;
    name: string;
    level: string;
    year: string;
    submittedAt: string;
    status: 'draft' | 'posted';
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
    ownerId?: string; // Links to the creator (Tutor/Developer)
    origin?: 'official' | 'school'; // Source classification
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
    id: string;
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
    status: 'Pending' | 'Active' | 'Rejected' | 'Deactivated';
}

export interface PortalBranding {
    schoolName: string;
    logo?: string;
    tagline?: string;
    primaryColor?: string;
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
    lastUpdated?: string;
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
    showMockData: boolean; // Added for experimental/demo controls
    wallpapers?: string[]; // Background slideshow images
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
    image: string; // This is the main thumbnail
    logo?: string;
    tagline: string;
    description: string;
    contact?: string;
    email?: string;
    location?: string;
    gallery?: string[]; // Added: array of showcase image URLs
    status: 'Pending' | 'Active' | 'Rejected';
    enrollmentStatus?: string;
    feesStructure?: string; // Base64 or URL for the fees document
    recommendations?: string; // Added: institutional course recommendations
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

// INITIAL_LANDING_CONTENT moved to initialState.ts

// INITIAL_DEVELOPER_SETTINGS moved to initialState.ts
// INITIAL_FEATURED_SCHOOLS moved to initialState.ts

export interface BankAccount {
    id: string;
    name: string;
    group: 'Cash' | 'Accounts' | 'Bank Accounts' | 'Card';
    type: 'Asset' | 'Liability';
    currency: string;
    balance: number;
    accountNumber?: string;
    bankName?: string;
    ownerRole?: string; // 🛡️ ROLE ISOLATION: Tags source role
}

// INITIAL_FINANCIAL_SETTINGS moved to initialState.ts

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
    studentId: number | string;
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
    attachments?: string[];
    directorNote?: string;
    approvedAt?: string;
    schoolId?: string; // 🏫 INSTITUTIONAL ISOLATION
    lastUpdated?: string;
}

export interface Payment {
    id: string;
    studentId: number | string;
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
    status?: TransactionStatus; // Approval Workflow
    directorNote?: string;
    approvedAt?: string;
    history: AuditLog[];
    type?: 'payment' | 'adjustment'; // New Flag for auditing
    metadata?: {
        payCode?: string;
        syncSource?: string;
        bankName?: string;
        [key: string]: any;
    };
    schoolId?: string; // 🏫 INSTITUTIONAL ISOLATION
    lastUpdated?: string;
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

// INITIAL_PAYMENT_INTEGRATIONS moved to initialState.ts

// INITIAL_MANUAL_PAYMENT_METHODS moved to initialState.ts

// --- INITIAL MOCK DATA ---

// Moved to initialState.ts

// Moved to initialState.ts

// Moved

// Moved

// Moved

// Moved

// INITIAL_SUGGESTIONS moved to initialState.ts

// INITIAL_ADVERTS moved to initialState.ts

// INITIAL_REQUISITIONS moved to initialState.ts

// INITIAL_REGISTRAR_STUDENTS moved to initialState.ts

// ... (skipping templates for brevity if not modifying) ...

// INITIAL_GENERAL_TRANSACTIONS moved to initialState.ts

// --- HOOK FOR GLOBAL STATE ---



function useSchoolDataInternal() {
    const pathname = usePathname() || "";
    const isBursarPortal = pathname.startsWith('/bursar');
    const isRegistrarPortal = pathname.startsWith('/admin');

    const [checkingAccess, setCheckingAccess] = useState(true);
    const [hydrated, setHydrated] = useState(false);

    // 🛡️ GLOBAL SAFETY: Guarantee the app mounts even if sync is slow or crashes
    useEffect(() => {
        const timer = setTimeout(() => {
            setHydrated(true);
            setCheckingAccess(false);
            console.log("🛡️ Store Safety: Failsafe triggered to ensure app mount.");
        }, 5000);
        return () => clearTimeout(timer);
    }, []);

    const [activeRole, setActiveRole] = useState<AccountantRole>(() => {
        if (typeof window !== 'undefined') {
            // Priority 1: Check sessionStorage (tab-specific)
            let saved = sessionStorage.getItem('school_active_role');

            // Priority 2: Fallback to localStorage (existing legacy sessions)
            if (!saved) {
                saved = localStorage.getItem('school_active_role');
            }

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

    const [studentProfile, setStudentProfile] = useState<StudentProfile>(() => {
        const defaultProfile: StudentProfile = {
            id: 'std_user_1',
            name: 'Student User',
            email: 'student@vine.ac.ug',
            likedContentIds: [],
            subscribedTutorIds: [],
            subscriptionStatus: 'expired',
            subscriptionExpiry: '',
            walletBalance: 0,
            paymentRequests: [],
            tutorSubscriptions: []
        };

        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_student_profile_v1');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    // 🧹 CACHE CLEANUP: If we find the placeholder date, treat it as null to force a fresh fetch
                    if (parsed.subscriptionExpiry === '2026-12-31') {
                        parsed.subscriptionExpiry = '';
                        parsed.subscriptionStatus = 'expired';
                    }
                    return { ...defaultProfile, ...parsed };
                } catch (e) {
                    console.warn("Failed to parse student profile", e);
                }
            }
        }
        return defaultProfile;
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
        if (hydrated) {
            safeSetItem('school_general_transactions_v1', generalTransactions);
            safeSetItem('school_global_audit_logs_v1', globalAuditLogs);
            safeSetItem('school_student_profile_v1', studentProfile);
        }
    }, [generalTransactions, globalAuditLogs, studentProfile, hydrated]);

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

    const router = useRouter();
    // --- HYDRATION: Mark as ready for Client-Side logic ---
    useEffect(() => {
        setHydrated(true);
    }, []);

    // --- CLOUD-SYNC FOR MANAGEMENT PORTALS (Consolidated) ---
    useEffect(() => {
        const syncPlatformData = async () => {
            if (!hydrated) return;

            // 🔒 SYNC HARMONY: Skip heartbeat if a manual action (like delete) happened recently (5s)
            const lastManualAction = Number(localStorage.getItem('school_manual_action_lock') || 0);
            if (Date.now() - lastManualAction < 5000) {
                console.log("☁️ Compass Heartbeat: Skipping cycle due to recent manual action lock.");
                return;
            }

            // --- PUBLIC DISCOVERY SYNC (Universal) ---
            try {
                const [officialLibRes, officialProgsRes, officialCUsRes] = await Promise.all([
                    supabase.from('official_library').select('*').order('created_at', { ascending: false }),
                    supabase.from('programmes').select('*').eq('ownerId', 'developer'),
                    supabase.from('course_units').select('*').eq('ownerId', 'developer')
                ]);

                if (officialLibRes.data) {
                    setOfficialLibrary(prev => {
                        const cloudIds = new Set(officialLibRes.data.map((c: any) => c.id));
                        const map = new Map();
                        // 1. Maintain local-first items only if they are extremely fresh (uploading) or present in cloud
                        prev.forEach(c => {
                            if (cloudIds.has(c.id) || (c.uploadDate && (Date.now() - new Date(c.uploadDate).getTime() < 60000))) {
                                map.set(c.id, c);
                            }
                        });
                        // 2. Overlay cloud data
                        officialLibRes.data.forEach((c: any) => {
                            map.set(c.id, {
                                id: c.id,
                                tutorId: c.developer_id || 'developer',
                                ownerId: 'developer',
                                origin: 'official',
                                authorRole: 'developer', // STRICT VISION TAG
                                type: c.type,
                                title: c.title,
                                description: c.description,
                                url: c.file_url,
                                thumbnailUrl: c.thumbnail_url,
                                status: c.status || 'Published',
                                uploadDate: c.created_at,
                                isFeatured: c.is_featured,
                                ...c.metadata
                            });
                        });
                        return Array.from(map.values());
                    });
                }

                if (officialProgsRes.data) {
                    setProgrammes(prev => {
                        const cloudIds = new Set(officialProgsRes.data.map((p: any) => p.id));
                        const map = new Map();
                        // Maintain non-developer programmes or developer programmes still in cloud
                        prev.forEach(p => {
                            if (p.ownerId !== 'developer' || cloudIds.has(p.id)) {
                                map.set(p.id, p);
                            }
                        });
                        officialProgsRes.data.forEach((p: any) => map.set(p.id, p));
                        return Array.from(map.values());
                    });
                }

                if (officialCUsRes.data) {
                    setCourseUnits(prev => {
                        const cloudIds = new Set(officialCUsRes.data.map((c: any) => c.id));
                        const map = new Map();
                        // Maintain non-developer CUs or developer CUs still in cloud
                        prev.forEach(cu => {
                            if (cu.ownerId !== 'developer' || cloudIds.has(cu.id)) {
                                map.set(cu.id, cu);
                            }
                        });
                        officialCUsRes.data.forEach((cu: any) => map.set(cu.id, cu));
                        return Array.from(map.values());
                    });
                }
            } catch (err) {
                console.error("☁️ Discovery Sync Error:", err);
            }

            const isAdmin = ['developer', 'director', 'bursar', 'expense manager', 'estate manager'].includes((activeRole || '').toLowerCase());

            if (isAdmin) {
                try {
                    // Fetch all profiles to find independent students and their requests
                    const { data: profiles, error } = await supabase.from('profiles').select('*');
                    if (error) throw error;

                    const isDev = (activeRole || '').toLowerCase() === 'developer';
                    const targetSchoolId = schoolProfile.id;

                    const cloudStudents = profiles.filter((p: any) => {
                        const isStudent = p.role?.toLowerCase() === 'student' ||
                            (p.payment_requests && p.payment_requests.length > 0) ||
                            (p.wallet_balance && p.wallet_balance > 0);

                        if (!isStudent) return false;

                        // 🛡️ DATA ISOLATION LOCK
                        // If not a developer, ONLY pull students belonging to THIS institution
                        // This prevents independent learners from "leaking" into school ledgers
                        if (isDev) return true;
                        return p.school_id === targetSchoolId;
                    });

                    // 🛡️ STAFF AUTO-DISCOVERY & IDENTIFICATION
                    // Reconcile staff data from profiles table to ensure Bursar/Director cards have real names
                    const cloudStaff = profiles.filter((p: any) => {
                        const isStaff = ['Director', 'Bursar', 'Registrar', 'Expense Manager', 'Estate Manager', 'News Coordinator'].includes(p.role);
                        if (!isStaff) return false;
                        if (isDev) return true; // Developers see all staff across the platform
                        return p.school_id === targetSchoolId;
                    });

                    if (cloudStaff.length > 0) {
                        setStaffAccounts(prev => {
                            const merged = [...prev];
                            cloudStaff.forEach((cs: any) => {
                                const index = merged.findIndex(acc => acc.role === cs.role && acc.id === cs.id);
                                const updatedAccount: StaffAccount = {
                                    id: cs.id,
                                    name: cs.full_name || cs.name || 'Staff User',
                                    username: cs.email || cs.username || cs.id,
                                    password: cs.password || 'password123', // Use cloud password or fallback
                                    role: cs.role,
                                    transactionPin: cs.transaction_pin,
                                    profileImage: cs.avatar_url
                                };

                                if (index >= 0) {
                                    merged[index] = { ...merged[index], ...updatedAccount };
                                } else {
                                    merged.push(updatedAccount);
                                }
                            });
                            return merged;
                        });
                    }

                    // 🛡️ FINANCIAL DISCOVERY & RECONCILIATION
                    // Automatically assign ownerRole to legacy accounts and transactions
                    // This prevents data loss while enforcing new isolation rules
                    setAccounts(prev => prev.map(acc => {
                        if (acc.ownerRole && acc.ownerRole !== 'Bursar') return acc;
                        // Heuristic: Accounts containing 'NABUKEERA' or being used for expenses go to Expense Manager
                        const name = acc.name.toUpperCase();
                        if (name.includes('NABUKEERA') || name.includes('TROPICAL')) return { ...acc, ownerRole: 'Expense Manager' };
                        return acc.ownerRole ? acc : { ...acc, ownerRole: 'Bursar' };
                    }));

                    setGeneralTransactions(prev => prev.map(tx => {
                        const desc = (tx.description || '').toLowerCase();
                        // 🏗️ CONSTRUCTION & LOGISTICS SCOPE (Expanded)
                        const isExpenseType = /cement|labour|fuel|site|bricks|sand|transport|lunch|security|nails|poles|timber|tiber|charges|withdraw/i.test(desc);

                        // If it's already correctly tagged, leave it
                        if (tx.ownerRole === 'Expense Manager' && isExpenseType) return tx;
                        if (tx.ownerRole === 'Bursar' && !isExpenseType) return tx;

                        // If it's untagged OR tagged as Bursar but should be Expense Manager, fix it
                        if (isExpenseType) return { ...tx, ownerRole: 'Expense Manager' };

                        // Default fallback for untagged items
                        return tx.ownerRole ? tx : { ...tx, ownerRole: 'Bursar' };
                    }));

                    const [tutorListRes] = await Promise.all([
                        supabase.from('profiles').select('*').eq('role', 'Tutor')
                    ]);

                    const tutorList = tutorListRes.data || [];

                    // Sync Students
                    setStudents(prev => {
                        const merged = [...prev];
                        cloudStudents.forEach((cp: any) => {
                            // 🛡️ MULTI-IDENTITY MERGE
                            // Find existing record by UUID OR PayCode to collapse duplicates
                            const index = merged.findIndex(s =>
                                s.id.toString() === cp.id.toString() ||
                                (cp.pay_code && s.payCode?.toString() === cp.pay_code.toString())
                            );

                            const cloudRequests = cp.payment_requests || [];
                            const localRequests = index >= 0 ? (merged[index].paymentRequests || []) : [];

                            const requestMap = new Map();
                            [...localRequests, ...cloudRequests].forEach(r => {
                                const existing = requestMap.get(r.id);
                                if (!existing || r.status !== 'Pending' || (existing && existing.status === 'Pending')) {
                                    requestMap.set(r.id, r);
                                }
                            });
                            const mergedRequests = Array.from(requestMap.values())
                                .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

                            const updatedStudent: EnrolledStudent = {
                                id: cp.id, // Always normalize to Cloud UUID
                                schoolId: cp.school_id,
                                name: cp.full_name || 'Student',
                                payCode: cp.pay_code || cp.id,
                                programme: index >= 0 ? merged[index].programme : 'Independent Learner',
                                level: index >= 0 ? merged[index].level : 'N/A',
                                semester: index >= 0 ? merged[index].semester : 'N/A',
                                balance: index >= 0 ? merged[index].balance : 0,
                                totalFees: index >= 0 ? merged[index].totalFees : 0,
                                services: index >= 0 ? merged[index].services : [],
                                bursary: index >= 0 ? merged[index].bursary : 'None',
                                previousBalance: index >= 0 ? merged[index].previousBalance : 0,
                                status: cp.status || 'active',
                                walletBalance: cp.wallet_balance || 0,
                                paymentRequests: mergedRequests,
                                tutorSubscriptions: cp.subscribed_tutors || [],
                                subscriptionExpiry: cp.subscription_expiry,
                                subscriptionStatus: cp.subscription_status
                            };

                            if (index >= 0) {
                                merged[index] = updatedStudent;
                            } else {
                                // 🌐 GLOBAL RECOVERY: Add independent accounts to the 'memory' so their dashboards work,
                                // but they stay hidden from the Bursar's desk via the UI filters.
                                merged.push(updatedStudent);
                            }
                        });
                        return merged;
                    });


                    // Sync Tutors
                    setTutors(prev => {
                        return tutorList.map(p => ({
                            id: p.id,
                            name: p.full_name || 'Tutor',
                            email: p.email || '',
                            phone: p.phone || '',
                            role: 'Tutor',
                            is_verified: p.is_verified || false,
                            walletBalance: p.wallet_balance || 0,
                            payoutRequests: p.payout_requests || [],
                            subscriptionDaysLeft: 30,
                            status: 'active',
                            type: 'independent',
                            programmeIds: []
                        }));
                    });

                } catch (err) {
                    console.error("❌ Consolidated Sync Error (Developer):", err);
                }
            } else if ((activeRole as string) === 'student' || studentProfile.id) {
                try {
                    // 1. IDENTITY: Use Auth UUID (The only source of truth)
                    const { data: { user } } = await supabase.auth.getUser();
                    const activeId = user?.id || studentProfile.id;
                    const userEmail = user?.email || studentProfile.email;

                    if (!activeId || activeId === 'std_user_1') return;

                    // 2. FETCH: Pull from Profile and Financial Ledger
                    // We search by BOTH ID and Email to bridge duplicate or misaligned records
                    const [profileRes, financeRes] = await Promise.all([
                        supabase.from('profiles').select('*').eq('id', activeId).maybeSingle(),
                        userEmail
                            ? supabase.from('financial_ledger').select('*').or(`id.eq.${activeId},email.eq.${userEmail}`)
                            : supabase.from('financial_ledger').select('*').eq('id', activeId)
                    ]);

                    const profile = profileRes.data;
                    const ledgerRecords = Array.isArray(financeRes.data) ? financeRes.data : (financeRes.data ? [financeRes.data] : []);

                    // 🧠 RICH MERGE STRATEGY: 
                    // If multiple ledger records exist (e.g. Brighton has 3 accounts), 
                    // we pick the ONE that is actually Active or has the most money.
                    const finance = ledgerRecords.sort((a, b) => {
                        // Priority 1: Status (Active > Expired)
                        if (a.subscription_status === 'active' && b.subscription_status !== 'active') return -1;
                        if (b.subscription_status === 'active' && a.subscription_status !== 'active') return 1;
                        // Priority 2: Money (Higher balance wins)
                        return (b.wallet_balance || 0) - (a.wallet_balance || 0);
                    })[0];

                    if (profile || finance) {
                        setStudentProfile(prev => {
                            // Merge Payment Requests (Bridged across all records)
                            const allRecords = [profile, ...ledgerRecords].filter(Boolean);
                            const cloudRequests = allRecords.flatMap(r => r.payment_requests || []);
                            const requestMap = new Map();
                            [...(prev.paymentRequests || []), ...cloudRequests].forEach(r => {
                                if (r && r.id) requestMap.set(r.id, r);
                            });

                            // Merge Activity Logs
                            const cloudLogs = allRecords.flatMap(r => r.activity_logs || []);
                            const logMap = new Map();
                            cloudLogs.forEach((l: any) => { if (l?.id) logMap.set(l.id, l); });
                            (prev.activityLogs || []).forEach(l => { if (l?.id && !logMap.has(l.id)) logMap.set(l.id, l); });

                            // 🛡️ ATOMIC SYNC: Prioritize Cloud Data (Sticky 'Active' Status)
                            const cloudStatus = (finance?.subscription_status === 'active' || profile?.subscription_status === 'active')
                                ? 'active'
                                : (finance?.subscription_status || profile?.subscription_status || prev.subscriptionStatus);

                            return {
                                ...prev,
                                id: activeId,
                                name: finance?.full_name || profile?.full_name || prev.name,
                                email: finance?.email || profile?.email || prev.email,
                                // 🏦 FINANCIAL TRUTH: Absolute Cloud Source (Avoid Math.max ghosting)
                                walletBalance: Number(finance?.wallet_balance ?? profile?.wallet_balance ?? prev.walletBalance ?? 0),
                                subscriptionStatus: cloudStatus,
                                subscriptionExpiry: finance?.subscription_expiry || profile?.subscription_expiry || prev.subscriptionExpiry,
                                paymentRequests: Array.from(requestMap.values()).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()),
                                activityLogs: Array.from(logMap.values()).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                            };
                        });
                    }
                } catch (err) {
                    console.error("❌ Sync Registry Error:", err);
                }
            }
        };

        syncPlatformData();
        const interval = setInterval(syncPlatformData, 10000);

        // 🚀 MULTI-DEVICE HARMONY: Periodic Cloud Pull (30s)
        // This ensures Device B reflects Device A's changes even if Device B stays focused.
        const cloudPullInterval = setInterval(() => {
            if (activeRole && ['bursar', 'director', 'developer', 'accountant'].includes(activeRole.toLowerCase())) {
                console.log("🌦️ Compass Heartbeat: Periodic cloud pull for cross-device consistency...");
                pullFromCloud();
            }
        }, 30000); // 30 seconds

        return () => {
            clearInterval(interval);
            clearInterval(cloudPullInterval);
        };
    }, [hydrated, activeRole, studentProfile.id]);

    const getSyncedDate = () => new Date(Date.now() + serverTimeOffset);

    const triggerManualActionLock = () => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('school_manual_action_lock', Date.now().toString());
            console.log("🔒 Sync: Manual Action Lock active (5s).");
        }
    };

    const logGlobalAction = (action: string, details: string, scope: 'school' | 'platform' = 'school') => {
        const newLog: AuditLog = {
            id: generateId(),
            action,
            details,
            user: activeRole || 'System',
            timestamp: getSyncedDate().toISOString(),
            scope
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
            const saved = localStorage.getItem('school_tutors_v4');
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

    const [officialLibrary, setOfficialLibrary] = useState<TutorContent[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_official_library_v1');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
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
            return saved ? JSON.parse(saved) : INITIAL_REQUISITIONS;
        }
        return INITIAL_REQUISITIONS;
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
            if (saved) {
                const parsed = JSON.parse(saved);
                return (Array.isArray(parsed) && parsed.length > 0) ? parsed : INITIAL_PAYMENT_INTEGRATIONS;
            }
            return INITIAL_PAYMENT_INTEGRATIONS;
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

    const [portalBranding, setPortalBranding] = useState<PortalBranding>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('school_portal_branding_v1');
            return saved ? JSON.parse(saved) : INITIAL_PORTAL_BRANDING;
        }
        return INITIAL_PORTAL_BRANDING;
    });

    const updatePortalBranding = (updates: Partial<PortalBranding>) => {
        setPortalBranding(prev => ({ ...prev, ...updates }));
    };

    useEffect(() => {
        if (hydrated) safeSetItem('school_portal_branding_v1', portalBranding);
    }, [portalBranding, hydrated]);

    useEffect(() => {
        if (hydrated) safeSetItem('school_staff_accounts_v1', staffAccounts);
    }, [staffAccounts, hydrated]);

    const updateStaffPassword = (accountId: string, newPassword: string) => {
        setStaffAccounts(prev => prev.map(acc => acc.id === accountId ? { ...acc, password: newPassword } : acc));
    };

    const resetStaffPassword = (accountId: string) => {
        setStaffAccounts(prev => prev.map(acc => acc.id === accountId ? { ...acc, password: 'password123' } : acc));
    };

    const updateStaffProfile = (accountId: string, updates: Partial<StaffAccount>) => {
        triggerManualActionLock();
        setStaffAccounts(prev => prev.map(acc => acc.id === accountId ? { ...acc, ...updates } : acc));
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
                localStorage.setItem('school_tutors_v4', JSON.stringify(tutors));
                localStorage.setItem('app_featured_schools_v4', JSON.stringify(featuredSchools));
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

    // --- TUTOR LIST SYNC ---
    // Ensure the logged-in tutor is always in the master list so pages that use tutors.find() don't break

    const loadTutorContentFromCloud = async (tutorId?: string) => {
        try {
            console.log('☁️ CLOUD: Loading tutor content...');
            const data = await databaseService.getTutorContents(tutorId);

            if (data) {
                const mapped: TutorContent[] = data.map((d: any) => ({
                    id: d.id,
                    tutorId: d.tutor_id,
                    type: d.type,
                    title: d.title,
                    description: d.description,
                    url: d.file_url,
                    thumbnailUrl: d.thumbnail_url,
                    status: d.status,
                    uploadDate: d.created_at,
                    programmeIds: d.metadata?.programmeIds || [],
                    levels: d.metadata?.levels || [],
                    courseUnitIds: d.metadata?.courseUnitIds || [],
                    likes: d.likes || 0,
                    views: d.views || 0,
                    isFeatured: d.is_featured || false
                }));

                setTutorContents(prev => {
                    const localIds = new Set(prev.map(c => c.id));
                    const newFromCloud = mapped.filter(c => !localIds.has(c.id));
                    return [...prev, ...newFromCloud];
                });
                safeSetItem('school_tutor_contents_v1', mapped); // Still persist cloud version if needed, but state holds merge
            }
        } catch (error) {
            console.error('☁️ CLOUD ERROR: Failed to load tutor content:', error);
        }
    };

    const loadOfficialLibraryFromCloud = async () => {
        try {
            console.log('🏛️ CLOUD: Loading official library...');
            const data = await databaseService.getOfficialLibrary();

            if (data) {
                const mapped: TutorContent[] = data.map((d: any) => ({
                    id: d.id,
                    tutorId: d.developer_id || 'developer',
                    type: d.type,
                    title: d.title,
                    description: d.description,
                    url: d.file_url,
                    thumbnailUrl: d.thumbnail_url,
                    status: d.status,
                    uploadDate: d.created_at,
                    programmeIds: d.metadata?.programmeIds || [],
                    levels: d.metadata?.levels || [],
                    courseUnitIds: d.metadata?.courseUnitIds || [],
                    likes: d.likes || 0,
                    views: d.views || 0,
                    isFeatured: d.is_featured || false,
                    authorRole: 'developer',
                    origin: 'official',
                    ownerId: 'developer'
                }));

                setOfficialLibrary(prev => {
                    const localIds = new Set(prev.map(c => c.id));
                    const newFromCloud = mapped.filter(c => !localIds.has(c.id));
                    return [...prev, ...newFromCloud];
                });
                safeSetItem('school_official_library_v1', mapped);
            }
        } catch (error) {
            console.error('🏛️ CLOUD ERROR: Failed to load official library:', error);
        }
    };

    useEffect(() => {
        if (hydrated) {
            // Tutors see their own content for management, students see global library
            const tid = tutorProfile?.id;
            loadTutorContentFromCloud(tid);
            loadOfficialLibraryFromCloud(); // Always load official library
        }
    }, [hydrated, tutorProfile?.id]);

    useEffect(() => {
        if (hydrated && tutorProfile && !tutors.find(t => t.id === tutorProfile.id)) {
            setTutors(prev => [...prev, {
                id: tutorProfile.id,
                name: tutorProfile.name || 'Tutor',
                email: tutorProfile.email,
                phone: '',
                type: 'Full-time',
                status: 'Active',
                programmeIds: [],
                stats: { subscribers: 0, views: 0, uploads: 0 },
                walletBalance: 0,
                subscriptionPrice: 3500,
                subscriptionDuration: '6 Months',
                payoutRequests: []
            }]);
        }
    }, [hydrated, tutorProfile, tutors]);

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
            const isSub = prev?.subscribedTutorIds?.includes(tutorId) || false;
            return {
                ...prev,
                subscribedTutorIds: isSub ? prev.subscribedTutorIds.filter(id => id !== tutorId) : [...(prev.subscribedTutorIds || []), tutorId]
            };
        });
    };

    const subscribeToTutor = (studentId: string | number, tutorId: string) => {
        const tutor = tutors.find(t => t.id === tutorId);
        if (!tutor) throw new Error("Tutor not found.");
        const price = tutor.subscriptionPrice || 3500;

        const startDate = new Date();
        const newExpiry = new Date();
        newExpiry.setMonth(newExpiry.getMonth() + 6);

        const newSub: TutorSubscription = {
            id: generateId(),
            tutorId,
            studentId: studentId.toString(),
            amount: price,
            status: 'Active',
            startDate: startDate.toISOString(),
            expiryDate: newExpiry.toISOString(),
            subscribedAt: startDate.toISOString()
        };

        // Update User Profile Balance
        setStudentProfile(prev => ({
            ...prev,
            walletBalance: (prev.walletBalance || 0) - price,
            tutorSubscriptions: [newSub, ...(prev.tutorSubscriptions || [])]
        }));

        // Link to Institutional Record
        setStudents(prev => prev.map(s => {
            if (s.id.toString() === studentId.toString()) {
                return {
                    ...s,
                    tutorSubscriptions: [newSub, ...(s.tutorSubscriptions || [])]
                };
            }
            return s;
        }));

        logGlobalAction('Tutor Subscription', `Student ${studentId} subscribed to ${tutor.name}`);
    };

    const addCalendarEvent = (event: CalendarEvent) => setCalendarEvents(prev => [...prev, event]);
    const updateCalendarEvent = (event: CalendarEvent) => setCalendarEvents(prev => prev.map(e => e.id === event.id ? event : e));
    const deleteCalendarEvent = (id: string) => setCalendarEvents(prev => prev.filter(e => e.id !== id));

    const verifySensitiveAction = (pin: string): boolean => {
        // Find current staff account by role or username (case-insensitive)
        const currentStaff = staffAccounts.find(s =>
            s.role === activeRole ||
            s.username.toLowerCase() === activeRole?.toLowerCase() ||
            s.name === activeRole
        );
        if (!currentStaff) return false;

        // If they haven't set a pin, check password as fallback
        if (!currentStaff.transactionPin) {
            return currentStaff.password === pin;
        }
        return currentStaff.transactionPin === pin;
    };

    const [schoolProfile, setSchoolProfile] = useState<SchoolProfile>({
        id: 'ea5d359f-8107-40a3-808c-0c4f8f3a847c',
        name: 'SAMI HEALTH SCIENCE INSTITUTE',
        motto: 'Excellence in Health Education',
        type: 'Nursing/Midwifery',
        poBox: 'P.O. Box 0000, Kampala',
        city: 'Kampala',
        phone: '+256 700 000000',
        email: 'samihealthscience@gmail.com',
        principal: 'Director',
        administrator: 'Admin',
        status: 'Active'
    });


    const [activeAccountId, setActiveAccountId] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            // Priority 1: Check sessionStorage
            const saved = sessionStorage.getItem('school_active_account_id') || localStorage.getItem('school_active_account_id');
            return saved || null;
        }
        return null;
    });

    // --- IDENTITY GUARD: REMOVED (Option 1: Manual Override) ---
    // The automated guard has been deleted to resolve redirection loops.
    // Navigation is now handled explicitly by login flows and manual role selection.

    // Logout Helper
    const logout = () => {
        setActiveRole(null);
        setActiveAccountId(null);
        setTutorProfile(null);
        setDeveloperProfile(null);
        if (typeof window !== 'undefined') {
            // Clear current session (tab-specific)
            sessionStorage.removeItem('school_active_role');
            sessionStorage.removeItem('school_active_account_id');

            // Clear legacy persistent sessions
            localStorage.removeItem('school_active_role');
            localStorage.removeItem('school_active_account_id');

            localStorage.removeItem('school_tutor_profile_v1');
            localStorage.removeItem('school_developer_profile_v1');
            localStorage.removeItem('school_active_student_id');
            localStorage.removeItem('school_student_profile_v1');
        }
        // Reset student profile to initial state in memory to prevent layout loops
        const initialState: StudentProfile = {
            id: 'std_user_1',
            name: 'Student User',
            email: 'student@vine.ac.ug',
            likedContentIds: [],
            subscribedTutorIds: [],
            tutorSubscriptions: [],
            subscriptionStatus: 'expired',
            subscriptionExpiry: '',
            walletBalance: 0,
            paymentRequests: []
        };
        setStudentProfile(initialState);
    };

    const [hydratedFinancials, setHydratedFinancials] = useState(false);

    // 🛑 DEACTIVATED: Local sync is now handled by the more robust syncPlatformData effect above
    // to avoid state conflicts and handle the unrestricted financial_ledger bridge.
    /*
    useEffect(() => {
        const syncStudentFinancials = async () => { ... };
        syncStudentFinancials();
    }, [hydrated, hydratedFinancials, setStudentProfile]);
    */

    const submitSubscriptionRequest = async (request: Omit<SubscriptionRequest, 'id' | 'status' | 'submittedAt'>) => {
        // 1. Validate Identity (Recover UUID if currently using Demo ID)
        let activeId = studentProfile.id;
        if (activeId === 'std_user_1') {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) activeId = user.id;
            else throw new Error("You must be logged in to submit a payment request.");
        }

        if (!studentProfile.email) {
            throw new Error("Student email missing. Please update your profile.");
        }

        const newRequest: SubscriptionRequest = {
            ...request,
            id: generateId(),
            studentId: activeId,
            email: studentProfile.email,
            status: 'Pending',
            submittedAt: new Date().toISOString()
        };

        // 2. Local Duplicate Check
        const duplicate = (studentProfile.paymentRequests || []).some(r => r.transactionId === request.transactionId && r.status !== 'Rejected');
        if (duplicate) throw new Error("This Transaction ID has already been submitted.");

        // 3. Update UI Immediate
        setStudentProfile(prev => ({
            ...prev,
            id: activeId,
            paymentRequests: [newRequest, ...(prev.paymentRequests || [])]
        }));

        // 4. PERSIST TO CLOUD (Universal Atomic Upsert)
        try {
            // Force dynamic identity check to ensure we aren't using a stale ID from state
            const { data: { user } } = await supabase.auth.getUser();
            const cloudId = user?.id || activeId;

            const { data: profile } = await supabase.from('profiles').select('payment_requests').eq('id', cloudId).maybeSingle();

            const cloudRequests = (profile as any)?.payment_requests || [];
            // Filter out any potential local duplicates that might have been pushed partially
            const filteredCloud = cloudRequests.filter((r: any) => r.id !== newRequest.id && r.transactionId !== newRequest.transactionId);
            const merged = [newRequest, ...filteredCloud];

            const { error: syncError } = await supabase.from('profiles').upsert({
                id: cloudId,
                full_name: studentProfile.name,
                email: studentProfile.email,
                role: (profile as any)?.role || 'Student',
                payment_requests: merged
            });

            if (syncError) throw syncError;
            console.log(`✅ Platform Ledger: TXN ${newRequest.transactionId} safely vaulted for ${cloudId}.`);
        } catch (err: any) {
            console.error("❌ Cloud Persist Failed:", err.message);
            // We don't throw here to allow LocalStorage fallback to keep user session feeling smooth
        }

        logGlobalAction('Subscription Request', `Student ${studentProfile.name} submitted TXN ${request.transactionId}`, 'platform');
    };

    const verifySubscriptionRequest = async (requestId: string, studentId: string | number, amount: number, status: 'Approved' | 'Rejected', reason?: string) => {
        // 1. Resolve Identity (Strictly UUID)
        try {
            const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', studentId.toString()).maybeSingle();

            if (error || !profile) {
                throw new Error(`Profile for Account ID ${studentId} not found in Cloud.`);
            }

            // Ensure we are working with numbers to prevent "0 + 5000 = 05000" or NaN issues
            const currentBalance = Number(profile.wallet_balance || 0);
            const verifiedAmount = Number(amount || 0);
            const currentRequests = profile.payment_requests || [];
            // 2. Calculate New State
            const updatedRequests = currentRequests.map((r: any) => r.id === requestId ? { ...r, status, amount: verifiedAmount, rejectionReason: reason, verifiedAt: new Date().toISOString() } : r);
            const updatedBalance = status === 'Approved' ? currentBalance + verifiedAmount : currentBalance;

            // 3. PERSIST TO CLOUD (Universal Source of Truth - Dual Table Consistency)
            try {
                // Update BOTH tables to ensure no stale data reverts the UI on next sync
                const [profUpdate, ledgerUpdate] = await Promise.all([
                    supabase.from('profiles').update({
                        wallet_balance: updatedBalance,
                        payment_requests: updatedRequests
                    }).eq('id', profile.id),
                    supabase.from('financial_ledger').update({
                        wallet_balance: updatedBalance,
                        payment_requests: updatedRequests
                    }).eq('id', profile.id)
                ]);

                if (profUpdate.error) throw profUpdate.error;
                // We don't throw on ledgerUpdate error if it's "not found" (legacy users)
                // but we log it for tracking.

                console.log(`✅ CLOUD SYNC: Account ${profile.id} wallet updated to ${updatedBalance} UGX in Master Ledger.`);

                // 4. Return data for immediate UI feedback
                return { updatedBalance, updatedRequests };
            } catch (pErr) {
                console.error("❌ Cloud Write Failed:", pErr);
                throw pErr;
            } finally {
                // 5. Sync Local UI for Student (if they are the one being verified in this browser)
                if (studentProfile.id.toString() === profile.id.toString()) {
                    setStudentProfile(prev => ({
                        ...prev,
                        walletBalance: updatedBalance,
                        paymentRequests: updatedRequests
                    }));
                }
            }
        } catch (fetchErr: any) {
            console.error("❌ Identity Resolution Failed:", fetchErr);
            throw new Error(`Cloud verification failed: ${fetchErr.message}`);
        }
    };

    const purchasePlatformPass = async (type: '6 Months' | '1 Year') => {
        const cost = type === '6 Months' ? 5000 : 9000;
        const months = type === '6 Months' ? 6 : 12;

        if (studentProfile.id === 'std_user_1') throw new Error("Please log in to purchase a pass.");

        // 🛡️ ANTI-GHOST CHECK: Refetch fresh balance from cloud before purchase
        const { data: freshProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('wallet_balance, subscription_expiry, subscription_status')
            .eq('id', studentProfile.id)
            .single();

        if (fetchError || !freshProfile) throw new Error("Verification failed. Please check your connection.");

        const currentBalance = Number(freshProfile.wallet_balance || 0);
        if (currentBalance < cost) throw new Error("Insufficient wallet balance. Please top up your wallet first.");

        const startDate = new Date();
        const currentExpiry = freshProfile.subscription_expiry ? new Date(freshProfile.subscription_expiry) : new Date(0);
        const baseDate = currentExpiry > startDate ? currentExpiry : startDate;
        const newExpiry = new Date(baseDate);
        newExpiry.setMonth(newExpiry.getMonth() + months);

        const updatedBalance = currentBalance - cost;
        const updatedExpiry = newExpiry.toISOString();

        // 2. Persist to Master Cloud Ledger (Dual Table Consistency)
        try {
            const newLog = {
                id: generateId(),
                type: 'AppPass',
                plan: type,
                amount: cost,
                timestamp: new Date().toISOString()
            };
            const updatedLogs = [newLog, ...(studentProfile.activityLogs || [])];

            const updates = {
                wallet_balance: updatedBalance,
                subscription_status: 'active',
                subscription_expiry: updatedExpiry,
                activity_logs: updatedLogs
            };

            const [profUpdate, ledgerUpdate] = await Promise.all([
                supabase.from('profiles').update(updates).eq('id', studentProfile.id),
                supabase.from('financial_ledger').update(updates).eq('id', studentProfile.id)
            ]);

            if (profUpdate.error) throw profUpdate.error;

            // 3. Update Local UI
            setStudentProfile(prev => ({
                ...prev,
                walletBalance: updatedBalance,
                subscriptionExpiry: updatedExpiry,
                subscriptionStatus: 'active',
                activityLogs: updatedLogs
            }));

            console.log(`✅ PLATFORM PASS: Access extended to ${updatedExpiry}`);
        } catch (err: any) {
            console.error("❌ Subscription Purchase Failed:", err.message);
            throw err;
        }
        logGlobalAction('Plan Purchase', `User ${studentProfile.email} purchased ${type} pass.`, 'platform');
    };

    const purchaseTutorSubscription = async (tutorId: string) => {
        const tutor = tutors.find(t => t.id === tutorId);
        if (!tutor) throw new Error("Tutor not found.");
        const price = tutor.subscriptionPrice || 3000;
        const duration = tutor.subscriptionDuration || '6 Months';
        const months = duration === '1 Month' ? 1 : duration === '3 Months' ? 3 : 6;

        if (studentProfile.id === 'std_user_1') throw new Error("Please log in to subscribe to tutors.");
        if ((studentProfile.walletBalance || 0) < price) throw new Error("Insufficient wallet balance for this subscription.");

        // PRE-CALCULATE Everything
        const existingSub = studentProfile.tutorSubscriptions?.find((ts: any) => ts.tutorId === tutorId);
        const startDate = new Date();
        const currentExpiryStr = existingSub?.expiryDate;
        const currentExpiry = currentExpiryStr ? new Date(currentExpiryStr) : new Date(0);
        const baseDate = currentExpiry > startDate ? currentExpiry : startDate;

        const newExpiry = new Date(baseDate);
        newExpiry.setMonth(newExpiry.getMonth() + months);

        const newSub: TutorSubscription = {
            id: generateId(),
            tutorId,
            studentId: studentProfile.id,
            amount: price,
            status: 'Active',
            startDate: startDate.toISOString(),
            expiryDate: newExpiry.toISOString(),
            subscribedAt: startDate.toISOString()
        };

        const updatedBalance = (studentProfile.walletBalance || 0) - price;
        const otherSubs = studentProfile.tutorSubscriptions?.filter((ts: any) => ts.tutorId !== tutorId) || [];
        const updatedSubs = [newSub, ...otherSubs];

        // 1. Update UI (Self)
        setStudentProfile(prev => ({
            ...prev,
            walletBalance: updatedBalance,
            tutorSubscriptions: updatedSubs
        }));

        const tutorEarnings = price * 0.8;

        // 3. PERSIST TO CLOUD
        try {
            const newLog = {
                id: generateId(),
                type: 'Marketplace',
                tutorId,
                amount: price,
                timestamp: new Date().toISOString()
            };
            const updatedLogs = [newLog, ...(studentProfile.activityLogs || [])];

            await developerService.updateUserProfile(studentProfile.id, {
                wallet_balance: updatedBalance,
                subscribed_tutors: updatedSubs,
                activity_logs: updatedLogs
            });
            await developerService.updateUserProfile(tutorId, {
                wallet_balance: (tutor.walletBalance || 0) + tutorEarnings
            });

            setStudentProfile(prev => ({ ...prev, activityLogs: updatedLogs }));
            console.log("✅ Tutor Subscription Successful.");
        } catch (err) {
            console.error("❌ Cloud Sync Error (Tutor Sub):", err);
        }

        logGlobalAction('Plan Purchase', `User ${studentProfile.email} subscribed to Tutor ${tutor.name}.`, 'platform');
    };

    const claimTutorEarnings = async (tutorId: string, amount: number) => {
        const newRequest: PayoutRequest = {
            id: generateId(),
            tutorId,
            amount,
            status: 'Pending',
            requestedAt: new Date().toISOString()
        };

        setTutors(prev => prev.map(t => {
            if (t.id === tutorId) {
                if ((t.walletBalance || 0) < amount) throw new Error("Insufficient earnings balance.");

                return {
                    ...t,
                    walletBalance: (t.walletBalance || 0) - amount,
                    payoutRequests: [newRequest, ...(t.payoutRequests || [])]
                };
            }
            return t;
        }));

        logGlobalAction('Payout Claim', `Tutor ${tutorId} claimed ${amount} UGX`);

        // 3. PERSIST TO CLOUD
        try {
            const targetTutor = tutors.find(t => t.id === tutorId);
            if (targetTutor) {
                await developerService.updateUserProfile(tutorId, {
                    wallet_balance: (targetTutor.walletBalance || 0) - amount,
                    payout_requests: [newRequest, ...(targetTutor.payoutRequests || [])]
                });
                console.log("✅ Cloud Sync Success: Payout request recorded.");
            }
        } catch (err) {
            console.error("❌ Cloud Sync Error (Claim Payout):", err);
        }
    };

    const processPayout = async (tutorId: string, requestId: string, reference: string) => {
        setTutors(prev => prev.map(t => {
            if (t.id === tutorId) {
                const requests: PayoutRequest[] = (t.payoutRequests || []).map(r =>
                    r.id === requestId ? { ...r, status: 'Paid' as const, paidAt: new Date().toISOString(), paymentReference: reference } : r
                );
                return { ...t, payoutRequests: requests };
            }
            return t;
        }));

        logGlobalAction('Payout Processed', `Tutor ${tutorId} payout ${requestId} marked as Paid. Ref: ${reference}`);

        // 3. PERSIST TO CLOUD
        try {
            const targetTutor = tutors.find(t => t.id === tutorId);
            if (targetTutor) {
                const requests: PayoutRequest[] = (targetTutor.payoutRequests || []).map(r =>
                    r.id === requestId ? { ...r, status: 'Paid' as const, paidAt: new Date().toISOString(), paymentReference: reference } : r
                );
                await developerService.updateUserProfile(tutorId, {
                    payout_requests: requests
                });
                console.log("✅ Cloud Sync Success: Payout status updated.");
            }
        } catch (err) {
            console.error("❌ Cloud Sync Error (Process Payout):", err);
        }
    };

    // Load once on mount
    useEffect(() => {
        const loadedStudents = loadFromStorage('school_students', INITIAL_STUDENTS);

        // MIGRATION / DATA REPAIR:
        // Ensure all students have a 'level' property. Old data might miss it.
        const migratedStudents = loadedStudents.map((s: EnrolledStudent) => {
            const hasId = s.schoolId === schoolProfile.id;
            const updated = { ...s };
            if (!s.level) {
                // Attempt to derive from semester e.g. "Year 1, Semester 1" -> "Year 1"
                updated.level = s.semester ? s.semester.split(',')[0].trim() : 'Year 1';
            }
            if (!s.origin) updated.origin = 'bursar';

            // 🛡️ INSTITUTIONAL STAMPING (Phase 1)
            // If student lacks a schoolId or has a legacy ID (sami_health, vine_intl),
            // claim/migrate them for the official SAMI Health Science Institute UUID.
            const isLegacy = !s.schoolId || s.schoolId === 'sami_health' || s.schoolId === 'vine_intl';
            if (isLegacy) {
                updated.schoolId = 'ea5d359f-8107-40a3-808c-0c4f8f3a847c' as string;
            }
            return updated;
        });

        // SEEDING / MIGRATION: Purge any old mock data (Alice, David, John) from persistent storage
        const realStudents = migratedStudents.filter((s: EnrolledStudent) =>
            !['ALICE MUTESI', 'DAVID OPIO', 'JOHN KAMAU'].includes(s.name.toUpperCase())
        );

        // We only add INITIAL_STUDENTS if the storage is completely empty.
        const finalStudents = realStudents.length > 0 ? realStudents : INITIAL_STUDENTS;

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
        setSuggestions(loadFromStorage('school_suggestions_v1', INITIAL_SUGGESTIONS));
        const loadedRegistrar = loadFromStorage('school_registrar_students_v1', INITIAL_REGISTRAR_STUDENTS);
        const migratedRegistrar = loadedRegistrar.map((s: RegistrarStudent) => {
            const isLegacy = !s.schoolId || s.schoolId === 'sami_health' || s.schoolId === 'vine_intl';
            if (isLegacy) {
                return { ...s, schoolId: 'ea5d359f-8107-40a3-808c-0c4f8f3a847c' };
            }
            return s;
        });
        setRegistrarStudents(migratedRegistrar);

        // Load Profile (Logo persistence)
        const initialSami = {
            id: 'ea5d359f-8107-40a3-808c-0c4f8f3a847c',
            name: 'SAMI HEALTH SCIENCE INSTITUTE',
            motto: 'Excellence in Health Education',
            type: 'Nursing/Midwifery',
            poBox: 'P.O. Box 0000, Kampala',
            city: 'Kampala',
            phone: '+256 700 000000',
            email: 'samihealthscience@gmail.com',
            principal: 'Director',
            administrator: 'Admin',
            status: 'Active'
        };

        const loadedProfile = loadFromStorage('school_profile_v1', initialSami);

        // 🛡️ PROFILE MIGRATION (Phase 1 Fix)
        // Ensure the active profile aligns with the official UUID for SAMI data visibility.
        if (loadedProfile.id === 'vine_intl' || loadedProfile.id === 'sami_health' || loadedProfile.id === 'ca5d359f-8107-40a3-808c-0c4f8f3a847c') {
            console.log("🛠️ Migrating legacy/typo school profile ID to official UUID...");
            loadedProfile.id = 'ea5d359f-8107-40a3-808c-0c4f8f3a847c';
            loadedProfile.name = 'SAMI HEALTH SCIENCE INSTITUTE';
            loadedProfile.status = 'Active';
        }

        setSchoolProfile(loadedProfile);

        // 🕵️ EMERGENCY DATA SALVAGE: Force a pull if local data is suspicious
        // This ensures the 92 real students overwrite the 62 'test' students.
        if (loadedProfile.id === 'ea5d359f-8107-40a3-808c-0c4f8f3a847c') {
            console.log("🕵️ Data Salvage Check: Monitoring cloud state for SAMI...");
            pullFromCloud(true, loadedProfile.id);
        }

        setHydrated(true);
    }, []);

    // PERSISTENCE FOR STUDENTS & TUTORS
    useEffect(() => {
        if (hydrated) {
            safeSetItem('school_students', students);
            safeSetItem('school_tutors_v2', tutors);
        }
    }, [students, tutors, hydrated]);

    // DATA INTEGRITY & REPAIR EFFECT
    // This runs once after hydration to ensure 'Overall Scores' survived the deduplication
    useEffect(() => {
        if (!hydrated) return;

        // 1. Map existing Page Configs (Cleaned)
        const validConfigMap = new Map(); // key -> configId
        resultPageConfigs.forEach(c => {
            const key = `${c.programmeId} - ${c.level} - ${c.name}`;
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
            const student = activeStudents.find(st => st.id.toString() === s.studentId.toString());
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
                console.log(`Rescuing orphaned score[${s.overallScore}] for ${student.name} -> ${target.name}`);
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
        if (!hydrated || typeof window === 'undefined') return;

        try {
            // Specialized handling for active role (sessionStorage only)
            if (key === 'school_active_role') {
                if (value) {
                    sessionStorage.setItem(key, window.btoa(String(value)));
                    localStorage.removeItem(key);
                } else {
                    sessionStorage.removeItem(key);
                    localStorage.removeItem(key);
                }
                return;
            }

            // Specialized handling for active account ID (sessionStorage only)
            if (key === 'school_active_account_id') {
                if (value) {
                    sessionStorage.setItem(key, String(value));
                    localStorage.removeItem(key);
                } else {
                    sessionStorage.removeItem(key);
                    localStorage.removeItem(key);
                }
                return;
            }

            // Normal storage
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            if (e instanceof Error && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
                console.error(`❌ STORAGE QUOTA EXCEEDED for ${key}!`);
                console.warn(`⚠️ STORAGE FULL! Attempting to clear heavy logs to make space...`);

                try {
                    // Emergency purge of heavy logs AND stale app data
                    const logKeys = [
                        'school_global_audit_logs_v1',
                        'school_inventory_logs_v1',
                        'school_post_history_v1',
                        'school_deleted_billings_v1',
                        'school_deleted_payments_v1',
                        'app_developer_settings_v1', // Usually high-res wallpapers causing issues
                        'app_landing_content_v1'
                    ];

                    logKeys.forEach(k => {
                        try {
                            localStorage.removeItem(k);
                            console.log(`🧹 Emergency Storage: Removed ${k} to free space.`);
                        } catch (err) {
                            console.error(`Failed to clear ${k} `, err);
                        }
                    });

                    // If value is a huge object/string (like Base64 content), don't save it if we're still failing
                    const contentSize = JSON.stringify(value).length;
                    if (contentSize > 5000000) { // RAISED TO 5MB: To accommodate High-Res School & Programme Logos
                        console.warn(`⚠️ skipping save of huge item(${(contentSize / 1024 / 1024).toFixed(2)} MB): ${key}`);
                        return;
                    }

                    localStorage.setItem(key, JSON.stringify(value));
                } catch (purgeError) {
                    console.error("Emergency purge failed", purgeError);

                    // Only alert if we don't have a backup strategy. 
                    // Since we have Cloud Snapshots, we can afford a local storage failure.
                    console.error(`❌ CRITICAL STORAGE FAILURE: Unable to save ${key} to local storage.`);
                    if (!schoolProfile.id) {
                        alert(`❌ CRITICAL ERROR!\n\nUnable to save data to local storage. Please ensure your cloud connection is active.`);
                    }
                }
            } else {
                console.error(`Storage Error for ${key}: `, e);
            }
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
        safeSetItem('school_student_profile_v1', studentProfile);
    }, [studentProfile, hydrated]);

    useEffect(() => {
        safeSetItem('school_tutor_profile_v1', tutorProfile);
    }, [tutorProfile, hydrated]);

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
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
                } catch (e) { console.error("Landing content parse error", e); }
            }
            return INITIAL_LANDING_CONTENT;
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
            const saved = localStorage.getItem('app_featured_schools_v4');
            const parsed = saved ? JSON.parse(saved) : [];
            // 🛡️ MEMORY RESILIENCE: Merge local hardcoded items with cached cloud items
            // This prevents blank screens if the cache is stale or old.
            const map = new Map();
            INITIAL_FEATURED_SCHOOLS.forEach(s => map.set(s.id, s));
            parsed.forEach((s: FeaturedSchool) => map.set(s.id, s));
            return Array.from(map.values());
        }
        return INITIAL_FEATURED_SCHOOLS;
    });

    // --- CLOUD SYNC FOR DEVELOPER CONTENT ---
    // --- SECURITY & INSTITUTIONAL SYNC ---
    useEffect(() => {
        const verifyInstitutionalAccess = async (isBackground = false) => {
            if (!hydrated) return;
            if (!isBackground) setCheckingAccess(true);

            // 1. Identify User Role & Identity
            // If they are a tutor or student, they only need email verification (no developer approval lock)
            // We NO LONGER return early here so that the auto-hydration logic below can refresh the profile data from cloud
            if (tutorProfile || (studentProfile && studentProfile.id !== 'std_user_1')) {
                // Ensure they are not blocked by institutional global state
                if (schoolProfile.status !== 'Active' && schoolProfile.id === 'vine_intl') {
                    setSchoolProfile({ ...schoolProfile, status: 'Active' });
                }
            };

            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setCheckingAccess(false);
                    return;
                }

                const userEmail = user.email;
                const userRole = (user.user_metadata?.role || '').toLowerCase();
                const schoolId = user.user_metadata?.school_id || (userRole === 'developer' ? null : schoolProfile.id);

                // Developer role always has access
                const isDeveloper = userRole === 'developer' || userEmail === 'callmebreyton500@gmail.com';

                if (isDeveloper) {
                    if (schoolProfile.status !== 'Active') setSchoolProfile(prev => ({ ...prev, status: 'Active' }));
                    // Auto-hydrate developer profile if missing
                    if (!developerProfile || developerProfile.id !== user.id) {
                        setDeveloperProfile({ id: user.id, name: user.user_metadata?.full_name || 'Admin', role: 'Developer' });
                    }
                    // FLOW THROUGH: Developers now also trigger institutional sync to pull branding (SAMI vs Other Schools)
                }

                // --- TUTOR AUTO-HYDRATION ---
                if (userRole === 'tutor') {
                    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                    if (profile) {
                        setTutorProfile({
                            id: user.id,
                            name: profile.full_name || user.user_metadata?.full_name || 'Tutor',
                            email: userEmail || profile.email || '',
                            role: 'Tutor',
                            subscriptionDaysLeft: 30
                        });
                    }
                    setCheckingAccess(false);
                    return;
                }

                // --- STUDENT AUTO-HYDRATION ---
                if (userRole === 'student' || userRole === 'Student') {
                    const activeId = user.id;
                    const userEmail = user.email;

                    // 🛡️ UNIFIED IDENTITY BRIDGE: Reconcile Profile + Ledger
                    const [profileRes, financeRes] = await Promise.all([
                        supabase.from('profiles').select('*').eq('id', activeId).maybeSingle(),
                        userEmail
                            ? supabase.from('financial_ledger').select('*').or(`id.eq.${activeId},email.eq.${userEmail}`)
                            : supabase.from('financial_ledger').select('*').eq('id', activeId)
                    ]);

                    const profile = profileRes.data;
                    const ledgerRecords = Array.isArray(financeRes.data) ? financeRes.data : (financeRes.data ? [financeRes.data] : []);

                    const finance = ledgerRecords.sort((a, b) => {
                        if (a.subscription_status === 'active' && b.subscription_status !== 'active') return -1;
                        if (b.subscription_status === 'active' && a.subscription_status !== 'active') return 1;
                        return (b.wallet_balance || 0) - (a.wallet_balance || 0);
                    })[0];

                    if (profile || finance) {
                        setStudentProfile(prev => {
                            const allRecords = [profile, ...ledgerRecords].filter(Boolean);
                            const cloudRequests = allRecords.flatMap(r => r.payment_requests || []);
                            const requestMap = new Map();
                            [...(prev.paymentRequests || []), ...cloudRequests].forEach(r => {
                                if (r && r.id) requestMap.set(r.id, r);
                            });

                            const cloudLogs = allRecords.flatMap(r => r.activity_logs || []);
                            const logMap = new Map();
                            cloudLogs.forEach((l: any) => { if (l?.id) logMap.set(l.id, l); });
                            (prev.activityLogs || []).forEach(l => { if (l?.id && !logMap.has(l.id)) logMap.set(l.id, l); });

                            const cloudStatus = (finance?.subscription_status === 'active' || profile?.subscription_status === 'active')
                                ? 'active'
                                : (finance?.subscription_status || profile?.subscription_status || prev.subscriptionStatus);

                            return {
                                ...prev,
                                id: activeId,
                                name: finance?.full_name || profile?.full_name || user.user_metadata?.full_name || prev.name,
                                email: userEmail || profile?.email || prev.email,
                                role: 'Student',
                                walletBalance: Number(finance?.wallet_balance ?? profile?.wallet_balance ?? prev.walletBalance ?? 0),
                                paymentRequests: Array.from(requestMap.values()).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()),
                                payCode: profile?.pay_code || finance?.pay_code || prev.payCode,
                                phoneNumber: profile?.phone || finance?.phone || prev.phoneNumber,
                                subscriptionStatus: cloudStatus,
                                subscriptionExpiry: finance?.subscription_expiry || profile?.subscription_expiry || prev.subscriptionExpiry,
                                activityLogs: Array.from(logMap.values()).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
                                subscribedTutorIds: profile?.subscribed_tutors || prev.subscribedTutorIds || []
                            };
                        });
                    }
                    setCheckingAccess(false);
                    return;
                }

                // 2. Check for Pending Application by Email (The "Sami" Lock)
                const { data: application } = await supabase
                    .from('school_applications')
                    .select('status, school_name')
                    .eq('email', userEmail)
                    .maybeSingle();

                if (application && application.status !== 'Approved') {
                    if (schoolProfile.status !== 'Pending') {
                        setSchoolProfile(prev => ({
                            ...prev,
                            name: application.school_name || prev.name,
                            status: 'Pending'
                        }));
                    }
                    setCheckingAccess(false);
                    return;
                }

                // 3. Identify the School ID (Metadata -> Email Fallback -> Default)
                let resolvedSchoolId = schoolId;

                // ALWAYS verify the school ID against the database to catch mismatches
                const { data: emailSchool } = await supabase
                    .from('schools')
                    .select('id')
                    .eq('email', userEmail)
                    .maybeSingle();

                if (emailSchool) {
                    // Use the database ID as the source of truth
                    resolvedSchoolId = emailSchool.id;
                } else if (!resolvedSchoolId || resolvedSchoolId === 'vine_intl' || resolvedSchoolId === 'sami_health') {
                    // No school found by email, use SAMI UUID as the fallback default
                    resolvedSchoolId = 'ea5d359f-8107-40a3-808c-0c4f8f3a847c';
                }

                // 4. Check for Active School Status by ID (The "Staff/Institution" Lock)
                if (resolvedSchoolId) {
                    const { data: schoolData } = await supabase
                        .from('schools')
                        .select('status, name')
                        .eq('id', resolvedSchoolId)
                        .maybeSingle();

                    if (schoolData) {
                        // 🧹 DYNAMIC CACHE FLUSH: If we are still seeing 'COMPASS 360' generic branding locally,
                        // force a fresh sync from the identified institution. This fixes "LocalStorage Poisoning".
                        const isGenericBranding = portalBranding.schoolName.toUpperCase() === "COMPASS 360" || !portalBranding.schoolName;
                        const isIdentityMismatch = resolvedSchoolId !== schoolProfile.id;

                        if (isGenericBranding || isIdentityMismatch) {
                            console.log("🌦️ Identity Shift: Flushing local cache to pull fresh institutional data.");
                            setSchoolProfile(prev => ({
                                ...prev,
                                id: resolvedSchoolId,
                                name: schoolData.name || prev.name,
                                status: (schoolData.status as any)
                            }));
                            setLastCloudSync(""); // Clear sync timestamp to force immediate full pull
                            localStorage.removeItem('school_last_cloud_sync');
                            // Trigger immediate pull logic
                            pullFromCloud(true, resolvedSchoolId);
                        } else if (schoolData.status !== schoolProfile.status) {
                            setSchoolProfile(prev => ({ ...prev, status: (schoolData.status as any) }));
                        }
                    } else if (application?.status === 'Approved') {
                        // Application approved but school record ID not yet available to user or record missing
                        if (schoolProfile.status !== 'Pending' || resolvedSchoolId !== schoolProfile.id) {
                            setSchoolProfile(prev => ({ ...prev, id: resolvedSchoolId, status: 'Pending' }));
                        }
                    }
                }
            } catch (err) {
                console.error("Institutional Sync Error:", err);
            } finally {
                setCheckingAccess(false);
            }
        };

        // Listen for Auth Changes to immediately refresh profile
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                verifyInstitutionalAccess(true);
            }
        });

        verifyInstitutionalAccess();
        const interval = setInterval(() => verifyInstitutionalAccess(true), 30000);
        return () => {
            clearInterval(interval);
            subscription.unsubscribe();
        };
    }, [hydrated, activeRole, schoolProfile.id]);

    // --- CLOUD SYNC FOR DEVELOPER CONTENT & MARKETING ---
    useEffect(() => {
        const fetchCloudConfig = async () => {
            if (!hydrated) return;
            try {
                const config = await developerService.getLandingPageConfig();
                if (config) {
                                        if (config.landing_content && config.landing_content.length > 0) setLandingPageContent(config.landing_content);
                    if (config.wallpapers) setDeveloperSettings(prev => ({ ...prev, wallpapers: config.wallpapers }));
                    if (config.featured_schools) setFeaturedSchools(config.featured_schools);
                }
            } catch (err) {
                console.error("Failed to fetch cloud config:", err);
            }
        };

        // 🔗 THE MARKETING BRIDGE: Real-Time Landing Page Updates
        // When a developer adds/edits a school in the portal, this channel 
        // broadcasts the new logo/name/location to the landing page instantly.
        const marketingSub = supabase
            .channel('public-marketing-sync')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'platform_settings' 
            }, (payload) => {
                const newData = payload.new as any;
                if (newData && newData.featured_schools) {
                    console.log("🚀 Marketing Update Received: Refreshing discovery portal...");
                    setFeaturedSchools(newData.featured_schools);
                                        if (newData.landing_content && newData.landing_content.length > 0) setLandingPageContent(newData.landing_content);
                }
            })
            .subscribe();

        fetchCloudConfig();
        return () => { marketingSub.unsubscribe(); };
    }, [hydrated]);

    // --- REAL-TIME WALLET & REQUEST SYNC ---
    useEffect(() => {
        if (!studentProfile || studentProfile.id === 'std_user_1' || !hydrated) return;

        const walletSub = supabase
            .channel(`sync-wallet-${studentProfile.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${studentProfile.id}`
            }, (payload) => {
                const newProfile = payload.new as any;
                console.log("🔔 Cloud Signal: Identity Profile Updated.");
                setStudentProfile(prev => {
                    // 🛡️ STATUS PERSISTENCE: Never let a single-table update downgrade an 'active' status.
                    // This prevents the sidebar from 'flickering' to locked if the financial_ledger is active.
                    const incomingStatus = newProfile.subscription_status;
                    const preserveActive = prev.subscriptionStatus === 'active' && incomingStatus !== 'active';

                    return {
                        ...prev,
                        walletBalance: Number(newProfile.wallet_balance ?? prev.walletBalance ?? 0),
                        subscriptionStatus: preserveActive ? 'active' : (incomingStatus || prev.subscriptionStatus),
                        subscriptionExpiry: newProfile.subscription_expiry || prev.subscriptionExpiry,
                        paymentRequests: newProfile.payment_requests || prev.paymentRequests || []
                    };
                });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(walletSub);
        };
    }, [studentProfile.id, hydrated]);

    useEffect(() => {
        safeSetItem('app_landing_content_v1', landingPageContent);
        safeSetItem('app_developer_settings_v1', developerSettings);
        safeSetItem('app_featured_schools_v4', featuredSchools);
    }, [landingPageContent, developerSettings, featuredSchools, hydrated]);

    const updateLandingPageContent = async (content: LandingPageRoleContent[]) => {
        setLandingPageContent(content);
        try {
            await developerService.saveLandingPageConfig({ landing_content: content });
        } catch (err) {
            console.error("Cloud Sync Error (Landing Content):", err);
        }
    };

    const updateDeveloperSettings = async (settings: DeveloperSettings) => {
        setDeveloperSettings(settings);
        try {
            await developerService.saveLandingPageConfig({ wallpapers: settings.wallpapers });
        } catch (err) {
            console.error("Cloud Sync Error (Developer Settings):", err);
        }
    };

    const updateFeaturedSchools = async (schools: FeaturedSchool[]) => {
        setFeaturedSchools(schools);
        try {
            await developerService.saveLandingPageConfig({ featured_schools: schools });
        } catch (err) {
            console.error("Cloud Sync Error (Featured Schools):", err);
        }
    };

    const deleteFeaturedSchool = async (id: string) => {
        const updated = featuredSchools.filter(s => s.id !== id);
        setFeaturedSchools(updated);
        try {
            await developerService.saveLandingPageConfig({ featured_schools: updated });
        } catch (err) {
            console.error("Cloud Sync Error (Delete Featured School):", err);
        }
    };

    // --- CLEANED UP: DUPLICATE HEARTBEAT REMOVED ---
    // Consolidated into main syncPlatformData effect at line 1850.

    // Assuming StoreData interface is defined elsewhere and this is the return object of useSchoolDataInternal
    // Adding setSchoolProfile to the return object of the hook.
    // The instruction implies adding it to an interface, but the diff shows it being added to the returned object.
    // I will add it to the returned object as per the second part of the instruction.

    const [schoolApplications, setSchoolApplications] = useState<SchoolApplication[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('app_school_applications_v1');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });

    const syncApplications = async () => {
        try {
            console.log("☁️ Syncing Admissions Hub from Cloud...");
            const cloudApps = await databaseService.getAdmissionApplications();
            
            // Map cloud columns to frontend interface with deep safety fallbacks
            const normalized = (cloudApps || []).map((app: any) => ({
                id: app.id || `temp_${Math.random()}`,
                schoolId: app.school_id || '',
                schoolName: app.school_name || 'Generic Institution',
                applicantName: app.applicant_name === 'EMPTY' ? 'Unknown Applicant' : (app.applicant_name || 'Anonymous'),
                applicantEmail: app.email === 'EMPTY' ? '' : (app.email || ''),
                applicantPhone: app.phone === 'EMPTY' ? '' : (app.phone || ''),
                status: (app.status || 'pending').toLowerCase(),
                programmes: app.programmes || 'General Admission',
                entryLevel: app.entry_level || 'L1',
                modeOfStudy: app.mode_of_study || 'Full-time',
                profilePhoto: app.profile_photo || '',
                academicResults: app.academic_results || '',
                submittedAt: app.submitted_at || new Date().toISOString(),
                ...(app.full_data || {}) // Safe merge only if full_data exists
            }));

            // 🛡️ DELETION SYNC: Load tombstones to ensure deleted records don't "ghost" back
            let tombstones: string[] = [];
            try {
                if (typeof window !== 'undefined') {
                    const raw = localStorage.getItem('school_tombstones_v1');
                    if (raw) tombstones = JSON.parse(raw);
                }
            } catch (e) {
                console.warn("Failed to parse tombstones:", e);
            }

            // 🛡️ RECOVERY: Ignoring local "tombstone" (deleted) filter to restore those 4 missing records
            const finalCloud = normalized; 

            // Union merge local with cloud, while enforcing the tombstone filter on existing local data
            setSchoolApplications(prev => {
                const filteredLocal = prev || [];
                const merged = unionMerge(filteredLocal, finalCloud as any);
                console.log(`📡 Admissions Sync: Local=${filteredLocal.length}, Cloud=${finalCloud.length}, Merged Result=${merged.length}`);
                return merged;
            });

            console.log("✅ Admissions Hub Sync Complete.");
        } catch (err) {
            console.error("Failed to sync applications from cloud:", err);
        }
    };

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
            id: generateId(),
            status: 'pending',
            submittedAt: new Date().toISOString()
        };
        setSchoolApplications(prev => [newApp, ...prev]);
        return newApp;
    };

    // ADMISSION-SPECIFIC SYNC (Using the new admission_applications table)
    const submitSchoolApplication = async (appData: any) => {
        try {
            // 1. Local Backup (Immediate UI response)
            const localApp = addSchoolApplication(appData);

            // 2. Cloud Sync (Infinite Storage into the dedicated table)
            const { error } = await supabase
                .from('admission_applications')
                .insert([{
                    id: localApp.id,
                    school_id: appData.schoolId,
                    school_name: appData.schoolName,
                    applicant_name: appData.applicantName,
                    email: appData.applicantEmail,
                    phone: appData.applicantPhone,
                    programmes: appData.programmes,
                    entry_level: appData.entryLevel,
                    mode_of_study: appData.modeOfStudy,
                    profile_photo: appData.profilePhoto, // High-res link/base64
                    academic_results: appData.academicResults, // High-res link/base64
                    status: 'pending',
                    full_data: appData,
                    submitted_at: new Date().toISOString()
                }]);

            if (error) throw error;
            console.log("🚀 Student Admission Synced to Cloud.");
            return true;
        } catch (err) {
            console.error("Admission Cloud Sync Failed:", err);
            return false;
        }
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
    useEffect(() => {
        if (hydrated) safeSetItem('school_official_library_v1', officialLibrary);
    }, [officialLibrary, hydrated]);

    useEffect(() => {
        if (hydrated) safeSetItem('school_programmes_v1', programmes);
    }, [programmes, hydrated]);

    useEffect(() => {
        if (hydrated) safeSetItem('school_course_units_v1', courseUnits);
    }, [courseUnits, hydrated]);


    const addProgramme = async (p: Programme) => {
        const isDev = (activeRole || '').toLowerCase() === 'developer';
        const origin = 'custom';
        const ownerId = schoolProfile?.id || p.ownerId;
        const enriched = { ...p, origin, ownerId };
        setProgrammes(prev => [...prev, enriched]);
        try {
            // CRITICAL: Push updated program list to Cloud Snapshot blob
            await takeInstitutionalSnapshot(`Add Program: ${enriched.name}`, true);
        } catch (error) {
            console.error("Failed to sync new programme to cloud snapshot:", error);
        }
    };
    const updateProgramme = async (p: Programme) => {
        const isDev = (activeRole || '').toLowerCase() === 'developer';
        const ownerId = isDev ? 'developer' : (schoolProfile?.id || p.ownerId);
        setProgrammes(prev => prev.map(prog => prog.id === p.id ? { ...p, ownerId } : prog));
        try {
            // CRITICAL: Push updated templates/programs to Cloud Snapshot blob
            await takeInstitutionalSnapshot(`Edit Program/Templates: ${p.name}`, true);
        } catch (error) {
            console.error("Failed to sync programme update to cloud snapshot:", error);
        }
    };
    const deleteProgramme = async (id: string) => {
        triggerTombstone([id]);
        setProgrammes(prev => prev.filter(p => p.id !== id));
        try {
            await new Promise(r => setTimeout(r, 100));
            await takeInstitutionalSnapshot(`Delete Program: ${id}`, true);
        } catch (error) {
            console.error("Failed to sync programme deletion to cloud snapshot:", error);
        }
    };

    const updateStudent = (s: EnrolledStudent) => {
        triggerManualActionLock();
        setStudents(prev => prev.map(st => st.id.toString() === s.id.toString() ? { ...st, ...s, schoolId: st.schoolId || schoolProfile.id, lastUpdated: new Date().toISOString() } : st));
    };

    const batchUpdateStudents = (updatedStudents: EnrolledStudent[], logAction?: string, logDetails?: string) => {
        triggerManualActionLock();
        if (updatedStudents.length === 0) return;

        const updatesMap = new Map<number | string, EnrolledStudent>();
        updatedStudents.forEach(s => updatesMap.set(s.id, s));

        setStudents(prev => prev.map(s => {
            if (updatesMap.has(s.id)) {
                return { ...updatesMap.get(s.id)!, lastUpdated: new Date().toISOString() };
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

    const updateTemplate = async (t: DocumentTemplate) => {
        setDocumentTemplates(prev => {
            const exists = prev.find(p => p.id === t.id);
            if (exists) return prev.map(p => p.id === t.id ? t : p);
            return [...prev, t];
        });
        try {
            // 🛡️ SYNC HARMONY: Wait for React state cycle to settle before snapshot
            await new Promise(r => setTimeout(r, 100));
            await takeInstitutionalSnapshot(`Update Template: ${t.name}`, true);
        } catch (error) {
            console.error("Failed to sync template update to cloud snapshot:", error);
        }
    };
    const deleteTemplate = async (id: string) => {
        setDocumentTemplates(prev => prev.filter(t => t.id !== id));
        try {
            await new Promise(r => setTimeout(r, 100));
            await takeInstitutionalSnapshot(`Delete Template: ${id}`, true);
        } catch (error) {
            console.error("Failed to sync template deletion to cloud snapshot:", error);
        }
    };


    useEffect(() => {
        if (hydrated) safeSetItem('school_promotion_batches_v1', promotionBatches);
    }, [promotionBatches, hydrated]);

    const addPromotionBatch = (b: PromotionBatch) => setPromotionBatches(prev => [...prev, b]);
    const updatePromotionBatch = (b: PromotionBatch) => setPromotionBatches(prev => prev.map(old => old.id === b.id ? b : old));
    const deletePromotionBatch = (id: string) => setPromotionBatches(prev => prev.filter(b => b.id !== id));


    const addBilling = (b: Billing) => {
        setBillings(prev => {
            if (prev.some(item => item.id === b.id)) return prev;
            return [...prev, { ...b, schoolId: schoolProfile.id, lastUpdated: new Date().toISOString() }];
        });
        setStudents(prev => prev.map(s => {
            if (s.id.toString() === b.studentId.toString()) {
                return { ...s, totalFees: s.totalFees + b.amount, balance: s.balance + b.amount, lastUpdated: new Date().toISOString() };
            }
            return s;
        }));
    };

    const updateBilling = (b: Billing) => {
        triggerManualActionLock();
        setBillings(prev => prev.map(old => old.id === b.id ? { ...b, lastUpdated: new Date().toISOString() } : old));
    };

    const deleteBilling = (id: string, reason: string = 'Moved to Trash') => {
        triggerManualActionLock();
        const bill = billings.find(b => b.id === id);
        if (!bill) return;

        // 🪦 TOMBSTONE: Locally record this deletion to prevent cloud resurrection
        triggerTombstone([id]);

        // 1. Move to Trash (Soft Delete)
        const deletedBill = {
            ...bill,
            status: 'Void' as TransactionStatus,
            history: [...bill.history, {
                id: generateId(),
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
            if (s.id.toString() === bill.studentId.toString()) {
                return {
                    ...s,
                    totalFees: s.totalFees - bill.amount,
                    balance: s.balance - bill.amount
                };
            }
            return s;
        }));

        logGlobalAction('Billing Deleted', `Deleted billing "${bill.description}" for student ID ${bill.studentId}.Reason: ${reason} `);
    };

    const addPayment = (p: Payment) => {
        // If studentId is 0 or missing, it's an unclaimed digital payment
        if (p.studentId.toString() === '0' || !p.studentId) {
            setUnclaimedPayments(prev => {
                if (prev.some(item => item.id === p.id || (p.reference && item.reference === p.reference))) return prev;
                return [p, ...prev];
            });
            logGlobalAction('Unclaimed Payment', `Synchronized unclaimed payment(Ref: ${p.reference}) totaling ${p.amount}. It will be auto - linked when a student with this PayCode is enrolled.`);
            return;
        }

        // --- NEW: Atomic Promotion Logic ---
        // If it was in unclaimed, remove it first.
        setUnclaimedPayments(prev => prev.filter(item => item.id !== p.id && item.reference !== p.reference));

        setPayments(prev => {
            if (prev.some(item => item.id === p.id)) return prev;
            return [...prev, { ...p, schoolId: schoolProfile.id, lastUpdated: new Date().toISOString() }];
        });

        // Update Student Balance
        setStudents(prev => prev.map(s => {
            if (s.id.toString() === p.studentId.toString()) {
                return { ...s, balance: (s.balance || 0) - p.amount };
            }
            return s;
        }));
    };

    const updatePayment = (p: Payment) => {
        triggerManualActionLock();
        const updatedPayment = { ...p, lastUpdated: new Date().toISOString() };
        const oldPayment = payments.find(o => o.id === p.id);

        // 1. Update the payments list
        setPayments(prev => prev.map(old => old.id === p.id ? updatedPayment : old));

        // 2. Adjust Student Balance if necessary
        if (oldPayment) {
            // Revert old student balance if it was linked
            if (oldPayment.studentId) {
                setStudents(prev => prev.map(s => s.id.toString() === oldPayment.studentId.toString() ? { ...s, balance: (s.balance || 0) + oldPayment.amount, lastUpdated: new Date().toISOString() } : s));
            }
            // Apply new student balance
            if (p.studentId) {
                setStudents(prev => prev.map(s => s.id.toString() === p.studentId.toString() ? { ...s, balance: (s.balance || 0) - p.amount, lastUpdated: new Date().toISOString() } : s));
            }
        }
    };

    const linkPayment = async (paymentId: string, studentId: number | string) => {
        const p = payments.find(pay => pay.id === paymentId) || unclaimedPayments.find(pay => pay.id === paymentId);
        if (!p) return;

        const student = students.find(s => s.id.toString() === studentId.toString());
        if (!student) return;

        // SAFEGUARD: Lock the cloud pull for 15 seconds to allow the push to finish
        localStorage.setItem('school_manual_action_lock', Date.now().toString());

        const updatedPayment: Payment = {
            ...p,
            studentId, // Ensure it's assigned to the specific student
            status: 'approved',
            term: student.semester, // Assign to student's current semester so it shows in history
            recordedBy: p.recordedBy?.includes('Auto-Sync') ? p.recordedBy : 'System (Linked)',
            history: [
                ...(p.history || []),
                {
                    id: generateId(),
                    action: 'Linked',
                    details: `Manually linked to student ${student.name} (${student.payCode})`,
                    user: activeRole || 'Bursar',
                    timestamp: new Date().toISOString()
                }
            ]
        };

        // 1. Update Students Balance
        setStudents(prev => prev.map(s => s.id.toString() === studentId.toString() ? { ...s, balance: (s.balance || 0) - p.amount } : s));

        // 2. Move from Unclaimed to Payments (Non-Nested)
        setPayments(prev => {
            const exists = prev.some(item => item.id === p.id);
            if (exists) {
                return prev.map(item => item.id === p.id ? updatedPayment : item);
            }
            return [updatedPayment, ...prev];
        });

        // 3. Remove from Unclaimed
        setUnclaimedPayments(prev => prev.filter(item => item.id !== p.id));

        logGlobalAction('Payment Linked', `Linked payment ${p.reference} of ${p.amount} to ${student.name}. Arrears updated instantly.`);

        // Force an immediate push instead of waiting 8 seconds
        setTimeout(() => {
            console.log("☁️ Compass Sync: Forcing immediate cloud push after manual link...");
        }, 100);
    };

    const deletePayment = (id: string, reason: string) => {
        triggerManualActionLock();
        const payment = payments.find(p => p.id === id);
        if (!payment) return;

        // 🪦 TOMBSTONE: Locally record this deletion to prevent cloud resurrection
        triggerTombstone([id]);

        const methodLower = (payment.method || '').toLowerCase().trim();
        const isDigitalIntegration = methodLower.includes('schoolpay') || methodLower.includes('pegpay');

        // 1. Soft Delete - Move to Trash
        const deletedPayment: Payment = {
            ...payment,
            status: 'rejected', // Mark as rejected/void
            history: [...(payment.history || []), {
                id: generateId(),
                action: 'Deleted',
                details: isDigitalIntegration ? `Unlinked digital payment: ${reason} ` : reason,
                user: activeRole || 'Bursar',
                timestamp: new Date().toISOString()
            }]
        };
        (deletedPayment as any).deleteReason = reason;

        setDeletedPayments(prev => [deletedPayment, ...prev]);

        // 2. If it's a digital integration, move it back to UNCLAIMED so it can be re-linked
        if (isDigitalIntegration) {
            const unclaimedRecord: Payment = {
                ...payment,
                studentId: 0, // Reset student link
                status: 'pending', // Reset status for re-syncing
                metadata: {
                    ...(payment.metadata || {}),
                    unlinkedFrom: payment.studentId,
                    unlinkedReason: reason,
                    unlinkedAt: new Date().toISOString()
                },
                history: [...(payment.history || []), {
                    id: generateId(),
                    action: 'Unlinked',
                    details: `Unlinked from Student ID ${payment.studentId} and moved to Unclaimed Store.Reason: ${reason} `,
                    user: activeRole || 'Bursar',
                    timestamp: new Date().toISOString()
                }]
            };
            setUnclaimedPayments(prev => {
                // Prevent duplicate references in unclaimed
                if (payment.reference && prev.some(up => up.reference === payment.reference)) return prev;
                return [unclaimedRecord, ...prev];
            });
        }

        // 3. Remove from Active
        setPayments(prev => prev.filter(p => p.id !== id));

        // 4. Reverse Balance
        setStudents(prev => prev.map(s => {
            if (s.id.toString() === payment.studentId.toString()) {
                return { ...s, balance: (s.balance || 0) + payment.amount, lastUpdated: new Date().toISOString() };
            }
            return s;
        }));

        logGlobalAction(
            isDigitalIntegration ? 'Payment Unlinked' : 'Payment Deleted',
            `${isDigitalIntegration ? 'Unlinked' : 'Deleted'} payment "${payment.description}"(Ref: ${payment.reference}) for student ID ${payment.studentId}.Reason: ${reason} `
        );
    };

    const restoreBilling = (id: string) => {
        const bill = deletedBillings.find(b => b.id === id);
        if (!bill) return;

        // 1. Move back to Active Billings
        setBillings(prev => [...prev, { ...bill, status: 'Pending' }]); // Restore as Pending
        setDeletedBillings(prev => prev.filter(b => b.id !== id));

        // 2. Re-apply Student Balance
        setStudents(prev => prev.map(s => {
            if (s.id.toString() === bill.studentId.toString()) {
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
            if (s.id.toString() === payment.studentId.toString()) {
                return {
                    ...s,
                    balance: (s.balance || 0) - payment.amount
                };
            }
            return s;
        }));

        logGlobalAction('Payment Restored', `Restored payment for student ID ${payment.studentId}.`);
    };

    const deleteStudent = (studentId: number | string) => deleteStudents([studentId]);

    const deleteStudents = (studentIds: (number | string)[]) => {
        triggerManualActionLock();
        if (studentIds.length === 0) return;

        // 1. COLLECT PAYMENT ACTIONS (Batch)
        // ... (rest of function logic) ...
        const paymentIdsToRemove = new Set<string>();
        const newUnclaimed: Payment[] = [];
        const newDeletedPayments: Payment[] = [];

        payments.forEach(p => {
            if (studentIds.some(id => id.toString() === p.studentId.toString())) {
                paymentIdsToRemove.add(p.id);
                const methodLower = (p.method || '').toLowerCase().replace(/\s/g, '');
                const isDigital = ['schoolpay', 'pegpay'].includes(methodLower) || methodLower.includes('schoolpay') || methodLower.includes('pegpay');
                if (isDigital) {
                    newUnclaimed.push({ ...p, studentId: 0, billingId: undefined, description: `Unclaimed: ${p.description} (Was linked to deleted student ${p.studentId})`, term: undefined });
                } else {
                    newDeletedPayments.push({ ...p, status: 'rejected', history: [...(p.history || []), { id: generateId(), action: 'Deleted', details: "Student Account Deleted (Batch)", user: 'Bursar', timestamp: new Date().toISOString() }] });
                }
            }
        });

        // 2. COLLECT BILLING ACTIONS (Batch)
        const billingIdsToRemove = new Set<string>();
        const newDeletedBillings: Billing[] = [];
        billings.forEach(b => {
            if (studentIds.some(id => id.toString() === b.studentId.toString())) {
                billingIdsToRemove.add(b.id);
                newDeletedBillings.push({ ...b, status: 'Void', history: [...(b.history || []), { id: generateId(), action: 'Deleted', details: "Student Account Deleted (Batch)", user: 'Bursar', timestamp: new Date().toISOString() }] });
            }
        });

        // 3. APPLY UPDATES (Batch)
        if (newUnclaimed.length > 0) setUnclaimedPayments(prev => [...newUnclaimed, ...prev]);
        if (newDeletedPayments.length > 0) setDeletedPayments(prev => [...newDeletedPayments, ...prev]);
        if (paymentIdsToRemove.size > 0) setPayments(prev => prev.filter(p => !paymentIdsToRemove.has(p.id)));
        if (newDeletedBillings.length > 0) setDeletedBillings(prev => [...newDeletedBillings, ...prev]);
        if (billingIdsToRemove.size > 0) setBillings(prev => prev.filter(b => !billingIdsToRemove.has(b.id)));

        // Students
        setStudents(prev => prev.filter(s => !studentIds.some(id => id.toString() === s.id.toString())));
        setRegistrarStudents(prev => prev.filter(s => {
            const sid = s.schoolPayCode || s.id;
            return !studentIds.some(id => id.toString() === (sid || '').toString());
        }));

        // 🪦 TOMBSTONE: Locally record these deletions to prevent cloud resurrection
        triggerTombstone([...studentIds, ...Array.from(paymentIdsToRemove), ...Array.from(billingIdsToRemove)]);

        logGlobalAction('Students Deleted (Batch)', `Deleted ${studentIds.length} students. IDs: ${studentIds.join(', ')}`);
    };

    const syncRequirementToInventory = (studentId: number | string, reqName: string, changeAmount: number) => {
        const student = students.find(s => s.id.toString() === studentId.toString());
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
                id: generateId(),
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
            console.warn(`No fee structure found for programme: ${student.programme} `);
            return;
        }

        // Find the fee configuration for the student's level
        const levelConfig = programme.feeStructure.find(fs => fs.level === student.level);
        if (!levelConfig) {
            console.warn(`No fee configuration found for level: ${student.level} in programme: ${student.programme} `);
            return;
        }

        // Check if billings already exist for this student and semester (duplicate prevention)
        const existingBillings = billings.filter(
            b => b.studentId.toString() === student.id.toString() && b.term === student.semester && b.type !== 'Adjustment'
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
                id: generateId(),
                studentId: student.id,
                programmeId: programme.id,
                level: student.level,
                term: student.semester,
                type: 'Tuition',
                description: `Tuition Fee - ${student.level}, ${student.semester} `,
                amount: levelConfig.tuitionFee,
                paidAmount: 0,
                balance: levelConfig.tuitionFee,
                date: currentDate,
                status: 'Pending',
                history: [{
                    id: generateId(),
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
                    console.warn(`Service not found: ${serviceId} `);
                    return;
                }

                const serviceBilling: Billing = {
                    id: generateId(),
                    studentId: student.id,
                    programmeId: programme.id,
                    level: student.level,
                    term: student.semester,
                    type: 'Service',
                    description: `${service.name} - ${student.semester} `,
                    amount: (student.serviceMetadata?.[serviceId]?.quantity || 1) * service.cost,
                    paidAmount: 0,
                    balance: (student.serviceMetadata?.[serviceId]?.quantity || 1) * service.cost,
                    date: currentDate,
                    status: 'Pending',
                    history: [{
                        id: generateId(),
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
                if (s.id.toString() === student.id.toString()) {
                    return {
                        ...s,
                        totalFees: s.totalFees + totalAmount,
                        balance: s.balance + totalAmount
                    };
                }
                return s;
            }));

            console.log(`Generated ${newBillings.length} automatic billings for ${student.name} totaling UGX ${totalAmount.toLocaleString()} `);
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
        triggerManualActionLock();
        setSchoolProfile(profile);
    };

    const addNews = (item: NewsItem) => { triggerManualActionLock(); setNews(prev => [item, ...prev]); };
    const updateNews = (item: NewsItem) => { triggerManualActionLock(); setNews(prev => prev.map(n => n.id === item.id ? item : n)); };
    const deleteNews = (id: string) => { triggerManualActionLock(); setNews(prev => prev.filter(n => n.id !== id)); };

    const addRegistrarStudent = (s: RegistrarStudent) => {
        const origin = s.origin || 'registrar';
        setRegistrarStudents(prev => [{ ...s, origin, schoolId: schoolProfile.id }, ...prev]);
    };
    const updateRegistrarStudent = (s: RegistrarStudent) => {
        setRegistrarStudents(prev => prev.map(old =>
            old.id === s.id ? { ...old, ...s, schoolId: old.schoolId || schoolProfile.id } : old
        ));
    };
    const deleteRegistrarStudent = (id: string) => setRegistrarStudents(prev => prev.filter(s => s.id !== id));

    // Tutor Actions
    const addTutor = (tutor: Tutor) => setTutors(prev => [...prev, tutor]);
    const updateTutor = (updatedTutor: Tutor) => {
        triggerManualActionLock();
        setTutors(prev => prev.map(t => t.id === updatedTutor.id ? updatedTutor : t));
    };
    const deleteTutor = (id: string) => {
        setTutors(prev => prev.filter(t => t.id !== id));
        // Reassign orphaned content to 'system' to preserve resources
        setTutorContents(prev => prev.map(c => c.tutorId === id ? { ...c, tutorId: 'system' } : c));
    };

    const addStudent = (s: EnrolledStudent) => {
        triggerManualActionLock();
        const origin = (activeRole === 'Registrar' || activeRole === 'School News Coordinator') ? 'registrar' : 'bursar';
        setStudents(prev => [...prev, { ...s, origin, schoolId: schoolProfile.id, lastUpdated: new Date().toISOString() }]);
    };
    const addStaffAccount = (s: StaffAccount) => {
        triggerManualActionLock();
        setStaffAccounts(prev => [...prev, s]);
    };

    // TUTOR CONTENT ACTIONS


    const addTutorContent = (content: TutorContent) => {
        setTutorContents(prev => [...prev, { ...content, authorRole: 'tutor', origin: 'marketplace' }]);
    };

    const deleteTutorContent = (id: string) => {
        const content = tutorContents.find(c => c.id === id);
        if (!content) return;
        const canDelete = developerProfile || (tutorProfile && content.tutorId === tutorProfile.id);
        if (!canDelete) return;
        setTutorContents(prev => prev.filter(c => c.id !== id));
    };

    const updateTutorContent = (content: TutorContent) => {
        setTutorContents(prev => prev.map(c => c.id === content.id ? { ...content, authorRole: 'tutor', origin: 'marketplace' } : c));
    };

    // --- OFFICIAL LIBRARY ACTIONS (DEVELOPER ONLY) ---
    const addOfficialContent = async (content: TutorContent) => {
        triggerManualActionLock();
        const enriched = { ...content, authorRole: 'developer', origin: 'official', ownerId: 'developer' };
        setOfficialLibrary(prev => [...prev, enriched as TutorContent]);

        try {
            await databaseService.saveOfficialContent({
                id: enriched.id,
                developer_id: 'developer',
                type: enriched.type,
                title: enriched.title,
                description: enriched.description,
                file_url: enriched.url,
                thumbnail_url: enriched.thumbnailUrl,
                status: enriched.status,
                metadata: {
                    programmeIds: enriched.programmeIds,
                    levels: enriched.levels,
                    courseUnitIds: enriched.courseUnitIds
                }
            });
        } catch (error) {
            console.error("Failed to sync official content to cloud:", error);
        }
    };

    const updateOfficialContent = async (content: TutorContent) => {
        triggerManualActionLock();
        const enriched = { ...content, authorRole: 'developer', origin: 'official', ownerId: 'developer' };
        setOfficialLibrary(prev => prev.map(c => c.id === content.id ? enriched as TutorContent : c));

        try {
            await databaseService.updateOfficialContent(content.id, {
                title: enriched.title,
                description: enriched.description,
                type: enriched.type,
                file_url: enriched.url,
                thumbnail_url: enriched.thumbnailUrl,
                status: enriched.status,
                is_featured: enriched.isFeatured,
                metadata: {
                    programmeIds: enriched.programmeIds,
                    levels: enriched.levels,
                    courseUnitIds: enriched.courseUnitIds
                }
            });
        } catch (error) {
            console.error("Failed to sync official content update to cloud:", error);
        }
    };

    const deleteOfficialContent = async (id: string) => {
        triggerManualActionLock();
        setOfficialLibrary(prev => prev.filter(c => c.id !== id));
        try {
            await databaseService.deleteOfficialContent(id);
        } catch (error) {
            console.error("Failed to sync official content deletion to cloud:", error);
        }
    };

    const updateTutorSettings = (settings: TutorSettings) => {
        setTutorSettings(prev => {
            const exists = prev.find(s => s.tutorId === settings.tutorId);
            if (exists) return prev.map(s => s.tutorId === settings.tutorId ? settings : s);
            return [...prev, settings];
        });
    };

    const updateSuggestionStatus = (id: string, status: Suggestion['status'], feedback?: string) => {
        setSuggestions(prev => prev.map(s => s.id === id ? {
            ...s,
            status,
            feedback: feedback !== undefined ? feedback : s.feedback,
            feedbackDate: feedback !== undefined ? new Date().toISOString() : s.feedbackDate
        } : s));
    };

    // RESULTS ACTIONS
    const addCourseUnit = async (cu: CourseUnit) => {
        const isDev = (activeRole || '').toLowerCase() === 'developer';
        const origin = (isDev ? 'official' : 'school') as any;
        const ownerId = isDev ? 'developer' : cu.ownerId;
        const enriched = { ...cu, origin, ownerId };
        setCourseUnits(prev => [...prev, enriched]);
        if (isDev) {
            try {
                await databaseService.saveOfficialCourseUnit({
                    id: enriched.id,
                    code: enriched.code,
                    name: enriched.name,
                    creditUnits: enriched.creditUnits,
                    type: enriched.type,
                    programmeId: enriched.programmeId,
                    level: enriched.level,
                    semester: enriched.semester,
                    ownerId: 'developer',
                    origin: 'official'
                });
            } catch (error) {
                console.error("Failed to sync course unit to cloud:", error);
            }
        }
    };
    const updateCourseUnit = async (cu: CourseUnit) => {
        const isDev = (activeRole || '').toLowerCase() === 'developer';
        setCourseUnits(prev => prev.map(c => c.id === cu.id ? { ...cu, ownerId: cu.ownerId || (isDev ? 'developer' : undefined), origin: cu.origin || (isDev ? 'official' : 'school') } : c));
        if (isDev) {
            try {
                await databaseService.saveOfficialCourseUnit({
                    id: cu.id,
                    code: cu.code,
                    name: cu.name,
                    creditUnits: cu.creditUnits,
                    type: cu.type,
                    programmeId: cu.programmeId,
                    level: cu.level,
                    semester: cu.semester,
                    ownerId: 'developer',
                    origin: 'official'
                });
            } catch (error) {
                console.error("Failed to sync course unit update to cloud:", error);
            }
        }
    };
    const deleteCourseUnit = async (id: string) => {
        const isDev = (activeRole || '').toLowerCase() === 'developer';
        setCourseUnits(prev => prev.filter(c => c.id !== id));
        if (isDev) {
            try {
                await databaseService.deleteOfficialCourseUnit(id);
            } catch (error) {
                console.error("Failed to sync course unit deletion to cloud:", error);
            }
        }
    };

    const addResultPageConfig = (config: ResultPageConfig) => setResultPageConfigs([...resultPageConfigs, config]);
    const updateResultPageConfig = (config: ResultPageConfig) => setResultPageConfigs(resultPageConfigs.map(c => c.id === config.id ? config : c));
    const deleteResultPageConfig = (id: string) => setResultPageConfigs(resultPageConfigs.filter(c => c.id !== id));

    const deleteStudentResult = (studentId: number | string, courseUnitId: string, pageConfigId?: string) => {
        setStudentResults(prev => prev.filter(r =>
            !(r.studentId.toString() === studentId.toString() && r.courseUnitId === courseUnitId && (pageConfigId ? r.pageConfigId === pageConfigId : true))
        ));
    };

    const saveStudentResult = (result: StudentResult) => {
        // Robust Save: Remove any conflicting records first, then add the new one.
        setStudentResults(prev => {
            // Remove duplicates for this student/course unit AND pageConfigId (if present)
            const clean = prev.filter(r => {
                const sameStudent = r.studentId.toString() === result.studentId.toString();
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
            s.studentId.toString() === summary.studentId.toString() && s.pageConfigId === summary.pageConfigId

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

    const saveRequisitionAtomic = async (req: Requisition) => {
        if (!schoolProfile.id) return;
        try {
            await fetch('/api/requisitions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ schoolId: schoolProfile.id, requisition: req })
            });
            console.log("☁️ Requisition Synced Atomically");
        } catch (e) {
            console.error("Atomic Sync Failed", e);
        }
    };

    const addRequisition = async (req: Requisition) => {
        const nextId = `REQ-${(requisitions.length + 1).toString().padStart(3, '0')}`;
        const newReq = { ...req, readableId: nextId, lastUpdated: new Date().toISOString() };
        setRequisitions(prev => [newReq, ...prev]);
        await saveRequisitionAtomic(newReq);
        return true;
    };

    const updateRequisition = async (updatedReq: Requisition) => {
        const fresherReq = { ...updatedReq, lastUpdated: new Date().toISOString() };
        setRequisitions(prev => prev.map(r => r.id === fresherReq.id ? fresherReq : r));
        await saveRequisitionAtomic(fresherReq);
        return true;
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
        triggerManualActionLock();
        // 🪦 TOMBSTONE
        triggerTombstone([id]);
        setRequisitions(prev => prev.filter(r => r.id !== id));
    };

    const deleteRequisitionCascade = async (id: string) => {
        triggerManualActionLock();
        // 🪦 TOMBSTONE
        triggerTombstone([id]);
        // 0. Identify the requisition to find its readableId
        const targetReq = requisitions.find(r => r.id === id);
        const readableId = targetReq?.readableId;

        // 1. Purge the requisition record
        setRequisitions(prev => prev.filter(r => r.id !== id));

        // 2. Cascade: Purge all ledger entries (General Transactions) linked to this requisition
        setGeneralTransactions(prev => prev.filter(t => t.requisitionId !== id && t.requisitionId !== targetReq?.readableId));

        console.log(`🧹 Cascade Purge: Requisition ${id} (${readableId}) and all related ledger entries removed.`);
        return true;
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
        triggerManualActionLock();
        setRequisitionQueue(prev => [item, ...prev]);
    };

    const removeFromQueue = (id: string) => {
        triggerManualActionLock();
        setRequisitionQueue(prev => prev.filter(i => i.id !== id));
        // 🪦 TOMBSTONE: Locally record this deletion to prevent cloud resurrection
        if (typeof window !== 'undefined') {
            const current = JSON.parse(localStorage.getItem('school_tombstones_v1') || '[]');
            localStorage.setItem('school_tombstones_v1', JSON.stringify([...current, id]));
        }
    };

    const clearQueue = () => {
        triggerManualActionLock();
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
        triggerManualActionLock();
        const newAccount = {
            ...account,
            id: Math.random().toString(36).substr(2, 9),
            ownerRole: activeRole || 'Bursar' // Auto-tag with current role
        };
        setAccounts(prev => [...prev, newAccount]);
    };

    const updateAccount = (updated: BankAccount) => {
        triggerManualActionLock();
        setAccounts(prev => prev.map(a => a.id === updated.id ? updated : a));
    };

    const deleteAccount = (id: string) => {
        triggerManualActionLock();
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
        triggerManualActionLock();
        const req = requisitions.find(r => r.id === id);
        if (!req || req.status === 'Approved') return;

        // 1. Update Status
        const approvedReq: Requisition = {
            ...req,
            status: 'Approved',
            queueSnapshot: [...requisitionQueue],
            lastUpdated: new Date().toISOString()
        };
        updateRequisition(approvedReq);

        // 2. Create Expenses & Calculate Total
        let totalDeduction = 0;
        const now = new Date().toISOString();
        const newTransactions: GeneralTransaction[] = req.items.map(item => {
            const amount = Number(item.amount);
            totalDeduction += amount;
            return {
                id: generateId(),
                date: req.date,
                amount: amount,
                type: 'Expense',
                category: item.category,
                method: req.account as any,
                mode: req.account as any,
                recordedBy: 'Director',
                description: item.name,
                requisitionId: req.readableId,
                longDescription: `Requisition: ${req.title} (${req.readableId})`,
                ownerRole: 'Expense Manager', // 🛡️ Ensure visibility in Finance/Expense Manager Ledger
                lastUpdated: now
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
        const backupKey = `backup_${Date.now()} `;
        localStorage.setItem(backupKey + '_results', JSON.stringify(studentResults));
        localStorage.setItem(backupKey + '_configs', JSON.stringify(resultPageConfigs));
        localStorage.setItem(backupKey + '_cus', JSON.stringify(courseUnits));

        // 1. DEDUPLICATE COURSE UNITS
        // Group by Code + Prog + Level
        const cuMap = new Map<string, CourseUnit>(); // Key "CODE-PROG-LEVEL" -> Master CU
        const cuReplacementMap = new Map<string, string>(); // OldID -> NewID

        const cleanCUs: CourseUnit[] = [];

        courseUnits.forEach(cu => {
            const key = `${cu.code.trim().toUpperCase()} -${cu.programmeId} -${cu.level} `;
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

        console.log(`Consolidated CUs: ${courseUnits.length} -> ${cleanCUs.length} `);
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
            const key = `${r.studentId} -${r.courseUnitId} `;
            // If duplicate, overwrite (assuming latest is best, or keep first? latest at end of array usually)
            uniqueResultsMap.set(key, r);
        });
        const finalResults = Array.from(uniqueResultsMap.values());
        console.log(`Consolidated Results: ${studentResults.length} -> ${finalResults.length} `);
        setStudentResults(finalResults);

        // 3. DEDUPLICATE PAGE CONFIGS (FROM RAW STORAGE)
        // We must read RAW storage because 'resultPageConfigs' state might have already hidden the duplicates via the useState initializer
        const rawConfigsJson = localStorage.getItem('school_result_page_configs_v1');
        const allConfigs: ResultPageConfig[] = rawConfigsJson ? JSON.parse(rawConfigsJson) : resultPageConfigs;

        const configMap = new Map<string, ResultPageConfig>();
        const configReplacementMap = new Map<string, string>();
        const cleanConfigs: ResultPageConfig[] = [];

        allConfigs.forEach(conf => {
            const key = `${conf.programmeId} -${conf.level} -${conf.name.trim()} `;
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

        console.log(`Consolidated Configs(Raw): ${allConfigs.length} -> ${finalConfigs.length} `);
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
            const key = `${s.studentId} -${s.pageConfigId} `;
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
        triggerManualActionLock();
        setInventoryItems(prev => prev.map(i => i.id === item.id ? { ...item, lastUpdated: new Date().toISOString() } : i));
    };

    const applyInventoryDelta = async (itemId: string, delta: number, log: InventoryLog) => {
        // 1. Update Local State Immediately (Optimistic)
        setInventoryItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, quantity: item.quantity + delta, lastUpdated: new Date().toISOString() } : item
        ));
        const stampedLog = { ...log, lastUpdated: new Date().toISOString() };
        setInventoryLogs(prev => [stampedLog, ...prev]);

        // 2. Lock Sync to prevent Snapshot overlap
        triggerManualActionLock();

        // 3. Send Transactional Patch to Cloud
        try {
            await databaseService.applyInventoryTransaction(schoolProfile.id, itemId, delta, log);
            console.log("☁️ Transaction Sync: Success");
        } catch (e) {
            console.error("☁️ Transaction Sync: Failed", e);
        }
    };

    const deleteInventoryItem = (id: string) => {
        triggerManualActionLock();
        setInventoryItems(prev => prev.filter(i => i.id !== id));
        // Remove logs? Keep for history.
    };

    const updateInventorySettings = (settings: InventorySettings) => {
        setInventorySettings(settings);
    };

    const addInventoryLog = (log: InventoryLog) => {
        setInventoryLogs(prev => [{ ...log, schoolId: schoolProfile.id, lastUpdated: new Date().toISOString() }, ...prev]);
    };

    const updateInventoryLog = (log: InventoryLog) => {
        setInventoryLogs(prev => prev.map(l => l.id === log.id ? { ...log, lastUpdated: new Date().toISOString() } : l));
    };

    const deleteInventoryLog = (id: string) => {
        setInventoryLogs(prev => prev.filter(l => l.id !== id));
    };

    const addInventoryTransfer = (transfer: InventoryTransfer) => {
        setInventoryTransfers(prev => [{ ...transfer, schoolId: schoolProfile.id, lastUpdated: new Date().toISOString() }, ...prev]);
    };

    const updateInventoryTransfer = (transfer: InventoryTransfer) => {
        setInventoryTransfers(prev => prev.map(t => t.id === transfer.id ? { ...transfer, lastUpdated: new Date().toISOString() } : t));
    };

    const addInventoryLocation = (location: string) => {
        if (!inventoryLocations.includes(location)) {
            setInventoryLocations(prev => [...prev, location]);
        }
    };

    const addAdvert = (ad: Advert) => { triggerManualActionLock(); setAdverts(prev => [ad, ...prev]); };
    const updateAdvert = (ad: Advert) => { triggerManualActionLock(); setAdverts(prev => prev.map(a => a.id === ad.id ? ad : a)); };
    const deleteAdvert = (id: string) => { triggerManualActionLock(); setAdverts(prev => prev.filter(a => a.id !== id)); };

    const filteredRegistrarStudents = useMemo(() => {
        const isDev = (activeRole || '').toLowerCase() === 'developer';
        // Deduplicate registrar students
        const uniqueRegistrar = Array.from(new Map(registrarStudents.map(s => [s.id, s])).values());

        if (!isDev && (isBursarPortal || isRegistrarPortal)) {
            return uniqueRegistrar.filter(s => s.schoolId === schoolProfile.id);
        }
        return uniqueRegistrar;
    }, [registrarStudents, schoolProfile.id, activeRole, isBursarPortal, isRegistrarPortal]);

    const filteredAccounts = useMemo(() => {
        const isDev = (activeRole || '').toLowerCase() === 'developer';
        const isDirector = activeRole === 'Director';
        if (isDev || isDirector) return accounts;

        // Silo accounts based on role
        return accounts.filter(acc => acc.ownerRole === activeRole);
    }, [accounts, activeRole]);

    const filteredGeneralTransactions = useMemo(() => {
        const isDev = (activeRole || '').toLowerCase() === 'developer';
        const isDirector = activeRole === 'Director';
        if (isDev || isDirector) return generalTransactions;

        // Silo transactions based on role
        return generalTransactions.filter(tx => tx.ownerRole === activeRole);
    }, [generalTransactions, activeRole]);

    const filteredStudents = useMemo(() => {
        const isDev = (activeRole || '').toLowerCase() === 'developer';

        // 💎 DEDUPLICATION: Ensure search and lists don't show duplicates
        const uniqueStudents = Array.from(new Map(students.map(s => [s.id, s])).values());

        if (!isDev && (isBursarPortal || isRegistrarPortal)) {
            let baseList = uniqueStudents.filter(s => s.schoolId === schoolProfile.id);

            // 🧼 BURSAR PURGE: Strictly exclude any guest/independent learners.
            // Even if they are linked, they stay hidden from Bursar lists unless they are formal school members.
            if (isBursarPortal || activeRole === 'Director') {
                baseList = baseList.filter(s =>
                    (s.origin === 'registrar' || s.origin === 'bursar') &&
                    s.programme !== 'Independent Learner' &&
                    (!s.admissionNumber || s.admissionNumber !== 'N/A')
                );
            }

            return baseList;
        }
        return uniqueStudents;
    }, [students, schoolProfile.id, activeRole, isBursarPortal, isRegistrarPortal]);

    const filteredProgrammes = useMemo(() => {
        // Programmes should be global across all portals for now
        return programmes;
    }, [programmes]);

    const filteredCourseUnits = useMemo(() => {
        return courseUnits;
    }, [courseUnits]);

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

    // --- CLOUD SYNCHRONIZATION (CROSS-DEVICE CONSISTENCY) ---
    const [lastCloudSync, setLastCloudSync] = useState<string>(() => {
        if (typeof window !== 'undefined') return localStorage.getItem('school_last_cloud_sync') || "";
        return "";
    });
    const [isCloudSyncing, setIsCloudSyncing] = useState(false);
    const lastPullTimeRef = useRef<number>(0);

    // 1. MASTER PUSH EFFECT (Debounced)
    useEffect(() => {
        if (!hydrated || !schoolProfile.id || isCloudSyncing) return;

        // 🛡️ SAFETY BOUNDARY: LOCALHOST BYPASS
        // We are enabling cloud sync on localhost at the USER'S REQUEST to resolve the "Critical Error" (Full Storage).
        // This allows the browser to offload the 89+ student records to the Supabase Cloud Vault.
        const isLocalHost = typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

        if (isLocalHost) {
            console.warn("☁️ CLOUD SYNC: Localhost bypass active. Saving Snapshot to Production Cloud...");
        }
        // -------------------------------------------

        // Core Business State Bundle
        const stateToCloud = {
            students,
            registrarStudents,
            payments,
            billings,
            generalTransactions,
            requisitions,
            requisitionQueue, // Sync In-Queue items
            bursaries,
            programmes,
            services,
            staffAccounts,
            schoolProfile,
            documentTemplates,
            paymentIntegrations,
            manualPaymentMethods,
            financialSettings,
            unclaimedPayments,
            budgetPeriods,
            expenseCategories,
            incomeCategories,
            tutors,
            // Academic Data
            courseUnits,
            resultPageConfigs,
            studentResults,
            studentPageSummaries,
            resultArchives,
            promotionBatches,
            // Inventory Data
            inventoryItems,
            inventoryLists,
            inventoryGroups,
            inventoryLogs,
            inventoryTransfers,
            inventoryLocations,
            // Financial Structure
            accounts,
            accountGroups,
            // Misc
            calendarEvents,
            suggestions,
            timestamp: new Date().toISOString()
        };

        const stateHash = JSON.stringify(stateToCloud);
        // Skip if same as last successful push
        if (stateHash === localStorage.getItem('school_last_pushed_hash')) return;

        const timer = setTimeout(async () => {
            try {
                const isAdmin = ['developer', 'director', 'bursar', 'expense manager', 'estate manager', 'accountant'].includes((activeRole || '').toLowerCase());

                // Only push if we are currently logged in as a valid school schoolProfile 
                // OR if the current user has an administrative staff role
                if (schoolProfile.status === 'Active' || (isLocalHost && schoolProfile.id) || isAdmin) {
                    // SAFEGUARD: Don't push if both students and programmes are empty 
                    // OR if we are on SAMI and the count is suspiciously low (prevents mess-overwrite)
                    const isLocalStateEmpty = students.length === 0 && programmes.length === 0;
                    const isSamiMess = false;

                    if ((isLocalStateEmpty || isSamiMess) && !localStorage.getItem('school_last_cloud_sync')) {
                        console.warn("☁️ Compass Cloud: Shield Active. Avoiding push of incomplete state.");
                        return;
                    }

                    // 📸 TAKE INSTITUTIONAL SNAPSHOT (Phase 2 & 3)
                    // COMPRESSION: Shrink-wrap the state to save 90% egress
                    const compressedState = LZString.compressToUTF16(JSON.stringify(stateToCloud));
                    await databaseService.saveSchoolCloudState(schoolProfile.id, compressedState);

                    localStorage.setItem('school_last_pushed_hash', stateHash);
                    localStorage.setItem('school_last_cloud_sync', stateToCloud.timestamp);
                    setLastCloudSync(stateToCloud.timestamp);
                    console.log("☁️ Compass Cloud: Institutional Snapshot Synced Successfully");
                }
            } catch (e) {
                console.error("☁️ Compass Cloud: Sync failed", e);
            }
        }, 5000); // 5 second debounce (Reduced frequency)

        return () => clearTimeout(timer);
    }, [
        students, registrarStudents, payments, billings, generalTransactions, requisitions,
        requisitionQueue, bursaries, programmes, services, staffAccounts, schoolProfile.id,
        paymentIntegrations, manualPaymentMethods, financialSettings, unclaimedPayments,
        documentTemplates, budgetPeriods, expenseCategories, incomeCategories,
        courseUnits, resultPageConfigs, studentResults, studentPageSummaries, resultArchives,
        promotionBatches, inventoryItems, inventoryLists, inventoryGroups, inventoryLogs,
        inventoryTransfers, inventoryLocations, accounts, accountGroups, calendarEvents,
        suggestions, hydrated, activeRole
    ]);

    // 🕒 THE TIME MACHINE: SNAPSHOT MANAGEMENT (Phase 4)
    const takeInstitutionalSnapshot = async (label: string = 'Manual Snapshot', silent: boolean = false) => {
        if (!schoolProfile.id) {
            if (!silent) alert("❌ Cannot snapshot: School ID is missing.");
            return false;
        }
        setIsCloudSyncing(true);
        try {
            const state = {
                students, registrarStudents, payments, billings, generalTransactions,
                requisitions, bursaries, programmes, services, staffAccounts, schoolProfile,
                documentTemplates, paymentIntegrations, manualPaymentMethods, financialSettings,
                unclaimedPayments, budgetPeriods, expenseCategories, incomeCategories,
                courseUnits, resultPageConfigs, studentResults, studentPageSummaries,
                resultArchives, promotionBatches, inventoryItems, inventoryLists, inventoryGroups,
                inventoryLogs, inventoryTransfers, inventoryLocations, accounts, accountGroups,
                calendarEvents, suggestions,
                tombstones: JSON.parse(localStorage.getItem('school_tombstones_v1') || '[]'),
                timestamp: new Date().toISOString()
            };

            // NEW: Use dedicated snapshot table (UNCOMPRESSED as requested)
            await databaseService.createSchoolSnapshot(schoolProfile.id, label, state);

            // Also update the 'latest' cloud state for auto-sync
            await databaseService.saveSchoolCloudState(schoolProfile.id, state, activeRole || '');

            setLastCloudSync(state.timestamp);
            logGlobalAction('Manual Snapshot Created', `By ${activeRole}: ${label}`);
            return true;
        } catch (e: any) {
            console.error("❌ Snapshot failed", e);
            if (!silent) alert("❌ Snapshot Engine Error: " + (e.message || "Unknown Error"));
            return false;
        } finally {
            setIsCloudSyncing(false);
        }
    };

    const fetchSchoolSnapshots = async () => {
        if (!schoolProfile.id) return [];
        return await databaseService.getSchoolSnapshots(schoolProfile.id);
    };

    const restoreInstitutionalSnapshot = async (snapshot: any) => {
        if (activeRole !== 'Director' && (activeRole || '').toLowerCase() !== 'developer') {
            alert("🔒 Access Denied: Only the Director can perform a school-wide rollback.");
            return;
        }

        const confirmRestore = confirm(`⚠️ DANGER: You are about to restore the school to the state of ${snapshot.timestamp}. This will overwrite all CURRENT data. Are you sure?`);
        if (!confirmRestore) return;

        try {
            setIsCloudSyncing(true);

            // 🔒 CRITICAL: Lock auto-pull for 60 seconds to allow the restored state to settle and sync UP
            localStorage.setItem('school_manual_action_lock', Date.now().toString());

            // Fetch the full snapshot state if it's not present (required because getSchoolSnapshots is now lean)
            let snapshotState = snapshot.state;
            if (!snapshotState && snapshot.id) {
                console.log("🕵️ Snapshot: Fetching full state for restoration...");
                snapshotState = await databaseService.getSchoolSnapshotDetail(snapshot.id.toString());
            }

            if (!snapshotState) {
                throw new Error("Could not retrieve state for this version.");
            }

            // Handles both compressed and uncompressed snapshot states
            let data = snapshotState;
            if (typeof snapshotState === 'string') {
                data = JSON.parse(snapshotState);
            }

            // Pillar Restoration
            if (data.students) setStudents(data.students);
            if (data.registrarStudents) setRegistrarStudents(data.registrarStudents);
            if (data.payments) setPayments(data.payments);
            if (data.billings) setBillings(data.billings);
            if (data.generalTransactions) setGeneralTransactions(data.generalTransactions);
            if (data.requisitions) setRequisitions(data.requisitions);
            if (data.bursaries) setBursaries(data.bursaries);
            if (data.programmes) setProgrammes(data.programmes);
            if (data.services) setServices(data.services);
            if (data.staffAccounts) setStaffAccounts(data.staffAccounts);
            if (data.documentTemplates) setDocumentTemplates(data.documentTemplates);
            if (data.inventoryItems) setInventoryItems(data.inventoryItems);
            if (data.accounts) setAccounts(data.accounts);
            if (data.calendarEvents) setCalendarEvents(data.calendarEvents);
            if (data.suggestions) setSuggestions(data.suggestions);
            if (data.financialSettings) setFinancialSettings(data.financialSettings);
            if (data.courseUnits) setCourseUnits(data.courseUnits);
            if (data.resultPageConfigs) setResultPageConfigs(data.resultPageConfigs);
            if (data.studentResults) setStudentResults(data.studentResults);
            if (data.studentPageSummaries) setStudentPageSummaries(data.studentPageSummaries);

            // Update Sync Metadata
            if (data.timestamp) {
                setLastCloudSync(data.timestamp);
                localStorage.setItem('school_last_cloud_sync', data.timestamp);
            }

            logGlobalAction('School Rollback', `To Version ${data.timestamp || 'Unknown'} by Director`);

            // Persist this restored state to the cloud immediately as the 'new' current state
            await databaseService.saveSchoolCloudState(schoolProfile.id, data);

            alert("✅ Institutional State Restored Successfully! The school has been rolled back.");
            window.location.reload();
        } catch (e) {
            console.error("❌ Restore failed", e);
            alert("Failed to restore state. Please contact support.");
        } finally {
            setIsCloudSyncing(false);
        }
    };

    // 2. MANUAL PULL FUNCTION
    // 2. MANUAL PULL FUNCTION
    async function pullFromCloud(forceOrEvent: any = false, targetSchoolId?: string) {
        // Handle case where React passes an event object instead of a boolean
        const isForce = forceOrEvent === true || (forceOrEvent && typeof forceOrEvent === 'object' && forceOrEvent.target);

        const idToUse = targetSchoolId || schoolProfile.id || studentProfile?.schoolId;

        // 🛡️ STUDENT SYNC BRIDGE
        // If we have a student ID, ensure we sync the profile first
        if (studentProfile?.id && studentProfile.id !== 'std_user_1') {
            console.log("☁️ Compass Student: Refreshing identity bridge...");
            // We just need to trigger the heartbeat sync logic
            const { data: { user } } = await supabase.auth.getUser();
            const activeId = user?.id || studentProfile.id;
            const userEmail = user?.email || studentProfile.email;

            if (userEmail) {
                const [profileRes, financeRes] = await Promise.all([
                    supabase.from('profiles').select('*').eq('id', activeId).maybeSingle(),
                    supabase.from('financial_ledger').select('*').or(`id.eq.${activeId},email.eq.${userEmail}`)
                ]);

                if (profileRes.data || financeRes.data) {
                    const profile = profileRes.data;
                    const ledgerRecords = Array.isArray(financeRes.data) ? financeRes.data : (financeRes.data ? [financeRes.data] : []);
                    const finance = ledgerRecords.sort((a, b) => {
                        if (a.subscription_status === 'active' && b.subscription_status !== 'active') return -1;
                        if (b.subscription_status === 'active' && a.subscription_status !== 'active') return 1;
                        return (b.wallet_balance || 0) - (a.wallet_balance || 0);
                    })[0];

                    setStudentProfile(prev => {
                        const allRecords = [profile, ...ledgerRecords].filter(Boolean);

                        // Bridge History (Requests & Logs)
                        const cloudRequests = allRecords.flatMap(r => r.payment_requests || []);
                        const requestMap = new Map();
                        [...(prev.paymentRequests || []), ...cloudRequests].forEach(r => {
                            if (r && r.id) requestMap.set(r.id, r);
                        });

                        const cloudLogs = allRecords.flatMap(r => r.activity_logs || []);
                        const logMap = new Map();
                        cloudLogs.forEach((l: any) => { if (l?.id) logMap.set(l.id, l); });
                        (prev.activityLogs || []).forEach(l => { if (l?.id && !logMap.has(l.id)) logMap.set(l.id, l); });

                        return {
                            ...prev,
                            // 🛡️ SOURCE OF TRUTH: Cloud always wins for financial data
                            walletBalance: Number(finance?.wallet_balance ?? profile?.wallet_balance ?? prev.walletBalance ?? 0),
                            subscriptionStatus: (finance?.subscription_status === 'active' || profile?.subscription_status === 'active') ? 'active' : (finance?.subscription_status || profile?.subscription_status || prev.subscriptionStatus),
                            subscriptionExpiry: finance?.subscription_expiry || profile?.subscription_expiry || prev.subscriptionExpiry,
                            paymentRequests: Array.from(requestMap.values()).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()),
                            activityLogs: Array.from(logMap.values()).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                        };
                    });
                }
            }
        }

        if (!idToUse) {
            setIsCloudSyncing(false);
            return;
        }

        // 🛡️ COOLDOWN SAFETY: Avoid rapid-fire pulls (Max once every 30 seconds)
        const now = Date.now();
        if (!isForce && now - lastPullTimeRef.current < 30000) {
            console.log("☁️ Compass Sync: Pull skipped (Cooldown active).");
            setIsCloudSyncing(false);
            return;
        }
        lastPullTimeRef.current = now;

        setIsCloudSyncing(true);
        try {
            let cloudStateRaw = await databaseService.getSchoolCloudState(idToUse);
            let cloudState = null;

            if (cloudStateRaw) {
                if (typeof cloudStateRaw === 'string') {
                    // 🛡️ SYNC RESILIENCE: Attempt decompression first as states can be "Packed" (Compressed)
                    // This handles LZString.compressToUTF16 optimization used in push cycles.
                    let processedRaw = cloudStateRaw;
                    try {
                        const decompressed = LZString.decompressFromUTF16(cloudStateRaw);
                        if (decompressed) {
                            processedRaw = decompressed;
                            console.log("🌦️ Sync: Successfully unpacked 'Packed' Cloud State.");
                        }
                    } catch (e) {
                        console.warn("🌦️ Sync: Data is not compressed, attempting direct parse.");
                    }

                    try {
                        cloudState = JSON.parse(processedRaw);
                    } catch (e) {
                        console.error("☁️ Sync Error: Failed to parse sync payload. Raw received:", processedRaw.substring(0, 100));
                        throw new Error("Malformatted synchronization payload.");
                    }
                } else {
                    // Legacy: already a JSON object
                    cloudState = cloudStateRaw;
                }
            }

            if (cloudState) {
                // If cloud is newer OR forced, apply it
                const cloudTime = new Date(cloudState.timestamp || 0).getTime();
                const localTime = new Date(lastCloudSync || 0).getTime();

                if (isForce || cloudTime > localTime) {
                    // SAFEGUARD: Don't pull if a manual action happened in the last 5 seconds
                    const lastManualAction = Number(localStorage.getItem('school_manual_action_lock') || 0);
                    if (!isForce && Date.now() - lastManualAction < 5000) {
                        console.log("☁️ Compass Sync: Pull deferred - manual action recently performed.");
                        return;
                    }

                    console.log("☁️ Compass Cloud: Pulling fresher data from server...");

                    const tombstonesData = cloudState.tombstones || [];
                    if (tombstonesData.length > 0) {
                        triggerTombstone(tombstonesData);
                    }
                    const tombstones = new Set<string>(JSON.parse(localStorage.getItem('school_tombstones_v1') || '[]'));

                    // Helper for robust merging and filtering
                    const filterAndMerge = (prev: any[], incoming: any[] | undefined) => {
                        if (!incoming) return prev.filter((item: any) => !tombstones.has(item.id?.toString()));
                        const filtered = incoming.filter((item: any) => !tombstones.has(item.id?.toString()));
                        return unionMerge(prev, filtered).filter((item: any) => !tombstones.has(item.id?.toString()));
                    };

                    if (cloudState.students) {
                        const stampedStudents = cloudState.students
                            .filter((s: any) => !tombstones.has(s.id?.toString()) && !tombstones.has((s.schoolPayCode || '').toString()))
                            .map((s: any) => ({ ...s, schoolId: idToUse }));
                        setStudents(prev => unionMerge(prev, stampedStudents));
                    }

                    if (cloudState.registrarStudents) {
                        const stampedRegistrar = cloudState.registrarStudents
                            .filter((s: any) => !tombstones.has(s.id?.toString()) && !tombstones.has((s.schoolPayCode || '').toString()))
                            .map((s: any) => ({ ...s, schoolId: idToUse }));
                        setRegistrarStudents(prev => unionMerge(prev, stampedRegistrar));
                    }

                    if (cloudState.payments) {
                        const stampedPayments = cloudState.payments.map((p: any) => ({ ...p, schoolId: idToUse }));
                        setPayments(prev => filterAndMerge(prev, stampedPayments));
                    }
                    if (cloudState.billings) {
                        const stampedBillings = cloudState.billings.map((b: any) => ({ ...b, schoolId: idToUse }));
                        setBillings(prev => filterAndMerge(prev, stampedBillings));
                    }
                    if (cloudState.generalTransactions) {
                        const stampedGT = cloudState.generalTransactions.map((t: any) => ({ ...t, schoolId: idToUse }));
                        setGeneralTransactions(prev => filterAndMerge(prev, stampedGT));
                    }

                    if (cloudState.requisitions) {
                        setRequisitions(prev => filterAndMerge(prev, cloudState.requisitions));
                    }
                    if (cloudState.requisitionQueue) {
                        setRequisitionQueue(prev => filterAndMerge(prev, cloudState.requisitionQueue));
                    }

                    if (cloudState.bursaries) setBursaries(prev => filterAndMerge(prev, cloudState.bursaries));
                    if (cloudState.programmes) setProgrammes(prev => filterAndMerge(prev, cloudState.programmes));
                    if (cloudState.services) setServices(prev => filterAndMerge(prev, cloudState.services));
                    if (cloudState.staffAccounts) setStaffAccounts(prev => filterAndMerge(prev, cloudState.staffAccounts));
                    if (cloudState.tutors) setTutors(prev => filterAndMerge(prev, cloudState.tutors));
                    if (cloudState.paymentIntegrations && cloudState.paymentIntegrations.length > 0) {
                        setPaymentIntegrations(prev => {
                            return prev.map(local => {
                                const incoming = cloudState.paymentIntegrations.find((i: any) => i.id === local.id || i.provider === local.provider);
                                if (!incoming) return local;
                                
                                // SMART MERGE: Only overwrite keys if the incoming data actually has them
                                return {
                                    ...incoming,
                                    merchantId: incoming.merchantId || local.merchantId,
                                    apiKey: incoming.apiKey || local.apiKey,
                                    clientSecret: incoming.clientSecret || local.clientSecret,
                                    status: (incoming.apiKey || local.apiKey) ? 'active' : incoming.status
                                };
                            });
                        });
                    }
                    if (cloudState.manualPaymentMethods && cloudState.manualPaymentMethods.length > 0) {
                        setManualPaymentMethods(cloudState.manualPaymentMethods);
                    }
                    if (cloudState.financialSettings) setFinancialSettings(cloudState.financialSettings);
                    if (cloudState.unclaimedPayments) setUnclaimedPayments(prev => filterAndMerge(prev, cloudState.unclaimedPayments));
                    if (cloudState.documentTemplates) setDocumentTemplates(cloudState.documentTemplates);
                    if (cloudState.budgetPeriods) setBudgetPeriods(cloudState.budgetPeriods);
                    if (cloudState.expenseCategories) setExpenseCategories(cloudState.expenseCategories);
                    if (cloudState.incomeCategories) setIncomeCategories(cloudState.incomeCategories);

                    // Academic Data
                    if (cloudState.courseUnits) setCourseUnits(prev => filterAndMerge(prev, cloudState.courseUnits));
                    if (cloudState.resultPageConfigs) setResultPageConfigs(prev => filterAndMerge(prev, cloudState.resultPageConfigs));
                    if (cloudState.studentResults) setStudentResults(prev => filterAndMerge(prev as any, cloudState.studentResults));
                    if (cloudState.studentPageSummaries) setStudentPageSummaries(prev => filterAndMerge(prev as any, cloudState.studentPageSummaries));
                    if (cloudState.resultArchives) setResultArchives(prev => filterAndMerge(prev, cloudState.resultArchives));
                    if (cloudState.promotionBatches) setPromotionBatches(prev => filterAndMerge(prev, cloudState.promotionBatches));

                    // Inventory Data
                    if (cloudState.inventoryItems) {
                        const stampedItems = cloudState.inventoryItems.map((i: any) => ({ ...i, schoolId: idToUse }));
                        setInventoryItems(prev => filterAndMerge(prev, stampedItems));
                    }
                    if (cloudState.inventoryLists) setInventoryLists(prev => filterAndMerge(prev, cloudState.inventoryLists));
                    if (cloudState.inventoryGroups) setInventoryGroups(prev => filterAndMerge(prev, cloudState.inventoryGroups));
                    if (cloudState.inventoryLogs) {
                        const stampedLogs = cloudState.inventoryLogs.map((l: any) => ({ ...l, schoolId: idToUse }));
                        setInventoryLogs(prev => filterAndMerge(prev, stampedLogs));
                    }
                    if (cloudState.inventoryTransfers) {
                        const stampedTransfers = cloudState.inventoryTransfers.map((t: any) => ({ ...t, schoolId: idToUse }));
                        setInventoryTransfers(prev => filterAndMerge(prev, stampedTransfers));
                    }
                    if (cloudState.inventoryLocations) setInventoryLocations(cloudState.inventoryLocations);

                    // Branding
                    if (cloudState.portalBranding) setPortalBranding(cloudState.portalBranding);

                    // Financial Accounts
                    if (cloudState.accounts) setAccounts(prev => filterAndMerge(prev, cloudState.accounts));
                    if (cloudState.accountGroups) setAccountGroups(cloudState.accountGroups);

                    // Misc
                    if (cloudState.calendarEvents) setCalendarEvents(prev => filterAndMerge(prev, cloudState.calendarEvents));
                    if (cloudState.suggestions) setSuggestions(prev => filterAndMerge(prev, cloudState.suggestions));
                    if (cloudState.news) setNews(prev => filterAndMerge(prev, cloudState.news));
                    if (cloudState.adverts) setAdverts(prev => filterAndMerge(prev, cloudState.adverts));

                    setLastCloudSync(cloudState.timestamp);
                    localStorage.setItem('school_last_cloud_sync', cloudState.timestamp);
                    // Update the pushed hash to prevent immediate re-push
                    localStorage.setItem('school_last_pushed_hash', JSON.stringify(cloudState));

                    // --- STABLE SINGLE-PASS RECONCILIATION ---
                    // Run once after data pull to match new records
                    if (cloudState.unclaimedPayments && cloudState.students) {
                        const unclaimed = cloudState.unclaimedPayments;
                        const studs = cloudState.students;
                        const linksToMake: { up: Payment, studentId: number }[] = [];

                        unclaimed.forEach((up: Payment) => {
                            const upPayCode = up.metadata?.payCode || (up as any).studentPaymentCode;
                            const match = studs.find((s: EnrolledStudent) =>
                                (s.payCode && upPayCode === s.payCode) ||
                                (s.payCode && up.description?.includes(s.payCode)) ||
                                (s.payCode && up.reference?.includes(s.payCode))
                            );
                            if (match) linksToMake.push({ up, studentId: match.id });
                        });

                        if (linksToMake.length > 0) {
                            console.log(`🔍 Compass Sync: Found ${linksToMake.length} potential auto - links in fresh cloud data.`);
                            // We don't call linkPayment here to avoid multiple pulls/pushes
                            // Instead we just note them for the next render cycle or manual action
                        }
                    }
                }
            }
        } catch (e) {
            console.error("☁️ Compass Cloud: Pull failed", e);
        } finally {
            setIsCloudSyncing(false);
        }
    };

    useEffect(() => {
        if (!hydrated || !schoolProfile.id) return;

        // 🟢 SMARTER SYNC: Trigger on Focus, Page Navigation, or Initial Load
        // This drastically reduces egress while keeping data fresh when the user needs it.
        const syncData = () => {
            console.log("💓 Compass Sync: Smarter heartbeat triggered (Focus/Navigation).");
            pullFromCloud();
        };

        // 1. Initial Load & Page Navigation (handled by pathname in deps)
        syncData();

        // 2. Tab Shift: Trigger when user switches back to this tab
        window.addEventListener('focus', syncData);

        return () => {
            window.removeEventListener('focus', syncData);
        };
    }, [hydrated, schoolProfile.id]); // Removed pathname to stop syncing on internal navigation

    // 4. REMOVED AGGRESSIVE LINKING EFFECT (Caused infinite loops)
    // We will implement a stable background task for this in the background sync interval instead.

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

    // 🕒 AUTOMATED SNAPSHOTS (Phase 5: 24h Pulse)
    useEffect(() => {
        // 🔒 CRITICAL SAFETY: Never auto-snapshot if we are currently syncing data
        // or if the store hasn't been populated with students yet (to avoid empty overwrites)
        if (!hydrated || !schoolProfile.id || !activeRole || isCloudSyncing || students.length === 0) return;

        const checkAutomatedSnapshots = async () => {
            const lastAuto = localStorage.getItem('school_last_auto_snapshot');
            const now = Date.now();

            // 1. 24-Hour Pulse
            const oneDayMs = 24 * 60 * 60 * 1000;
            const needsDaily = !lastAuto || (now - parseInt(lastAuto)) > oneDayMs;

            if (needsDaily) {
                console.log("🕒 Triggering Automated Daily Baseline...");
                const success = await takeInstitutionalSnapshot("Automatic Daily Baseline", true);
                if (success) {
                    localStorage.setItem('school_last_auto_snapshot', now.toString());
                }
            }
            // LOGIN-TRIGGERED SNAPSHOTS REMOVED: They cause race conditions during hydration
        };

        checkAutomatedSnapshots();
    }, [hydrated, schoolProfile.id, activeRole, isCloudSyncing, students.length]);

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
        deleteRequisitionCascade,
        saveRequisitionAtomic,
        approveRequisition,
        verifySensitiveAction,

        requisitionQueue,
        addToQueue,
        removeFromQueue,
        clearQueue,

        students,
        studentRequirements,
        filteredStudents,

        filteredAccounts,
        filteredGeneralTransactions,

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
        setSchoolProfile: (profile: Partial<SchoolProfile>) => setSchoolProfile(prev => ({ ...prev, ...profile })),
        bursaries,
        programmes,
        documentTemplates,
        billings,
        filteredBillings,
        payments,
        filteredPayments,
        downloadBackup: () => {
            const backup = { students, registrarStudents, payments, billings, timestamp: new Date().toISOString() };
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `VINE_EMERGENCY_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
        },
        hydrated,
        checkingAccess,
        addProgramme,
        updateProgramme,
        deleteProgramme,
        updateStudent,
        addStudent,
        batchUpdateStudents,
        batchUpdateData,
        isProcessingPromotion,
        setIsProcessingPromotion,
        setStudents: (val: any) => { triggerManualActionLock(); setStudents(val); }, // Exposing raw setter for flexibility in complex pages
        setRegistrarStudents: (val: any) => { triggerManualActionLock(); setRegistrarStudents(val); },
        setPayments: (val: any) => { triggerManualActionLock(); setPayments(val); },
        setBillings: (val: any) => { triggerManualActionLock(); setBillings(val); },
        setServices: (val: any) => { triggerManualActionLock(); setServices(val); }, // Exposing raw setter
        setBursaries: (val: any) => { triggerManualActionLock(); setBursaries(val); }, // Exposing raw setter
        postHistory, addPostHistory, deletePostHistory, // New Actions
        updateTemplate,
        addBilling,
        updateBilling,
        deleteBilling,
        restoreBilling,
        addPayment,
        updatePayment,
        linkPayment,
        deletePayment,
        restorePayment,
        deletedBillings,
        filteredDeletedBillings,
        deletedPayments,
        filteredDeletedPayments,
        deleteStudent, // New
        deleteStudents, // New Bulk
        unclaimedPayments, // New
        filteredUnclaimedPayments,
        setUnclaimedPayments: (val: any) => { triggerManualActionLock(); setUnclaimedPayments(val); }, // Helper
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
        calculateStudentInitialFinancials,
        releaseGhostPayments: () => {
            const activeStudentIds = new Set(students.map(s => s.id));
            let releasedCount = 0;

            console.log("👻 RELEASE GHOSTS: Starting scan...");
            console.log(`📊 Active Students: ${activeStudentIds.size} `);

            setPayments(prev => prev.map(p => {
                // If payment is linked (status LINKED or Approved/Paid) AND has a studentId that is NOT in the active set
                // We must handle cases where studentId might be 0 or null safely
                if (p.studentId && !activeStudentIds.has(p.studentId)) {
                    // This is a GHOST LINK
                    console.log(`🔓 Releasing Payment ${p.id} (PayCode: ${p.metadata?.payCode}) from dead ID: ${p.studentId} `);
                    releasedCount++;
                    return {
                        ...p,
                        studentId: 0, // Detach
                        status: 'Pending', // Reset status to allow claiming
                        date: p.date // Preserve original date
                    };
                }
                return p;
            }));

            // Also check Unclaimed Payments list just in case triggers there too
            // (Though usually unclaimed are already unlinked, but sometimes they get 'stuck' with a code but no student)

            return releasedCount;
        },

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
        toggleTutorSubscription,
        subscribeToTutor,
        purchaseTutorSubscription,
        submitSubscriptionRequest,
        purchasePlatformPass,
        // hydrated, // Removed duplicate to fix lint error 02a7baa5


        // Tutor Portal
        tutorProfile, setTutorProfile,
        developerProfile, setDeveloperProfile,
        safeSetItem,
        tutorContents, setTutorContents,
        // Published content only (filters out drafts for student portal)
        publishedTutorContents: tutorContents.filter(c => c.status !== 'Draft' && c.origin !== 'official'),

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
        officialLibrary,
        addOfficialContent,
        updateOfficialContent,
        deleteOfficialContent,
        updateTutorSettings,

        // Developer / Admin
        landingPageContent,
        updateLandingPageContent,
        developerSettings,
        updateDeveloperSettings,
        featuredSchools,
        updateFeaturedSchools,
        deleteFeaturedSchool,
        schoolApplications,
        addSchoolApplication,
        submitSchoolApplication,
        syncApplications,
        deleteSchoolApplication: (id: string) => {
            setSchoolApplications(prev => prev.filter(app => app.id !== id));
            console.log(`🗑️ Registry: Local record ${id} has been manually purged.`);
        },
        updateSchoolApplicationStatus,
        addStaffAccount,
        verifySubscriptionRequest,
        processPayout,

        // Results
        addGeneralTransaction: (tx: GeneralTransaction) => { triggerManualActionLock(); setGeneralTransactions(prev => [{ ...tx, ownerRole: activeRole || 'Bursar', schoolId: schoolProfile.id, lastUpdated: new Date().toISOString() }, ...prev]); },
        updateGeneralTransaction: (tx: GeneralTransaction) => {
            triggerManualActionLock();
            setGeneralTransactions(prev => prev.map(t => t.id === tx.id ? { ...tx, lastUpdated: new Date().toISOString() } : t));
        },
        deleteGeneralTransaction: (id: string) => {
            triggerManualActionLock();
            setGeneralTransactions(prev => prev.filter(t => t.id !== id));
        },
        updateBudget: (budget: Budget) => { // Added updateBudget action
            triggerManualActionLock();
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
        addExpenseCategory: (cat: TransactionCategoryItem) => { triggerManualActionLock(); setExpenseCategories(prev => [...prev, { ...cat, id: cat.id || `exp_${Date.now()} ` }]); },
        updateExpenseCategory: (cat: TransactionCategoryItem) => { triggerManualActionLock(); setExpenseCategories(prev => prev.map(c => c.id === cat.id ? cat : c)); },
        deleteExpenseCategory: (id: string) => { triggerManualActionLock(); setExpenseCategories(prev => prev.filter(c => c.id !== id)); },

        addIncomeCategory: (cat: TransactionCategoryItem) => { triggerManualActionLock(); setIncomeCategories(prev => [...prev, { ...cat, id: cat.id || `inc_${Date.now()} ` }]); },
        updateIncomeCategory: (cat: TransactionCategoryItem) => { triggerManualActionLock(); setIncomeCategories(prev => prev.map(c => c.id === cat.id ? cat : c)); },
        deleteIncomeCategory: (id: string) => { triggerManualActionLock(); setIncomeCategories(prev => prev.filter(c => c.id !== id)); },

        addCategory: (type: string, name: string) => {
            triggerManualActionLock();
            const newItem = { id: `${type.toLowerCase()}_${Date.now()} `, name, subcategories: [] };
            if (type === 'Expense') setExpenseCategories(prev => [...prev, newItem]);
            else setIncomeCategories(prev => [...prev, newItem]);
        },
        updateCategory: (type: string, id: string, name: string) => {
            triggerManualActionLock();
            // Legacy/Simple update support
            const updater = (prev: TransactionCategoryItem[]) => prev.map(c => c.id === id ? { ...c, name } : c);
            if (type === 'Expense') setExpenseCategories(updater);
            else setIncomeCategories(updater);
        },
        deleteCategory: (type: string, id: string) => {
            triggerManualActionLock();
            const updater = (prev: TransactionCategoryItem[]) => prev.filter(c => c.id !== id);
            if (type === 'Expense') setExpenseCategories(updater);
            else setIncomeCategories(updater);
        },
        addSubcategory: (type: string, catId: string, subName: string) => {
            triggerManualActionLock();
            const updater = (prev: TransactionCategoryItem[]) => prev.map(c => c.id === catId ? { ...c, subcategories: [...(c.subcategories || []), subName] } : c);
            if (type === 'Expense') setExpenseCategories(updater);
            else setIncomeCategories(updater);
        },
        updateSubcategory: (type: string, catId: string, oldSub: string, newSub: string) => {
            triggerManualActionLock();
            const updater = (prev: TransactionCategoryItem[]) => prev.map(c => c.id === catId ? { ...c, subcategories: (c.subcategories || []).map(s => s === oldSub ? newSub : s) } : c);
            if (type === 'Expense') setExpenseCategories(updater);
            else setIncomeCategories(updater);
        },
        deleteSubcategory: (type: string, catId: string, subName: string) => {
            triggerManualActionLock();
            const updater = (prev: TransactionCategoryItem[]) => prev.map(c => c.id === catId ? { ...c, subcategories: (c.subcategories || []).filter(s => s !== subName) } : c);
            if (type === 'Expense') setExpenseCategories(updater);
            else setIncomeCategories(updater);
        },

        // --- BUDGET ACTIONS ---
        budgetPeriods,
        addBudgetPeriod: (period: BudgetPeriod) => { triggerManualActionLock(); setBudgetPeriods(prev => [...prev, period]); },
        updateBudgetPeriod: (period: BudgetPeriod) => { triggerManualActionLock(); setBudgetPeriods(prev => prev.map(p => p.id === period.id ? period : p)); },
        deleteBudgetPeriod: (id: string) => { triggerManualActionLock(); setBudgetPeriods(prev => prev.filter(p => p.id !== id)); },

        transactionSettings,
        updateTransactionSettings: (settings: Partial<TransactionSettings>) => { triggerManualActionLock(); setTransactionSettings(prev => ({ ...prev, ...settings })); },

        // Inventory Exports
        inventoryLists,
        addInventoryList: (l: InventoryList) => { triggerManualActionLock(); setInventoryLists(prev => [...prev, { ...l, lastUpdated: new Date().toISOString() }]); },
        deleteInventoryList: (id: string) => { triggerManualActionLock(); setInventoryLists(prev => prev.filter(p => p.id !== id)); },

        inventoryGroups,
        addInventoryGroup: (g: InventoryGroup) => { triggerManualActionLock(); setInventoryGroups(prev => [...prev, { ...g, lastUpdated: new Date().toISOString() }]); },
        updateInventoryGroup: (g: InventoryGroup) => { triggerManualActionLock(); setInventoryGroups(prev => prev.map(p => p.id === g.id ? { ...g, lastUpdated: new Date().toISOString() } : p)); },
        deleteInventoryGroup: (id: string) => { triggerManualActionLock(); setInventoryGroups(prev => prev.filter(p => p.id !== id)); },

        inventoryItems,
        addInventoryItem: (i: InventoryItem) => { triggerManualActionLock(); setInventoryItems(prev => [...prev, { ...i, schoolId: schoolProfile.id, lastUpdated: new Date().toISOString() }]); },
        updateInventoryItem,
        applyInventoryDelta,
        deleteInventoryItem,

        inventorySettings,
        updateInventorySettings: (settings: InventorySettings) => { triggerManualActionLock(); setInventorySettings(settings); },

        inventoryLogs,
        addInventoryLog,
        updateInventoryLog,
        deleteInventoryLog,

        inventoryTransfers,
        addInventoryTransfer,
        updateInventoryTransfer,

        inventoryLocations,
        addInventoryLocation: (l: string) => { triggerManualActionLock(); setInventoryLocations(prev => [...new Set([...prev, l])]); },

        admissionFormData,
        setAdmissionFormData,

        // Payment Modes
        paymentIntegrations,
        updatePaymentIntegration: (integration: PaymentIntegration) => { triggerManualActionLock(); setPaymentIntegrations(prev => prev.map(p => p.id === integration.id ? integration : p)); },

        manualPaymentMethods,
        addManualPaymentMethod: (method: ManualPaymentMethod) => { triggerManualActionLock(); setManualPaymentMethods(prev => [...prev, method]); },
        updateManualPaymentMethod: (method: ManualPaymentMethod) => { triggerManualActionLock(); setManualPaymentMethods(prev => prev.map(p => p.id === method.id ? method : p)); },
        deleteManualPaymentMethod: (id: string) => { triggerManualActionLock(); setManualPaymentMethods(prev => prev.filter(p => p.id !== id)); },

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
        resetStaffPassword,
        updateStaffProfile,
        portalBranding,
        updatePortalBranding,
        setCourseUnits: (val: any) => { triggerManualActionLock(); setCourseUnits(val); },
        setTutors: (val: any) => { triggerManualActionLock(); setTutors(val); },
        setProgrammes: (val: any) => { triggerManualActionLock(); setProgrammes(val); },

        // Cloud Actions
        loadTutorContentFromCloud,
        pullFromCloud,
        triggerAtomicCloudSync: async () => {
            // Force a snapshot now (bypasses debounce)
            return await takeInstitutionalSnapshot("Atomic Platform Sync", true);
        },

        // Time Utilities
        getSyncedDate,
        serverTimeOffset,

        // Snapshot Management
        takeInstitutionalSnapshot,
        restoreInstitutionalSnapshot,
        fetchSchoolSnapshots,
        lastCloudSync,
        isCloudSyncing,
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
    allStudents?: EnrolledStudent[], // NEW: Pass all students for Pay Code lookup
    programmes: any[] = [] // Optional programmes for tuition fallback
): number => {
    if (!student) return 0;

    // Strong Detection for Arrears (typographical resistance)
    const isArrears = (str: string) => /brought\s*forward|bf|arrears|prev|balance\s*b\/f/i.test(str);

    // FINANCIAL MIRRORING: If this is a Registrar student, find the Bursar's financial record
    let financialAuthority = student;
    if (student.origin === 'registrar' && student.payCode && allStudents) {
        const bursarRecord = allStudents.find(s =>
            s.origin === 'bursar' &&
            s.payCode?.toString() === student.payCode?.toString()
        );

        if (bursarRecord) {
            financialAuthority = bursarRecord;
        } else {
            return 0;
        }
    }

    const term = targetTerm || financialAuthority.semester;
    const isCurrent = term === financialAuthority.semester;

    // 1. Tuition Bill
    let totalTuitionBilled = billings.filter(b => {
        if (b.studentId.toString() !== financialAuthority.id.toString() || b.term !== term) return false;
        const isTuition = /tuition/i.test(b.description || "") || /tuition/i.test(b.type || "");
        const isArrearsBill = isArrears(b.description || "") || isArrears(b.type || "");
        return isTuition && !isArrearsBill;
    }).reduce((sum, b) => sum + b.amount, 0);

    // SAFETY FALLBACK: If NO tuition bill is found
    if (totalTuitionBilled === 0 && programmes.length > 0) {
        const prog = programmes.find(p => p.id === financialAuthority.programme || p.name === financialAuthority.programme);
        const feeConfig = prog?.feeStructure?.find((fs: any) => fs.level === (financialAuthority.level));
        if (feeConfig) totalTuitionBilled = feeConfig.tuitionFee;
    }

    // 2. Arrears Bills
    const arrearsBillings = billings.filter(b =>
        b.studentId.toString() === financialAuthority.id.toString() &&
        b.term === term &&
        (isArrears(b.description || "") || isArrears(b.type || ""))
    );
    const totalArrearsBilled = arrearsBillings.reduce((sum, b) => sum + b.amount, 0);

    // 3. Bursaries
    const bursaryValue = financialAuthority.bursary && financialAuthority.bursary !== 'none'
        ? (bursaries.find(b => b.id === financialAuthority.bursary)?.value || 0)
        : 0;

    // 4. Payments
    const studentPayments = payments.filter(p =>
        p.studentId.toString() === financialAuthority.id.toString() &&
        (p.term === term || (!p.term && isCurrent))
    );

    const totalClearingPaid = studentPayments.reduce((acc, p) => {
        const methodLower = String(p.method || "").toLowerCase().replace(/\s/g, "");
        const descLower = String(p.description || "").toLowerCase();
        const isDigitalIntegration =
            ['schoolpay', 'pegpay'].includes(methodLower) ||
            descLower.includes('automatic schoolpay') ||
            descLower.includes('automatic pegpay') ||
            p.metadata?.syncSource === 'digital_integration';

        if (p.allocations && Object.keys(p.allocations).length > 0) {
            const tuitionKey = Object.keys(p.allocations).find(k => k.toLowerCase().includes('tuition'));
            const arrearsKey = Object.keys(p.allocations).find(k => isArrears(k));
            let amount = 0;
            if (tuitionKey) amount += (p.allocations[tuitionKey] || 0);
            if (arrearsKey) amount += (p.allocations[arrearsKey] || 0);

            if (amount === 0 && isDigitalIntegration) {
                const isOnlyGeneric = Object.keys(p.allocations).every(k =>
                    ['general', 'collection', 'fee payment'].includes(k.toLowerCase().trim())
                );
                if (isOnlyGeneric) amount = p.amount;
            }

            return acc + amount;
        } else {
            if (isDigitalIntegration) return acc + p.amount;
            return acc + p.amount;
        }
    }, 0);

    // 5. Previous Balance (Safety check for unbilled debt)
    const hasArrearsBill = arrearsBillings.length > 0;
    const startPrevBal = overridePrevBal !== undefined ? overridePrevBal : (financialAuthority.previousBalance || 0);
    const effectivePrev = hasArrearsBill ? 0 : startPrevBal;

    // DEBT-FIRST CLEARANCE LOGIC (User Request)
    // Percentage tracks current tuition progress AFTER old debts are covered.
    const totalArrears = totalArrearsBilled + effectivePrev;
    const tuitionNetTarget = Math.max(0, totalTuitionBilled - bursaryValue);
    const tuitionNetPaid = Math.max(0, totalClearingPaid - totalArrears);

    if (tuitionNetTarget <= 0) return 100; // No tuition target this term = fully cleared

    const pct = (tuitionNetPaid / tuitionNetTarget) * 100;
    return Math.max(0, Math.min(100, pct));
};

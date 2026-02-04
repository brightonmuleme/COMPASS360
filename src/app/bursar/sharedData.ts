
export interface Transaction {
    id: string | number;
    studentId: number;
    studentName?: string;
    description?: string;
    amount: number;
    type: 'billed' | 'digital' | 'manual' | 'cash';
    mode?: string;
    subMode?: string;
    date: string;
    timeAgo?: string;
    receiptNumber?: string;
    particulars?: string;
    allocations?: any;
    term?: string;
    reference?: string;
}

export const FEE_STRUCTURE: Record<string, { base: number }> = {
    'Bachelor of Science in Computer Science': { base: 1500000 },
    'Bachelor of Business Administration': { base: 1200000 },
    'Diploma in IT': { base: 800000 },
    // Add generic fallback
    'default': { base: 1000000 }
};

export const BURSARY_SCHEMES = [
    { id: 'none', name: 'None', value: 0 },
    { id: 'merit', name: 'Merit Scholarship', value: 500000 },
    { id: 'need', name: 'Need-based Aid', value: 300000 },
    { id: 'sports', name: 'Sports Bursary', value: 200000 }
];

export const OPTIONAL_SERVICES = [
    { id: 'transport', name: 'Transport', cost: 150000 },
    { id: 'meals', name: 'Meals', cost: 200000 },
    { id: 'uniform', name: 'Uniform', cost: 50000 }
];

export const MOCK_ENROLLED_STUDENTS: any[] = [];
export const MOCK_TRANSACTIONS: any[] = [];
export const TOTAL_BILLED = 150000000;

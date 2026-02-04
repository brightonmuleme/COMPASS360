export type LevelType = 'YEAR' | 'GRADE' | 'FORM' | 'LEVEL' | 'PRIMARY' | 'SENIOR' | 'RETAKER' | 'OTHER';
export type TimeUnit = 'SEMESTER' | 'TERM' | 'TRIMESTER' | 'QUARTER' | 'NONE';

export interface ParsedLevel {
    original: string;
    levelType: LevelType;
    levelNumber: number;
    timeUnit: TimeUnit;
    period: number; // e.g. 1, 2
    canonicalLabel: string; // "Year 1 Semester 2"
    isValid: boolean;
    confidence: number; // 0 to 1
}

const SYNONYMS: Record<string, string[]> = {
    YEAR: ['year', 'yr', 'y'],
    GRADE: ['grade', 'gr', 'g', 'class'],
    FORM: ['form', 'f'],
    LEVEL: ['level', 'lvl', 'l'],
    PRIMARY: ['primary', 'p', 'pri'],
    SENIOR: ['senior', 's', 'snr', 'sec', 'secondary'],
    RETAKER: ['retaker', 'retake', 'r', 'repeater'],
    SEMESTER: ['semester', 'sem'],
    TERM: ['term', 't'],
    TRIMESTER: ['trimester', 'tri'],
    QUARTER: ['quarter', 'q']
};

export function parseLevelString(input: string): ParsedLevel {
    const normalized = input.toLowerCase().trim().replace(/\s+/g, ' ');

    let result: ParsedLevel = {
        original: input,
        levelType: 'YEAR', // Default
        levelNumber: 1,
        timeUnit: 'NONE',
        period: 0,
        canonicalLabel: '',
        isValid: false,
        confidence: 0
    };

    if (!normalized) return result;

    // 1. Identify Level Type & Number
    // Regex looks for: (key)? space? (number)
    // or (number) space? (key)

    let levelFound = false;
    let timeFound = false;

    // Helper to find key-value pair
    const findMatch = (keys: string[], text: string): { number: number, match: string } | null => {
        for (const key of keys) {
            // key followed by optional space then digits
            // Special case for single letters like 'p' or 's', ensure they are not part of another word
            const regexForward = new RegExp(`\\b${key}\\s*(\\d+)`, 'i');
            const matchFwd = text.match(regexForward);
            if (matchFwd) return { number: parseInt(matchFwd[1]), match: matchFwd[0] };
        }
        return null;
    };

    // --- DETECT PRIMARY LEVEL ---
    for (const [type, keywords] of Object.entries(SYNONYMS)) {
        if (['SEMESTER', 'TERM', 'TRIMESTER', 'QUARTER'].includes(type)) continue;

        const match = findMatch(keywords, normalized);
        if (match) {
            result.levelType = type as LevelType;
            result.levelNumber = match.number;
            levelFound = true;
            break;
        } else if (type === 'RETAKER') {
            // Allow Retaker without number
            const hasKeyword = keywords.some(k => normalized.includes(k));
            if (hasKeyword) {
                result.levelType = 'RETAKER';
                result.levelNumber = 1; // Default
                levelFound = true;
                break;
            }
        }
    }

    // Fallback: If no type found but straightforward number "1", assuming Year 1 if purely numeric?
    // Actually, "1" might be ambiguous. Let's see if we can find a number at the start.
    if (!levelFound) {
        const startNum = normalized.match(/^(\d+)/);
        if (startNum) {
            result.levelNumber = parseInt(startNum[1]);
            levelFound = true; // Weakly found
            result.confidence = 0.5;
        }
    } else {
        result.confidence = 0.8;
    }

    // --- DETECT TIME UNIT ---
    for (const [type, keywords] of Object.entries(SYNONYMS)) {
        if (!['SEMESTER', 'TERM', 'TRIMESTER', 'QUARTER'].includes(type)) continue;

        const match = findMatch(keywords, normalized);
        if (match) {
            result.timeUnit = type as TimeUnit;
            result.period = match.number;
            timeFound = true;
            break;
        }
    }

    // --- CONSTRUCT CANONICAL LABEL ---
    let typeLabel = result.levelType.charAt(0) + result.levelType.slice(1).toLowerCase(); // "Year"

    // Custom casing logic
    if (result.levelType === 'RETAKER') {
        typeLabel = 'Retakers'; // Plural usually
    }

    const timeLabel = result.timeUnit !== 'NONE'
        ? ` ${result.timeUnit.charAt(0) + result.timeUnit.slice(1).toLowerCase()} ${result.period}`
        : '';

    // If Retakers and number is 1, just show "Retakers" (Clean look)
    if (result.levelType === 'RETAKER' && result.levelNumber === 1 && !result.original.match(/\d/)) {
        result.canonicalLabel = `${typeLabel}${timeLabel}`;
    } else {
        result.canonicalLabel = `${typeLabel} ${result.levelNumber}${timeLabel}`;
    }

    // --- VALIDATION ---
    // Rule: Must have found at least a level number. Type defaults to Year if missing.
    // If only "sem 1", that's invalid as a level definition (needs parent level).
    if (levelFound) {
        result.isValid = true;

        // Boost confidence if explicit keywords were used
        if (normalized.match(/[a-z]/)) {
            // Has letters, likely tried to specify type
        }
    }

    return result;
}

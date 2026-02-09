/**
 * Standalone MD5 implementation for SchoolCode hashing.
 * Source: SparkMD5 or similar robust implementation
 */
function md5(string: string) {
    function k(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
        a = a + (b & c | ~b & d) + x + t;
        return (a << s | a >>> 32 - s) + b;
    }
    function l(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
        a = a + (b & d | c & ~d) + x + t;
        return (a << s | a >>> 32 - s) + b;
    }
    function m(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
        a = a + (b ^ c ^ d) + x + t;
        return (a << s | a >>> 32 - s) + b;
    }
    function n(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
        a = a + (c ^ (b | ~d)) + x + t;
        return (a << s | a >>> 32 - s) + b;
    }

    let words: number[] = [];
    for (let i = 0; i < string.length * 8; i += 8) {
        words[i >> 5] |= (string.charCodeAt(i / 8) & 255) << i % 32;
    }

    let a = 1732584193;
    let b = -271733879;
    let c = -1732584194;
    let d = 271733878;

    for (let i = 0; i < words.length; i += 16) {
        let olda = a, oldb = b, oldc = c, oldd = d;
        a = k(a, b, c, d, words[i + 0], 7, -680876936); d = k(d, a, b, c, words[i + 1], 12, -389564586); c = k(c, d, a, b, words[i + 2], 17, 606105819); b = k(b, c, d, a, words[i + 3], 22, -1044525330);
        a = k(a, b, c, d, words[i + 4], 7, -176418897); d = k(d, a, b, c, words[i + 5], 12, 1200080426); c = k(c, d, a, b, words[i + 6], 17, -1473231341); b = k(b, c, d, a, words[i + 7], 22, -45705983);
        a = k(a, b, c, d, words[i + 8], 7, 1770035416); d = k(d, a, b, c, words[i + 9], 12, -1958414417); c = k(c, d, a, b, words[i + 10], 17, -42063); b = k(b, c, d, a, words[i + 11], 22, -1990404162);
        a = k(a, b, c, d, words[i + 12], 7, 1804603682); d = k(d, a, b, c, words[i + 13], 12, -40341101); c = k(c, d, a, b, words[i + 14], 17, -1502002290); b = k(b, c, d, a, words[i + 15], 22, 1236535329);
        a = l(a, b, c, d, words[i + 1], 5, -165796510); d = l(d, a, b, c, words[i + 6], 9, -1069501632); c = l(c, d, a, b, words[i + 11], 14, 643717713); b = l(b, c, d, a, words[i + 0], 20, -373897302);
        a = l(a, b, c, d, words[i + 5], 5, -701558691); d = l(d, a, b, c, words[i + 10], 9, 38016083); c = l(c, d, a, b, words[i + 15], 14, -660478335); b = l(b, c, d, a, words[i + 4], 20, -405537848);
        a = l(a, b, c, d, words[i + 9], 5, 568446438); d = l(d, a, b, c, words[i + 14], 9, -1019803690); c = l(c, d, a, b, words[i + 3], 14, -187363961); b = l(b, c, d, a, words[i + 8], 20, 1163531501);
        a = l(a, b, c, d, words[i + 13], 5, -1444681467); d = l(d, a, b, c, words[i + 2], 9, -51403784); c = l(c, d, a, b, words[i + 7], 14, 1735328473); b = l(b, c, d, a, words[i + 12], 20, -1926607734);
        a = m(a, b, c, d, words[i + 5], 4, -378558); d = m(d, a, b, c, words[i + 8], 11, -2022574463); c = m(c, d, a, b, words[i + 11], 16, 1839030562); b = m(b, c, d, a, words[i + 14], 23, -35309556);
        a = m(a, b, c, d, words[i + 1], 4, -1530992060); d = m(d, a, b, c, words[i + 4], 11, 1272893353); c = m(c, d, a, b, words[i + 7], 16, -155497632); b = m(b, c, d, a, words[i + 10], 23, -1094730640);
        a = m(a, b, c, d, words[i + 13], 4, 681279174); d = m(d, a, b, c, words[i + 0], 11, -358537222); c = m(c, d, a, b, words[i + 3], 16, -722521979); b = m(b, c, d, a, words[i + 6], 23, 76029189);
        a = m(a, b, c, d, words[i + 9], 4, -640364487); d = m(d, a, b, c, words[i + 12], 11, -421815835); c = m(c, d, a, b, words[i + 15], 16, 530742520); b = m(b, c, d, a, words[i + 2], 23, -995338651);
        a = n(a, b, c, d, words[i + 0], 6, -198630844); d = n(d, a, b, c, words[i + 7], 10, 1126891415); c = n(c, d, a, b, words[i + 14], 15, -1416354905); b = n(b, c, d, a, words[i + 5], 21, -57434055);
        a = n(a, b, c, d, words[i + 12], 6, 1700485571); d = n(d, a, b, c, words[i + 3], 10, -1894986606); c = n(c, d, a, b, words[i + 10], 15, -1051523); b = n(b, c, d, a, words[i + 1], 21, -2054922799);
        a = n(a, b, c, d, words[i + 8], 6, 1873313359); d = n(d, a, b, c, words[i + 15], 10, -30611744); c = n(c, d, a, b, words[i + 6], 15, -1560198380); b = n(b, c, d, a, words[i + 13], 21, 1309151649);
        a = n(a, b, c, d, words[i + 4], 6, -145523070); d = n(d, a, b, c, words[i + 11], 10, -1120210379); c = n(c, d, a, b, words[i + 2], 15, 718787280); b = n(b, c, d, a, words[i + 9], 21, -343485551);
        a = a + olda | 0; b = b + oldb | 0; c = c + oldc | 0; d = d + oldd | 0;
    }
    const hex = (n: number) => ("00000000" + (n >>> 0).toString(16)).slice(-8).match(/../g)!.reverse().join("");
    return hex(a) + hex(b) + hex(c) + hex(d);
}

export interface SchoolPayTransaction {
    amount: string;
    paymentDateAndTime: string;
    schoolpayReceiptNumber: string;
    settlementBankCode: string;
    sourceChannelTransDetail: string;
    sourceChannelTransactionId: string;
    sourcePaymentChannel: string;
    studentName: string;
    studentPaymentCode: string;
    studentRegistrationNumber: string;
    transactionCompletionStatus: string;
    // For supplementary fee payments
    supplementaryFeeDescription?: string;
    supplementaryFeeId?: string;
    studentClass?: string;
}

export interface SyncResponse {
    returnCode: number;
    returnMessage: string;
    transactions: SchoolPayTransaction[];
    supplementaryFeePayments: SchoolPayTransaction[];
}

const BASE_URL = 'https://schoolpay.co.ug/paymentapi';

export const schoolPayService = {
    /**
     * Calls our internal Secure Proxy instead of direct external URL
     * This avoids CORS errors and keeps the API Password hidden.
     */
    syncRange: async (schoolCode: string, password: string, fromDate: string, toDate: string): Promise<SyncResponse> => {
        try {
            const response = await fetch('/api/schoolpay/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    schoolCode,
                    password,
                    fromDate,
                    toDate,
                    mode: 'range'
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || `Server Sync Failed (${response.status})`);
            }

            return await response.json();
        } catch (error: any) {
            console.error('SchoolPay Range Sync Error:', error);
            throw error;
        }
    },

    syncDaily: async (schoolCode: string, password: string, date: string): Promise<SyncResponse> => {
        try {
            const response = await fetch('/api/schoolpay/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    schoolCode,
                    password,
                    fromDate: date,
                    mode: 'daily'
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || `Server Sync Failed (${response.status})`);
            }

            return await response.json();
        } catch (error: any) {
            console.error('SchoolPay Daily Sync Error:', error);
            throw error;
        }
    }
};

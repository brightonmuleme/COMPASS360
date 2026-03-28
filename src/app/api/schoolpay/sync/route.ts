import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const BASE_URL = 'https://schoolpay.co.ug/paymentapi';

/**
 * Server-side Proxy for SchoolPay API
 * This avoids CORS errors and keeps the API Password secure.
 */
export async function POST(req: NextRequest) {
    try {
        const { schoolCode, password, fromDate, toDate, mode } = await req.json();

        if (!schoolCode || !password || !fromDate) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        // 🛡️ SCHOOLPAY DOCS FIX: The hash only uses 'fromDate' (identifyingDate) even for range requests.
        // Formula: MD5(schoolCode + identifyingDate + password)
        const hashStr = schoolCode + fromDate + password;
            
        const hash = crypto.createHash('md5').update(hashStr).digest('hex').toUpperCase();

        let url = '';
        if (mode === 'range' && toDate) {
            // URL has from/to, but hash (above) only uses fromDate per documentation
            url = `${BASE_URL}/AndroidRS/SchoolRangeTransactions/${schoolCode}/${fromDate}/${toDate}/${hash}`;
        } else {
            url = `${BASE_URL}/AndroidRS/SyncSchoolTransactions/${schoolCode}/${fromDate}/${hash}`;
        }

        console.log(`--- PROXYING SCHOOLPAY REQUEST ---`);
        console.log(`URL: ${url}`);

        // 2. Make the request from the server
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Compass360-Server-Sync'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('SchoolPay API Error Response:', errorText);
            return NextResponse.json({
                error: `SchoolPay API returned ${response.status}`,
                details: errorText
            }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error('SchoolPay Proxy Error:', error);
        return NextResponse.json({
            error: 'Failed to connect to SchoolPay',
            message: error.message
        }, { status: 500 });
    }
}

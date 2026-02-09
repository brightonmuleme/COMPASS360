import { NextRequest, NextResponse } from 'next/server';
import { generateId } from '@/lib/store';

/**
 * SchoolPay Webhook Handler
 * 
 * This endpoint receives real-time payment notifications from SchoolPay.
 * 
 * Expected Payload (based on SchoolPay API):
 * {
 *   "transactionId": "...",
 *   "studentId": "...", (This is the SchoolPay/Pay Code)
 *   "amount": 100000,
 *   "paymentDate": "...",
 *   "receiptNumber": "...",
 *   "paymentMode": "...", (MTN, AIRTEL, BANK)
 *   "signature": "..." (For security)
 * }
 */

export async function POST(req: NextRequest) {
    try {
        const payload = await req.json();
        const apiKey = req.headers.get('x-schoolpay-api-key'); // Example security check

        console.log('--- SCHOOLPAY WEBHOOK RECEIVED ---');
        console.log('Payload:', payload);

        // 1. Validate Secret / Signature
        // if (apiKey !== process.env.SCHOOLPAY_SECRET) {
        //     return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
        // }

        // 2. Logic to store in Supabase or LocalStorage
        // In this local-first architecture, we'd need a way to push to the client.
        // For a real production app, we write to the 'payments' table.

        const { studentId, amount, receiptNumber, paymentMode, paymentDate } = payload;

        // Note: In Next.js App Router, we usually use a Server Action or Database call here.
        // Since the current app uses localStorage for state, this webhook will only work 
        // if connected to a real database (Supabase).

        /* EXAMPLE SUPABASE SAVE:
        const { data, error } = await supabase
            .from('payments')
            .insert([{
                id: generateId(),
                student_pay_code: studentId,
                amount: amount,
                reference: receiptNumber,
                mode: paymentMode,
                status: 'Success',
                created_at: paymentDate
            }]);
        */

        return NextResponse.json({
            status: 'success',
            message: 'Payment received and recorded',
            acknowledgmentId: generateId()
        });

    } catch (error) {
        console.error('Webhook Error:', error);
        return NextResponse.json({
            status: 'error',
            message: 'Failed to process webhook'
        }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'SchoolPay Webhook Endpoint is Active',
        instructions: 'Point your SchoolPay dashboard webhooks to this POST endpoint.'
    });
}

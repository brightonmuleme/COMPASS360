import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get('schoolId');

        if (!schoolId) {
            return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 });
        }

        // 1. Fetch EVERYTHING from the 'students' table without filters
        // We do this to see if data is orphaned or using a different school ID
        const { data: allStudents } = await supabase.from('students').select('*');
        const { data: allTransactions } = await supabase.from('transactions').select('*');
        const { data: allBillings } = await supabase.from('billings').select('*');
        const { data: allPayments } = await supabase.from('payments').select('*');
        const { data: allAdmissions } = await supabase.from('registrar_students').select('*');

        // 2. Fetch the School's specific settings object
        const { data: school } = await supabase.from('schools').select('*').eq('id', schoolId).single();

        return NextResponse.json({
            summary: {
                students: allStudents?.length || 0,
                transactions: allTransactions?.length || 0,
                billings: allBillings?.length || 0,
                payments: allPayments?.length || 0,
                admissions: allAdmissions?.length || 0,
            },
            raw: {
                students: allStudents || [],
                transactions: allTransactions || [],
                billings: allBillings || [],
                payments: allPayments || [],
                admissions: allAdmissions || [],
                schoolSettings: school?.settings || {}
            }
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

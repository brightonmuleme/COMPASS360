import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const tablesToTry = [
        'students', 'enrolled_students', 'registrar_students',
        'transactions', 'payments', 'billings', 'schools', 'profiles'
    ];

    const results: any = {};

    for (const table of tablesToTry) {
        try {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });

            results[table] = error ? `Error: ${error.message}` : count;
        } catch (e: any) {
            results[table] = `Failed: ${e.message}`;
        }
    }

    return NextResponse.json(results);
}

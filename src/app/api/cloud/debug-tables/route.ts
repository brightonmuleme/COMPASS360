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

    try {
        // Check for specific columns in profiles
        const { data: columns, error: columnError } = await supabase
            .rpc('get_table_columns', { table_name_val: 'profiles' });

        if (columnError) {
            // Fallback: try a direct query to information_schema if RPC fails
            const { data: infoSchema, error: infoError } = await supabase
                .from('profiles')
                .select('*')
                .limit(1);

            if (infoSchema && infoSchema.length > 0) {
                results.profiles_columns = Object.keys(infoSchema[0]);
            } else {
                results.profiles_error = infoError?.message || "No data in profiles to infer columns";
            }
        } else {
            results.profiles_columns = columns;
        }

        for (const table of tablesToTry) {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });

            results[table] = error ? `Error: ${error.message}` : count;
        }
    } catch (e: any) {
        results.critical_error = e.message;
    }

    return NextResponse.json(results);
}

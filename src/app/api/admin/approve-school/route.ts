import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseServiceKey) {
        return NextResponse.json({ error: 'System configuration error: Service key missing.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const { applicationId, schoolName, email } = await req.json();

        if (!applicationId || !schoolName || !email) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        // 1. Create the school entry (using service role to bypass RLS)
        const { data: school, error: schoolError } = await supabase
            .from('schools')
            .insert([{
                name: schoolName,
                email: email,
                status: 'Active'
            }])
            .select()
            .single();

        if (schoolError) {
            console.error('Error creating school:', schoolError);
            return NextResponse.json({ error: schoolError.message }, { status: 500 });
        }

        // 2. Update the application status
        const { error: appError } = await supabase
            .from('school_applications')
            .update({ status: 'Approved' })
            .eq('id', applicationId);

        if (appError) {
            console.error('Error updating application:', appError);
            return NextResponse.json({ error: appError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, school });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

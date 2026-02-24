import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const { schoolId, requisition } = await req.json();

        if (!schoolId || !requisition) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // 1. Get current settings
        const { data: school, error: fetchError } = await supabase
            .from('schools')
            .select('settings')
            .eq('id', schoolId)
            .single();

        if (fetchError) throw fetchError;

        let settings = school.settings || {};
        if (typeof settings === 'string') settings = JSON.parse(settings);

        let cloudState = settings.cloud_state || {};
        let requisitions = cloudState.requisitions || [];

        // 2. Atomic Update (Upsert into the array)
        const index = requisitions.findIndex((r: any) => r.id === requisition.id);
        if (index >= 0) {
            requisitions[index] = requisition;
        } else {
            requisitions.push(requisition);
        }

        // 3. Save back
        const updatedSettings = {
            ...settings,
            cloud_state: {
                ...cloudState,
                requisitions,
                timestamp: new Date().toISOString()
            }
        };

        const { error: updateError } = await supabase
            .from('schools')
            .update({ settings: updatedSettings })
            .eq('id', schoolId);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, requisition });

    } catch (error: any) {
        console.error('ATOMI REQ ERR:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

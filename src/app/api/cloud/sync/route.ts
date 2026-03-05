import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseServiceKey) {
        return NextResponse.json({ error: 'System configuration error: Service key missing.' }, { status: 500 });
    }

    // Use service role client to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const { schoolId, cloudState } = await req.json();

        if (!schoolId || !cloudState) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        console.log('☁️ API CLOUD SYNC: Saving for school ID:', schoolId);

        // Get current settings
        const { data: school, error: fetchError } = await supabase
            .from('schools')
            .select('settings')
            .eq('id', schoolId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
            console.error('☁️ API CLOUD SYNC ERROR: Failed to fetch:', fetchError);
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        // Handle NULL or empty settings
        let currentSettings = {};
        if (school?.settings) {
            if (typeof school.settings === 'string') {
                try {
                    currentSettings = JSON.parse(school.settings);
                } catch (e) {
                    console.warn('☁️ API CLOUD SYNC: Failed to parse settings, using empty object');
                }
            } else {
                currentSettings = school.settings;
            }
        }

        const updatedSettings = {
            ...currentSettings,
            cloud_state: cloudState
        };

        console.log('☁️ API CLOUD SYNC: Attempting to save with service role');

        // Update with service role (bypasses RLS)
        const { error: updateError } = await supabase
            .from('schools')
            .update({ settings: updatedSettings })
            .eq('id', schoolId);

        if (updateError) {
            console.error('☁️ API CLOUD SYNC ERROR: Update failed:', updateError);
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        console.log('☁️ API CLOUD SYNC SUCCESS');

        return NextResponse.json({
            success: true,
            message: 'Cloud state saved successfully'
        });

    } catch (error: any) {
        console.error('☁️ API CLOUD SYNC CRITICAL ERROR:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseServiceKey) {
        return NextResponse.json({ error: 'System configuration error: Service key missing.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get('schoolId');

        if (!schoolId) {
            return NextResponse.json({ error: 'Missing schoolId parameter' }, { status: 400 });
        }

        console.log('☁️ API CLOUD FETCH: Getting data for school ID:', schoolId);

        const { data, error } = await supabase
            .from('schools')
            .select('settings')
            .eq('id', schoolId)
            .single();

        if (error) {
            console.error('☁️ API CLOUD FETCH ERROR:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!data?.settings) {
            return NextResponse.json({ cloudState: null });
        }

        const settings = typeof data.settings === 'string' ? JSON.parse(data.settings) : data.settings;
        return NextResponse.json({ cloudState: settings.cloud_state || null });

    } catch (error: any) {
        console.error('☁️ API CLOUD FETCH CRITICAL ERROR:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

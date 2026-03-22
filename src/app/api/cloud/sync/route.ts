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

        // --- THE CONFLICT SOLVER: MERGING VS OVERWRITING ---
        const incomingState = cloudState;
        const existingState = (currentSettings as any).cloud_state || {};
        
        // Final merged object starts as a copy of the incoming data
        const mergedState = { ...incomingState };

        /**
         * 🛡️ COMPASS MERGE: Merges two arrays based on unique IDs and Timestamps
         */
        const mergeArrays = (incoming: any[], existing: any[]) => {
            if (!Array.isArray(existing)) return incoming;
            if (!Array.isArray(incoming)) return existing;

            const map = new Map();
            // 1. Start with the Existing Cloud baseline
            existing.forEach(item => { if (item.id) map.set(item.id.toString(), item); });

            // 2. Overlay Incoming data (Newest Wins)
            incoming.forEach(item => {
                const id = item.id?.toString();
                if (!id) return;

                if (!map.has(id)) {
                    map.set(id, item);
                } else {
                    const current = map.get(id);
                    const incomingTime = item.lastUpdated ? new Date(item.lastUpdated).getTime() : 0;
                    const currentTime = current.lastUpdated ? new Date(current.lastUpdated).getTime() : 0;

                    if (incomingTime >= currentTime) {
                        map.set(id, item);
                    }
                }
            });
            return Array.from(map.values());
        };

        // Apply merge to all critical collections to prevent "January Loss" scenario
        const collections = ['students', 'payments', 'generalTransactions', 'inventory', 'attendanceRecord', 'manualPaymentMethods', 'paymentIntegrations'];
        
        collections.forEach(key => {
            if (incomingState[key] && existingState[key]) {
                mergedState[key] = mergeArrays(incomingState[key], existingState[key]);
            } else if (existingState[key] && !incomingState[key]) {
                // If the laptop doesn't have January data, but the cloud DOES, keep the cloud data!
                mergedState[key] = existingState[key];
            }
        });

        const updatedSettings = {
            ...currentSettings,
            cloud_state: mergedState
        };

        console.log(`☁️ API CLOUD SYNC: Final merge complete for school ${schoolId}.`);

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

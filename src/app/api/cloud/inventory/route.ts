import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseServiceKey) {
        return NextResponse.json({ error: 'System configuration error.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const { schoolId, itemId, delta, log } = await req.json();

        if (!schoolId || !itemId || delta === undefined) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        console.log(`☁️ TRANSACTION: ${schoolId} | Item: ${itemId} | Delta: ${delta}`);

        // 1. Fetch current settings
        const { data: school, error: fetchError } = await supabase
            .from('schools')
            .select('settings')
            .eq('id', schoolId)
            .single();

        if (fetchError) throw fetchError;

        let settings = typeof school.settings === 'string' ? JSON.parse(school.settings) : school.settings;
        let cloudState = settings.cloud_state || {};

        // 2. Apply Delta
        if (cloudState.inventoryItems) {
            const itemIndex = cloudState.inventoryItems.findIndex((i: any) => i.id === itemId);
            if (itemIndex !== -1) {
                const item = cloudState.inventoryItems[itemIndex];
                item.quantity = (item.quantity || 0) + delta;
                item.lastUpdated = new Date().toISOString();
            }
        }

        // 3. Add Log
        if (log && cloudState.inventoryLogs) {
            cloudState.inventoryLogs = [log, ...cloudState.inventoryLogs].slice(0, 1000);
        }

        // 4. Save Back
        const updatedSettings = {
            ...settings,
            cloud_state: {
                ...cloudState,
                timestamp: new Date().toISOString()
            }
        };

        const { error: updateError } = await supabase
            .from('schools')
            .update({ settings: updatedSettings })
            .eq('id', schoolId);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, newTimestamp: updatedSettings.cloud_state.timestamp });

    } catch (error: any) {
        console.error('☁️ TRANSACTION FAILED:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

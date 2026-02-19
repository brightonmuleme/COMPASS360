const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function syncProfiles() {
    try {
        const envContent = fs.readFileSync('.env.local', 'utf8');
        const getEnv = (key) => {
            const regex = new RegExp(`^${key}=(.*)$`, 'm');
            const match = envContent.match(regex);
            return match ? match[1].trim() : null;
        };

        const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
        const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceKey) {
            console.error("Missing credentials in .env.local");
            return;
        }

        const supabase = createClient(supabaseUrl, serviceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        console.log("--- STARTING PROFILE SYNC (MINIMAL) ---");

        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) return console.error(listError);

        const { data: profiles, error: profileError } = await supabase.from('profiles').select('id');
        if (profileError) return console.error(profileError);

        const existingIds = new Set(profiles.map(p => p.id));
        let synced = 0;
        let errors = 0;

        for (const user of users) {
            if (!existingIds.has(user.id)) {
                console.log(`Syncing: ${user.email}`);

                const meta = user.user_metadata || {};

                // Minimal Insert - excluding fields that might not exist
                const newProfile = {
                    id: user.id,
                    // Removing email as it caused error
                    full_name: meta.full_name || meta.name || user.email?.split('@')[0] || 'Unknown',
                    role: meta.role || meta.custom_role || 'Student',
                    // Removing phone_number
                    // Keeping school_id and pay_code as they are critical if present
                    school_id: meta.school_id || null,
                    pay_code: meta.pay_code || null
                };

                const { error: insertError } = await supabase
                    .from('profiles')
                    .insert([newProfile]);

                if (insertError) {
                    console.error(`  FAILED: ${insertError.message}`);
                    errors++;
                } else {
                    console.log(`  SUCCESS`);
                    synced++;
                }
            }
        }

        console.log(`Sync Complete. Synced: ${synced}, Errors: ${errors}`);

    } catch (err) {
        console.error("Unexpected error:", err);
    }
}

syncProfiles();

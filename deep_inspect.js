const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function deepInspectSettings() {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const getEnv = (key) => {
        const match = envContent.match(new RegExp(`${key}=(.*)`));
        return match ? match[1].trim() : null;
    };

    const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: school } = await supabase.from('schools').select('settings').eq('id', 'ea5d359f-8107-40a3-808c-0c4f8f3a847c').single();

    if (school && school.settings) {
        console.log("--- SETTINGS INSPECTION ---");
        const keys = Object.keys(school.settings);
        console.log("Top level keys in settings:", keys);

        if (school.settings.cloud_state) {
            console.log("Cloud State Keys:", Object.keys(school.settings.cloud_state));
            console.log("Timestamp:", school.settings.cloud_state.timestamp);
        }

        // Search for any key that looks like a backup
        keys.forEach(k => {
            if (k.toLowerCase().includes('backup') || k.toLowerCase().includes('old') || k.toLowerCase().includes('recover')) {
                console.log(`Potential backup key found: ${k}`);
            }
        });
    }
}

deepInspectSettings();

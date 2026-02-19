const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkProfiles() {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const getEnv = (key) => {
        const match = envContent.match(new RegExp(`${key}=(.*)`));
        return match ? match[1].trim() : null;
    };

    const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("--- PROFILES TABLE CHECK ---");
    const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

    if (error) {
        console.log("Error fetching profiles:", error.message);
    } else {
        console.log(`Found ${count} total profiles.`);

        // Let's see some names to confirm if they are students
        const { data: names } = await supabase.from('profiles').select('full_name, role').limit(10);
        console.log("Sample profiles:", names);
    }
}

checkProfiles();

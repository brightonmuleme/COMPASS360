const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function inspectProfile() {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const getEnv = (key) => {
        const match = envContent.match(new RegExp(`${key}=(.*)`));
        return match ? match[1].trim() : null;
    };

    const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("--- INSPECTING PROFILES TABLE ---");

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error fetching profile:", error);
    } else {
        console.log("Sample Profile Record:", data[0]);
        console.log("Columns:", Object.keys(data[0] || {}));
    }
}

inspectProfile();

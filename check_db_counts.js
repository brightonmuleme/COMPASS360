const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkCounts() {
    // Manually parse .env.local
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const getEnv = (key) => {
        const match = envContent.match(new RegExp(`${key}=(.*)`));
        return match ? match[1].trim() : null;
    };

    const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
        console.log("Error: Could not find Supabase URL or Service Role Key in .env.local");
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("--- DATABASE COUNT CHECK (TOTAL RECORDS) ---");

    // We check both students (Bursar) and registrar_students (Admissions)
    const tables = ['students', 'registrar_students', 'transactions', 'billings', 'payments'];

    for (const table of tables) {
        try {
            const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
            if (error) {
                console.log(`${table}: Error - ${error.message}`);
            } else {
                console.log(`${table}: ${count} rows`);
            }
        } catch (err) {
            console.log(`${table}: Exception - ${err.message}`);
        }
    }
    console.log("--------------------------------------------");
}

checkCounts();

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function listTables() {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const getEnv = (key) => {
        const match = envContent.match(new RegExp(`${key}=(.*)`));
        return match ? match[1].trim() : null;
    };

    const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("--- SCANNING FOR ALL TABLES ---");

    // In Supabase (Postgres), we can query information_schema to find table names
    const { data, error } = await supabase.rpc('get_tables'); // This usually isn't enabled by default

    if (error) {
        // Fallback: try to query a few more common names
        const commonNames = [
            'students', 'registrar_students', 'transactions', 'billings', 'payments',
            'deleted_students', 'students_backup', 'old_students', 'audit_logs',
            'general_transactions', 'requisitions', 'bursaries', 'programmes', 'services',
            'school_profile', 'profiles'
        ];

        for (const name of commonNames) {
            const { count, error: tableError } = await supabase.from(name).select('*', { count: 'exact', head: true });
            if (!tableError) {
                console.log(`Table found: ${name} (${count} rows)`);
            }
        }
    } else {
        console.log("Tables found:", data);
    }
}

listTables();

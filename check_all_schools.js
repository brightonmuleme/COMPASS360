const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkAllSchools() {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const getEnv = (key) => {
        const match = envContent.match(new RegExp(`${key}=(.*)`));
        return match ? match[1].trim() : null;
    };

    const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("--- ALL SCHOOLS SEARCH ---");
    const { data, error } = await supabase.from('schools').select('id, name, settings');

    if (error) {
        console.log("Error fetching schools:", error.message);
        return;
    }

    console.log(`Found ${data.length} total schools in the registry.`);
    data.forEach(s => {
        const cloudState = s.settings?.cloud_state || {};
        const students = cloudState.students?.length || 0;
        const reg = cloudState.registrarStudents?.length || 0;
        const payments = cloudState.payments?.length || 0;
        const billings = cloudState.billings?.length || 0;

        console.log(`- ${s.name} (ID: ${s.id})`);
        console.log(`  Students: ${students}, Admissions: ${reg}, Payments: ${payments}, Billings: ${billings}`);

        if (students > 50) {
            console.log(`  >>> POTENTIAL MATCH FOUND!`);
        }
    });
}

checkAllSchools();

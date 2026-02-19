const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkSchools() {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const getEnv = (key) => {
        const match = envContent.match(new RegExp(`${key}=(.*)`));
        return match ? match[1].trim() : null;
    };

    const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("--- SCHOOLS TABLE CHECK ---");
    const { data, error } = await supabase.from('schools').select('id, name, settings');

    if (error) {
        console.log("Error fetching schools:", error.message);
        return;
    }

    console.log(`Found ${data.length} schools.`);
    data.forEach(s => {
        const students = s.settings?.cloud_state?.students?.length || 0;
        const regStudents = s.settings?.cloud_state?.registrarStudents?.length || 0;
        console.log(`School ID: ${s.id}, Name: ${s.name}, Students in Cloud State: ${students}, Admissions in Cloud State: ${regStudents}`);
    });
}

checkSchools();

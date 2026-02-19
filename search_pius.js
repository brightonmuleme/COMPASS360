const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function findStudent() {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const getEnv = (key) => {
        const match = envContent.match(new RegExp(`${key}=(.*)`));
        return match ? match[1].trim() : null;
    };

    const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'); // Use Anon key first just in case
    const supabaseService = createClient(supabaseUrl, getEnv('SUPABASE_SERVICE_ROLE_KEY'));

    console.log("Searching for 'Kiganda Pius'...");

    const { data: school } = await supabaseService.from('schools').select('settings').eq('id', 'ea5d359f-8107-40a3-808c-0c4f8f3a847c').single();

    if (school && school.settings) {
        const fullJson = JSON.stringify(school.settings);

        if (fullJson.toLowerCase().includes('kiganda') || fullJson.toLowerCase().includes('pius')) {
            console.log("MATCH FOUND for 'Kiganda Pius' in settings blob!");

            // Re-find the exact object
            const students = school.settings.cloud_state?.students || [];
            const match = students.find(s => s.name?.toLowerCase().includes('kiganda'));
            if (match) {
                console.log("Found student object:", match);
            } else {
                console.log("Name found in string but not in active students array. Searching registrar...");
                const reg = school.settings.cloud_state?.registrarStudents || [];
                const regMatch = reg.find(s => s.name?.toLowerCase().includes('kiganda'));
                if (regMatch) console.log("Found in registrar:", regMatch);
            }
        } else {
            console.log("No match found for 'Kiganda Pius' in the current settings blob.");
        }
    }
}

findStudent();


const { createClient } = require('@supabase/supabase-js');

const NEXT_PUBLIC_SUPABASE_URL = "https://ccxgdztlplwtaznwrfyr.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeGdkenRscGx3dGF6bndyZnlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzNTQ3OCwiZXhwIjoyMDg1ODExNDc4fQ.p_sbFUZZb-iVAwPBN1LL-P6F90vs9AUCPYbn5QjW28Q";

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
    console.log("🕵️ Starting Global Data Salvage Operation...");

    // 1. Check all entries in the schools table (specifically for settings/snapshots)
    const { data: schools, error: schoolErr } = await supabase.from('schools').select('id, name, settings');
    if (schoolErr) console.error("❌ School Fetch Error:", schoolErr);
    else {
        console.log(`✅ Found ${schools.length} schools.`);
        schools.forEach(s => {
            console.log(`\n🏫 School: ${s.name} (${s.id})`);
            if (s.settings) {
                const settings = typeof s.settings === 'string' ? JSON.parse(s.settings) : s.settings;
                const keys = Object.keys(settings);
                console.log(`   - Settings Keys: ${keys.join(', ')}`);
                if (settings.cloud_state) {
                    const cs = settings.cloud_state;
                    const studentsCount = cs.students ? cs.students.length : 0;
                    const regCount = cs.registrarStudents ? cs.registrarStudents.length : 0;
                    console.log(`   - 📦 Cloud State Found! Students: ${studentsCount}, Registrar: ${regCount}`);
                    if (studentsCount > 0) {
                        console.log(`   - Sample Student: ${cs.students[0].name}`);
                    }
                }
            } else {
                console.log("   - (Settings Empty)");
            }
        });
    }

    // 2. Check profiles table for students
    const { data: profiles, error: profErr } = await supabase.from('profiles').select('name, full_name, role').limit(100);
    if (!profErr && profiles) {
        const studentProfiles = profiles.filter(p => p.role === 'student' || p.role === 'Student');
        console.log(`\n👤 Profiles Table (Sample): Found ${studentProfiles.length} students in first 100 rows.`);
    }

    // 3. Check transactions for "missing" names
    const { data: txs, error: txErr } = await supabase.from('transactions').select('description, metadata').limit(50);
    if (!txErr && txs) {
        console.log(`\n💸 Transactions Table (Sample):`);
        txs.slice(0, 10).forEach(t => {
            console.log(`   - ${t.description} | ${JSON.stringify(t.metadata)}`);
        });
    }
}

inspect();

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function restoreStudents() {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const getEnv = (key) => {
        const match = envContent.match(new RegExp(`${key}=(.*)`));
        return match ? match[1].trim() : null;
    };

    const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const SCHOOL_ID = 'ea5d359f-8107-40a3-808c-0c4f8f3a847c';

    console.log("--- STARTING EMERGENCY RESTORE ---");

    // 1. Fetch Current Cloud State
    const { data: school, error } = await supabase
        .from('schools')
        .select('settings')
        .eq('id', SCHOOL_ID)
        .single();

    if (error || !school.settings?.cloud_state) {
        console.error("Critical Error: Could not load cloud state.", error);
        return;
    }

    let cloudState = school.settings.cloud_state;
    const currentStudents = cloudState.students || [];
    const registrarStudents = cloudState.registrarStudents || [];
    const payments = cloudState.payments || [];

    console.log(`Current Visible Students: ${currentStudents.length}`);
    console.log(`Visible Admissions: ${registrarStudents.length}`);
    console.log(`Total Payments: ${payments.length}`);

    // 2. Identify the Missing 34 IDs
    const currentIds = new Set(currentStudents.map(s => s.id));
    const missingIds = new Set();

    payments.forEach(p => {
        if (p.studentId && !currentIds.has(p.studentId) && p.studentId !== 0) {
            missingIds.add(p.studentId);
        }
    });

    console.log(`Found ${missingIds.size} missing Student IDs from payments.`);

    if (missingIds.size === 0) {
        console.log("No missing students found to restore.");
        return;
    }

    // 3. Reconstruct Student Objects
    const restoredStudents = [];

    missingIds.forEach(id => {
        // Try to find name in Admissions
        const admission = registrarStudents.find(a => a.id === id);

        // Try to find name in Payments (metadata)
        const relevantPayments = payments.filter(p => p.studentId === id);
        const bestPaymentName = relevantPayments.find(p => p.studentName && p.studentName !== 'Unknown')?.studentName
            || relevantPayments.find(p => p.metadata?.studentName)?.metadata.studentName;

        let name = admission ? (admission.name || admission.firstName + ' ' + admission.lastName) : (bestPaymentName || `Recovered Student ${id}`);
        let level = admission?.level || 'Unknown Level';
        let program = admission?.program || admission?.programme || 'Unknown Program';

        // Reconstruct Object
        const newStudent = {
            id: id,
            name: name,
            payCode: admission?.schoolPayCode || admission?.payCode || "Recovered",
            level: level,
            programme: program,
            stream: admission?.stream || "A",
            gender: admission?.gender || "Unknown",
            status: "Active",
            origin: "restored_v1", // Mark so we know
            balance: 0, // Will be recalculated by system
            totalFees: 0,
            access: true
        };

        restoredStudents.push(newStudent);
    });

    console.log(`Reconstructed ${restoredStudents.length} student records.`);
    console.log("Sample Restored:", restoredStudents[0]);

    // 4. MERGE & SAVE
    const updatedStudents = [...currentStudents, ...restoredStudents];
    cloudState.students = updatedStudents;
    cloudState.timestamp = new Date().toISOString(); // Force update

    const updatedSettings = {
        ...school.settings,
        cloud_state: cloudState
    };

    const { error: saveError } = await supabase
        .from('schools')
        .update({ settings: updatedSettings })
        .eq('id', SCHOOL_ID);

    if (saveError) {
        console.error("FAILED TO SAVE RESTORED DATA:", saveError);
    } else {
        console.log("--- SUCCESS! RESTORE COMPLETE ---");
        console.log(`New Student Count: ${updatedStudents.length} (Was ${currentStudents.length})`);
        console.log("\nPLEASE REFRESH YOUR BROWSER NOW.");
    }
}

restoreStudents();

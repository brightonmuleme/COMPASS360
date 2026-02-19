const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkOrphanPayments() {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const getEnv = (key) => {
        const match = envContent.match(new RegExp(`${key}=(.*)`));
        return match ? match[1].trim() : null;
    };

    const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: school } = await supabase.from('schools').select('settings').eq('id', 'ea5d359f-8107-40a3-808c-0c4f8f3a847c').single();

    if (!school || !school.settings?.cloud_state) {
        console.log("Could not load cloud state.");
        return;
    }

    const students = school.settings.cloud_state.students || [];
    const payments = school.settings.cloud_state.payments || [];

    const knownStudentIds = new Set(students.map(s => s.id));
    const orphanPayments = [];

    payments.forEach(p => {
        // If payment has a studentId but that ID is NOT in our student list, it's an orphan
        if (p.studentId && !knownStudentIds.has(p.studentId) && p.studentId !== 0) {
            orphanPayments.push({
                paymentId: p.id,
                studentId: p.studentId,
                name: p.studentName || p.metadata?.studentName || "Name Not Stored",
                amount: p.amount,
                date: p.date
            });
        }
    });

    if (orphanPayments.length > 0) {
        console.log(`⚠️ FOUND ${orphanPayments.length} ORPHAN PAYMENTS!`);
        console.log("These belong to students who are currently missing from your list.");

        // Group by student ID to see how many unique missing students we found
        const uniqueMissing = new Set(orphanPayments.map(p => p.studentId));
        console.log(`Unique Missing Student IDs found: ${uniqueMissing.size}`);

        console.log("\nSample of missing students found in receipts:");
        orphanPayments.slice(0, 5).forEach(p => console.log(p));
    } else {
        console.log("No orphan payments found. All 249 payments belong to the 59 visible students.");
    }
}

checkOrphanPayments();

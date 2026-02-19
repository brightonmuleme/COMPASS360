const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function reconstructFromPayments() {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const getEnv = (key) => {
        const match = envContent.match(new RegExp(`${key}=(.*)`));
        return match ? match[1].trim() : null;
    };

    const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: school } = await supabase.from('schools').select('settings').eq('id', 'ea5d359f-8107-40a3-808c-0c4f8f3a847c').single();

    if (!school || !school.settings?.cloud_state) return;

    const cloudState = school.settings.cloud_state;
    const students = cloudState.students || [];
    const payments = cloudState.payments || [];
    const billings = cloudState.billings || [];

    console.log(`Current Students: ${students.length}`);
    console.log(`Current Payments: ${payments.length}`);

    // Find Student IDs in payments that don't exist in students
    const studentIdsInStudents = new Set(students.map(s => s.id));
    const studentsInPayments = new Map();

    payments.forEach(p => {
        if (!studentIdsInStudents.has(p.studentId) && p.studentId !== 0) {
            if (!studentsInPayments.has(p.studentId)) {
                studentsInPayments.set(p.studentId, {
                    id: p.studentId,
                    name: p.studentName || p.metadata?.studentName || "Restored Student",
                    payCode: p.metadata?.payCode || "Unknown",
                    lastPaymentDate: p.date,
                    paymentCount: 1,
                    totalPaid: p.amount
                });
            } else {
                const s = studentsInPayments.get(p.studentId);
                s.paymentCount++;
                s.totalPaid += p.amount;
            }
        }
    });

    console.log(`--- RECOVERABLE STUDENTS FROM PAYMENTS: ${studentsInPayments.size} ---`);
    studentsInPayments.forEach(s => {
        console.log(`ID: ${s.id}, Name: ${s.name}, PayCode: ${s.payCode}, Total Paid: ${s.totalPaid}`);
    });

    // Also check Billings
    const studentsInBillings = new Set();
    billings.forEach(b => {
        if (!studentIdsInStudents.has(b.studentId)) {
            studentsInBillings.add(b.studentId);
        }
    });
    console.log(`Found ${studentsInBillings.size} additional IDs in billings that are missing.`);
}

reconstructFromPayments();

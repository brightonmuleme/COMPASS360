
const { createClient } = require('@supabase/supabase-js');

const NEXT_PUBLIC_SUPABASE_URL = "https://ccxgdztlplwtaznwrfyr.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeGdkenRscGx3dGF6bndyZnlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzNTQ3OCwiZXhwIjoyMDg1ODExNDc4fQ.p_sbFUZZb-iVAwPBN1LL-P6F90vs9AUCPYbn5QjW28Q";

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase.from('profiles').select('*').limit(10);
    if (error) {
        console.error(error);
    } else {
        data.forEach(p => {
            console.log(`User: ${p.full_name || p.name} (${p.id})`);
            console.log(`- Wallet: ${p.wallet_balance}`);
            console.log(`- KEYS: ${Object.keys(p).join(', ')}`);
            console.log(`- Activity Logs Content: ${JSON.stringify(p.activity_logs || p.activityLogs || [])}`);
            console.log(`- Subscriptions Content: ${JSON.stringify(p.subscribed_tutors || p.tutor_subscriptions || p.tutorSubscriptions || [])}`);
            console.log('---');
        });
    }
}

check();

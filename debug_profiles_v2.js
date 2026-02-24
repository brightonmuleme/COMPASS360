
const { createClient } = require('@supabase/supabase-js');

const NEXT_PUBLIC_SUPABASE_URL = "https://ccxgdztlplwtaznwrfyr.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeGdkenRscGx3dGF6bndyZnlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzNTQ3OCwiZXhwIjoyMDg1ODExNDc4fQ.p_sbFUZZb-iVAwPBN1LL-P6F90vs9AUCPYbn5QjW28Q";

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    try {
        const { data, error } = await supabase.from('profiles').select('id, full_name, wallet_balance, activity_logs, subscribed_tutors').limit(10);
        if (error) {
            console.error("ERROR:", error);
        } else {
            console.log("DATA_START");
            console.log(JSON.stringify(data, null, 2));
            console.log("DATA_END");
        }
    } catch (e) {
        console.error("CATCH:", e.message);
    }
}

check();

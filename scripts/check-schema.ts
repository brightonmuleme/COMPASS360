
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log("🔍 Checking 'profiles' table columns...");
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

    if (error) {
        console.error("❌ Error fetching profiles:", error.message);
        return;
    }

    if (data && data.length > 0) {
        console.log("✅ Columns found in 'profiles':", Object.keys(data[0]));
    } else {
        console.log("⚠️ No rows in 'profiles' to infer columns.");
        // Try a different way
        const { data: cols, error: colErr } = await supabase.rpc('get_table_columns', { table_name_val: 'profiles' });
        if (colErr) {
            console.error("❌ RPC failed:", colErr.message);
        } else {
            console.log("✅ RPC Columns:", cols);
        }
    }
}

checkSchema();

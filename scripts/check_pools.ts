import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.log('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPools() {
    const { data, error } = await supabase
        .from('pools')
        .select('*, members:pool_members(*)')
        .eq('is_private', false)
        .limit(5);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Pools:', JSON.stringify(data, null, 2));
}

checkPools();

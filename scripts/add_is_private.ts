import { Client } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

async function migrate() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('❌ Error: DATABASE_URL environment variable is missing.');
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔌 Connecting to Database...');
        await client.connect();

        console.log('🚀 Adding is_private column...');
        await client.query(`ALTER TABLE public.pools ADD COLUMN IF NOT EXISTS is_private boolean default false;`);

        console.log('✅ Column added successfully!');

    } catch (err: any) {
        console.error('❌ Migration Failed:', err.message);
    } finally {
        await client.end();
        console.log('🔌 Disconnected.');
    }
}

migrate();


import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

async function migrate() {
    // 1. Get Connection String
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('❌ Error: DATABASE_URL environment variable is missing.');
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false } // Required for Supabase/Neon + Self-signed certs sometimes
    });

    try {
        console.log('🔌 Connecting to Database...');
        await client.connect();

        // 2. Read Schema File
        const schemaPath = path.join(__dirname, '../supabase/schema.sql');
        console.log(`📂 Reading schema from: ${schemaPath}`);
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // 3. Execute
        console.log('🚀 Executing Migration...');
        // We split by ';' might be dangerous for procedures, but schema.sql is mostly DDL.
        // Actually, pg can execute multiple statements in one go.
        await client.query(schemaSql);

        console.log('✅ Migration Successful!');

    } catch (err: any) {
        console.error('❌ Migration Failed:', err.message);
        if (err.position) {
            console.error(`   At position: ${err.position}`);
        }
    } finally {
        await client.end();
        console.log('🔌 Disconnected.');
    }
}

migrate();

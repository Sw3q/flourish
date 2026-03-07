#!/usr/bin/env node
/**
 * Seed script: Create test user accounts for the Flourish app.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=<your-key> node scripts/seed-test-users.mjs
 *
 * The SERVICE ROLE KEY can be found in:
 *   Supabase Dashboard → Project Settings → API → "service_role" (secret)
 *
 * All test accounts are created with password: Flourish123!
 * All accounts are immediately approved so they can vote right away.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wwltnqlrhagqybgyfjbs.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
    console.error('   Run with: SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/seed-test-users.mjs');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const TEST_PASSWORD = 'Flourish123!';

const TEST_USERS = [
    { email: 'maya.chen@floor42.test', name: 'Maya Chen' },
    { email: 'luca.moretti@floor42.test', name: 'Luca Moretti' },
    { email: 'sofia.park@floor42.test', name: 'Sofia Park' },
    { email: 'ray.jackson@floor42.test', name: 'Ray Jackson' },
    { email: 'nina.osei@floor42.test', name: 'Nina Osei' },
];

async function seed() {
    console.log('🌱 Seeding test users...\n');

    for (const user of TEST_USERS) {
        process.stdout.write(`  Creating ${user.name} (${user.email})... `);

        // 1. Create the auth user
        const { data, error } = await supabase.auth.admin.createUser({
            email: user.email,
            password: TEST_PASSWORD,
            email_confirm: true, // skip email confirmation — they're already "verified"
        });

        if (error) {
            if (error.message.includes('already been registered')) {
                console.log('⚠️  already exists, skipping.');
            } else {
                console.log(`❌ Error: ${error.message}`);
            }
            continue;
        }

        const userId = data.user.id;

        // 2. Approve the user in the profiles table
        //    (The trigger auto-creates the profile, we just need to approve it)
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ is_approved: true })
            .eq('id', userId);

        if (profileError) {
            console.log(`⚠️  Created but couldn't approve: ${profileError.message}`);
        } else {
            console.log('✅');
        }
    }

    console.log('\n✨ Done! All test users have been seeded.');
    console.log(`\n📋 Credentials (all share the same password):`);
    console.log(`   Password: ${TEST_PASSWORD}\n`);
    for (const user of TEST_USERS) {
        console.log(`   ${user.name.padEnd(16)}  ${user.email}`);
    }
    console.log('');
}

seed().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});

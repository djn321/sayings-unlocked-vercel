#!/usr/bin/env -S deno run --allow-net --allow-env

/**
 * Script to check the cron job configuration in Supabase
 *
 * Usage: deno run --allow-net --allow-env scripts/check-cron-job.ts
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Get configuration from environment or use defaults
const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL') || 'https://vmsdalzjlkuilzcetztv.supabase.co';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!serviceRoleKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  console.log('Please set it with: export SUPABASE_SERVICE_ROLE_KEY="your_key_here"');
  Deno.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

console.log('🔍 Checking cron job configuration...\n');

// Query the cron jobs table
try {
  // Note: We're using SQL via RPC or a direct query
  // Since Supabase JS client doesn't directly expose cron schema,
  // we'll try to query using a custom query

  const { data: cronData, error: cronError } = await supabase
    .rpc('get_cron_jobs', {})
    .select('*');

  if (cronError) {
    console.log('⚠️  Could not query cron jobs directly (expected if RPC not created)');
    console.log('Error:', cronError.message);
    console.log('\n💡 Alternative: Check via Supabase Dashboard:');
    console.log('   1. Go to https://supabase.com/dashboard/project/vmsdalzjlkuilzcetztv/database/tables');
    console.log('   2. Navigate to: cron schema > job table');
    console.log('   3. Look for jobname = "send-daily-etymology"');
  } else {
    console.log('✅ Cron jobs found:');
    console.log(cronData);
  }
} catch (err) {
  console.log('⚠️  Direct query failed:', err.message);
}

// Check if we can access subscribers table (verifies connection)
console.log('\n🔍 Verifying database connection...');
const { data: subscribers, error: subError } = await supabase
  .from('subscribers')
  .select('count')
  .limit(1);

if (subError) {
  console.error('❌ Cannot connect to database:', subError.message);
} else {
  console.log('✅ Database connection successful');

  // Count active subscribers
  const { count, error: countError } = await supabase
    .from('subscribers')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  if (!countError) {
    console.log(`📊 Active subscribers: ${count || 0}`);
  }
}

console.log('\n📝 To check the cron job status:');
console.log('   1. Go to Supabase Dashboard > Database > Cron Jobs');
console.log('   2. Or run this SQL in the SQL Editor:');
console.log('      SELECT * FROM cron.job WHERE jobname = \'send-daily-etymology\';');

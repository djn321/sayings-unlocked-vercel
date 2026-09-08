import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { verifyServiceOrAdminAuth } from '../_shared/auth.ts';
import { sendAdminAlert } from '../_shared/notify-admin.ts';
import { getDayIndex, getRunway } from '../_shared/etymology-queue.ts';
import { generateEtymologyBatch } from '../_shared/etymology-generator.ts';

const getCorsOrigin = () => {
  return Deno.env.get('SITE_URL') || 'https://sayings-unlocked.vercel.app';
};

const corsHeaders = {
  'Access-Control-Allow-Origin': getCorsOrigin(),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// How many days of pre-generated content to keep ahead of today.
const TARGET_BUFFER_DAYS = 21;
// Caps worst-case invocation time if the queue has fallen a long way behind
// (e.g. several missed weekly runs). The job is target-based and self-heals,
// so catching up in capped increments across a few runs is fine.
const MAX_GENERATE_PER_RUN = 10;
// Requests are batched (many candidates per Gemini call) rather than one
// call per etymology, to bound round trips regardless of how much history
// there is to avoid duplicating. A handful of batch rounds, each requesting
// more than currently needed to survive expected duplicate collisions.
const MAX_BATCH_ROUNDS = 3;
const MAX_REQUEST_PER_BATCH = 12;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting etymology queue top-up...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const auth = await verifyServiceOrAdminAuth(req, supabaseUrl, supabaseAnonKey, supabaseServiceKey, corsHeaders);
    if (!auth.ok) {
      return auth.response!;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const dayIndex = getDayIndex(new Date());

    const { data: maxRow } = await supabase
      .from('etymology_queue')
      .select('sequence_number')
      .order('sequence_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const maxSequenceNumber = maxRow?.sequence_number ?? 0;
    const runwayBefore = getRunway(maxSequenceNumber, dayIndex);

    console.log(`Day index: ${dayIndex}, max sequence: ${maxSequenceNumber}, runway: ${runwayBefore} days`);

    if (runwayBefore >= TARGET_BUFFER_DAYS) {
      console.log('Runway already at or above target, nothing to do');
      return new Response(
        JSON.stringify({ message: 'No top-up needed', runway: runwayBefore }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const needed = Math.min(TARGET_BUFFER_DAYS - runwayBefore, MAX_GENERATE_PER_RUN);
    console.log(`Generating ${needed} new etymologies this run (target buffer: ${TARGET_BUFFER_DAYS} days)`);

    // Dedup against all-time sent sayings and everything already queued
    const { data: allSends } = await supabase
      .from('etymology_sends')
      .select('etymology_saying')
      .order('sent_at', { ascending: false });

    const { data: allQueued } = await supabase
      .from('etymology_queue')
      .select('saying');

    const usedSayings = new Set([
      ...(allSends?.map(e => e.etymology_saying.toLowerCase().trim()) || []),
      ...(allQueued?.map(e => e.saying.toLowerCase().trim()) || []),
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: feedbackData } = await supabase
      .from('etymology_feedback')
      .select('etymology_saying, feedback_type')
      .gte('created_at', thirtyDaysAgo.toISOString());

    const liked = feedbackData?.filter(f => f.feedback_type === 'like').map(f => f.etymology_saying) || [];
    const disliked = feedbackData?.filter(f => f.feedback_type === 'dislike').map(f => f.etymology_saying) || [];

    console.log(`Feedback context: ${liked.length} liked, ${disliked.length} disliked`);

    // Pass the full history, not just a recent slice - with hundreds of
    // sends accumulated, truncating this let Gemini repeatedly suggest
    // sayings it had no way of knowing were already used, exhausting the
    // per-item retry budget on guaranteed-duplicate candidates.
    const recentForPrompt = allSends?.map(e => e.etymology_saying) || [];
    let generatedCount = 0;
    let remaining = needed;

    for (let round = 0; round < MAX_BATCH_ROUNDS && remaining > 0; round++) {
      // Over-provision to survive expected duplicate collisions in one call.
      const requestCount = Math.min(remaining * 2, MAX_REQUEST_PER_BATCH);
      console.log(`Round ${round + 1}/${MAX_BATCH_ROUNDS}: requesting ${requestCount} candidates for ${remaining} remaining slot(s)`);

      const candidates = await generateEtymologyBatch(recentForPrompt, { liked, disliked }, requestCount);

      for (const candidate of candidates) {
        if (remaining <= 0) break;

        const candidateNormalised = candidate.saying.toLowerCase().trim();
        if (usedSayings.has(candidateNormalised)) {
          console.log(`Duplicate detected: "${candidate.saying}" - skipping`);
          continue;
        }

        usedSayings.add(candidateNormalised);
        recentForPrompt.push(candidate.saying);

        // Insert immediately so a timeout partway through a large catch-up run
        // doesn't lose everything generated so far.
        const { error: insertError } = await supabase
          .from('etymology_queue')
          .insert(candidate);

        if (insertError) {
          console.error('Error inserting generated etymology:', insertError);
          throw insertError;
        }

        generatedCount++;
        remaining--;
      }

      console.log(`After round ${round + 1}: generated ${generatedCount}/${needed}, ${remaining} remaining`);
    }

    const runwayAfter = runwayBefore + generatedCount;
    console.log(`Top-up complete. Generated ${generatedCount}/${needed}. Runway now ${runwayAfter} days`);

    if (generatedCount < needed) {
      await sendAdminAlert(
        '⚠️ Etymology Daily - Queue Top-up Incomplete',
        `Weekly top-up only generated ${generatedCount}/${needed} new etymologies`,
        `Runway is now ${runwayAfter} days (target: ${TARGET_BUFFER_DAYS}). This is a low-urgency heads-up - there is still buffer, but Gemini may be having repeated issues. Check logs and consider re-running this function manually.`
      );
    }

    return new Response(
      JSON.stringify({
        message: 'Etymology queue top-up complete',
        generated: generatedCount,
        requested: needed,
        runwayBefore,
        runwayAfter,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in generate-etymology-batch function:', error);

    const errorMessage = error instanceof Error ? error.message : String(error);
    await sendAdminAlert(
      '⚠️ Etymology Daily - Batch Generation Failed',
      'generate-etymology-batch threw an exception during execution',
      errorMessage
    );

    return new Response(
      JSON.stringify({ error: 'An internal error occurred while generating the etymology batch' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

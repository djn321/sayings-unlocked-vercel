import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface AuthResult {
  ok: boolean;
  response?: Response;
}

// Accepts either the service role key (used by GitHub Actions cron / setup-cron-auth)
// or an authenticated admin user's JWT (used by the manual Admin panel trigger).
export async function verifyServiceOrAdminAuth(
  req: Request,
  supabaseUrl: string,
  supabaseAnonKey: string,
  supabaseServiceKey: string,
  corsHeaders: Record<string, string>
): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ),
    };
  }

  // Note: SUPABASE_SERVICE_ROLE_KEY env var contains a different format (sb_secret_...),
  // so we use a custom secret with the actual JWT for cron auth comparison
  const cronServiceKey = Deno.env.get('SERVICE_ROLE_KEY_ACTUAL') || supabaseServiceKey;
  const isServiceRoleAuth = authHeader === `Bearer ${cronServiceKey}`;

  if (isServiceRoleAuth) {
    console.log('Authentication: service role (cron)');
    return { ok: true };
  }

  const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userError } = await userSupabase.auth.getUser(token);

  if (userError || !user) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: 'Invalid or expired authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ),
    };
  }

  const { data: isAdmin, error: roleError } = await userSupabase.rpc('has_role', {
    _user_id: user.id,
    _role: 'admin',
  });

  if (roleError || !isAdmin) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: 'Unauthorized. Admin privileges required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ),
    };
  }

  console.log('Authentication: admin user');
  return { ok: true };
}

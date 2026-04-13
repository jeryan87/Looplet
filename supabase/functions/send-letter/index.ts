// Supabase Edge Function — runs in Deno on Supabase's servers
// Deploy: Supabase dashboard → Edge Functions → send-letter → Code tab (copy-paste)
// Set secret via Supabase dashboard → Edge Functions → Secrets: RESEND_API_KEY=re_xxxx
// JWT verification: disabled in dashboard → Edge Functions → send-letter → Settings

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { letterId } = await req.json();
    if (!letterId) return json({ error: 'letterId is required' }, 400);

    const { data: letter, error: letterError } = await supabase
      .from('letters')
      .select('*')
      .eq('id', letterId)
      .single();
    if (letterError || !letter) return json({ error: 'Letter not found' }, 404);

    const { data: loop, error: loopError } = await supabase
      .from('loops')
      .select('*')
      .eq('id', letter.loop_id)
      .single();
    if (loopError || !loop || loop.user_id !== user.id) {
      return json({ error: 'Forbidden' }, 403);
    }

    const { data: recipients } = await supabase
      .from('recipients')
      .select('*')
      .eq('loop_id', loop.id);
    if (!recipients || recipients.length === 0) {
      return json({ error: 'No recipients found' }, 400);
    }

    const { data: photos } = await supabase
      .from('letter_photos')
      .select('*')
      .eq('letter_id', letterId)
      .order('sort_order', { ascending: true });

    const photoUrls = (photos ?? []).map((p: { storage_path: string }) => {
      const { data } = supabase.storage.from('letter-photos').getPublicUrl(p.storage_path);
      return { url: data.publicUrl };
    });

    const date = new Date().toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });

    type SendResult = { ok: true } | { ok: false; email: string; status: number; body: string };

    const sendResults: SendResult[] = await Promise.all(
      recipients.map(async (recipient: { name: string; email: string }): Promise<SendResult> => {
        const html = buildEmailHtml(letter, loop, recipient.name, photoUrls, date);
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Looplet <onboarding@resend.dev>',
            to: recipient.email,
            subject: `${loop.name} — ${date}`,
            html,
          }),
        });
        if (!res.ok) {
          const body = await res.text();
          console.error(`Resend error for ${recipient.email}: ${res.status} ${body}`);
          return { ok: false, email: recipient.email, status: res.status, body };
        }
        return { ok: true };
      })
    );

    const failures = sendResults.filter((r) => !r.ok) as Array<{ ok: false; email: string; status: number; body: string }>;
    if (failures.length > 0) {
      const f = failures[0];
      return json({ error: `Resend ${f.status}: ${f.body}` }, 500);
    }

    await supabase
      .from('letters')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', letterId);

    await supabase
      .from('loops')
      .update({ last_sent_at: new Date().toISOString() })
      .eq('id', loop.id);

    return json({ success: true });
  } catch (err) {
    console.error('Unhandled error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ── Inline email template ────────────────────────────────────────────────────
// Keep this in sync with src/email/template.ts (can't import across Deno boundary).

const PROMPTS: Array<{ id: string; text: string }> = [
  { id: 'p1', text: 'Something {name} learned this week' },
  { id: 'p2', text: 'A funny moment we want to remember' },
  { id: 'p3', text: 'What {name} is currently obsessed with' },
  { id: 'p4', text: "A challenge we're working through" },
  { id: 'p5', text: 'Something that surprised us' },
  { id: 'p6', text: 'A milestone, big or small' },
  { id: 'p7', text: 'What made {name} laugh' },
  { id: 'p8', text: 'Something {name} said or did for the first time' },
  { id: 'p9', text: 'How {name} is changing lately' },
  { id: 'p10', text: 'A moment we want to remember forever' },
];

function buildEmailHtml(
  letter: { prompt_responses: Record<string, string> },
  loop: { name: string; child_name: string | null; child_pronoun: string },
  recipientName: string,
  photoUrls: Array<{ url: string }>,
  date: string
): string {
  const childName = loop.child_name ?? 'the little one';

  const promptSections = PROMPTS
    .filter((p) => letter.prompt_responses[p.id])
    .map((p) => {
      const promptText = p.text
        .replace(/{name}/g, childName)
        .replace(/{pronoun}/g, loop.child_pronoun);
      const response = letter.prompt_responses[p.id];
      return `
        <tr>
          <td style="padding: 0 0 32px 0;">
            <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; text-transform: uppercase;
                       letter-spacing: 1px; color: #9E9892; font-family: Georgia, serif;">
              ${promptText}
            </p>
            <p style="margin: 0; font-size: 17px; line-height: 1.7; color: #1A1A1A;
                       font-family: Georgia, serif; white-space: pre-wrap;">
              ${escapeHtml(response)}
            </p>
          </td>
        </tr>
      `;
    })
    .join('');

  const photoGrid = photoUrls.length > 0
    ? `
      <tr>
        <td style="padding: 0 0 32px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              ${photoUrls.map((p) => `
                <td style="padding: 4px; width: ${Math.floor(100 / Math.min(photoUrls.length, 3))}%;">
                  <img src="${p.url}" alt="" width="100%"
                       style="display: block; border-radius: 8px; object-fit: cover;" />
                </td>
              `).join('')}
            </tr>
          </table>
        </td>
      </tr>
    `
    : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(loop.name)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F0EA; font-family: Georgia, serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color: #F5F0EA; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width: 560px; background-color: #FFFFFF; border-radius: 12px;
                      overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background-color: #4A6741; padding: 32px 40px 28px 40px;">
              <p style="margin: 0 0 4px 0; font-size: 13px; color: rgba(255,255,255,0.7);
                         font-family: -apple-system, sans-serif; letter-spacing: 0.5px;">
                ${escapeHtml(date)}
              </p>
              <h1 style="margin: 0; font-size: 26px; font-weight: 700; color: #FFFFFF;
                          font-family: Georgia, serif; line-height: 1.2;">
                ${escapeHtml(loop.name)}
              </h1>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 32px 40px 0 40px;">
              <p style="margin: 0 0 28px 0; font-size: 16px; color: #6B6560;
                         font-family: Georgia, serif; border-bottom: 1px solid #E8E0D5;
                         padding-bottom: 24px;">
                Hi ${escapeHtml(recipientName)},
              </p>
            </td>
          </tr>

          <!-- Prompt sections -->
          <tr>
            <td style="padding: 0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${promptSections}
                ${photoGrid}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 32px 40px; border-top: 1px solid #E8E0D5;">
              <p style="margin: 0; font-size: 12px; color: #9E9892;
                         font-family: -apple-system, sans-serif; line-height: 1.6;">
                You're receiving this because someone added you to their Looplet newsletter.
                <br />
                To unsubscribe, reply to this email with "unsubscribe" in the subject.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

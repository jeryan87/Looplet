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

    // Generate share token so recipients can view the letter in a browser
    const shareToken = crypto.randomUUID();
    await supabase.from('letters').update({ share_token: shareToken }).eq('id', letterId);
    const viewInBrowserUrl = `${SUPABASE_URL}/functions/v1/view-letter?token=${shareToken}`;

    const html = buildEmailHtml(letter, loop, photoUrls, date, viewInBrowserUrl);

    type SendResult = { ok: true } | { ok: false; email: string; status: number; body: string };

    const sendResults: SendResult[] = await Promise.all(
      recipients.map(async (recipient: { name: string; email: string }): Promise<SendResult> => {
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
// SYNC: Last synced with src/email/template.ts on 2026-05-24.
// Changes here must also be made in:
//   - supabase/functions/view-letter/index.ts  (same, but viewInBrowserUrl always omitted)
// NOTE: buildEmailHtml here accepts `date` as a param (unlike template.ts which computes it).
// Cannot import across Deno boundary — keep these files in sync manually.

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
  letter: {
    prompt_responses: Record<string, string>;
    intro: string;
    outro: string;
    show_intro: boolean;
    show_outro: boolean;
  },
  loop: { name: string; child_name: string | null; child_pronoun: string },
  photoUrls: Array<{ url: string }>,
  date: string,
  viewInBrowserUrl?: string
): string {
  const childName = loop.child_name ?? 'the little one';

  const introBlock = letter.show_intro && letter.intro
    ? `
      <tr>
        <td style="padding: 0 0 32px 0;">
          <p style="margin: 0; font-size: 17px; line-height: 1.8; color: #222222;
                     font-family: Georgia, serif; white-space: pre-wrap;">${escapeHtml(letter.intro)}</p>
        </td>
      </tr>
    `
    : '';

  const outroBlock = letter.show_outro && letter.outro
    ? `
      <tr>
        <td style="padding: 32px 0 0 0;">
          <p style="margin: 0; font-size: 17px; line-height: 1.8; color: #222222;
                     font-family: Georgia, serif; white-space: pre-wrap;">${escapeHtml(letter.outro)}</p>
        </td>
      </tr>
    `
    : '';

  const promptSections = PROMPTS
    .filter((p) => letter.prompt_responses[p.id])
    .map((p) => {
      const promptText = p.text
        .replace(/{name}/g, childName)
        .replace(/{pronoun}/g, loop.child_pronoun);
      const response = letter.prompt_responses[p.id];
      return `
        <tr>
          <td style="padding: 0 0 40px 0;">
            <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #4A6741;
                       font-family: -apple-system, Helvetica, sans-serif;">
              ${promptText}
            </p>
            <p style="margin: 0; font-size: 17px; line-height: 1.8; color: #222222;
                       font-family: Georgia, serif; white-space: pre-wrap;">${escapeHtml(response)}</p>
          </td>
        </tr>
      `;
    })
    .join('');

  const photoGrid = buildPhotoGrid(photoUrls);

  const viewInBrowserRow = viewInBrowserUrl
    ? `
      <tr>
        <td align="center" style="padding: 0 16px 12px 16px;">
          <p style="margin: 0; font-size: 12px; color: #9E9892;
                     font-family: -apple-system, Helvetica, sans-serif;">
            Having trouble reading this?
            <a href="${viewInBrowserUrl}"
               style="color: #4A6741; text-decoration: underline;">View in browser</a>
          </p>
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
  <style>
    /* Web view only — email clients ignore this block */
    body { -webkit-font-smoothing: antialiased; }
    @media (max-width: 600px) {
      .email-card { border-radius: 0 !important; }
      .email-body-pad { padding: 24px 24px 0 24px !important; }
      .email-header-pad { padding: 24px !important; }
      .email-footer-pad { padding: 0 24px 24px 24px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F0EA; font-family: Georgia, serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color: #F5F0EA; padding: 32px 16px;">
    ${viewInBrowserRow}
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" class="email-card"
               style="max-width: 560px; background-color: #FFFFFF; border-radius: 12px;
                      overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td class="email-header-pad"
                style="background-color: #4A6741; padding: 32px 40px 32px 40px;">
              <p style="margin: 0 0 6px 0; font-size: 13px; color: rgba(255,255,255,0.65);
                         font-family: -apple-system, Helvetica, sans-serif; letter-spacing: 0.3px;">
                ${escapeHtml(date)}
              </p>
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #FFFFFF;
                          font-family: Georgia, serif; line-height: 1.25;">
                ${escapeHtml(loop.name)}
              </h1>
            </td>
          </tr>

          <!-- Body sections -->
          <tr>
            <td class="email-body-pad" style="padding: 36px 40px 4px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${introBlock}
                ${promptSections}
                ${outroBlock}
                ${photoGrid}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="email-footer-pad"
                style="background-color: #F5F0EA; padding: 0 40px 28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 20px 0 16px 0; border-top: 1px solid #E8E0D5;"></td>
                </tr>
                <tr>
                  <td>
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: #9E9892;
                               font-family: -apple-system, Helvetica, sans-serif; line-height: 1.6;">
                      You're receiving this because someone added you to their family newsletter.
                      To unsubscribe, reply with &quot;unsubscribe&quot; in the subject line.
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #C4BDB6;
                               font-family: -apple-system, Helvetica, sans-serif;">
                      Sent with <a href="https://looplet.app"
                                   style="color: #C4BDB6; text-decoration: none;">Looplet</a>
                    </p>
                  </td>
                </tr>
              </table>
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

function buildPhotoGrid(photoUrls: Array<{ url: string }>): string {
  if (photoUrls.length === 0) return '';

  if (photoUrls.length === 1) {
    return `
      <tr>
        <td style="padding: 0 0 32px 0;">
          <img src="${photoUrls[0].url}" alt="" width="100%"
               style="display: block; border-radius: 8px; max-height: 340px; object-fit: cover;" />
        </td>
      </tr>
    `;
  }

  if (photoUrls.length === 2) {
    return `
      <tr>
        <td style="padding: 0 0 32px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding-right: 4px; width: 49%;">
                <img src="${photoUrls[0].url}" alt="" width="100%"
                     style="display: block; border-radius: 8px;" />
              </td>
              <td style="padding-left: 4px; width: 49%;">
                <img src="${photoUrls[1].url}" alt="" width="100%"
                     style="display: block; border-radius: 8px;" />
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  }

  // 3+ photos: first photo is a full-width hero, rest form a strip below
  const stripPhotos = photoUrls.slice(1);
  const stripWidth = Math.floor(100 / stripPhotos.length);
  const stripCells = stripPhotos.map((p, i) => {
    const pl = i > 0 ? 'padding-left: 4px; ' : '';
    const pr = i < stripPhotos.length - 1 ? 'padding-right: 4px; ' : '';
    return `
      <td style="${pl}${pr}width: ${stripWidth}%;">
        <img src="${p.url}" alt="" width="100%"
             style="display: block; border-radius: 0 0 4px 4px;" />
      </td>
    `;
  }).join('');

  return `
    <tr>
      <td style="padding: 0 0 4px 0;">
        <img src="${photoUrls[0].url}" alt="" width="100%"
             style="display: block; border-radius: 8px 8px 0 0; max-height: 300px; object-fit: cover;" />
      </td>
    </tr>
    <tr>
      <td style="padding: 0 0 32px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>${stripCells}</tr>
        </table>
      </td>
    </tr>
  `;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

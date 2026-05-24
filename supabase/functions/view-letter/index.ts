// Supabase Edge Function — runs in Deno on Supabase's servers
// Deploy: Supabase dashboard → Edge Functions → view-letter → Code tab (copy-paste)
// JWT verification: DISABLED in dashboard → Edge Functions → view-letter → Settings
// No RESEND_API_KEY needed — this function only reads and renders.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return htmlError('Invalid link', 'This link is missing a token. Please check the email you received.');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: rows } = await supabase
    .from('letters')
    .select('*, loops(*), letter_photos(storage_path, sort_order)')
    .eq('share_token', token)
    .eq('status', 'sent')
    .limit(1);

  const letter = rows?.[0] ?? null;

  if (!letter) {
    return htmlError(
      'Letter not found',
      'This link is invalid or has expired. Please check the email you received.'
    );
  }

  const loop = letter.loops;

  const photos: Array<{ storage_path: string; sort_order: number }> =
    (letter.letter_photos ?? []).sort(
      (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
    );

  const photoUrls = photos.map((p) => {
    const { data } = supabase.storage.from('letter-photos').getPublicUrl(p.storage_path);
    return { url: data.publicUrl };
  });

  const date = letter.sent_at
    ? new Date(letter.sent_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });

  // viewInBrowserUrl intentionally omitted — no recursive "View in browser" on the web page
  const html = buildEmailHtml(letter, loop, photoUrls, date);

  return new Response(
    new Blob([html], { type: 'text/html; charset=utf-8' }),
    { status: 200 }
  );
});

function htmlError(title: string, message: string): Response {
  const body = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Georgia, serif;
      background: #F5F0EA;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .box {
      background: #fff;
      border-radius: 12px;
      padding: 48px 40px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 2px 16px rgba(0,0,0,0.06);
    }
    h1 { color: #1A1A1A; font-size: 22px; margin-bottom: 12px; line-height: 1.3; }
    p { color: #6B6560; font-size: 16px; line-height: 1.6; font-family: -apple-system, Helvetica, sans-serif; }
    .dot { color: #4A6741; font-size: 28px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="box">
    <div class="dot">&#9679;</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;

  return new Response(
    new Blob([body], { type: 'text/html; charset=utf-8' }),
    { status: 404 }
  );
}

// ── Inline email template ────────────────────────────────────────────────────
// SYNC: Last synced with src/email/template.ts on 2026-05-24.
// Changes here must also be made in:
//   - supabase/functions/send-letter/index.ts  (same signature + viewInBrowserUrl param)
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

  // 3+ photos: first photo full-width hero, rest in a strip below
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

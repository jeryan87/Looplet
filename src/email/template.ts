import { Letter } from '../hooks/useLetter';
import { Loop } from '../hooks/useLoop';
import { PROMPTS } from '../constants/prompts';

interface PhotoUrl {
  url: string;
}

export function buildEmailHtml(
  letter: Letter,
  loop: Loop,
  photoUrls: PhotoUrl[]
): string {
  const date = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const childName = loop.child_name ?? 'the little one';

  // Intro block (shown before prompts if enabled and non-empty)
  const introBlock = letter.show_intro && letter.intro
    ? `
      <tr>
        <td style="padding: 0 0 24px 0;">
          <p style="margin: 0; font-size: 17px; line-height: 1.7; color: #1A1A1A;
                     font-family: Georgia, serif; font-style: italic; white-space: pre-wrap;">
            ${escapeHtml(letter.intro)}
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding: 0 0 24px 0; border-bottom: 1px solid #E8E0D5;"></td>
      </tr>
      <tr><td style="padding: 0 0 8px 0;"></td></tr>
    `
    : '';

  // Outro block (shown after prompts if enabled and non-empty)
  const outroBlock = letter.show_outro && letter.outro
    ? `
      <tr>
        <td style="padding: 0 0 8px 0; border-top: 1px solid #E8E0D5;"></td>
      </tr>
      <tr>
        <td style="padding: 24px 0 0 0;">
          <p style="margin: 0; font-size: 17px; line-height: 1.7; color: #1A1A1A;
                     font-family: Georgia, serif; font-style: italic; white-space: pre-wrap;">
            ${escapeHtml(letter.outro)}
          </p>
        </td>
      </tr>
    `
    : '';

  // Build prompt sections in prompt order (p1 → p10)
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

  // Photo grid (up to 5, flow layout)
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
                ${date}
              </p>
              <h1 style="margin: 0; font-size: 26px; font-weight: 700; color: #FFFFFF;
                          font-family: Georgia, serif; line-height: 1.2;">
                ${escapeHtml(loop.name)}
              </h1>
            </td>
          </tr>

          <!-- Body sections -->
          <tr>
            <td style="padding: 32px 40px 0 40px;">
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

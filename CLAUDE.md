# Looplet — Project Document for Claude Code

> This document is the single source of truth for the Looplet project.
> Update it as decisions are made, features are built, and things change.
> Always read this file at the start of every Claude Code session.

---

## What is Looplet?

Looplet is a private family newsletter app for iOS. It lets parents write and send a beautiful, personal newsletter to their family and friends on a set cadence — weekly, biweekly, or monthly. Recipients (grandparents, friends, family) receive a beautifully formatted email with no app download required.

**Tagline:** Keep your people in the loop.

**Core insight:** Existing apps like Tinybeans are private photo feeds — still social media, just smaller. Looplet is fundamentally different: it's a letter, not a feed. It has the parent's voice, arrives as an event, and is intentional by design.

**What makes Looplet different:**
- It's a newsletter, not a feed
- Written in the parent's own words — no AI rewrites content
- Recipients get a beautiful email, no app needed
- No ads, ever
- No AI touches photos or personal content (a core privacy commitment)
- Flexible cadence set by the parent
- Offline-capable draft writing

---

## Target audience

**Primary user (the publisher):** Expat parents or parents living away from family, aged 25–45, who want to stay genuinely connected with grandparents and extended family without social media. They are intentional about privacy and want something that feels personal, not algorithmic.

**Secondary user (the recipient):** Grandparents and family members who receive the newsletter by email. They must not need to download any app. The experience for them is: a beautiful email arrives, they click a link, they read the letter in a browser.

**Future expansion (not v1):** Broader audience of anyone living away from their network — expats, people who moved cities, anyone wanting a private alternative to social media updates.

---

## Product decisions (locked)

These decisions have been made and should not be revisited without explicit instruction:

- **No AI generation of content.** Parents write everything themselves. AI must never rewrite, suggest edits to, or process the content of letters.
- **No AI processing of photos or personal information.** Photos are stored and displayed as-is.
- **No free tier with ads.** Looplet is a premium product. Monetization is subscription only.
- **Recipients never need to download an app.** Email + web view only for recipients.
- **The app is for publishers (parents) only.** iOS app. React Native + Expo.
- **Flexible cadence.** Parents set weekly, biweekly, or monthly. The app handles reminders.
- **10 prompts, parent picks 3.** Each letter is structured around 3 prompts chosen from a fixed list of 10. Same 10 prompts available every time.

---

## The 10 prompts

Parents see these every time they start a new letter and pick 3 to answer:

1. Something she/he learned this week
2. A funny moment we want to remember
3. What she/he is currently obsessed with
4. A challenge we're working through
5. Something that surprised us
6. A milestone, big or small
7. What made her/him laugh
8. Something she/he said or did for the first time
9. How she/he is changing lately
10. A moment we want to remember forever

> Note: Prompt wording uses "she/he" as a placeholder. The app should use the child's name or a user-configured pronoun pulled from the loop settings.

---

## Tech stack

| Layer | Tool | Notes |
|---|---|---|
| App framework | React Native + Expo | Beginner-friendly, works on Windows for development |
| Backend + database | Supabase | Free tier, handles auth, database, and file storage |
| Email delivery | Resend | Simple API, generous free tier |
| Payments | RevenueCat | Handles App Store subscriptions, free up to $2.5k/month revenue |
| Push notifications | Expo Notifications | Built into Expo |
| Photo storage | Supabase Storage | Photos stored here, paths referenced in DB |

**Development environment:**
- Primary dev machine: Windows PC with Claude Code
- iOS testing + App Store submission: Mac (wife's machine, used when needed)
- iOS simulator: run on Mac when needed for visual testing
- GitHub repo: https://github.com/jeryan87/Looplet
- `.claude/settings.local.json` is gitignored (machine-local Claude Code permissions)

---

## Database schema (Supabase)

### `users`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | Supabase auth user id |
| email | string | |
| full_name | string | |
| created_at | timestamp | |
| subscription_status | string | `trialing`, `active`, `expired` — updated by RevenueCat webhook |
| trial_ends_at | timestamp | |

### `loops`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users | |
| name | string | e.g. "The Ryan Family Newsletter" |
| child_name | string (nullable) | Child's name for prompt personalisation |
| child_pronoun | string | `he`, `she`, `they` — default `they` |
| cadence | string | `weekly`, `biweekly`, `monthly` |
| reminder_day | int | 0–6 (day of week for reminder) |
| time_zone | string | User's time zone for reminders |
| last_sent_at | timestamp | |
| created_at | timestamp | |

### `recipients`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| loop_id | uuid FK → loops | |
| name | string | e.g. "Grandma Sue" |
| email | string | |
| created_at | timestamp | |

### `letters`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| loop_id | uuid FK → loops | |
| status | string | `draft`, `sent` |
| prompt_responses | jsonb | `{"prompt_1": "text...", "prompt_2": "text..."}` |
| sent_at | timestamp | Null until sent |
| created_at | timestamp | |

### `letter_photos`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| letter_id | uuid FK → letters | |
| storage_path | string | Path in Supabase Storage |
| sort_order | int | Parent-controlled photo order |
| created_at | timestamp | |

**Key decisions:**
- Photos stored in Supabase Storage, not in the database
- `prompt_responses` is jsonb so prompts can evolve without schema changes
- One user can eventually own multiple loops (v2 feature — build the schema to support it now)

---

## App screens (v1 scope)

### Onboarding flow
1. **Welcome screen** — app name, tagline, get started CTA
2. **Sign up / log in** — email + password via Supabase auth
3. **Create your loop** — name your newsletter, add child's name/pronoun
4. **Add recipients** — name + email for each recipient (grandparents etc.)
5. **Set cadence** — weekly / biweekly / monthly, pick reminder day
6. **Paywall / trial start** — 7-day free trial, then $4.99/month or $39.99/year

### Main app flow
1. **Home screen** — shows current loop, next reminder date, CTA to start new letter or continue draft
2. **New letter screen** — shows 10 prompts, parent taps to select 3
3. **Write letter screen** — 3 selected prompts shown with text input fields, photo picker at bottom
4. **Preview screen** — shows how the email will look to recipients
5. **Send screen** — confirmation, recipient list shown, send button
6. **Archive screen** — scrollable list of all past letters, tap to read

### Settings
- Manage loop (name, child info)
- Manage recipients (add/remove)
- Change cadence and reminder day
- Subscription management (via RevenueCat)
- Account / sign out

---

## Email design (recipient experience)

The email recipients receive should feel like a real newsletter, not a notification. Key requirements:
- Beautiful, simple HTML email template
- Shows the loop name and date prominently
- Each of the 3 prompt responses displayed as readable sections with the prompt as a subtle header
- Photos displayed in a clean grid (1–3 photos)
- Footer with an unsubscribe link (legal requirement)
- A "View in browser" link at the top
- No Looplet branding pushed aggressively — the letter should feel like it came from the family, not the app

---

## Monetization

- **Trial:** 7 days free, up to 3 letters can be sent
- **Subscription:** $4.99/month or $39.99/year
- **No free tier with ads**
- **RevenueCat** handles all subscription logic and App Store integration
- Subscription status synced back to Supabase `users.subscription_status` via RevenueCat webhook

---

## App Store strategy

- **App name:** Looplet — Keep Your People in the Loop
- **Subtitle:** Private family newsletter
- **Category:** Social Networking
- **Price:** Free download, subscription inside
- **Keywords:** family newsletter, baby updates, grandparent sharing, private family app, baby milestone, family journal, keep in touch, expat family
- **Key differentiators for App Store copy:**
  - No AI touches your family's story
  - Your words, your voice — never rewritten
  - Recipients need no app — just a beautiful email
  - No ads, ever
  - One-time setup, automatic reminders

---

## Competitive context

**Tinybeans** is the main competitor — 4M users, $4.99/month. It is a private photo feed, not a newsletter. It has significant user frustration around forced paywalls and a feed-style UX. Looplet is positioned as more intentional, more personal, and more privacy-conscious.

**Substack** is how our co-founder currently manages a manual family newsletter. Looplet automates the delivery and structure while preserving the personal voice.

---

## Build phases

### Phase 1 — Core loop (build this first)
- [x] Expo project scaffolded and running on device
- [x] Supabase project created, schema applied
- [x] Auth: sign up, log in, log out
- [x] Create a loop (name, child info, cadence, recipients)
- [x] Write a letter (select 3 prompts, write responses, add photos)
- [x] Preview letter
- [x] Send letter (triggers Resend email to all recipients)
- [x] Basic recipient email template

### Phase 2 — Polish
- [x] Bottom tab bar navigation (Home / Letters / Settings)
- [x] Intro and outro sections (opening/closing paragraphs, per-letter toggle)
- [x] Flexible send — allow sending with 1–3 prompts (confirmation alert if < 3)
- [ ] Push notification reminders based on cadence
- [x] Letter archive (list + read view)
- [ ] Improved email template design
- [ ] Web view for recipients (nice browser rendering of letter)
- [ ] Draft auto-save

### Phase 3 — Monetization
- [ ] RevenueCat integration
- [ ] Paywall screen (7-day trial messaging)
- [ ] Subscription status enforcement (block send after trial if unpaid)
- [ ] Subscription management in settings

### Phase 4 — Ship
- [ ] TestFlight beta (requires Mac + Xcode)
- [ ] App Store screenshots and copy
- [ ] App Store submission
- [ ] Launch

---

## Future ideas (not v1 — do not build yet)

- Multiple loops per user (one for family, one for friends)
- Non-parent use case: anyone living away from their network
- Android app
- Reaction/reply from recipients (a simple heart or short note back)
- Annual "year in review" letter auto-generated from the year's letters (layout only, no AI writing)
- Photo book print integration

---

## Key constraints and principles

1. **Never use AI to process, rewrite, or suggest edits to user content.** This is a core product promise and a trust issue with parents.
2. **Never store sensitive personal data beyond what is needed.** Minimal data collection.
3. **Keep the UX fast and low-friction.** The weekly/monthly ritual lives or dies on how fast a parent can go from notification to sent letter. Target: under 5 minutes.
4. **Recipients must never be required to create an account or download an app.**
5. **The app must work offline for drafting.** A parent on a plane should be able to write a letter. Sending requires connectivity.
6. **Preserve the parent's voice.** No autocorrect of tone, no suggested rewrites, no AI summary of what they wrote.

---

## Session log

Use this section to track what was built or decided in each Claude Code session.

| Date | What was done |
|---|---|
| — | Project document created |
| 2026-04-12 | Scaffolded Expo + TypeScript project (Expo SDK 54, React Native 0.81, React 19). Installed React Navigation (native-stack), Supabase JS client, AsyncStorage, react-native-safe-area-context, react-native-screens. Built full src/ folder structure: constants/theme.ts (color system, typography, spacing), constants/prompts.ts (all 10 prompts), lib/supabase.ts (client stub, env-var driven), navigation/types.ts + OnboardingStack + MainStack + RootNavigator, and stub screens for all 13 screens across onboarding, main, and settings. WelcomeScreen shows app name and tagline. TypeScript clean (0 errors). App runs in Expo Go via QR code. Built Supabase auth: supabase/schema.sql (all 5 tables + RLS + new-user trigger), src/hooks/useAuth.ts (session listener), src/components/ui/Input.tsx (reusable form input), fully functional SignUpScreen and SignInScreen with validation + error handling, sign-out button in SettingsScreen, RootNavigator wired to real session state. Added Settings nav link to HomeScreen so sign-out is reachable. Full auth flow verified working end-to-end on device. Built full onboarding setup flow: useLoop.ts hook + LoopContext, SetupStack navigator, RootNavigator now has 3-way routing (no session → Onboarding / session + no loop → Setup / session + loop → Main). CreateLoopScreen (name, child name, pronoun picker), AddRecipientsScreen (dynamic add/remove rows, email validation, bulk insert), SetCadenceScreen (cadence pills, day-of-week picker, auto timezone detection). All save to Supabase. On completion refetch() triggers automatic switch to MainStack. Built full letter write/preview/send flow: useLetter hook (fetches active draft + photos), createDraftLetter helper, HomeScreen rebuilt (shows live draft state, filled prompts, photo count, Preview & Send enabled only at 3 prompts), PromptPickerScreen (10 prompts, filled ones greyed), WriteResponseScreen (autosave on 800ms debounce, photo upload to Supabase Storage via expo-image-picker, photo delete, remove prompt), PreviewScreen (native email-style render), SendScreen (recipient list, calls Edge Function, success state). Supabase Edge Function send-letter/index.ts (Deno): verifies ownership, builds HTML email, sends via Resend API (one per recipient), marks letter sent. src/email/template.ts: standalone HTML email builder for client-side use. Photo storage: letter-photos bucket (manual setup required). |
| 2026-04-13 | Fixed 3 UX bugs found during real testing: (1) Added "Save & done" button to WriteResponseScreen — flushes debounced autosave and navigates home. (2) Added useFocusEffect refetch to HomeScreen so filled prompts appear immediately on return. (3) Added full photo section to HomeScreen (thumbnails, upload, delete) matching WriteResponseScreen. Debugged send-letter Edge Function — root cause was Supabase gateway-level JWT verification blocking every request before function code ran (explaining zero logs despite invocations). Fixed by disabling JWT verification in Supabase dashboard → Edge Functions → send-letter → Settings. Function now uses SUPABASE_ANON_KEY (auto-injected) + userClient.auth.getUser() for auth internally. End-to-end send flow confirmed working — email received via Resend. Deployment method: Supabase dashboard Code tab (copy-paste from local index.ts) — Supabase CLI is not actively used for deploys. |
| 2026-04-13 | Cleanup pass after Phase 1 completion. Changes: (1) Synced Edge Function buildEmailHtml with src/email/template.ts — fixed photo grid from flexbox (broken in Gmail/Outlook) to table-based layout, matched child_name fallback ('the little one'), matched padding/spacing/box-shadow. Added comment noting the two must stay in sync. (2) Removed console.error left in SendScreen. (3) Fixed misleading Edge Function deploy comment (removed CLI command, now says copy-paste via dashboard). (4) Fixed SettingsScreen TODO label (Phase 1 → Phase 2). (5) Updated CLAUDE.md loops schema table to include child_name and child_pronoun columns. |
| 2026-04-13 | Fixed photo upload. Root causes: (1) fetch().blob() returned 0-byte blobs on RN 0.81/Hermes — fixed by using XHR with responseType 'arraybuffer' to read the file. (2) Installed expo-image-manipulator to resize photos to 1200px/JPEG 0.7 before upload (reduces ~4MB originals to ~200KB, required for performance and email delivery). (3) FileSystem.uploadAsync and FileSystem.readAsStringAsync both hung in Expo Go — XHR is the working read path. Upload now uses supabase.storage.upload() with the ArrayBuffer. Fixed photo delete badge being clipped in ScrollView by adding paddingTop: 8 to photoRow in HomeScreen and WriteLetterScreen. |
| 2026-04-14 | Three UX improvements: (1) Bottom tab bar navigation — replaced MainStack with MainTabNavigator (new file) using @react-navigation/bottom-tabs + @expo/vector-icons (Ionicons). Three tabs: Home (letter writing flow), Letters (archive stub), Settings. Each tab has its own nested NativeStack. Removed gear icon from HomeScreen. RootNavigator now mounts MainTabNavigator for authenticated + loop-exists state. (2) Intro/Outro sections — added intro/outro/show_intro/show_outro columns to letters table (migration run via Supabase SQL editor). Extended Letter type in useLetter.ts. HomeScreen shows Opening and Closing rows above/below the prompts card, each with an Include/Exclude pill toggle (flips show_* in Supabase) and tap-to-edit (navigates to new IntroOutroScreen). IntroOutroScreen is a full-screen TextInput with 800ms autosave + Save & done, mirrors WriteLetterScreen keyboard behavior. PreviewScreen renders intro/outro with italic styling if enabled + non-empty. Email template (template.ts) and Edge Function both render intro before prompts and outro after as italic blocks with divider lines. (3) Flexible send — canSend changed from filledCount === 3 to filledCount >= 1. PromptPicker counter updated to "X chosen (up to 3)". PreviewScreen shows Alert.alert() confirmation when filledCount < 3 ("Not quite full" — "Keep writing" / "Send anyway"). TypeScript clean (0 errors). Follow-up fixes after real-device testing: replaced eye-icon toggles with Include/Exclude pill buttons (green when included, grey when excluded); removed the "Hi [name]," auto-greeting from PreviewScreen, template.ts, and Edge Function — the intro paragraph now opens the letter directly so users aren't prompted to write a duplicate salutation. Removed recipientName parameter from buildEmailHtml in both template files as it became unused. Edge Function redeployed via Supabase dashboard. |
| 2026-05-03 | Built letter archive (Phase 2). New screens: ArchiveScreen (Letters tab list — FlatList of sent letters, each card shows date, moment count, text snippet, and up to 3 photo thumbnails), ArchiveReadScreen (read-only detail view — same email card layout as PreviewScreen with green header, prompts, intro/outro, photos, footer). Navigation: added ArchiveRead route to LettersStackParamList, registered screen in MainTabNavigator with slide_from_right animation. Key bugs fixed during build: (1) Direct queries to letter_photos table silently returned empty due to RLS policy evaluation — fixed by using Supabase embedded select (letter_photos nested inside letters query) throughout. (2) Photos rendered invisibly in ArchiveReadScreen due to React Native bug: width:'47%' + aspectRatio:1 inside overflow:hidden container calculates height as 0 — fixed by computing concrete pixel dimensions from Dimensions.get('window').width. Both ArchiveScreen and ArchiveReadScreen use embedded select; ArchiveReadScreen avoids .single() (which strips embedded arrays in some Supabase JS versions) and instead takes rows[0]. Phase 2 checklist: archive ✓, push notifications ☐, improved email template ☐, web view for recipients ☐, draft auto-save ☐. |


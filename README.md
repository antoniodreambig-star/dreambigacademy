# Dream Big Academy app (app.dreambigctx.com) 

Student portal for the Dream Big Studios Audio Engineering Academy.

**Students** sign in with an emailed link the first time, then choose a username and password (either works after that) and get: a profile, the 26-week class plan, a schedule with homework due dates (turn in a note, link or file), private messages with the instructor, announcements, and a calendar link for their phone.

**Instructor** (you) gets: all students with who is behind or waiting on a reply, each student's profile and homework with feedback, classes (set one start date and every class and due date is calculated), enrollment by email, a curriculum editor, announcements.

Built with Next.js + Supabase. Cost: $0 to start.

---

## Set up (about 45 minutes, once)

### 1. Supabase (the database and logins)
> After running `01_schema.sql` and `02_storage.sql`, also run `supabase/03_username_password.sql` (adds usernames) and `supabase/04_audio_attendance_resources.sql` (audio feedback, attendance, resource library). Existing accounts, including yours, will be asked to pick a username and password at next sign-in.
1. Make a free account at supabase.com → **New project** (name it `dreambig-academy`, pick a region near Texas, save the database password).
2. **SQL Editor → New query**: paste all of `supabase/01_schema.sql` → Run. Then paste `supabase/02_storage.sql` → Run.
3. Open `01_schema.sql` first if you want to change who counts as an instructor (the two emails near the top). You can also change it later: `insert into instructors (email) values ('new@example.com');`
4. **Authentication → URL Configuration**
   - Site URL: `https://app.dreambigctx.com`
   - Redirect URLs: add `https://app.dreambigctx.com/**` and `http://localhost:3000/**`
5. **Authentication → Emails → Templates**. Edit both **Magic Link** and **Confirm signup** (use `type=magiclink` in the first and `type=signup` in the second):
   ```html
   <h2>Sign in to Dream Big Academy</h2>
   <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink">Tap here to sign in</a></p>
   <p>Or type this code on the sign-in page: <strong>{{ .Token }}</strong></p>
   ```
6. **Authentication → SMTP Settings**: Supabase's built-in email only sends a few messages an hour. Turn on custom SMTP using Resend (step 3 below gives you the SMTP details) so sign-in emails always arrive.
7. **Project Settings → API**: copy the Project URL, the `anon` key and the `service_role` key (keep that last one secret).

### 2. Vercel (hosts the app)
1. Put this folder in a GitHub repository (github.com → New repository → upload the files).
2. vercel.com → **Add New → Project** → pick the repository.
3. Add the environment variables from `.env.example` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`). Make `CRON_SECRET` any long random text.
4. Deploy. Then **Settings → Domains → Add** `app.dreambigctx.com`.
5. At your domain host (where dreambigctx.com's DNS lives) add: **CNAME**, name `app`, value `cname.vercel-dns.com`.

### 3. Resend (emails: messages, reminders, invites)
1. resend.com → add the domain `dreambigctx.com` and add the DNS records it shows. Create an API key.
2. Use it as `RESEND_API_KEY`. `EMAIL_FROM` should be an address on that domain, such as `Dream Big Academy <academy@dreambigctx.com>`.
3. For Supabase's SMTP (step 1.6): host `smtp.resend.com`, port 465, user `resend`, password = your API key.

### 4. First sign-in
1. Go to app.dreambigctx.com and enter your email (it must be in the instructors list). You land on the Students page.
2. **Classes**: create one (name, Week 1 class date, start time). Add each student's email. They sign in with that email.
3. **Curriculum**: weeks 1–9 are loaded from your course plan. Weeks 10–26 say "Outline coming soon" until you fill them in.

Students who aren't on your list can't create an account. Removing a person from Classes only removes the invite; to remove an account, delete the user in Supabase → Authentication.

## How the schedule works
- Class date for week N = Week 1 date + (N−1) × 7 days.
- Homework is due `homework_due_days` after that week's class (7 = next class; weeks 4 and 9 use 0 because the projects are due at class).
- Change the class's start date and everyone's schedule and calendar update.
- A daily job (Vercel cron, 9am Central) emails students homework due today or tomorrow and class the next day.

## Audio feedback, attendance and resources
- **Audio feedback:** when a student turns in an MP3/M4A/WAV file, a player appears for them and for you. Pause the song, tap "Pin comment to current time", write the note, and it shows as a clickable timestamp. Both sides can comment. Files upload straight from the browser (up to 50 MB); export mixes as MP3 or M4A to stay under that.
- **Attendance:** Instructor → Attendance. Pick the class and week, mark each student, save. Students see a chip on each week in Classes; you see totals on each student's page.
- **Resources:** Resources page. You add links or upload files (whole course or a specific week); students see them read-only.

## Messages
One private thread per student. New messages appear live. Each message also emails the other person (needs Resend).

## Privacy for 16–17 year olds
The profile has parent/guardian fields and a **Parent consent signed** switch you control on each student's page. Students see only their own data and the instructor's name. Don't ask for more than you need.

## Run it on your computer
```
cp .env.example .env.local   # fill in the keys
npm install
npm run dev                  # http://localhost:3000
```

## Files
- `supabase/01_schema.sql`, `02_storage.sql`: tables, security rules, course plan
- `src/app/(app)/`: the screens (student pages; `admin/` for the instructor)
- `src/app/api/calendar/[token]`: calendar feed; `src/app/api/cron/reminders`: daily reminders
- `src/lib/schedule.ts`: all the date math

---

## Tuition, applications and guardian consent (added Nov 2026)

**Apply flow.** Public form at `/apply` (no sign-in). Applicants must be 16+; under-18s must give a parent/guardian name and email. New applications show up under **Applications** (badge in the menu) and you get an email alert. **Accept** adds them to your invite list with their class and payment plan, and emails them how to sign in. **Waitlist** and **Decline** can send a message too.

**Guardian consent.** For applicants under 18, accepting emails the guardian a private link (`/consent/<secret>`). They read the studio rules and terms, tick the boxes, type their name as a signature, and give a phone number and an emergency contact. It is stored with the date, the wording version and the guardian's details, and the student's "Parent consent signed" switch turns on by itself. You can see status, copy the link to text it, or resend it under **Guardian consent** on each student's page. Under-18 students who haven't been consented see a reminder banner. The wording lives in `src/lib/consent.ts`. It is a plain-language template, not legal advice: have a Texas attorney review it.

**Tuition and payments.** Pricing is **$1,500 in full, or $250 a month for 6 months** (change it in `src/lib/pricing.ts`). Set up each student's plan on their page (you can change the total for a discount or scholarship). Record each payment as it arrives (Square, cash, Zelle…) and the app tracks paid, balance, next due date and what's past due, and can email the student a receipt. **Payments** shows everyone at a glance, with past-due students first. Students see their own schedule, balance and history under **Tuition**. Paste your Square payment links on the Payments page and students get a "Pay with Square" button. Payments are recorded by you by hand; nothing is charged automatically.

### Installing this update
1. **Supabase → SQL Editor → New query**: paste all of `supabase/06_tuition_applications_consent.sql` → Run. Do this before the new code goes live. It is safe to run twice.
2. Upload the files in this patch to GitHub at the same paths (keep the folder structure). Vercel redeploys automatically.
3. Optional: in Vercel add `ADMIN_NOTIFY_EMAIL` (where "new application" and "consent signed" alerts go). If you skip it, they go to `studio@dreambigctx.com`.
4. Open **Payments** and paste your Square links.
5. On your WordPress academy page, point the Apply button at `https://app.dreambigctx.com/apply`.

Emails use Resend like the rest of the app. If it isn't configured, nothing breaks: the guardian link is shown on the screen so you can text it.

## Online-only students (added Nov 2026)

A second track for students who attend remotely: **$1,000 for the full course, 3 months (13 weeks)**. Everything is per class: a class is either *in person* or *online*, and its students automatically get the online experience.

**What online students get.** Their own Home (setup checklist, next live session with a Join button in their own time zone, homework, recordings to catch up on, office hours, announcements), **Live sessions** (join links, recordings, slides, "I watched this"), **Set up** (time zone, equipment checklist), **Office hours** (book/cancel slots), the 13-week **Course**, **Schedule**, **Tuition** (online price and plan), and class rules and guardian-consent wording written for remote learning. Reminders and the calendar feed use the student's time zone.

**What you manage.** **Classes** has separate "New in-person class" and "New online class" forms (meeting link, passcode, seats). **Online classes** (admin menu) is the per-week session manager: recording, slides, reschedule or cancel, and who hasn't caught up. **Office hours** creates and clears slots. **Curriculum** has In person / Online tabs. **Applications** shows the track and time zone, and you can add a student directly with their course.

### Installing this update
1. **Supabase → SQL Editor**: run all of `supabase/20_online_students.sql` first. It is safe to run twice.
2. Upload the changed and new files to GitHub at the same paths. Do not upload `node_modules/` or `tsconfig.tsbuildinfo`.
3. **Payments**: paste two new Square links, one for online paid in full ($1,000) and one for online monthly. Online students never fall back to the in-person links.
4. Create an online class (set the start date, class time in Killeen time, meeting link) and edit the 13-week online curriculum draft under **Curriculum → Online**.
5. Point a WordPress button at `https://app.dreambigctx.com/apply?track=online` (and `?track=in_person` for the studio course). `/apply` alone shows a chooser.
6. Pricing and defaults are in `src/lib/pricing.ts` (`ONLINE_TUITION_CENTS`, `ONLINE_ALLOW_MONTHLY`, `ONLINE_MONTHLY_COUNT`).

Note: `package-lock.json` is out of sync with `package.json` (it was before this change), so use `npm install` locally rather than `npm ci`.

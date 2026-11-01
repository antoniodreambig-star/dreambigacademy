# Dream Big Academy app (app.dreambigctx.com)

Student portal for the Dream Big Studios Audio Engineering Academy.

**Students** sign in with an emailed link the first time, then choose a username and password (either works after that) and get: a profile, the 26-week class plan, a schedule with homework due dates (turn in a note, link or file), private messages with the instructor, announcements, and a calendar link for their phone.

**Instructor** (you) gets: all students with who is behind or waiting on a reply, each student's profile and homework with feedback, cohorts (set one start date and every class and due date is calculated), enrollment by email, a curriculum editor, announcements.

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
2. **Cohorts**: create one (name, Week 1 class date, start time). Add each student's email. They sign in with that email.
3. **Curriculum**: weeks 1–9 are loaded from your course plan. Weeks 10–26 say "Outline coming soon" until you fill them in.

Students who aren't on your list can't create an account. Removing a person from Cohorts only removes the invite; to remove an account, delete the user in Supabase → Authentication.

## How the schedule works
- Class date for week N = Week 1 date + (N−1) × 7 days.
- Homework is due `homework_due_days` after that week's class (7 = next class; weeks 4 and 9 use 0 because the projects are due at class).
- Change the cohort's start date and everyone's schedule and calendar update.
- A daily job (Vercel cron, 9am Central) emails students homework due today or tomorrow and class the next day.

## Audio feedback, attendance and resources
- **Audio feedback:** when a student turns in an MP3/M4A/WAV file, a player appears for them and for you. Pause the song, tap "Pin comment to current time", write the note, and it shows as a clickable timestamp. Both sides can comment. Files upload straight from the browser (up to 50 MB); export mixes as MP3 or M4A to stay under that.
- **Attendance:** Instructor → Attendance. Pick the cohort and week, mark each student, save. Students see a chip on each week in Classes; you see totals on each student's page.
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

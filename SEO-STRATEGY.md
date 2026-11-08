# Dream Big Academy: SEO strategy

Goal: show on page one of Google for "audio school Killeen TX", "media school Killeen", and related searches.

## 1. Honest expectations
- The local competition is thin. Searches for audio and media schools in Killeen mostly return school district pages, directories and schools in other cities. That makes page one realistic.
- Nobody can guarantee a position. Typical timeline: new pages are indexed in days to 2 weeks, move into the results in 4 to 12 weeks, and the Google Maps "local pack" (the top 3 map results) depends mostly on your Google Business Profile and reviews.
- Rankings are earned by three things: pages that match what people search, a complete and active Google Business Profile, and other local sites linking to you. This plan covers all three.

## 2. What is built into the app (already in the code)
| What | Where | Why it matters |
|---|---|---|
| Indexable landing page: "Audio engineering school in Killeen, TX" | `/` | Targets audio school / audio engineering school / recording school Killeen |
| Indexable online course page | `/online` | Targets online audio engineering course, learn Pro Tools online |
| Indexable application page | `/apply` | Converts visitors; keyword title |
| Private areas stay hidden | all other pages | `noindex` plus robots rules keep student data out of Google |
| robots.txt and sitemap.xml | `/robots.txt`, `/sitemap.xml` | Tells Google what to crawl. The login middleware now lets both through (without that fix Google would be redirected to the login page) |
| Structured data (schema) | landing and online pages | Course, LocalBusiness/EducationalOrganization with address, FAQ, breadcrumbs. Helps Google understand you are a school in Killeen |
| Visible FAQ | both pages | Answers real questions and can win extra search features |
| Image alt text, canonical links, social share cards | both pages | Basic on-page hygiene |
| Internal links | header, footer, pages | Links between `/`, `/online`, `/apply` and your main site |

Set this in Vercel after upload: `NEXT_PUBLIC_STUDIO_PHONE` (format `+12545551234`) so your phone number is included in the structured data. It must match your Google Business Profile exactly.

## 3. Important: two websites, one message
You have dreambigctx.com (WordPress, `/academy/`) and app.dreambigctx.com (this app). Google treats them as separate sites. Rules to avoid competing with yourself:
1. The app pages above are written to be different from the WordPress `/academy/` page (different headlines and angle). Do not copy text between them.
2. On WordPress `/academy/`, add visible links using these anchor texts: "audio school in Killeen" to `https://app.dreambigctx.com/`, "online audio engineering course" to `https://app.dreambigctx.com/online`, "Apply" to `https://app.dreambigctx.com/apply`.
3. Link the other way too: the app header and footer already link to dreambigctx.com and `/academy/`.
4. Longer term, the strongest setup is to have these public pages on dreambigctx.com (older, more links). If you ever want that, the same content can be added to the WordPress theme, and the app pages can then point to it with a canonical link.

## 4. Keyword map (one main page per search)
| Page | Main search | Also covers |
|---|---|---|
| `/` | audio school Killeen TX | audio engineering school Killeen, recording school Killeen, music production classes Killeen, Pro Tools classes Killeen, audio school near Fort Hood, Harker Heights, Copperas Cove, Temple |
| `/online` | online audio engineering course | learn Pro Tools online, online recording and mixing course, online music production course Texas |
| `/apply` | apply audio engineering academy Killeen | enroll, admissions |
| WordPress `/academy/` | Dream Big Academy | brand searches |

"Media school Killeen": Google matches words to real content. Today the course teaches audio, so the pages say "audio and media production" and mention podcasts and voice work the studio records. If you want to truly rank for "media school", add real media content to the course (podcast production, voice-over, content creation, video audio), then add a page for it. Do not claim video or broadcast training you do not teach.

## 5. Google Business Profile (the biggest lever for "Killeen" searches)
Your profile "Dream Big Studios" already exists. Do these in the profile at business.google.com:
1. Name, address and phone must match your website exactly. Use "1507 W Stan Schlueter Loop, Suite 101, Killeen, TX 76549" (Schlueter is the spelling on the street and in news coverage. Your app used "Schleuter" before, now fixed. Use whichever the profile has, and make everything else match it).
2. Primary category: Recording studio. Add secondary categories: Music school, Vocational school (or Training center if offered).
3. Website link: use `https://app.dreambigctx.com/` for the Academy. Add an "Academy" service listing with a description that uses "audio engineering school in Killeen".
4. Add a Products or Services entry for: In-person audio engineering course, Online audio engineering course, Recording, Mixing, Mastering, Podcast recording, Vocal coaching.
5. Upload 20+ real photos: control room, booth, instruments, classes, the exterior. Add one new photo a week.
6. Post an update weekly (Buffer lists your Google Business channel but it is locked on your plan. Upgrade, or post manually). Mention "Killeen" and the Academy.
7. Turn on messaging and add booking or application links.
8. Add the Q and A: post and answer "Is there an audio engineering school in Killeen?", "How much is the course?", "Can I take it online?"
9. Reviews: ask every client and student for a Google review and reply to every one. Aim for 25+ reviews in 90 days. A short text link to your review page works well. Reviews that mention "audio school" or "Killeen" help most. Never pay for or write fake reviews.

## 6. Local links and listings (what moves rankings after the basics)
- Greater Killeen Chamber of Commerce: you already had a ribbon cutting. Make sure the chamber directory lists the Academy with a link.
- Local news: you have already been covered by the Killeen Daily Herald and KTEM. Send a short press note about the Academy launch and first cohort to the Daily Herald, KTEM, Fox 44 and KWTX. A news link is very strong.
- Killeen and Fort Hood area: Fort Hood education offices, military spouse groups and veteran groups. Offer a talk or a studio tour. Do not say the Academy accepts GI Bill or military tuition assistance unless it is approved (see section 9).
- High schools: Killeen ISD music and audio-visual teachers and counselors. Offer a field trip or guest talk.
- Directories with the same name, address and phone: Bing Places, Apple Business Connect, Yelp, Facebook page, Instagram and TikTok bios, Nextdoor, BBB, Texas Music Office directory (Texas Music Industry Directory lists recording studios), Mapquest, Yellow Pages. Consistency matters more than quantity.
- Artists and partners: ask clients, local artists and the DreamBigArtists.com profiles to link to the Academy page when they mention the studio.
- Every social profile (Instagram, TikTok, Facebook) should list the Academy URL in the bio.

## 7. Content to publish (on WordPress, where your domain is strongest)
One useful post a month, each linking to `/` or `/online`:
1. How to become an audio engineer in Texas
2. Pro Tools for beginners: what to learn first
3. Recording vs mixing vs mastering explained
4. What does an audio engineering course teach?
5. How to start a home studio on a budget
6. Student spotlight (with permission): first project, before and after
Add real student work, photos and short videos as the Academy grows. Original photos of classes beat stock images.

## 8. Set up measurement (30 minutes, once)
1. Google Search Console: add `https://app.dreambigctx.com` as a property (DNS TXT record at your domain host), submit `https://app.dreambigctx.com/sitemap.xml`, then use "URL inspection" on `/`, `/online` and `/apply` and click "Request indexing". Do the same for dreambigctx.com.
2. Bing Webmaster Tools: import from Search Console.
3. Check Search Console monthly: which searches show your pages, which pages get clicks, and fix pages with impressions but few clicks by improving their title.
4. Track: Google Business Profile views, calls, direction requests, and number of applications from `/apply`.

## 9. Compliance notes (please check)
- Texas regulates private career schools. Courses that teach job skills for a fee may need approval from the Texas Workforce Commission (Career Schools and Colleges) or an exemption. Check with TWC before you advertise heavily. It also decides whether you can ever accept GI Bill or other aid.
- The pages do not claim accreditation, certificates, degrees, job placement or earnings. Keep it that way unless they become true and documented.
- The Academy pages say Antonio Noriega teaches. Update `src/lib/seo.ts` if instructors change.

## 10. 90-day checklist
Week 1: upload app update, add phone env var, set up Search Console and Bing, request indexing, fix Google Business Profile (sections 5 and 8), add links on WordPress `/academy/`.
Weeks 2 to 4: 10 reviews, 20 photos, directory listings, chamber listing, first blog post, press note.
Weeks 5 to 8: second and third posts, school and Fort Hood outreach, student work posts, check Search Console and improve titles.
Weeks 9 to 12: more reviews (25+), a page for any new course (for example podcast production), refresh the FAQ with real questions from applicants.

## 11. Files changed in this update
New: `src/lib/seo.ts`, `src/components/JsonLd.tsx`, `src/components/FaqList.tsx`, `src/app/robots.ts`, `src/app/sitemap.ts`, `src/app/online/page.tsx`, `SEO-STRATEGY.md`
Changed: `src/app/page.tsx`, `src/app/apply/page.tsx`, `src/app/globals.css`, `src/lib/supabase/middleware.ts`, `src/components/PublicHeader.tsx`, `src/components/SiteFooter.tsx`, `src/lib/consent.ts`, `src/app/api/calendar/[token]/route.ts` (street spelling only)

/**
 * The parent / guardian consent that students aged 16–17 need before taking part.
 * EDIT THIS FILE to change the wording. Change CONSENT_VERSION when the wording changes in a way that matters;
 * each signature records the version it was signed under.
 *
 * NOTE: this is a plain-language template, not legal advice. Have a Texas attorney review it (especially the
 * risk, medical and media sections) before you rely on it.
 */
export const CONSENT_VERSION = '2026-11c';

export const PROGRAM_SUMMARY =
  'The Dream Big Studios Audio Engineering Academy offers standalone in-person modules at Dream Big Studios (1507 W Stan Schlueter Loop, Suite 101, Killeen, TX). ' +
  'In the module the student signs up for, they meet for one three-hour class each week for about eight weeks to learn recording, mixing and mastering in Pro Tools, ' +
  'with homework and hands-on lab time in the studio.';

export const CONSENT_TERMS: { title: string; text: string }[] = [
  {
    title: 'Permission to take part',
    text: 'I am the parent or legal guardian of the student named above. I give my permission for my child to take part in the Academy, including classes, labs and studio sessions at Dream Big Studios.',
  },
  {
    title: 'Studio rules',
    text: 'I have read the studio rules on this page and I will go over them with my child. I understand the studio may remove a student for repeated rule violations, unsafe behavior or damage to equipment.',
  },
  {
    title: 'Safety and risks',
    text: 'A recording studio has normal risks: loud sound levels, electrical equipment, cables and heavy gear. Staff will teach safe listening levels and safe handling, but I understand some risk remains and I accept it on my child’s behalf.',
  },
  {
    title: 'Equipment',
    text: 'Studio equipment is expensive. I understand my child must follow instructions for using it, and that I may be asked to cover repair or replacement costs for damage caused by misuse or carelessness.',
  },
  {
    title: 'Emergencies',
    text: 'If my child is hurt or ill during Academy activities, I authorize studio staff to call emergency services and to contact me and the emergency contact below. I understand I am responsible for any medical costs.',
  },
  {
    title: 'Communication and privacy',
    text: 'My child will use the Academy app to see their schedule and homework and to message their instructor. I understand the studio will keep my family’s contact details private and use them only for Academy business.',
  },
];

export const MEDIA_RELEASE =
  'Optional: I allow Dream Big Studios to use photos, video or audio of my child made during Academy activities on its website and social media. (You can leave this unchecked and your child can still take part.)';

/** The same consent, worded for the ONLINE-only modules (students join live video sessions from home). */
export const PROGRAM_SUMMARY_ONLINE =
  'The Dream Big Studios Audio Engineering Academy offers standalone online modules taught over live video from Dream Big Studios (Killeen, TX). ' +
  'In the module the student signs up for, they join the in-person class live on video, one three-hour class each week for about eight weeks, to learn recording, mixing and mastering in Pro Tools, watch recordings of the sessions, do homework on their own equipment, and can book one-on-one office hours with their instructor.';

export const CONSENT_TERMS_ONLINE: { title: string; text: string }[] = [
  {
    title: 'Permission to take part',
    text: 'I am the parent or legal guardian of the student named above. I give my permission for my child to take part in the online Academy, including live video sessions, homework and office hours.',
  },
  {
    title: 'Class rules',
    text: 'I have read the class rules on this page and I will go over them with my child. I understand the studio may remove a student for repeated rule violations, harassment, or sharing recordings or other students’ work.',
  },
  {
    title: 'Recorded sessions',
    text: 'Live sessions are recorded and shared with the students in the class so they can catch up. My child’s voice, image and screen may appear in those recordings. The recordings are not posted publicly, and I understand students must not record or share them.',
  },
  {
    title: 'Office hours and supervision',
    text: 'My child can book one-on-one office hours with an instructor over video. Office hours with students under 18 are recorded, and I may sit in on any session or office hour at any time. Because my child joins from home, I am responsible for supervising their use of video calls and the internet.',
  },
  {
    title: 'Equipment and safe listening',
    text: 'My child will use their own computer, software, microphone and headphones. I understand the studio does not supply or insure this equipment, that my child should keep headphone volume at a safe level and take breaks, and that I am responsible for safe set-up at home.',
  },
  {
    title: 'Emergencies',
    text: 'Because my child joins from home, studio staff cannot provide emergency help in person. If a session is interrupted or there is a concern, I authorize staff to contact me and the emergency contact below.',
  },
  {
    title: 'Communication and privacy',
    text: 'My child will use the Academy app to see their schedule, homework, live-session links and recordings and to message their instructor. I understand the studio will keep my family’s contact details private and use them only for Academy business.',
  },
];

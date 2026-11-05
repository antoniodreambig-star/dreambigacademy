/**
 * The parent / guardian consent that students aged 16–17 need before taking part.
 * EDIT THIS FILE to change the wording. Change CONSENT_VERSION when the wording changes in a way that matters;
 * each signature records the version it was signed under.
 *
 * NOTE: this is a plain-language template, not legal advice. Have a Texas attorney review it (especially the
 * risk, medical and media sections) before you rely on it.
 */
export const CONSENT_VERSION = '2026-11';

export const PROGRAM_SUMMARY =
  'The Dream Big Studios Audio Engineering Academy is an in-person course at Dream Big Studios (1507 W Stan Schleuter Loop, Suite 101, Killeen, TX). ' +
  'Students meet for one three-hour class each week for about six months to learn recording, mixing and mastering in Pro Tools, ' +
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

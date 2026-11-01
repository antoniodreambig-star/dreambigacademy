/**
 * The studio rules every student accepts before using the app.
 * EDIT THIS FILE to change the wording. When you change the rules in a way students must re-accept,
 * change RULES_VERSION (for example to '2027-01') and everyone will be asked to sign again.
 */
export const RULES_VERSION = '2026-11';

export const RULES: { title: string; text: string }[] = [
  { title: 'Be on time and be present', text: 'Class starts at the scheduled time. If you can’t make it, message your instructor before class. Missing class means missing material you’ll need for homework.' },
  { title: 'Turn in homework on time', text: 'Homework is due on the date shown in your Schedule. If something comes up, ask for more time before the due date, not after.' },
  { title: 'Respect the studio and the gear', text: 'Studio equipment is expensive and shared. Ask before touching anything you haven’t been shown how to use. No food or drinks in the control room or booths. Report any damage right away.' },
  { title: 'Respect everyone in the room', text: 'No harassment, bullying or discrimination of any kind. Keep language and behavior professional. Artists and clients who record here deserve privacy and respect.' },
  { title: 'Keep other people’s work private', text: 'Sessions, songs and files you hear or work on at Dream Big Studios belong to the artists who made them. Don’t share, post or copy them without written permission.' },
  { title: 'Turn in your own work', text: 'Homework and projects must be your own work. You may use sounds and samples you have the rights to use.' },
  { title: 'Studio time', text: 'Lab and practice time in the studio happens only when scheduled or approved by your instructor. Never enter the studio alone or bring guests without permission.' },
  { title: 'Students under 18', text: 'Students who are 16 or 17 need a parent or guardian to review these rules and give consent before taking part.' },
  { title: 'Staying in the Academy', text: 'The studio may remove a student from the Academy for repeated rule violations, unsafe behavior or damage to equipment.' },
];

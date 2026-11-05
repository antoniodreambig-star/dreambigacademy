export type Role = 'student' | 'instructor';

export interface Profile {
  id: string;
  email: string;
  username: string | null;
  rules_version: string | null;
  rules_accepted_at: string | null;
  rules_signed_name: string | null;
  under_18: boolean;
  guardian_ack: boolean;
  role: Role;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  goals: string | null;
  experience: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  parent_email: string | null;
  consent_signed: boolean;
  cohort_id: string | null;
  calendar_token: string;
  created_at: string;
}

export interface Cohort {
  id: string;
  name: string;
  start_date: string; // YYYY-MM-DD, the Week 1 class
  class_weekday: number;
  class_start: string; // HH:MM:SS
  class_hours: number;
  active: boolean;
}

export interface Week {
  week: number;
  phase: string;
  title: string;
  in_class: string;
  lab: string;
  homework: string;
  homework_due_days: number;
}

export interface Project {
  key: string;
  title: string;
  week: number;
  items: string[];
}

export interface Submission {
  id: string;
  student_id: string;
  week: number;
  note: string | null;
  link: string | null;
  file_path: string | null;
  submitted_at: string;
  feedback: string | null;
  feedback_at: string | null;
}

export interface Message {
  id: string;
  thread_student_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface Announcement {
  id: string;
  cohort_id: string | null;
  title: string;
  body: string;
  created_at: string;
}

export interface SubmissionComment {
  id: string;
  submission_id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  at_seconds: number | null;
  body: string;
  created_at: string;
}

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused';

export interface Attendance {
  student_id: string;
  week: number;
  status: AttendanceStatus;
  note: string | null;
}

export interface Resource {
  id: string;
  week: number | null;
  title: string;
  description: string | null;
  url: string | null;
  file_path: string | null;
  created_at: string;
}

export type PlanKey = 'full' | 'monthly';

export interface Enrollment {
  student_id: string;
  plan: PlanKey;
  total_cents: number;
  installments: number;
  first_due: string; // YYYY-MM-DD
  note: string | null;
}

export interface Payment {
  id: string;
  student_id: string;
  amount_cents: number;
  paid_on: string; // YYYY-MM-DD
  method: string;
  note: string | null;
  created_at: string;
}

export type ApplicationStatus = 'new' | 'accepted' | 'waitlist' | 'declined';

export interface Application {
  id: string;
  created_at: string;
  status: ApplicationStatus;
  full_name: string;
  email: string;
  phone: string | null;
  birth_date: string;
  under_18: boolean;
  guardian_name: string | null;
  guardian_email: string | null;
  guardian_phone: string | null;
  experience: string | null;
  goals: string | null;
  referral: string | null;
  plan: PlanKey | null;
  cohort_id: string | null;
  decided_at: string | null;
  decision_note: string | null;
}

export interface GuardianConsent {
  id: string;
  token: string;
  application_id: string | null;
  student_email: string;
  student_name: string;
  guardian_name: string;
  guardian_email: string | null;
  status: 'pending' | 'signed';
  requested_at: string;
  last_sent_at: string | null;
  signed_name: string | null;
  relationship: string | null;
  phone: string | null;
  emergency_name: string | null;
  emergency_phone: string | null;
  media_ok: boolean;
  version: string | null;
  signed_at: string | null;
}

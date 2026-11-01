export type Role = 'student' | 'instructor';

export interface Profile {
  id: string;
  email: string;
  username: string | null;
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

import { Role } from "@/enums/enums";

// Department options for forms
export const DEPARTMENTS = [
  { label: "Computer Science", value: "cs" },
  { label: "Engineering", value: "eng" },
  { label: "Business", value: "bus" },
  { label: "Medicine", value: "med" },
  { label: "Arts & Humanities", value: "arts" },
  { label: "Science", value: "sci" },
] as const;

// Empty state messages
export const EMPTY_STATE_MESSAGES = {
  members: "No members found. Add your first member to get started.",
  courses: "No courses available. Courses will appear here once added.",
  sessions: "No sessions found. Create a session to begin tracking attendance.",
  notifications: "You're all caught up! No new notifications.",
  analytics: "No analytics data available yet.",
  admins: "No admin users found.",
  staff: "No staff members found.",
  courseReps: "No course assistants assigned yet.",
  attendance: "No attendance records found for this period.",
  search: "No results match your search criteria.",
  default: "No data available.",
} as const;

// Role filter options for UI components
export const ROLE_FILTER_OPTIONS = [
  { label: "All Roles", value: "all" },
  { label: "Students", value: Role.STUDENT },
  { label: "Staff", value: Role.STAFF },
  { label: "Admin", value: Role.ADMIN },
  { label: "Lecturers", value: Role.LECTURER },
  { label: "Course Assistants", value: Role.REP },
  { label: "System Admin", value: Role.SYSTEM_ADMIN },
  { label: "Owner", value: Role.OWNER },
] as const;

// Roles available for adding new members (excludes high-privilege roles)
export const MEMBER_ROLES = [
  { label: "Student", value: Role.STUDENT },
  { label: "Staff", value: Role.STAFF },
  { label: "Lecturer", value: Role.LECTURER },
  { label: "Admin", value: Role.ADMIN },
] as const;

// Admin roles for admin management
export const ADMIN_ROLES = [
  { label: "Admin", value: Role.ADMIN },
  { label: "System Admin", value: Role.SYSTEM_ADMIN },
] as const;

// Type exports for use in components
export type Department = (typeof DEPARTMENTS)[number];
export type EmptyStateKey = keyof typeof EMPTY_STATE_MESSAGES;

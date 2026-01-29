export enum NotificationStatus {
  READ = "READ",
  UNREAD = "UNREAD",
}

export enum Priority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export enum AttendanceStatus {
  PRESENT = "PRESENT",
  LATE = "LATE",
  EXCUSED = "EXCUSED",
  ABSENT = "ABSENT",
  CHECKED_IN = "CHECKED_IN",
  CHECKED_OUT = "CHECKED_OUT",
}

export enum Role {
  ADMIN = "ADMIN",
  OWNER = "OWNER",
  SYSTEM_ADMIN = "SYSTEM_ADMIN",
  LECTURER = "LECTURER",
  STAFF = "STAFF",
  STUDENT = "STUDENT",
  REP = "REP",
}

export enum SessionMode {
  CHECK_IN = "CHECK_IN",
  CHECK_OUT = "CHECK_OUT",
}

export enum SessionStatus {
  OPEN = "OPEN",
  CLOSED = "CLOSED",
  SCHEDULED = "SCHEDULED",
}

export enum AccountStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SUSPENDED = "SUSPENDED",
}

export enum ImageStatus {
  PENDING = "PENDING",
  UPLOADED = "UPLOADED",
  FAILED = "FAILED",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
}

export enum SessionType {
  CLASS = "CLASS",
  EXAM = "EXAM",
  LAB = "LAB",
  TUTORIAL = "TUTORIAL",
  EVENT = "EVENT",
  WORKSHIFT = "WORKSHIFT",
}

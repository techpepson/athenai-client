import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  RefreshCw,
  QrCode,
  Download,
  X,
  CalendarDays,
  LayoutList,
  BookOpen,
  FileText,
  Users,
  Send,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Link,
  Radio,
} from "lucide-react";
import TimetableTab from "@/components/modules/TimetableTab";
import LecturerAttendanceTab from "@/components/sessions/LecturerAttendanceTab";
import MyAttendanceSheet from "@/components/sessions/MyAttendanceSheet";
import MasterAttendanceSheet from "@/components/sessions/MasterAttendanceSheet";
import { Button } from "@/components/ui/button";
import { SessionCard } from "@/components/sessions/SessionCard";
import { SessionReportModal } from "@/components/sessions/SessionReportModal";
import {
  AttendanceSession,
  SessionAttendanceRecord,
  ExpectedAttendee,
} from "@/types/attendance";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/enums/enums";
import {
  getAllSessionsAdmin,
  getCreatorSessions,
  getLecturerSessions,
  closeSession,
  createSession,
  deleteSession,
  toggleSessionMode,
  generateSessionQrCode,
  Session,
  SessionStatus,
  SessionType,
  SessionMode,
  Attendance,
  CourseEnrollment,
} from "@/services/sessions.service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  modulesService,
  TimetableSlot,
  Module,
  ModuleTimetable,
} from "@/services/modules.service";
import { usersServices } from "@/services/users.services";
import { IUser, IStudent, ILecturer } from "@/interface/user.interface";
import {
  getUserAttendance,
  AttendanceRecord,
} from "@/services/attendance.services";

// Helper function to map API Session to AttendanceSession
const mapSessionToAttendanceSession = (
  session: Session,
  allUsers: (IUser & {
    student?: IStudent | null;
    lecturer?: ILecturer | null;
  })[],
  allModules: Module[],
): AttendanceSession => {
  // Map session type
  const typeMap: Record<SessionType, AttendanceSession["type"]> = {
    [SessionType.CLASS]: "class",
    [SessionType.EXAM]: "exam",
    [SessionType.LAB]: "class",
    [SessionType.TUTORIAL]: "class",
    [SessionType.EVENT]: "event",
    [SessionType.WORKSHIFT]: "shift",
  };

  // Map session status
  const statusMap: Record<SessionStatus, AttendanceSession["status"]> = {
    [SessionStatus.OPEN]: "active",
    [SessionStatus.CLOSED]: "completed",
    [SessionStatus.SCHEDULED]: "active", // Treat scheduled as active for display
  };

  // Map attendance records
  const mappedAttendances: SessionAttendanceRecord[] =
    session.attendances?.map((a: Attendance) => ({
      id: a.id,
      userId: a.userId,
      userName: a.user?.name || undefined,
      userEmail: a.user?.email || undefined,
      studentId:
        a.user?.student?.studentId || a.user?.student?.matricNo || undefined,
      department: a.user?.student?.department || undefined,
      timestamp: new Date(a.timestamp),
      checkInTime: a.checkInTime ? new Date(a.checkInTime) : undefined,
      checkOutTime: a.checkOutTime ? new Date(a.checkOutTime) : undefined,
      confidence: a.confidence,
      source: a.source,
      status: a.status as SessionAttendanceRecord["status"],
    })) || [];

  // Calculate present count from attendances - PRESENT and LATE count
  const presentCount =
    session.attendances?.filter(
      (a) => a.status === "PRESENT" || a.status === "LATE",
    ).length || 0;

  // ── Compute expected attendees ──
  // For module-based sessions: students at the module's level + assigned lecturer(s)
  // For course-based sessions: fall back to course enrollments
  let mappedExpectedAttendees: ExpectedAttendee[] = [];
  let expectedCount = 0;

  const moduleLevel =
    session.module?.level ||
    allModules.find((m) => m.id === session.moduleId)?.level;

  if (moduleLevel && allUsers.length > 0) {
    // Students at this module's level
    const levelStudents = allUsers.filter(
      (u) => u.student && u.student.level === moduleLevel,
    );
    mappedExpectedAttendees = levelStudents.map((u) => ({
      id: u.student!.id,
      userId: u.id,
      name: u.name,
      email: u.email,
      studentId: u.student!.studentId || u.student!.matricNo || undefined,
    }));

    // Add the assigned lecturer(s)
    if (session.lecturerId) {
      // session.lecturer is the Lecturer record; find the User
      const lecturerUser = session.lecturer?.user
        ? {
            id: session.lecturer.user.id,
            name: session.lecturer.user.name,
            email: session.lecturer.user.email,
          }
        : allUsers.find((u) => u.lecturer?.id === session.lecturerId);

      if (lecturerUser) {
        mappedExpectedAttendees.push({
          id: session.lecturerId,
          userId: lecturerUser.id,
          name: lecturerUser.name,
          email: lecturerUser.email,
        });
      }
    }

    expectedCount = mappedExpectedAttendees.length;
  } else if (session.course?.enrollments?.length) {
    // Fallback: course enrollment-based
    mappedExpectedAttendees = session.course.enrollments.map(
      (e: CourseEnrollment) => ({
        id: e.id,
        userId: e.student?.user?.id || "",
        name: e.student?.user?.name || "Unknown",
        email: e.student?.user?.email,
        studentId: e.student?.studentId || e.student?.matricNo,
        department: undefined,
      }),
    );
    expectedCount =
      session.expectedAttendeesCount ||
      session.course._count?.enrollments ||
      session.course.enrollments.length;
  } else {
    expectedCount =
      session.expectedAttendeesCount ||
      session.course?._count?.enrollments ||
      0;
  }

  return {
    id: session.id,
    name: session.name,
    type: typeMap[session.type] || "class",
    attendanceType:
      session.mode === SessionMode.CHECK_IN ? "checkin" : "checkout",
    startTime: new Date(session.startTime),
    endTime: new Date(session.endTime),
    status: statusMap[session.status] || "active",
    location: session.location || undefined,
    expectedCount: expectedCount,
    presentCount: presentCount,
    courseId: session.courseId || session.moduleId || undefined,
    courseName: session.module
      ? `${session.module.name} (${session.module.code})`
      : session.course?.title || undefined,
    department: session.module?.code || undefined,
    createdBy: session.userId,
    createdByRole: session.createdBy?.name ? Role.LECTURER : undefined,
    attendances: mappedAttendances,
    expectedAttendees: mappedExpectedAttendees,
  };
};

// Wrapper that binds allUsers/allModules for use in .map()
const createSessionMapper = (
  allUsers: (IUser & {
    student?: IStudent | null;
    lecturer?: ILecturer | null;
  })[],
  allModules: Module[],
) => {
  return (session: Session): AttendanceSession =>
    mapSessionToAttendanceSession(session, allUsers, allModules);
};

const Sessions = () => {
  const navigate = useNavigate();
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] =
    useState<AttendanceSession | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [mainTab, setMainTab] = useState("sessions");
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [lecturerActiveSessions, setLecturerActiveSessions] = useState<
    Session[]
  >([]);
  const [isLoadingLecturerSessions, setIsLoadingLecturerSessions] =
    useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [allModules, setAllModules] = useState<Module[]>([]);
  const [allTimetables, setAllTimetables] = useState<ModuleTimetable[]>([]);
  const [allUsers, setAllUsers] = useState<
    (IUser & {
      student?: IStudent | null;
      lecturer?: ILecturer | null;
    })[]
  >([]);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [studentLevel, setStudentLevel] = useState<number | undefined>();
  const [userAttendanceRecords, setUserAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);

  // Get auth context early (needed by useEffects below)
  const { user, token } = useAuth();

  // Load modules, timetables, and students from API
  useEffect(() => {
    const loadModuleData = async () => {
      try {
        const modRes = await modulesService.getModules();
        if (modRes.success && modRes.data?.data) {
          const modules = modRes.data.data;
          setAllModules(modules);

          // Fetch full timetable (with slots) for each module
          const ttPromises = modules.map((m) =>
            modulesService.getTimetableForModule(m.id),
          );
          const ttResults = await Promise.all(ttPromises);
          const timetables: ModuleTimetable[] = [];
          ttResults.forEach((res) => {
            if (res.success && res.data?.data) {
              timetables.push(res.data.data);
            }
          });
          setAllTimetables(timetables);
        }
      } catch (e) {
        console.error("Failed to load module data for sessions:", e);
      }
    };
    loadModuleData();
  }, []);

  // Fetch all users (students + lecturers) for attendee counts
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await usersServices.getAllUsers();
        if (res.success && res.data?.users) {
          setAllUsers(res.data.users);
        }
      } catch (e) {
        console.error("Failed to load users:", e);
      }
    };
    loadUsers();
  }, []);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [clockTick, setClockTick] = useState(Date.now());
  const remindedSessionKeysRef = useRef<Set<string>>(new Set());
  const [togglingSessionId, setTogglingSessionId] = useState<string | null>(
    null,
  );
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(
    null,
  );
  const [qrCodeModalOpen, setQrCodeModalOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [qrCodeSessionName, setQrCodeSessionName] = useState<string>("");
  const [generatingQrCode, setGeneratingQrCode] = useState<string | null>(null);
  const [endingSessionId, setEndingSessionId] = useState<string | null>(null);

  // Check if user is admin (can see all sessions)
  const isAdmin = user?.role === Role.ADMIN || user?.role === Role.SYSTEM_ADMIN;

  // Check if user can view lecturer attendance (REP, ADMIN, SYSTEM_ADMIN only — lecturers cannot mark their own attendance)
  const canViewLecturerAttendance = isAdmin || user?.role === Role.REP;

  // Check if user is a student (for My Attendance Sheet)
  const isStudent = user?.role === Role.STUDENT;
  const isRep = user?.role === Role.REP;
  const isLecturer = user?.role === Role.LECTURER;

  // Check if user can view My Attendance Sheet (students only; reps use the Student Attendance Sheet)
  const canViewMyAttendanceSheet = isStudent;

  // Check if user can view/edit Master Attendance Sheet (reps and lecturers)
  const canViewMasterAttendanceSheet = isRep || isLecturer || isAdmin;

  // Fetch student level and attendance records (for students/reps)
  useEffect(() => {
    const loadStudentData = async () => {
      if (!token) return;
      try {
        // Get student level
        const userRes = await usersServices.getUserById(token);
        if (userRes.success && userRes.data?.user?.student?.level) {
          setStudentLevel(userRes.data.user.student.level);
        }
        // Get attendance records for the current user
        const attRes = await getUserAttendance(token);
        if (attRes.success && attRes.data) {
          setUserAttendanceRecords(attRes.data);
        }
      } catch (e) {
        console.error("Failed to load student data:", e);
      }
    };
    if (isStudent || isRep) {
      loadStudentData();
    }
  }, [token, isStudent, isRep]);

  // SMS modal state for session start
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [startingSession, setStartingSession] =
    useState<AttendanceSession | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [createdSessionData, setCreatedSessionData] = useState<{
    attendanceLink?: string;
    smsSentToLecturer?: boolean;
    studentsSmsCount?: number;
    sessionId?: string;
  } | null>(null);

  // Day name mapping for display
  const dayNames = useMemo(
    () => [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ],
    [],
  );

  const playReminderSound = useCallback(() => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (
          window as Window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;
      if (!AudioCtx) return;

      const audioContext = new AudioCtx();

      const playBeep = (startAt: number, duration: number, frequency: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, startAt);

        gainNode.gain.setValueAtTime(0.0001, startAt);
        gainNode.gain.exponentialRampToValueAtTime(0.08, startAt + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(
          0.0001,
          startAt + duration,
        );

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start(startAt);
        oscillator.stop(startAt + duration);
      };

      const now = audioContext.currentTime;
      playBeep(now, 0.18, 880);
      playBeep(now + 0.23, 0.24, 1175);

      setTimeout(() => {
        void audioContext.close().catch(() => {});
      }, 700);
    } catch {
      // Ignore sound failures (e.g. autoplay restrictions).
    }
  }, []);

  // Recompute lecture status (scheduled/active/completed) in near real time.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockTick(Date.now());
    }, 15000);

    return () => window.clearInterval(timer);
  }, []);

  // Build weekly lecture cards from timetable activities
  // Reps: show ALL subtopic sessions for today (startable)
  // Others: show this week's remaining lectures
  const weeklyLectureSessions = useMemo((): AttendanceSession[] => {
    if (allTimetables.length === 0) return [];

    const now = new Date(clockTick);
    // Get Monday of the current week
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);

    // Today at start of day for filtering
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const dayIndexMap: Record<string, number> = {
      MONDAY: 0,
      TUESDAY: 1,
      WEDNESDAY: 2,
      THURSDAY: 3,
      FRIDAY: 4,
      SATURDAY: 5,
      SUNDAY: 6,
    };

    const parseTime = (timeStr: string): { hours: number; minutes: number } => {
      const [h, m] = timeStr.split(":").map(Number);
      // Handle 12-hour implied format (1:30 = 13:30 if < 7)
      const hours = h < 7 ? h + 12 : h;
      return { hours, minutes: m || 0 };
    };

    const lectureCards: AttendanceSession[] = [];

    allTimetables.forEach((timetable) => {
      const mod = allModules.find((m) => m.id === timetable.moduleId);
      if (!mod) return;

      // Determine current week number within the timetable
      let currentWeek = 1;
      if (isRep) {
        // Reps manually select the week
        currentWeek = selectedWeek;
      } else if (timetable.startDate) {
        const start = new Date(timetable.startDate);
        const diffMs = now.getTime() - start.getTime();
        currentWeek = Math.max(
          1,
          Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)),
        );
      }
      if (currentWeek > timetable.totalWeeks) return; // past this module

      // Filter slots for the current week
      // Reps: ALL activity types; others: only LECTURE
      const weekSlots = timetable.slots.filter((slot) => {
        const weekMatch = !slot.week || slot.week === currentWeek;
        if (!weekMatch) return false;
        if (!isRep) return slot.activityType === "LECTURE";
        return true; // Reps see all activity types
      });

      weekSlots.forEach((slot) => {
        const dayOffset = dayIndexMap[slot.day.toUpperCase()];
        if (dayOffset === undefined) return;

        const slotDate = new Date(monday);
        slotDate.setDate(monday.getDate() + dayOffset);

        // Reps: show ONLY today's sessions
        if (isRep) {
          if (slotDate < todayStart || slotDate > todayEnd) return;
        } else {
          // Non-reps: skip past days (only show today and upcoming)
          if (slotDate < todayStart) return;
        }

        const start = parseTime(slot.startTime);
        const end = parseTime(slot.endTime);

        const startTime = new Date(slotDate);
        startTime.setHours(start.hours, start.minutes, 0, 0);

        const endTime = new Date(slotDate);
        endTime.setHours(end.hours, end.minutes, 0, 0);

        // Determine status based on current time
        let status: AttendanceSession["status"] = "scheduled";
        if (now >= startTime && now <= endTime) {
          status = "active";
        } else if (now > endTime) {
          status = "completed";
        }

        const subtopic = mod.subtopics.find((s) => s.id === slot.subtopicId);

        // Filter students at the same level as this module
        const levelStudents = allUsers.filter(
          (u) => u.student && u.student.level === mod.level,
        );

        // Build expected attendees: students at this level
        const expectedAttendees: ExpectedAttendee[] = levelStudents.map(
          (u) => ({
            id: u.student!.id,
            userId: u.id,
            name: u.name,
            email: u.email,
            studentId: u.student!.studentId || u.student!.matricNo || undefined,
          }),
        );

        // Add lecturer(s) assigned to this subtopic or slot
        const lecturerId = slot.lecturerId || subtopic?.lecturerId;
        if (lecturerId) {
          const lecturerUser = allUsers.find((u) => u.id === lecturerId);
          expectedAttendees.push({
            id: lecturerId,
            userId: lecturerId,
            name:
              lecturerUser?.name ||
              slot.lecturerName ||
              subtopic?.lecturerName ||
              "Lecturer",
            email: lecturerUser?.email,
          });
        }

        lectureCards.push({
          id: `timetable-${slot.id}`,
          name:
            subtopic?.name || `${mod.name} - ${slot.activityType || "Lecture"}`,
          type: "class",
          attendanceType: "checkin",
          department: mod.code,
          startTime,
          endTime,
          status,
          location: slot.venue || undefined,
          expectedCount: expectedAttendees.length,
          presentCount: 0,
          courseId: undefined,
          courseName: `${mod.name} (${mod.code})`,
          createdBy: undefined,
          expectedAttendees,
        });
      });
    });

    // Sort by start time
    lectureCards.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    return lectureCards;
  }, [allModules, allTimetables, allUsers, isRep, selectedWeek, clockTick]);

  // Group lectures by day for display
  const lecturesByDay = useMemo(() => {
    const grouped: Record<string, AttendanceSession[]> = {};

    weeklyLectureSessions.forEach((session) => {
      const dayName = dayNames[session.startTime.getDay()];
      if (!grouped[dayName]) {
        grouped[dayName] = [];
      }
      grouped[dayName].push(session);
    });

    // Sort days in order (Monday to Friday)
    const orderedDays = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    const sortedGrouped: Record<string, AttendanceSession[]> = {};
    orderedDays.forEach((day) => {
      if (grouped[day]) {
        sortedGrouped[day] = grouped[day];
      }
    });

    return sortedGrouped;
  }, [weeklyLectureSessions, dayNames]);

  // Fetch sessions from API
  const fetchSessions = useCallback(
    async (showRefreshToast = false) => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        if (showRefreshToast) {
          setIsRefreshing(true);
        }

        let response;

        if (isAdmin) {
          // Admins can see all sessions
          response = await getAllSessionsAdmin(token);
        } else if (isLecturer) {
          // Lecturers: use getLecturerSessions as primary source (subtopic-based)
          response = await getLecturerSessions(token);
        } else if (isRep) {
          // Reps see sessions they created
          response = await getCreatorSessions(token);
        } else {
          // Students: fetch all sessions, then filter to their level
          response = await getAllSessionsAdmin(token);
        }

        if (response.success && response.data) {
          // Handle different response structures
          let sessionsData = Array.isArray(response.data)
            ? response.data
            : "data" in response.data
              ? response.data.data
              : "sessions" in response.data
                ? response.data.sessions
                : [];

          // For students (non-rep): filter to sessions matching their level modules
          if (isStudent && studentLevel) {
            const levelModuleIds = allModules
              .filter((m) => m.level === studentLevel)
              .map((m) => m.id);
            const levelSubtopicIds = allModules
              .filter((m) => m.level === studentLevel)
              .flatMap((m) => (m.subtopics || []).map((st) => st.id));

            sessionsData = (sessionsData as Session[]).filter((s) => {
              // Match by module level
              if (s.moduleId && levelModuleIds.includes(s.moduleId))
                return true;
              if (s.module?.level === studentLevel) return true;
              // Match by subtopic belonging to a level module
              if (s.subtopicId && levelSubtopicIds.includes(s.subtopicId))
                return true;
              return false;
            });
          }

          const mappedSessions = (sessionsData as Session[]).map(
            createSessionMapper(allUsers, allModules),
          );
          setSessions(mappedSessions);

          if (showRefreshToast) {
            toast.success("Sessions refreshed");
          }

          // For lecturers, also populate lecturerActiveSessions (OPEN only) from the same data
          if (isLecturer) {
            const allLecSessions = sessionsData as Session[];
            const activeLecSessions = allLecSessions.filter(
              (s) => s.status === SessionStatus.OPEN,
            );
            setLecturerActiveSessions(activeLecSessions);
          }
        } else {
          console.error("Failed to fetch sessions:", response.error);
          if (!showRefreshToast) {
            toast.error("Failed to load sessions");
          }
        }
      } catch (error) {
        console.error("Error fetching sessions:", error);
        toast.error("Failed to load sessions");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [
      token,
      isAdmin,
      isLecturer,
      isRep,
      isStudent,
      studentLevel,
      allUsers,
      allModules,
    ],
  );

  // Fetch sessions on mount and when dependencies change
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Filter sessions based on active tab
  const filteredSessions = sessions.filter((session) => {
    if (activeTab === "all") return true;
    return session.status === activeTab;
  });

  const handleStartSession = useCallback(
    async (session: AttendanceSession) => {
      if (!token) {
        toast.error("You must be logged in to start a session");
        return;
      }

      // Extract slot ID from the session ID (e.g., "timetable-slotId" -> "slotId")
      const slotId = session.id.replace("timetable-", "");

      // Find the timetable slot to get subtopicId, lecturerId, moduleId
      let timetableSlot: TimetableSlot | undefined;
      let moduleForSlot: Module | undefined;
      for (const tt of allTimetables) {
        const slot = tt.slots.find((s) => s.id === slotId);
        if (slot) {
          timetableSlot = slot;
          moduleForSlot = allModules.find((m) => m.id === tt.moduleId);
          break;
        }
      }

      if (!timetableSlot || !moduleForSlot) {
        toast.error("Could not find timetable slot data");
        return;
      }

      // Resolve lecturer ID — slot may have lecturerId directly, or via subtopic
      // Note: subtopic.lecturerId and slot.lecturerId are User IDs,
      // but the backend Session.lecturerId expects the Lecturer record ID.
      const subtopic = moduleForSlot.subtopics.find(
        (s) => s.id === timetableSlot!.subtopicId,
      );
      const lecturerUserId = timetableSlot.lecturerId || subtopic?.lecturerId;

      if (!lecturerUserId) {
        toast.error(
          "No lecturer assigned to this slot. Please assign a lecturer first.",
        );
        return;
      }

      // Resolve the Lecturer record ID from the User ID
      const lecturerUser = allUsers.find((u) => u.id === lecturerUserId);
      const lecturerId = lecturerUser?.lecturer?.id;

      if (!lecturerId) {
        toast.error(
          "Could not find lecturer record. The assigned user may not have a lecturer profile.",
        );
        return;
      }

      // Get geolocation
      setIsCreatingSession(true);
      setStartingSession(session);

      let latitude: number | undefined;
      let longitude: number | undefined;

      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
        });
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch {
        // Geolocation failed — proceed without it (backend will allow if lat/long not required)
        toast.warning(
          "Could not get your location. Session will be created without geofencing.",
        );
      }

      try {
        const response = await createSession(
          {
            name:
              subtopic?.name ||
              `${moduleForSlot.name} - ${timetableSlot.activityType || "Lecture"}`,
            type: SessionType.CLASS,
            mode: SessionMode.CHECK_IN,
            moduleId: moduleForSlot.id,
            lecturerId,
            subtopicId: timetableSlot.subtopicId || undefined,
            timetableSlotId: timetableSlot.id,
            location: timetableSlot.venue || undefined,
            startTime: session.startTime.toISOString(),
            endTime: session.endTime.toISOString(),
            latitude,
            longitude,
            geofenceRadius: 10,
            week: selectedWeek,
          },
          token,
        );

        if (response.success && response.data?.data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const created = response.data.data as any;

          // Store created session info for SMS modal
          setCreatedSessionData({
            attendanceLink: created.attendanceLink,
            smsSentToLecturer: created.smsSentToLecturer,
            studentsSmsCount: created.studentsSmsCount,
            sessionId: created.id,
          });

          // Save to localStorage to mark as active
          const storedActiveSessions = localStorage.getItem(
            "active_lecture_sessions",
          );
          const activeSessions = storedActiveSessions
            ? JSON.parse(storedActiveSessions)
            : [];

          if (!activeSessions.includes(slotId)) {
            activeSessions.push(slotId);
            localStorage.setItem(
              "active_lecture_sessions",
              JSON.stringify(activeSessions),
            );
          }

          // Dispatch event to notify other components
          window.dispatchEvent(new Event("session-started"));

          // Show SMS modal with result info
          setSmsModalOpen(true);

          toast.success("Session created successfully!");

          // Refresh sessions list to show the new server session
          fetchSessions();
        } else {
          toast.error(response.error || "Failed to create session");
          setStartingSession(null);
        }
      } catch (error: unknown) {
        console.error("Error creating session:", error);
        const errMsg =
          error instanceof Error ? error.message : "Failed to create session";
        toast.error(errMsg);
        setStartingSession(null);
      } finally {
        setIsCreatingSession(false);
      }
    },
    [token, allTimetables, allModules, allUsers, selectedWeek, fetchSessions],
  );

  // Rep reminder: alert when a slot time is due so they can start attendance.
  useEffect(() => {
    if (!isRep || mainTab !== "sessions" || weeklyLectureSessions.length === 0) {
      return;
    }

    const storedActiveSessions = localStorage.getItem("active_lecture_sessions");
    let activeSlotIds: string[] = [];
    try {
      activeSlotIds = storedActiveSessions ? JSON.parse(storedActiveSessions) : [];
    } catch {
      activeSlotIds = [];
    }

    weeklyLectureSessions.forEach((session) => {
      if (session.status !== "active") return;

      const slotId = session.id.replace("timetable-", "");
      if (activeSlotIds.includes(slotId)) return;

      const reminderKey = `${session.id}-${session.startTime.getTime()}`;
      if (remindedSessionKeysRef.current.has(reminderKey)) return;

      remindedSessionKeysRef.current.add(reminderKey);
      playReminderSound();

      toast.warning("Session time is up", {
        description: `${session.name} is due now. Start the session to begin attendance.`,
        duration: 10000,
        action: {
          label: "Start now",
          onClick: () => {
            void handleStartSession(session);
          },
        },
      });
    });
  }, [isRep, mainTab, weeklyLectureSessions, playReminderSound, handleStartSession]);

  // Handle sending SMS link
  const handleSendSms = () => {
    if (!startingSession) return;

    const link =
      createdSessionData?.attendanceLink ||
      `${window.location.origin}/attend/unknown`;

    navigator.clipboard.writeText(link).catch(() => {});

    toast.success(
      createdSessionData?.smsSentToLecturer
        ? "SMS was already sent to the lecturer automatically"
        : "Attendance link copied to clipboard",
      {
        description: createdSessionData?.smsSentToLecturer
          ? "Link also copied to clipboard"
          : "You can share this link manually",
      },
    );

    setSmsModalOpen(false);
    setStartingSession(null);
    setCreatedSessionData(null);
  };

  const handleEndSession = async (session: AttendanceSession) => {
    if (!token) {
      toast.error("You must be logged in to end a session");
      return;
    }

    setEndingSessionId(session.id);
    try {
      const response = await closeSession(session.id, token);

      if (response.success) {
        toast.success("Session ended successfully. Generating report...");
        // Update local state to reflect the closed session
        setSessions((prev) =>
          prev.map((s) =>
            s.id === session.id ? { ...s, status: "completed" as const } : s,
          ),
        );
        // Show the report modal
        setSelectedSession({ ...session, status: "completed" });
        setReportModalOpen(true);
        // Refresh sessions to get updated data
        fetchSessions();
      } else {
        toast.error(response.error || "Failed to end session");
      }
    } catch (error) {
      console.error("Error ending session:", error);
      toast.error("Failed to end session");
    } finally {
      setEndingSessionId(null);
    }
  };

  const handleViewReport = (session: AttendanceSession) => {
    setSelectedSession(session);
    setReportModalOpen(true);
  };

  const handleCheckout = (session: AttendanceSession) => {
    toast.success("Session checked out successfully");
    // The SessionCard handles localStorage sync internally
  };

  const handleDeleteSession = async (session: AttendanceSession) => {
    if (!token) {
      toast.error("You must be logged in to delete a session");
      return;
    }

    setDeletingSessionId(session.id);
    try {
      const response = await deleteSession(session.id, token);

      if (response.success) {
        toast.success("Session deleted successfully");
        // Remove from local state
        setSessions((prev) => prev.filter((s) => s.id !== session.id));
      } else {
        toast.error(response.error || "Failed to delete session");
      }
    } catch (error) {
      console.error("Error deleting session:", error);
      toast.error("Failed to delete session");
    } finally {
      setDeletingSessionId(null);
    }
  };

  const handleToggleMode = async (session: AttendanceSession) => {
    if (!token) {
      toast.error("You must be logged in to toggle session mode");
      return;
    }

    setTogglingSessionId(session.id);
    try {
      const response = await toggleSessionMode(session.id, token);

      if (response.success) {
        toast.success("Session mode switched to Check-Out");
        // Update local state to reflect the mode change
        setSessions((prev) =>
          prev.map((s) =>
            s.id === session.id
              ? { ...s, attendanceType: "checkout" as const }
              : s,
          ),
        );
        // Refresh sessions to get updated data
        fetchSessions();
      } else {
        toast.error(response.error || "Failed to toggle session mode");
      }
    } catch (error) {
      console.error("Error toggling session mode:", error);
      toast.error("Failed to toggle session mode");
    } finally {
      setTogglingSessionId(null);
    }
  };

  const handleRefresh = () => {
    fetchSessions(true);
  };

  const handleGenerateQrCode = async (session: AttendanceSession) => {
    if (!token) {
      toast.error("You must be logged in to generate QR code");
      return;
    }

    setGeneratingQrCode(session.id);
    try {
      const response = await generateSessionQrCode(session.id, token);

      if (response.success && response.data?.data) {
        // Add data URL prefix if not already present
        const imageData = response.data.data.startsWith("data:")
          ? response.data.data
          : `data:image/png;base64,${response.data.data}`;
        setQrCodeData(imageData);
        setQrCodeSessionName(session.name);
        setQrCodeModalOpen(true);
        toast.success("QR Code generated successfully");
      } else {
        toast.error(response.error || "Failed to generate QR code");
      }
    } catch (error) {
      console.error("Error generating QR code:", error);
      toast.error("Failed to generate QR code");
    } finally {
      setGeneratingQrCode(null);
    }
  };

  const handleDownloadQrCode = () => {
    if (!qrCodeData) return;

    const link = document.createElement("a");
    link.href = qrCodeData;
    link.download = `qrcode-${qrCodeSessionName.replace(/\s+/g, "-").toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("QR Code downloaded");
  };

  // Count sessions by status
  const activeSessions = sessions.filter((s) => s.status === "active").length;
  const completedSessions = sessions.filter(
    (s) => s.status === "completed",
  ).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Attendance Sessions
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin
              ? "View completed sessions and download reports"
              : isRep
                ? "Start and manage today's attendance sessions"
                : isLecturer
                  ? "View sessions for your assigned subtopics and mark attendance"
                  : "View your weekly lectures and attendance sessions"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {mainTab === "sessions" && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh sessions"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </Button>
          )}
        </div>
      </div>

      {/* Main Tabs: Sessions vs Activities */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
        <TabsList className="bg-card border border-border w-full sm:w-auto">
          <TabsTrigger
            value="sessions"
            className="gap-1.5 text-xs sm:text-sm sm:gap-2"
          >
            <LayoutList className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger
            value="activities"
            className="gap-1.5 text-xs sm:text-sm sm:gap-2"
          >
            <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Activities
          </TabsTrigger>
          {canViewLecturerAttendance && (
            <TabsTrigger
              value="lecturer-attendance"
              className="gap-1.5 text-xs sm:text-sm sm:gap-2"
            >
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Lecturer</span> Att.
            </TabsTrigger>
          )}
          {canViewMyAttendanceSheet && (
            <TabsTrigger
              value="my-attendance"
              className="gap-1.5 text-xs sm:text-sm sm:gap-2"
            >
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">My</span> Attendance
            </TabsTrigger>
          )}
          {canViewMasterAttendanceSheet && (
            <TabsTrigger
              value="student-attendance"
              className="gap-1.5 text-xs sm:text-sm sm:gap-2"
            >
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Student</span> Att.
            </TabsTrigger>
          )}
        </TabsList>

        {/* Sessions Tab Content */}
        <TabsContent value="sessions" className="mt-6">
          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">
                Loading sessions...
              </span>
            </div>
          ) : isRep ? (
            /* ─── REP VIEW: Today's sessions from timetable ─── */
            <div className="space-y-6">
              {/* Week Selector */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground mr-1">
                  Week:
                </span>
                {Array.from(
                  {
                    length: Math.max(
                      ...allModules.map((m) =>
                        m.subtopics.reduce((sum, s) => sum + (s.weeks || 1), 0),
                      ),
                      1,
                    ),
                  },
                  (_, i) => i + 1,
                ).map((week) => (
                  <button
                    key={week}
                    onClick={() => setSelectedWeek(week)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedWeek === week
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {week}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">
                  Week {selectedWeek} &mdash; Today&apos;s Sessions
                </h2>
                <span className="text-sm text-muted-foreground">
                  ({weeklyLectureSessions.length} session
                  {weeklyLectureSessions.length !== 1 ? "s" : ""})
                </span>
              </div>

              {weeklyLectureSessions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {weeklyLectureSessions.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      user={user}
                      onStart={handleStartSession}
                      onCheckout={handleCheckout}
                      onViewReport={handleViewReport}
                      isStarting={
                        isCreatingSession && startingSession?.id === session.id
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-card rounded-xl border border-border">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">
                    No sessions scheduled for today.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add subtopics with timetable slots in the Activities tab.
                  </p>
                </div>
              )}

              {/* Also show any API sessions the rep created */}
              {sessions.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-lg font-semibold text-foreground">
                      Your Started Sessions
                    </h2>
                    <span className="text-sm text-muted-foreground">
                      ({sessions.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sessions.map((session) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        onStart={handleStartSession}
                        onEnd={handleEndSession}
                        onViewReport={handleViewReport}
                        onDelete={handleDeleteSession}
                        onToggleMode={handleToggleMode}
                        onGenerateQrCode={handleGenerateQrCode}
                        onCheckout={handleCheckout}
                        user={user}
                        isStarting={
                          isCreatingSession &&
                          startingSession?.id === session.id
                        }
                        isEnding={endingSessionId === session.id}
                        isTogglingMode={togglingSessionId === session.id}
                        isDeleting={deletingSessionId === session.id}
                        isGeneratingQrCode={generatingQrCode === session.id}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : isAdmin ? (
            /* ─── ADMIN VIEW: Only completed/ended sessions for reports ─── */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <h2 className="text-lg font-semibold text-foreground">
                    Ended Sessions
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    ({sessions.filter((s) => s.status === "completed").length}{" "}
                    session
                    {sessions.filter((s) => s.status === "completed").length !==
                    1
                      ? "s"
                      : ""}
                    )
                  </span>
                </div>
              </div>

              {sessions.filter((s) => s.status === "completed").length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sessions
                    .filter((s) => s.status === "completed")
                    .map((session) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        onViewReport={handleViewReport}
                        onDelete={handleDeleteSession}
                        user={user}
                        isDeleting={deletingSessionId === session.id}
                      />
                    ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-card rounded-xl border border-border">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">
                    No completed sessions found.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sessions will appear here once they have been ended by their
                    creators.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* ─── DEFAULT VIEW: Lecturers / Students ─── */
            <div className="space-y-6">
              {/* ─── Lecturer: Active Sessions to Mark Attendance ─── */}
              {isLecturer && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Radio className="w-5 h-5 text-success animate-pulse" />
                    <h2 className="text-lg font-semibold text-foreground">
                      Active Sessions — Mark Your Attendance
                    </h2>
                  </div>

                  {isLoadingLecturerSessions ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <span className="ml-2 text-sm text-muted-foreground">
                        Checking for active sessions…
                      </span>
                    </div>
                  ) : lecturerActiveSessions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {lecturerActiveSessions.map((session) => {
                        const now = new Date();
                        const start = new Date(session.startTime);
                        const end = new Date(session.endTime);
                        const isLive = now >= start && now <= end;
                        return (
                          <div
                            key={session.id}
                            className="relative p-5 rounded-xl border border-primary/50 bg-card shadow-glow animate-fade-in"
                          >
                            {/* Live badge */}
                            {isLive && (
                              <span className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full bg-success/20 text-success">
                                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                                Live
                              </span>
                            )}

                            <h3 className="text-lg font-semibold text-foreground mb-1 pr-16">
                              {session.name}
                            </h3>

                            {session.module && (
                              <p className="text-sm text-muted-foreground mb-3">
                                {session.module.name} ({session.module.code})
                              </p>
                            )}

                            <div className="space-y-1.5 text-sm text-muted-foreground mb-4">
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4" />
                                <span>
                                  {session.subtopic?.name ||
                                    session.type.charAt(0) +
                                      session.type.slice(1).toLowerCase()}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CalendarDays className="w-4 h-4" />
                                <span>
                                  {start.toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}{" "}
                                  –{" "}
                                  {end.toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              {session.location && (
                                <div className="flex items-center gap-2">
                                  <ExternalLink className="w-4 h-4" />
                                  <span>{session.location}</span>
                                </div>
                              )}
                              {session.week && (
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4" />
                                  <span>Week {session.week}</span>
                                </div>
                              )}
                            </div>

                            {/* Attendance link / mark attendance button */}
                            <div className="flex flex-col gap-2">
                              <Button
                                variant="gradient"
                                className="w-full"
                                onClick={() => navigate(`/kiosk/${session.id}`)}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Mark Attendance (Face Scan)
                              </Button>

                              {session.attendanceLink && (
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 min-w-0 bg-muted/50 rounded-lg px-3 py-2">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Link className="w-3 h-3 flex-shrink-0" />
                                      <span className="truncate">
                                        {session.attendanceLink}
                                      </span>
                                    </div>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      navigator.clipboard
                                        .writeText(session.attendanceLink || "")
                                        .then(() =>
                                          toast.success(
                                            "Attendance link copied",
                                          ),
                                        );
                                    }}
                                  >
                                    Copy
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-card rounded-xl border border-border">
                      <CheckCircle className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
                      <p className="text-muted-foreground text-sm">
                        No active sessions requiring your attendance right now.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Sessions started by your course rep will appear here
                        automatically.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <TabsList className="bg-card border border-border">
                    <TabsTrigger value="all">
                      All Sessions ({sessions.length})
                    </TabsTrigger>
                    <TabsTrigger value="active">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
                        Active ({activeSessions})
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="completed">
                      Completed ({completedSessions})
                    </TabsTrigger>
                  </TabsList>
                  <div className="text-sm text-muted-foreground">
                    {filteredSessions.length} session
                    {filteredSessions.length !== 1 ? "s" : ""} shown
                  </div>
                </div>

                <TabsContent value={activeTab} className="mt-6">
                  {/* Weekly Lectures from Timetable - Grouped by Day */}
                  {weeklyLectureSessions.length > 0 && (
                    <div className="mb-8">
                      <div className="flex items-center gap-2 mb-4">
                        <BookOpen className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold text-foreground">
                          This Week&apos;s Lectures
                        </h2>
                        <span className="text-sm text-muted-foreground">
                          (
                          {
                            weeklyLectureSessions.filter((s) => {
                              if (activeTab === "all") return true;
                              return s.status === activeTab;
                            }).length
                          }{" "}
                          lectures remaining)
                        </span>
                      </div>

                      {/* Group lectures by day */}
                      {Object.entries(lecturesByDay).map(
                        ([dayName, daySessions]) => {
                          const filteredDaySessions = daySessions.filter(
                            (s) => {
                              if (activeTab === "all") return true;
                              return s.status === activeTab;
                            },
                          );

                          if (filteredDaySessions.length === 0) return null;

                          const isToday =
                            dayNames[new Date().getDay()] === dayName;

                          return (
                            <div key={dayName} className="mb-6">
                              <div className="flex items-center gap-2 mb-3">
                                <h3
                                  className={`text-md font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}
                                >
                                  {dayName}
                                  {isToday && (
                                    <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                                      Today
                                    </span>
                                  )}
                                </h3>
                                <span className="text-xs text-muted-foreground">
                                  ({filteredDaySessions.length} lecture
                                  {filteredDaySessions.length !== 1 ? "s" : ""})
                                </span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredDaySessions.map((session) => (
                                  <SessionCard
                                    key={session.id}
                                    session={session}
                                    user={user}
                                    onStart={handleStartSession}
                                    onCheckout={handleCheckout}
                                    onViewReport={handleViewReport}
                                    isStarting={
                                      isCreatingSession &&
                                      startingSession?.id === session.id
                                    }
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  )}

                  {/* API Sessions (if any) */}
                  {filteredSessions.length > 0 && (
                    <>
                      {weeklyLectureSessions.length > 0 && (
                        <div className="flex items-center gap-2 mb-4">
                          <h2 className="text-lg font-semibold text-foreground">
                            Attendance Sessions
                          </h2>
                          <span className="text-sm text-muted-foreground">
                            ({filteredSessions.length})
                          </span>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredSessions.map((session) => (
                          <SessionCard
                            key={session.id}
                            session={session}
                            onStart={handleStartSession}
                            onEnd={handleEndSession}
                            onViewReport={handleViewReport}
                            onDelete={handleDeleteSession}
                            onToggleMode={handleToggleMode}
                            onGenerateQrCode={handleGenerateQrCode}
                            onCheckout={handleCheckout}
                            user={user}
                            isStarting={
                              isCreatingSession &&
                              startingSession?.id === session.id
                            }
                            isEnding={endingSessionId === session.id}
                            isTogglingMode={togglingSessionId === session.id}
                            isDeleting={deletingSessionId === session.id}
                            isGeneratingQrCode={generatingQrCode === session.id}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {filteredSessions.length === 0 &&
                    weeklyLectureSessions.length === 0 && (
                      <div className="text-center py-12 bg-card rounded-xl border border-border">
                        <p className="text-muted-foreground">
                          {activeTab === "all"
                            ? "No lectures scheduled this week. Add activities in the Activities tab."
                            : `No ${activeTab} sessions found.`}
                        </p>
                      </div>
                    )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </TabsContent>

        {/* Activities / Timetable Tab Content */}
        <TabsContent value="activities" className="mt-6">
          <TimetableTab />
        </TabsContent>

        {/* Lecturer Attendance Tab Content */}
        {canViewLecturerAttendance && (
          <TabsContent value="lecturer-attendance" className="mt-6">
            <LecturerAttendanceTab />
          </TabsContent>
        )}

        {/* My Attendance Sheet Tab Content (Student/Rep personal view) */}
        {canViewMyAttendanceSheet && (
          <TabsContent value="my-attendance" className="mt-6">
            <MyAttendanceSheet />
          </TabsContent>
        )}

        {/* Student Attendance Sheet Tab Content (Master view for Rep/Lecturer) */}
        {canViewMasterAttendanceSheet && (
          <TabsContent value="student-attendance" className="mt-6">
            <MasterAttendanceSheet />
          </TabsContent>
        )}
      </Tabs>

      {/* Session Report Modal */}
      <SessionReportModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        session={selectedSession}
      />

      {/* QR Code Modal */}
      <Dialog open={qrCodeModalOpen} onOpenChange={setQrCodeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Session QR Code
            </DialogTitle>
            <DialogDescription>
              Scan this QR code to open the kiosk for &quot;{qrCodeSessionName}
              &quot;
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrCodeData && (
              <div className="bg-white p-4 rounded-lg shadow-inner">
                <img
                  src={qrCodeData}
                  alt="Session QR Code"
                  className="w-64 h-64 object-contain"
                />
              </div>
            )}
            <p className="text-sm text-muted-foreground text-center">
              Students can scan this code to mark their attendance
            </p>
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setQrCodeModalOpen(false)}
              >
                <X className="w-4 h-4 mr-2" />
                Close
              </Button>
              <Button
                variant="gradient"
                className="flex-1"
                onClick={handleDownloadQrCode}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* SMS Link Modal for Session Start */}
      <Dialog
        open={smsModalOpen}
        onOpenChange={(open) => {
          setSmsModalOpen(open);
          if (!open) {
            setStartingSession(null);
            setCreatedSessionData(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Session Created
            </DialogTitle>
            <DialogDescription>
              The session has been created on the server and attendance tracking
              is now active.
            </DialogDescription>
          </DialogHeader>

          {startingSession && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg text-sm">
                <p>
                  <strong>Session:</strong> {startingSession.name}
                </p>
                <p>
                  <strong>Course:</strong> {startingSession.courseName}
                </p>
                <p>
                  <strong>Time:</strong>{" "}
                  {startingSession.startTime.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  -{" "}
                  {startingSession.endTime.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p>
                  <strong>Week:</strong> {selectedWeek}
                </p>
              </div>

              {/* SMS Status */}
              {createdSessionData && (
                <div className="space-y-2">
                  <div
                    className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
                      createdSessionData.smsSentToLecturer
                        ? "bg-success/10 text-success"
                        : "bg-warning/10 text-warning"
                    }`}
                  >
                    {createdSessionData.smsSentToLecturer ? (
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span>
                      {createdSessionData.smsSentToLecturer
                        ? "SMS with attendance link sent to lecturer automatically"
                        : "SMS could not be sent — lecturer may not have a phone number registered"}
                    </span>
                  </div>

                  {(createdSessionData.studentsSmsCount ?? 0) > 0 && (
                    <div className="p-3 rounded-lg bg-success/10 text-success flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      <span>
                        SMS sent to {createdSessionData.studentsSmsCount}{" "}
                        enrolled students
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Attendance Link */}
              {createdSessionData?.attendanceLink && (
                <div className="p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    Attendance link:
                  </p>
                  <code className="text-xs bg-muted px-2 py-1 rounded break-all">
                    {createdSessionData.attendanceLink}
                  </code>
                </div>
              )}

              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                  The lecturer can use the attendance link to verify their
                  presence through face recognition. Students within the
                  geofence radius can mark attendance via the same link.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setSmsModalOpen(false);
                setStartingSession(null);
                setCreatedSessionData(null);
              }}
            >
              Close
            </Button>
            <Button variant="gradient" onClick={handleSendSms}>
              <Send className="w-4 h-4 mr-2" />
              Copy Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Sessions;

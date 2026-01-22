import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export type UserRole =
  | "super_admin"
  | "admin"
  | "staff"
  | "lecturer"
  | "course_rep"
  | "student";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  mustChangePassword?: boolean;
  isCourseRep?: boolean;
  studentId?: string;
  staffId?: string;
  program?: string;
  semester?: string;
  department?: string;
  courseRepData?: {
    courseId: string;
    courseName: string;
    department: string;
  }[];
  coursesTaught?: string[];
  coursesTaken?: string | string[];
}

export interface Course {
  id: string;
  name: string;
  department: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => void;
  changePassword: (
    oldPassword: string,
    newPassword: string,
  ) => Promise<{ success: boolean; error?: string }>;
}

export const getAllUsers = (): User[] => {
  const users = getStoredUsers();
  return users.map(({ password, ...user }) => user);
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users database - in production, this would be in a real database
const MOCK_USERS: (User & { password: string })[] = [
  {
    id: "1",
    email: "admin@facetrack.com",
    name: "Super Admin",
    role: "super_admin",
    password: "admin123",
    mustChangePassword: false,
  },
  // Mock admin staff user (created by IT/super_admin)
  {
    id: "admin_staff_1",
    email: "adminstaff@facetrack.com",
    name: "Admin Staff",
    role: "admin",
    password: "adminstaff123",
    mustChangePassword: true, // Force password change on first login
  },
  // Mock student user
  {
    id: "student_1",
    email: "student@gmail.com",
    name: "Emmanuel Yawson",
    role: "student",
    password: "student123",
    mustChangePassword: false,
    studentId: "123456",
    program: "cs",
    semester: "1",
  },
  // Mock staff user
  {
    id: "staff_1",
    email: "staff@gmail.com",
    name: "Dr Amenyaw Menu",
    role: "staff",
    password: "staff123",
    mustChangePassword: false,
    staffId: "STF001",
    department: "cs",
  },
];

// Mock data for student registration form
export const MOCK_PROGRAMS = [
  { label: "Computer Science", value: "cs" },
  { label: "Information Technology", value: "it" },
  { label: "Software Engineering", value: "se" },
];

export const MOCK_COURSES: Course[] = [
  { id: "ds", name: "Data Structures", department: "cs" },
  { id: "alg", name: "Algorithms", department: "cs" },
  { id: "db", name: "Database Systems", department: "cs" },
  { id: "web", name: "Web Development", department: "cs" },
  { id: "ai", name: "Artificial Intelligence", department: "cs" },
  { id: "os", name: "Operating Systems", department: "cs" },
  { id: "calc1", name: "Calculus I", department: "math" },
  { id: "lin_alg", name: "Linear Algebra", department: "math" },
  { id: "phy1", name: "Physics I", department: "phy" },
  { id: "circuits", name: "Circuit Theory", department: "ee" },
  { id: "thermo", name: "Thermodynamics", department: "me" },
  { id: "mgt101", name: "Management 101", department: "ba" },
];

// Mock data for staff registration form
export const MOCK_DEPARTMENTS = [
  { label: "Computer Science", value: "cs" },
  { label: "Electrical Engineering", value: "ee" },
  { label: "Mechanical Engineering", value: "me" },
  { label: "Business Administration", value: "ba" },
  { label: "Mathematics", value: "math" },
  { label: "Physics", value: "phy" },
];

// Mock student database for auto-fill
export const MOCK_STUDENT_DB: Record<
  string,
  { name: string; email: string; program?: string; semester?: string }
> = {
  "123456": {
    name: "Emmanuel Yawson",
    email: "student@gmail.com",
    program: "cs",
    semester: "1",
  },
};

// Role filter options for UI components
export const ROLE_FILTER_OPTIONS = [
  { label: "All Roles", value: "all" },
  { label: "Students", value: "student" },
  { label: "Staff", value: "staff" },
  { label: "Admin", value: "admin" },
  { label: "Lecturers", value: "lecturer" },
  { label: "Course Reps", value: "course_rep" },
];

// Roles available for adding new members
export const MEMBER_ROLES = [
  { label: "Student", value: "student" },
  { label: "Staff", value: "staff" },
  { label: "Lecturer", value: "lecturer" },
  { label: "Admin", value: "admin" },
] as const;

// Mock staff database for auto-fill
export const MOCK_STAFF_DB: Record<
  string,
  { name: string; email: string; department?: string }
> = {
  STF001: {
    name: "Dr Amenyaw Menu",
    email: "staff@gmail.com",
    department: "cs",
  },
};

// Mock session data for payroll
export const MOCK_SESSIONS = [
  {
    id: "ses1",
    staffId: "staff_1",
    staffName: "Dr Amenyaw Menu",
    department: "cs",
    courseId: "ds",
    courseName: "Data Structures",
    date: "2026-01-15",
    clockIn: "08:00",
    clockOut: "10:00",
    hoursWorked: 2,
    hourlyRate: 50,
    earnings: 100,
    paymentStatus: "pending" as const,
  },
  {
    id: "ses2",
    staffId: "staff_1",
    staffName: "Dr Amenyaw Menu",
    department: "cs",
    courseId: "alg",
    courseName: "Algorithms",
    date: "2026-01-16",
    clockIn: "14:00",
    clockOut: "18:30",
    hoursWorked: 4.5,
    hourlyRate: 50,
    earnings: 225,
    paymentStatus: "pending" as const,
  },
  {
    id: "ses3",
    staffId: "staff_1",
    staffName: "Dr Amenyaw Menu",
    department: "cs",
    courseId: "ds",
    courseName: "Data Structures",
    date: "2026-01-10",
    clockIn: "09:00",
    clockOut: "11:00",
    hoursWorked: 2,
    hourlyRate: 50,
    earnings: 100,
    paymentStatus: "paid" as const,
  },
];

// Helper to get users from localStorage (for persistence of added staff)
const getStoredUsers = (): (User & { password: string })[] => {
  const stored = localStorage.getItem("facetrack_users");
  if (stored) {
    return JSON.parse(stored);
  }
  localStorage.setItem("facetrack_users", JSON.stringify(MOCK_USERS));
  return MOCK_USERS;
};

const saveUsers = (users: (User & { password: string })[]) => {
  localStorage.setItem("facetrack_users", JSON.stringify(users));
};

export const addStaffUser = (
  email: string,
  name: string,
  tempPassword: string,
  department: string,
  coursesTaught: string[],
): { success: boolean; error?: string } => {
  const users = getStoredUsers();
  if (users.find((u) => u.email === email)) {
    return { success: false, error: "User with this email already exists" };
  }

  const newUser: User & { password: string } = {
    id: crypto.randomUUID(),
    email,
    name,
    role: "staff",
    password: tempPassword,
    mustChangePassword: true,
    department,
    coursesTaught,
  };

  users.push(newUser);
  saveUsers(users);
  return { success: true };
};

export const getStaffUsers = (): User[] => {
  const users = getStoredUsers();
  return users
    .filter((u) => u.role === "staff")
    .map(({ password, ...user }) => user);
};

export const deleteStaffUser = (userId: string): boolean => {
  const users = getStoredUsers();
  const userToDelete = users.find((u) => u.id === userId);
  
  const filtered = users.filter(
    (u) => u.id !== userId || u.role === "super_admin",
  );
  if (filtered.length !== users.length) {
    saveUsers(filtered);
    
    // Also remove from mock DB if exists
    if (userToDelete?.staffId && MOCK_STAFF_DB[userToDelete.staffId]) {
      delete MOCK_STAFF_DB[userToDelete.staffId];
    }
    
    return true;
  }
  return false;
};

// Course Rep management

export const assignCourseRep = (
  studentId: string,
  courseId: string,
): { success: boolean; error?: string } => {
  const users = getStoredUsers();
  const studentIndex = users.findIndex((u) => u.id === studentId);

  if (studentIndex === -1) {
    return { success: false, error: "Student not found" };
  }

  const course = MOCK_COURSES.find((c) => c.id === courseId);
  if (!course) {
    return { success: false, error: "Course not found" };
  }

  // Check if someone else is already rep for this course?
  // For now we allow multiple, or maybe we should restrict?
  // Let's restrict: Check if course already has a rep
  // Check if someone else is already rep for this course
  const existingRep = users.find((u) => u.courseRepData?.some((c) => c.courseId === courseId));
  if (existingRep && existingRep.id !== studentId) {
    return {
      success: false,
      error: `Course already has a Course Rep: ${existingRep.name}`,
    };
  }

  const user = users[studentIndex];
  
  const currentData = user.courseRepData || [];
  // Add if not already present
  if (!currentData.some(c => c.courseId === course.id)) {
      currentData.push({
          courseId: course.id,
          courseName: course.name,
          department: course.department,
      });
  }

  // Update user role and data
  users[studentIndex] = {
    ...user,
    role: "course_rep",
    isCourseRep: true,
    courseRepData: currentData,
  };

  saveUsers(users);
  return { success: true };
};

export const removeCourseRep = (userId: string): boolean => {
  const users = getStoredUsers();
  const userIndex = users.findIndex((u) => u.id === userId);

  if (userIndex === -1) return false;

  const user = users[userIndex];

  // Demote back to student
  users[userIndex] = {
    ...user,
    role: "student",
    isCourseRep: false,
    courseRepData: undefined,
  };

  saveUsers(users);
  return true;
};

export const updateUser = (
  userId: string,
  updates: Partial<User & { coursesTaught?: string[]; coursesTaken?: string[] | string }>,
): { success: boolean; error?: string } => {
  const users = getStoredUsers();
  const userIndex = users.findIndex((u) => u.id === userId);

  if (userIndex === -1) return { success: false, error: "User not found" };

  const existing = users[userIndex];
  const nextRole = updates.role ?? existing.role;

  // Apply updates while keeping password and other fields intact.
  let updatedUser: User & { password: string } = {
    ...existing,
    ...updates,
  };

  // If demoting from course rep, clear associated flags and metadata.
  if (existing.role === "course_rep" && nextRole !== "course_rep") {
    updatedUser = {
      ...updatedUser,
      role: nextRole,
      isCourseRep: false,
      courseRepData: undefined,
    };
  }

  users[userIndex] = updatedUser;
  saveUsers(users);
  return { success: true };
};

// Deprecated or Helpers
export const getCourseRepUsers = (): User[] => {
  const users = getStoredUsers();
  return users
    .filter((u) => u.role === "course_rep")
    .map(({ password, ...user }) => user);
};

// Student management functions
export const getStudentByStudentId = (
  studentId: string,
): {
  name: string;
  email: string;
  program?: string;
  semester?: string;
} | null => {
  return MOCK_STUDENT_DB[studentId] || null;
};

export const addStudentUser = (
  studentId: string,
  email: string,
  name: string,
  program: string,
  semester: string,
  coursesTaken: string[] = [],
  password: string = "student123",
): { success: boolean; error?: string } => {
  const users = getStoredUsers();
  if (users.find((u) => u.email === email || u.studentId === studentId)) {
    return {
      success: false,
      error: "Student with this email or ID already exists",
    };
  }

  const newUser: User & { password: string } = {
    id: crypto.randomUUID(),
    email,
    name,
    role: "student",
    password,
    mustChangePassword: false,
    studentId,
    program,
    semester,
    coursesTaken,
  };

  users.push(newUser);
  saveUsers(users);

  // Also add to mock student DB for auto-fill
  MOCK_STUDENT_DB[studentId] = { name, email, program, semester };

  return { success: true };
};

// Staff management functions
export const getStaffByStaffId = (
  staffId: string,
): { name: string; email: string; department?: string } | null => {
  return MOCK_STAFF_DB[staffId] || null;
};

export const addStaffUserComplete = (
  staffId: string,
  email: string,
  name: string,
  department: string,
  coursesTaught: string[] = [],
  password: string = "staff123",
): { success: boolean; error?: string } => {
  const users = getStoredUsers();
  if (users.find((u) => u.email === email || u.staffId === staffId)) {
    return {
      success: false,
      error: "Staff with this email or ID already exists",
    };
  }

  const newUser: User & { password: string } = {
    id: crypto.randomUUID(),
    email,
    name,
    role: "staff",
    password,
    mustChangePassword: false,
    staffId,
    department,
    coursesTaught,
  };

  users.push(newUser);
  saveUsers(users);

  // Also add to mock staff DB for auto-fill
  MOCK_STAFF_DB[staffId] = { name, email, department };

  return { success: true };
};

// Admin Staff management
export const addAdminStaffUser = (
  email: string,
  name: string,
  tempPassword: string,
): { success: boolean; error?: string } => {
  const users = getStoredUsers();
  if (users.find((u) => u.email === email)) {
    return { success: false, error: "User with this email already exists" };
  }

  const newUser: User & { password: string } = {
    id: crypto.randomUUID(),
    email,
    name,
    role: "admin",
    password: tempPassword,
    mustChangePassword: true,
  };

  users.push(newUser);
  saveUsers(users);
  return { success: true };
};

export const deleteAdminStaffUser = (userId: string): boolean => {
  const users = getStoredUsers();
  const filtered = users.filter((u) => u.id !== userId || u.role !== "admin");
  if (filtered.length !== users.length) {
    saveUsers(filtered);
    return true;
  }
  return false;
};

// Lecturer management functions (similar to Staff)
export const addLecturerUserComplete = (
  staffId: string,
  email: string,
  name: string,
  department: string,
  coursesTaught: string[] = [],
  password: string = "lecturer123",
): { success: boolean; error?: string } => {
  const users = getStoredUsers();
  if (users.find((u) => u.email === email || u.staffId === staffId)) {
    return {
      success: false,
      error: "Lecturer with this email or ID already exists",
    };
  }

  const newUser: User & { password: string } = {
    id: crypto.randomUUID(),
    email,
    name,
    role: "lecturer",
    password,
    mustChangePassword: false,
    staffId,
    department,
    coursesTaught,
  };

  users.push(newUser);
  saveUsers(users);

  // Also add to mock staff DB for auto-fill
  MOCK_STAFF_DB[staffId] = { name, email, department };

  return { success: true };
};

export const deleteStudentUser = (userId: string): boolean => {
  const users = getStoredUsers();
  const userToDelete = users.find((u) => u.id === userId);

  // Allow deleting students, course reps, and legacy class reps
  const filtered = users.filter(
    (u) =>
      u.id !== userId ||
      (u.role !== "student" &&
        u.role !== "course_rep"),
  );
  if (filtered.length !== users.length) {
    saveUsers(filtered);

    // Also remove from mock DB if exists
    if (userToDelete?.studentId && MOCK_STUDENT_DB[userToDelete.studentId]) {
      delete MOCK_STUDENT_DB[userToDelete.studentId];
    }

    return true;
  }
  return false;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Sync MOCK_USERS to localStorage to ensure new dev users appear
    const storedUsersStr = localStorage.getItem("facetrack_users");
    let currentUsers: (User & { password: string })[] = storedUsersStr
      ? JSON.parse(storedUsersStr)
      : [];

    let hasChanges = false;
    if (!storedUsersStr) {
      currentUsers = [...MOCK_USERS];
      hasChanges = true;
    } else {
      MOCK_USERS.forEach((mockUser) => {
        const existingIndex = currentUsers.findIndex(
          (u) => u.id === mockUser.id,
        );
        if (existingIndex === -1) {
          currentUsers.push(mockUser);
          hasChanges = true;
        } else {
          // Determine if critical fields changed (like password or role)
          const existing = currentUsers[existingIndex];
          if (
            existing.password !== mockUser.password ||
            existing.role !== mockUser.role ||
            existing.name !== mockUser.name
          ) {
            currentUsers[existingIndex] = { ...existing, ...mockUser };
            hasChanges = true;
          }
        }
      });
    }

    if (hasChanges) {
      localStorage.setItem("facetrack_users", JSON.stringify(currentUsers));
    }

    // Check for existing session
    const storedSession = localStorage.getItem("facetrack_session");
    if (storedSession) {
      const sessionUser = JSON.parse(storedSession);
      // Verify user still exists
      const users = currentUsers; // Use the potentially updated list
      const existingUser = users.find((u) => u.id === sessionUser.id);
      if (existingUser) {
        const { password, ...userWithoutPassword } = existingUser;
        setUser(userWithoutPassword);
      } else {
        localStorage.removeItem("facetrack_session");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string; user?: User }> => {
    const users = getStoredUsers();
    const foundUser = users.find(
      (u) => u.email === email && u.password === password,
    );

    if (!foundUser) {
      return { success: false, error: "Invalid email or password" };
    }

    const { password: _, ...userWithoutPassword } = foundUser;
    setUser(userWithoutPassword);
    localStorage.setItem(
      "facetrack_session",
      JSON.stringify(userWithoutPassword),
    );

    return { success: true, user: userWithoutPassword };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("facetrack_session");
  };

  const changePassword = async (
    oldPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "Not logged in" };

    const users = getStoredUsers();
    const userIndex = users.findIndex((u) => u.id === user.id);

    if (userIndex === -1) return { success: false, error: "User not found" };
    if (users[userIndex].password !== oldPassword)
      return { success: false, error: "Current password is incorrect" };

    users[userIndex].password = newPassword;
    users[userIndex].mustChangePassword = false;
    saveUsers(users);

    const { password: _, ...updatedUser } = users[userIndex];
    setUser(updatedUser);
    localStorage.setItem("facetrack_session", JSON.stringify(updatedUser));

    return { success: true };
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, logout, changePassword }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

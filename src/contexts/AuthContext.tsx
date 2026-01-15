import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'super_admin' | 'admin_staff' | 'staff' | 'class_rep' | 'student';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  mustChangePassword?: boolean;
  isClassRep?: boolean;
  studentId?: string;
  staffId?: string;
  program?: string;
  semester?: string;
  department?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users database - in production, this would be in a real database
const MOCK_USERS: (User & { password: string })[] = [
  {
    id: '1',
    email: 'admin@facetrack.com',
    name: 'Super Admin',
    role: 'super_admin',
    password: 'admin123',
    mustChangePassword: false,
  },
  // Mock admin staff user (created by IT/super_admin)
  {
    id: 'admin_staff_1',
    email: 'adminstaff@facetrack.com',
    name: 'Admin Staff',
    role: 'admin_staff',
    password: 'adminstaff123',
    mustChangePassword: true, // Force password change on first login
  },
  // Mock student user
  {
    id: 'student_1',
    email: 'student@gmail.com',
    name: 'Emmanuel Yawson',
    role: 'student',
    password: 'student123',
    mustChangePassword: false,
    studentId: '123456',
    program: 'cs',
    semester: '1',
  },
  // Mock staff user
  {
    id: 'staff_1',
    email: 'staff@gmail.com',
    name: 'Dr Amenyaw Menu',
    role: 'staff',
    password: 'staff123',
    mustChangePassword: false,
    staffId: 'STF001',
    department: 'cs',
  },
];

// Mock data for student registration form
export const MOCK_PROGRAMS = [
  { label: 'Computer Science', value: 'cs' },
  { label: 'Information Technology', value: 'it' },
  { label: 'Software Engineering', value: 'se' },
];

export const MOCK_COURSES = [
  { label: 'Data Structures', value: 'ds' },
  { label: 'Algorithms', value: 'alg' },
  { label: 'Database Systems', value: 'db' },
  { label: 'Web Development', value: 'web' },
  { label: 'Artificial Intelligence', value: 'ai' },
  { label: 'Operating Systems', value: 'os' },
  { label: 'Calculus I', value: 'calc1' },
  { label: 'Linear Algebra', value: 'lin_alg' },
];

// Mock data for staff registration form
export const MOCK_DEPARTMENTS = [
  { label: 'Computer Science', value: 'cs' },
  { label: 'Electrical Engineering', value: 'ee' },
  { label: 'Mechanical Engineering', value: 'me' },
  { label: 'Business Administration', value: 'ba' },
  { label: 'Mathematics', value: 'math' },
  { label: 'Physics', value: 'phy' },
];

// Mock student database for auto-fill
export const MOCK_STUDENT_DB: Record<string, { name: string; email: string; program?: string; semester?: string }> = {
  '123456': { 
    name: 'Emmanuel Yawson', 
    email: 'student@gmail.com',
    program: 'cs',
    semester: '1'
  },
};

// Mock staff database for auto-fill
export const MOCK_STAFF_DB: Record<string, { name: string; email: string; department?: string }> = {
  'STF001': { 
    name: 'Dr Amenyaw Menu', 
    email: 'staff@gmail.com',
    department: 'cs'
  },
};

// Helper to get users from localStorage (for persistence of added staff)
const getStoredUsers = (): (User & { password: string })[] => {
  const stored = localStorage.getItem('facetrack_users');
  if (stored) {
    return JSON.parse(stored);
  }
  localStorage.setItem('facetrack_users', JSON.stringify(MOCK_USERS));
  return MOCK_USERS;
};

const saveUsers = (users: (User & { password: string })[]) => {
  localStorage.setItem('facetrack_users', JSON.stringify(users));
};

export const addStaffUser = (email: string, name: string, tempPassword: string): { success: boolean; error?: string } => {
  const users = getStoredUsers();
  if (users.find(u => u.email === email)) {
    return { success: false, error: 'User with this email already exists' };
  }
  
  const newUser: User & { password: string } = {
    id: crypto.randomUUID(),
    email,
    name,
    role: 'staff',
    password: tempPassword,
    mustChangePassword: true,
  };
  
  users.push(newUser);
  saveUsers(users);
  return { success: true };
};

export const getStaffUsers = (): User[] => {
  const users = getStoredUsers();
  return users.filter(u => u.role === 'staff').map(({ password, ...user }) => user);
};

export const deleteStaffUser = (userId: string): boolean => {
  const users = getStoredUsers();
  const filtered = users.filter(u => u.id !== userId || u.role === 'super_admin');
  if (filtered.length !== users.length) {
    saveUsers(filtered);
    return true;
  }
  return false;
};

// Class Rep management
export const addClassRepUser = (email: string, name: string, tempPassword: string): { success: boolean; error?: string } => {
  const users = getStoredUsers();
  if (users.find(u => u.email === email)) {
    return { success: false, error: 'User with this email already exists' };
  }
  
  const newUser: User & { password: string } = {
    id: crypto.randomUUID(),
    email,
    name,
    role: 'class_rep',
    password: tempPassword,
    mustChangePassword: true,
    isClassRep: true,
  };
  
  users.push(newUser);
  saveUsers(users);
  return { success: true };
};

export const getClassRepUsers = (): User[] => {
  const users = getStoredUsers();
  return users.filter(u => u.role === 'class_rep').map(({ password, ...user }) => user);
};

export const deleteClassRepUser = (userId: string): boolean => {
  const users = getStoredUsers();
  const filtered = users.filter(u => u.id !== userId || u.role !== 'class_rep');
  if (filtered.length !== users.length) {
    saveUsers(filtered);
    return true;
  }
  return false;
};

// Student management functions
export const getStudentByStudentId = (studentId: string): { name: string; email: string; program?: string; semester?: string } | null => {
  return MOCK_STUDENT_DB[studentId] || null;
};

export const addStudentUser = (
  studentId: string, 
  email: string, 
  name: string, 
  program: string, 
  semester: string,
  password: string = 'student123'
): { success: boolean; error?: string } => {
  const users = getStoredUsers();
  if (users.find(u => u.email === email || u.studentId === studentId)) {
    return { success: false, error: 'Student with this email or ID already exists' };
  }
  
  const newUser: User & { password: string } = {
    id: crypto.randomUUID(),
    email,
    name,
    role: 'student',
    password,
    mustChangePassword: false,
    studentId,
    program,
    semester,
  };
  
  users.push(newUser);
  saveUsers(users);
  
  // Also add to mock student DB for auto-fill
  MOCK_STUDENT_DB[studentId] = { name, email, program, semester };
  
  return { success: true };
};

// Staff management functions
export const getStaffByStaffId = (staffId: string): { name: string; email: string; department?: string } | null => {
  return MOCK_STAFF_DB[staffId] || null;
};

export const addStaffUserComplete = (
  staffId: string, 
  email: string, 
  name: string, 
  department: string,
  password: string = 'staff123'
): { success: boolean; error?: string } => {
  const users = getStoredUsers();
  if (users.find(u => u.email === email || u.staffId === staffId)) {
    return { success: false, error: 'Staff with this email or ID already exists' };
  }
  
  const newUser: User & { password: string } = {
    id: crypto.randomUUID(),
    email,
    name,
    role: 'staff',
    password,
    mustChangePassword: false,
    staffId,
    department,
  };
  
  users.push(newUser);
  saveUsers(users);
  
  // Also add to mock staff DB for auto-fill
  MOCK_STAFF_DB[staffId] = { name, email, department };
  
  return { success: true };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Sync MOCK_USERS to localStorage to ensure new dev users appear
    const storedUsersStr = localStorage.getItem('facetrack_users');
    let currentUsers: (User & { password: string })[] = storedUsersStr ? JSON.parse(storedUsersStr) : [];
    
    let hasChanges = false;
    if (!storedUsersStr) {
        currentUsers = [...MOCK_USERS];
        hasChanges = true;
    } else {
         MOCK_USERS.forEach(mockUser => {
            const existingIndex = currentUsers.findIndex((u) => u.id === mockUser.id);
            if (existingIndex === -1) {
                currentUsers.push(mockUser);
                hasChanges = true;
            } else {
                // Determine if critical fields changed (like password or role)
                const existing = currentUsers[existingIndex];
                if (existing.password !== mockUser.password || existing.role !== mockUser.role || existing.name !== mockUser.name) {
                     currentUsers[existingIndex] = { ...existing, ...mockUser };
                     hasChanges = true;
                }
            }
         });
    }

    if (hasChanges) {
        localStorage.setItem('facetrack_users', JSON.stringify(currentUsers));
    }

    // Check for existing session
    const storedSession = localStorage.getItem('facetrack_session');
    if (storedSession) {
      const sessionUser = JSON.parse(storedSession);
      // Verify user still exists
      const users = currentUsers; // Use the potentially updated list
      const existingUser = users.find(u => u.id === sessionUser.id);
      if (existingUser) {
        const { password, ...userWithoutPassword } = existingUser;
        setUser(userWithoutPassword);
      } else {
        localStorage.removeItem('facetrack_session');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const users = getStoredUsers();
    const foundUser = users.find(u => u.email === email && u.password === password);
    
    if (!foundUser) {
      return { success: false, error: 'Invalid email or password' };
    }
    
    const { password: _, ...userWithoutPassword } = foundUser;
    setUser(userWithoutPassword);
    localStorage.setItem('facetrack_session', JSON.stringify(userWithoutPassword));
    
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('facetrack_session');
  };

  const changePassword = async (oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not logged in' };
    
    const users = getStoredUsers();
    const userIndex = users.findIndex(u => u.id === user.id);
    
    if (userIndex === -1) return { success: false, error: 'User not found' };
    if (users[userIndex].password !== oldPassword) return { success: false, error: 'Current password is incorrect' };
    
    users[userIndex].password = newPassword;
    users[userIndex].mustChangePassword = false;
    saveUsers(users);
    
    const { password: _, ...updatedUser } = users[userIndex];
    setUser(updatedUser);
    localStorage.setItem('facetrack_session', JSON.stringify(updatedUser));
    
    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
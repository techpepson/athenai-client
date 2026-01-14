import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'super_admin' | 'staff' | 'class_rep';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  mustChangePassword?: boolean;
  isClassRep?: boolean;
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
];

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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedSession = localStorage.getItem('facetrack_session');
    if (storedSession) {
      const sessionUser = JSON.parse(storedSession);
      // Verify user still exists
      const users = getStoredUsers();
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

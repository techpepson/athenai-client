import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { authServices } from "@/services/auth.services";
import { usersServices } from "@/services/users.services";
import { Role } from "@/enums/enums";
import { IUserPublic } from "@/interface/user.interface";
import { LoginPayload } from "@/interface/auth.interface";

// Re-export Role enum for convenience
export { Role };

// User type for the context (based on IUserPublic)
export type User = IUserPublic;

// Auth context type
interface AuthContextType {
  user: User | null;
  token: string | null;
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
  updateUser: (
    updates: Partial<User>,
  ) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage keys
const TOKEN_KEY = "accessToken";

// Helper to get role-based route prefix
export const getRolePrefix = (role: Role): string => {
  switch (role) {
    case Role.OWNER:
      return "owner";
    case Role.SYSTEM_ADMIN:
      return "system_admin";
    case Role.ADMIN:
      return "admin";
    case Role.LECTURER:
      return "lecturer";
    case Role.REP:
      return "rep";
    case Role.STAFF:
      return "staff";
    case Role.STUDENT:
    default:
      return "student";
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem(TOKEN_KEY);

        if (storedToken) {
          setToken(storedToken);

          // Fetch user from API using stored token
          const response = await usersServices.getUserByEmail(storedToken);
          if (response.success && response.data?.user) {
            const userData = response.data.user as User;
            setUser(userData);
          } else {
            // Token invalid, clear auth
            localStorage.removeItem(TOKEN_KEY);
            setToken(null);
            setUser(null);
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string; user?: User }> => {
    try {
      const payload: LoginPayload = { email, password };
      const response = await authServices.login(payload);

      if (response.success && response.data) {
        // Server returns { token, role, isActive, accountStatus, isPasswordChanged }
        const { token: accessToken } = response.data as unknown as {
          token: string;
          role: string;
          isActive: boolean;
          accountStatus: string;
          isPasswordChanged: boolean;
        };

        // Store token
        localStorage.setItem(TOKEN_KEY, accessToken);
        setToken(accessToken);

        // Fetch full user profile using the token
        const userResponse = await usersServices.getUserById(accessToken);

        if (userResponse.success && userResponse.data) {
          const userData = userResponse.data.user || userResponse.data;
          setUser(userData as User);
          return { success: true, user: userData as User };
        }

        // If user fetch fails, still return success but without user data
        // The app should handle fetching user on next page load
        return { success: true };
      }

      return {
        success: false,
        error: response.error || "Login failed",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Login failed",
      };
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const changePassword = async (
    oldPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!token) {
      return { success: false, error: "Not logged in" };
    }

    try {
      const response = await authServices.changePassword(
        { oldPassword, newPassword },
        token,
      );

      if (response.success) {
        return { success: true };
      }

      return {
        success: false,
        error: response.error || "Password change failed",
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Password change failed",
      };
    }
  };

  const updateUser = async (
    updates: Partial<User>,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!token || !user) {
      return { success: false, error: "Not logged in" };
    }

    try {
      const response = await usersServices.updateUserDetails({
        fullName: updates.name,
        phone: updates.phone,
        email: updates.email,
      });

      if (response.success) {
        // Update local state
        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
        return { success: true };
      }

      return {
        success: false,
        error: response.error || "Update failed",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Update failed",
      };
    }
  };

  const refreshUser = async (): Promise<void> => {
    if (!token) return;

    try {
      const response = await usersServices.getUserByEmail(token);
      if (response.success && response.data?.user) {
        const userData = response.data.user as User;
        setUser(userData);
      }
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        changePassword,
        updateUser,
        refreshUser,
      }}
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

// Helper function to get token (for use outside of React components)
export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

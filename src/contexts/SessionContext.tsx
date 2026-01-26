import { createContext, useContext, useState, ReactNode } from "react";
import { AttendanceSession } from "@/types/attendance";
import { mockSessions } from "@/data/mockData";

interface SessionContextType {
  sessions: AttendanceSession[];
  addSession: (session: AttendanceSession) => void;
  updateSession: (
    sessionId: string,
    updates: Partial<AttendanceSession>,
  ) => void;
  deleteSession: (sessionId: string) => void;
  getSessionById: (sessionId: string) => AttendanceSession | undefined;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  // Initialize with mock data - will be replaced with API call later
  const [sessions, setSessions] = useState<AttendanceSession[]>(mockSessions);

  const addSession = (session: AttendanceSession) => {
    setSessions((prev) => [session, ...prev]);
  };

  const updateSession = (
    sessionId: string,
    updates: Partial<AttendanceSession>,
  ) => {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId ? { ...session, ...updates } : session,
      ),
    );
  };

  const deleteSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((session) => session.id !== sessionId));
  };

  const getSessionById = (sessionId: string) => {
    return sessions.find((session) => session.id === sessionId);
  };

  return (
    <SessionContext.Provider
      value={{
        sessions,
        addSession,
        updateSession,
        deleteSession,
        getSessionById,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
};

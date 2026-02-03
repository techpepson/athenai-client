import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/enums/enums";
import ProfileSetting from "./ProfileSetting";
import SystemSetting from "./SystemSetting";

const Settings = () => {
  const { user } = useAuth();

  if (!user) return null;

  // Admin and System Admin see system settings (which now includes profile tab)
  if (
    user.role === Role.SYSTEM_ADMIN ||
    user.role === Role.ADMIN ||
    user.role === Role.OWNER
  ) {
    return <SystemSetting />;
  }

  // Other roles see profile settings only
  return <ProfileSetting />;
};

export default Settings;

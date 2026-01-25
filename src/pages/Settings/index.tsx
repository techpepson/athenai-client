import { useAuth } from "@/contexts/AuthContext";
import ProfileSetting from "./ProfileSetting";
import SystemSetting from "./SystemSetting";

const Settings = () => {
  const { user } = useAuth();

  if (!user) return null;

  if (user.role === "super_admin" || user.role === "admin") {
    return <SystemSetting />;
  }

  return <ProfileSetting />;
};

export default Settings;

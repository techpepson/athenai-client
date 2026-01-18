import { LucideIcon } from "lucide-react";

interface PayrollStatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  variant?: "default" | "primary" | "success" | "warning";
}

export const PayrollStatsCard = ({
  label,
  value,
  icon: Icon,
  variant = "default",
}: PayrollStatsCardProps) => {
  const variants = {
    default: "bg-cyan-500/10 text-cyan-500",
    primary: "bg-blue-500/10 text-blue-500",
    success: "bg-emerald-500/10 text-emerald-500",
    warning: "bg-amber-500/10 text-amber-500",
  };

  return (
    <div className="bg-gradient-to-br from-card to-card/50 p-6 rounded-xl border border-border">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <h3 className="text-3xl font-bold text-foreground mt-1">{value}</h3>
        </div>
        <div
          className={`w-12 h-12 rounded-lg flex items-center justify-center ${variants[variant]}`}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

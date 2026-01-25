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
    <div className="bg-gradient-to-br from-card to-card/50 p-4 lg:p-5 xl:p-6 rounded-xl border border-border">
      <div className="flex items-start justify-between gap-2 mb-3 lg:mb-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs lg:text-sm text-muted-foreground truncate">
            {label}
          </p>
          <h3 className="text-xl lg:text-2xl xl:text-3xl font-bold text-foreground mt-1 truncate">
            {value}
          </h3>
        </div>
        <div
          className={`w-10 h-10 lg:w-11 lg:h-11 xl:w-12 xl:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${variants[variant]}`}
        >
          <Icon className="w-5 h-5 lg:w-5.5 lg:h-5.5 xl:w-6 xl:h-6" />
        </div>
      </div>
    </div>
  );
};

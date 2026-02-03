import { Search, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEPARTMENTS } from "@/constants/appConstants";

interface StaffFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedStaff: string;
  onStaffChange: (staffId: string) => void;
  selectedDepartment: string;
  onDepartmentChange: (dept: string) => void;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  staffList: { id: string; name: string }[];
}

export const StaffFilters = ({
  searchQuery,
  onSearchChange,
  selectedStaff,
  onStaffChange,
  selectedDepartment,
  onDepartmentChange,
  selectedMonth,
  onMonthChange,
  staffList,
}: StaffFiltersProps) => (
  <div className="flex items-center gap-4 bg-card p-4 rounded-xl border border-border flex-wrap">
    <div className="relative flex-1 min-w-[200px]">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        placeholder="Search by name, ID, or course..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-10"
      />
    </div>

    <Select value={selectedStaff} onValueChange={onStaffChange}>
      <SelectTrigger className="w-52">
        <SelectValue placeholder="All Staff" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Staff</SelectItem>
        {staffList.map((staff) => (
          <SelectItem key={staff.id} value={staff.id}>
            {staff.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    <Select value={selectedDepartment} onValueChange={onDepartmentChange}>
      <SelectTrigger className="w-52">
        <SelectValue placeholder="All Departments" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Departments</SelectItem>
        {DEPARTMENTS.map((dept) => (
          <SelectItem key={dept.value} value={dept.value}>
            {dept.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    <Select value={selectedMonth} onValueChange={onMonthChange}>
      <SelectTrigger className="w-40">
        <Calendar className="w-4 h-4 mr-2" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="2026-01">January 2026</SelectItem>
        <SelectItem value="2025-12">December 2025</SelectItem>
        <SelectItem value="2025-11">November 2025</SelectItem>
      </SelectContent>
    </Select>
  </div>
);

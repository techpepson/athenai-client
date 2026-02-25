import { useState, useEffect } from "react";
import {
  Users,
  Clock,
  DollarSign,
  Loader2,
  GraduationCap,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { PayrollStatsCard } from "@/components/staff/PayrollStatsCard";
import {
  getLecturerEarnings,
  LecturerEarning,
} from "@/services/payroll.service";
import { usersServices } from "@/services/users.services";
import { IUserPublic } from "@/interface/user.interface";
import { Role } from "@/enums/enums";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Combined lecturer data with earnings
interface LecturerWithEarnings {
  id: string;
  name: string;
  email: string;
  staffNo: string | null;
  hourlyRate: number;
  creditHours: number;
  totalHours: number;
  earnings: number;
  isActive: boolean;
}

const StaffManagement = () => {
  const { token } = useAuth();
  const [lecturers, setLecturers] = useState<LecturerWithEarnings[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRate, setEditingRate] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    const loadLecturerData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch all users and filter for lecturers
        const usersResponse = await usersServices.getAllUsers();

        // Fetch earnings data
        const earningsResponse = await getLecturerEarnings(token);

        // Create a map of earnings by lecturer email for quick lookup
        const earningsMap = new Map<string, LecturerEarning>();
        if (earningsResponse.success && earningsResponse.data?.result) {
          earningsResponse.data.result.forEach((earning) => {
            earningsMap.set(earning.email, earning);
          });
        }

        if (usersResponse.success && usersResponse.data?.users) {
          // Filter for lecturers only
          const lecturerUsers = usersResponse.data.users.filter(
            (user: IUserPublic) => user.role === Role.LECTURER,
          );

          // Combine user data with earnings data
          const combinedData: LecturerWithEarnings[] = lecturerUsers.map(
            (user: IUserPublic) => {
              const earning = earningsMap.get(user.email);
              return {
                id: user.id,
                name: user.name,
                email: user.email,
                staffNo: user.lecturer?.staffNo || null,
                hourlyRate:
                  earning?.hourlyRate || user.lecturer?.hourlyRate || 0,
                creditHours: user.lecturer?.creditHours || 0,
                totalHours: earning?.totalHours || 0,
                earnings: earning?.earnings || 0,
                isActive: user.isActive,
              };
            },
          );

          setLecturers(combinedData);
        } else {
          setLecturers([]);
        }
      } catch (error) {
        console.error("Failed to load lecturer data:", error);
        toast({
          title: "Error",
          description: "Failed to load lecturer data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadLecturerData();
  }, [token, toast]);

  // Filter lecturers based on search
  const filteredLecturers = lecturers.filter((lecturer) => {
    const matchesSearch =
      lecturer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lecturer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lecturer.staffNo &&
        lecturer.staffNo.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSearch;
  });

  // Calculate statistics
  const stats = {
    totalLecturers: lecturers.length,
    totalHours: lecturers.reduce((sum, l) => sum + l.totalHours, 0),
    totalEarnings: lecturers.reduce((sum, l) => sum + l.earnings, 0),
  };

  // Handle inline hourly rate edit
  const handleRateClick = (id: string, currentRate: number) => {
    setEditingId(id);
    setEditingRate(currentRate.toFixed(2));
  };

  const handleRateSave = (id: string) => {
    const newRate = parseFloat(editingRate);
    if (isNaN(newRate) || newRate < 0) {
      toast({
        title: "Invalid Rate",
        description: "Please enter a valid hourly rate",
        variant: "destructive",
      });
      return;
    }

    // Update the lecturer's hourly rate and recalculate earnings
    setLecturers((prev) =>
      prev.map((lec) => {
        if (lec.id === id) {
          const newEarnings = lec.totalHours * newRate;
          return { ...lec, hourlyRate: newRate, earnings: newEarnings };
        }
        return lec;
      }),
    );

    setEditingId(null);
    setEditingRate("");
    toast({
      title: "Rate Updated",
      description: "Hourly rate and earnings updated successfully",
    });
  };

  const handleRateKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter") {
      handleRateSave(id);
    } else if (e.key === "Escape") {
      setEditingId(null);
      setEditingRate("");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">
          Loading lecturer earnings...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Staff Management</h1>
        <p className="text-muted-foreground mt-1">
          Track lecturer hours and earnings
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or staff number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <PayrollStatsCard
          label="Total Lecturers"
          value={stats.totalLecturers}
          icon={Users}
        />
        <PayrollStatsCard
          label="Total Teaching Hours"
          value={`${stats.totalHours.toFixed(1)}h`}
          icon={Clock}
          variant="primary"
        />
        <PayrollStatsCard
          label="Total Earnings"
          value={`$${stats.totalEarnings.toFixed(2)}`}
          icon={DollarSign}
          variant="success"
        />
      </div>

      {/* Lecturers Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Lecturer Earnings
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Staff No</TableHead>
                <TableHead className="text-right">Hourly Rate</TableHead>
                <TableHead className="text-right">Total Hours Worked</TableHead>
                <TableHead className="text-right">Total Earnings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLecturers.map((lecturer) => (
                <TableRow key={lecturer.id}>
                  <TableCell className="font-medium">{lecturer.name}</TableCell>
                  <TableCell>{lecturer.staffNo || "-"}</TableCell>
                  <TableCell className="text-right">
                    {editingId === lecturer.id ? (
                      <Input
                        type="number"
                        value={editingRate}
                        onChange={(e) => setEditingRate(e.target.value)}
                        onBlur={() => handleRateSave(lecturer.id)}
                        onKeyDown={(e) => handleRateKeyDown(e, lecturer.id)}
                        className="w-24 ml-auto text-right"
                        autoFocus
                        step="0.01"
                        min="0"
                      />
                    ) : (
                      <button
                        onClick={() =>
                          handleRateClick(lecturer.id, lecturer.hourlyRate)
                        }
                        className="hover:bg-muted px-2 py-1 rounded cursor-pointer transition-colors"
                        title="Click to edit"
                      >
                        ${lecturer.hourlyRate.toFixed(2)}
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {lecturer.totalHours.toFixed(1)}h
                  </TableCell>
                  <TableCell className="text-right font-semibold text-green-600">
                    ${lecturer.earnings.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredLecturers.length === 0 && (
          <div className="p-12 text-center">
            <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No lecturers found
            </h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? "No lecturers match your search criteria."
                : "No lecturers have been added to the system yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffManagement;

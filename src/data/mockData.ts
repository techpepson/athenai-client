// import { Member, DashboardStats, AttendanceAlert } from "@/types/attendance";
// import { Role } from "@/enums/enums";

// export const mockMembers: Member[] = [
//   {
//     id: "1",
//     name: "Emma Johnson",
//     email: "emma.j@school.edu",
//     role: Role.STUDENT,
//     department: "Computer Science",
//     studentId: "CS2024001",
//     photoUrl:
//       "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
//     isMinor: true,
//     parentContact: {
//       name: "Sarah Johnson",
//       email: "sarah.j@email.com",
//       phone: "+1 555-0101",
//     },
//     createdAt: new Date("2024-01-15"),
//     status: "active",
//   },
//   {
//     id: "2",
//     name: "Marcus Chen",
//     email: "marcus.c@school.edu",
//     role: Role.STUDENT,
//     department: "Engineering",
//     studentId: "EN2024002",
//     photoUrl:
//       "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
//     isMinor: false,
//     createdAt: new Date("2024-01-16"),
//     status: "active",
//   },
//   {
//     id: "3",
//     name: "Dr. Sarah Williams",
//     email: "sarah.w@school.edu",
//     role: Role.STAFF,
//     department: "Computer Science",
//     photoUrl:
//       "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
//     isMinor: false,
//     createdAt: new Date("2023-09-01"),
//     status: "active",
//   },
//   {
//     id: "4",
//     name: "James Rodriguez",
//     email: "james.r@school.edu",
//     role: Role.STUDENT,
//     department: "Business",
//     studentId: "BU2024003",
//     photoUrl:
//       "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
//     isMinor: true,
//     parentContact: {
//       name: "Maria Rodriguez",
//       email: "maria.r@email.com",
//       phone: "+1 555-0102",
//     },
//     createdAt: new Date("2024-01-17"),
//     status: "active",
//   },
//   {
//     id: "5",
//     name: "Aisha Patel",
//     email: "aisha.p@school.edu",
//     role: Role.STUDENT,
//     department: "Medicine",
//     studentId: "MD2024004",
//     photoUrl:
//       "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
//     isMinor: false,
//     createdAt: new Date("2024-01-18"),
//     status: "active",
//   },
//   {
//     id: "6",
//     name: "Prof. Michael Brown",
//     email: "michael.b@school.edu",
//     role: Role.STAFF,
//     department: "Engineering",
//     photoUrl:
//       "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
//     isMinor: false,
//     createdAt: new Date("2023-08-15"),
//     status: "active",
//   },
// ];

// export const mockStats: DashboardStats = {
//   totalMembers: 1247,
//   activeSessions: 8,
//   todayAttendance: 892,
//   attendanceRate: 94.2,
//   lateArrivals: 23,
//   absentees: 47,
// };

// export const mockAlerts: AttendanceAlert[] = [
//   {
//     id: "1",
//     type: "late",
//     memberId: "2",
//     memberName: "Marcus Chen",
//     message: "Arrived 15 minutes late to Introduction to Programming",
//     timestamp: new Date(Date.now() - 30 * 60 * 1000),
//     severity: "low",
//     read: false,
//   },
//   {
//     id: "2",
//     type: "pattern",
//     memberId: "4",
//     memberName: "James Rodriguez",
//     message: "Has been late 4 times this week",
//     timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
//     severity: "medium",
//     read: false,
//   },
//   {
//     id: "3",
//     type: "checkin",
//     memberId: "1",
//     memberName: "Emma Johnson",
//     message: "Checked in to Introduction to Programming",
//     timestamp: new Date(Date.now() - 45 * 60 * 1000),
//     severity: "low",
//     read: true,
//   },
//   {
//     id: "4",
//     type: "absent",
//     memberId: "6",
//     memberName: "Prof. Michael Brown",
//     message: "Absent from scheduled Lab Session",
//     timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
//     severity: "high",
//     read: false,
//   },
// ];

// export const attendanceChartData = [
//   { day: "Mon", present: 892, late: 45, absent: 63 },
//   { day: "Tue", present: 918, late: 38, absent: 44 },
//   { day: "Wed", present: 875, late: 52, absent: 73 },
//   { day: "Thu", present: 901, late: 41, absent: 58 },
//   { day: "Fri", present: 845, late: 67, absent: 88 },
//   { day: "Sat", present: 234, late: 12, absent: 15 },
//   { day: "Sun", present: 0, late: 0, absent: 0 },
// ];

// export const departmentData = [
//   { name: "Computer Science", value: 320, color: "hsl(173, 80%, 50%)" },
//   { name: "Engineering", value: 280, color: "hsl(199, 89%, 48%)" },
//   { name: "Business", value: 245, color: "hsl(142, 76%, 46%)" },
//   { name: "Medicine", value: 210, color: "hsl(38, 92%, 50%)" },
//   { name: "Arts", value: 192, color: "hsl(280, 65%, 60%)" },
// ];

// export const hourlyData = [
//   { hour: "7AM", count: 45 },
//   { hour: "8AM", count: 234 },
//   { hour: "9AM", count: 312 },
//   { hour: "10AM", count: 189 },
//   { hour: "11AM", count: 156 },
//   { hour: "12PM", count: 98 },
//   { hour: "1PM", count: 145 },
//   { hour: "2PM", count: 201 },
//   { hour: "3PM", count: 178 },
//   { hour: "4PM", count: 134 },
//   { hour: "5PM", count: 89 },
// ];

// export const mockEarlyArrivals = [
//   {
//     id: "1",
//     memberId: "1",
//     memberName: "Emma Johnson",
//     photoUrl:
//       "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
//     department: "Computer Science",
//     checkInTime: new Date(Date.now() - 75 * 60 * 1000),
//     scheduledTime: new Date(Date.now() - 45 * 60 * 1000),
//     minutesEarly: 30,
//   },
//   {
//     id: "2",
//     memberId: "5",
//     memberName: "Aisha Patel",
//     photoUrl:
//       "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
//     department: "Medicine",
//     checkInTime: new Date(Date.now() - 55 * 60 * 1000),
//     scheduledTime: new Date(Date.now() - 30 * 60 * 1000),
//     minutesEarly: 25,
//   },
//   {
//     id: "3",
//     memberId: "3",
//     memberName: "Dr. Sarah Williams",
//     photoUrl:
//       "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
//     department: "Computer Science",
//     checkInTime: new Date(Date.now() - 50 * 60 * 1000),
//     scheduledTime: new Date(Date.now() - 30 * 60 * 1000),
//     minutesEarly: 20,
//   },
//   {
//     id: "4",
//     memberId: "4",
//     memberName: "James Rodriguez",
//     photoUrl:
//       "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
//     department: "Business",
//     checkInTime: new Date(Date.now() - 45 * 60 * 1000),
//     scheduledTime: new Date(Date.now() - 30 * 60 * 1000),
//     minutesEarly: 15,
//   },
//   {
//     id: "5",
//     memberId: "6",
//     memberName: "Prof. Michael Brown",
//     photoUrl:
//       "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
//     department: "Engineering",
//     checkInTime: new Date(Date.now() - 40 * 60 * 1000),
//     scheduledTime: new Date(Date.now() - 30 * 60 * 1000),
//     minutesEarly: 10,
//   },
//   {
//     id: "6",
//     memberId: "2",
//     memberName: "Marcus Chen",
//     photoUrl:
//       "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
//     department: "Engineering",
//     checkInTime: new Date(Date.now() - 35 * 60 * 1000),
//     scheduledTime: new Date(Date.now() - 30 * 60 * 1000),
//     minutesEarly: 5,
//   },
// ];

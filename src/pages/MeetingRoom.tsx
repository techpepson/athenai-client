import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/enums/enums";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  Users,
  CheckSquare,
  Volume2,
  Loader2,
  Video,
  ShieldCheck,
  UserCheck,
  ClipboardList,
  Maximize2,
  Minimize2,
  X,
  Radio,
} from "lucide-react";
import {
  joinMeeting,
  sendMeetingSignal,
  getMeetingSignals,
  leaveMeeting,
  getMeetingPeers,
  getSessionById,
  Session,
} from "@/services/sessions.service";
import { markBulkManualAttendance } from "@/services/attendance.services";
import { coursesService } from "@/services/courses.services";
import { usersServices } from "@/services/users.services";

interface PeerConnection {
  peerId: string;
  name: string;
  role: string;
  pc: RTCPeerConnection;
  stream?: MediaStream;
}

interface PeerInfo {
  peerId: string;
  name: string;
  role: string;
}

interface EnrolledStudent {
  userId: string;
  name: string;
  email: string;
  studentId?: string;
  matricNo?: string;
}

export default function MeetingRoom() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user, token: authToken } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<{ [peerId: string]: MediaStream }>({});
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [activeTab, setActiveTab] = useState<"participants" | "attendance">("participants");
  const [showSidebar, setShowSidebar] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  
  // Attendance and enrollment state
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [markedPresent, setMarkedPresent] = useState<Set<string>>(new Set());
  const [submittingAttendance, setSubmittingAttendance] = useState(false);

  // WebRTC refs
  const myPeerIdRef = useRef<string>(`peer-${user?.id || Math.random().toString(36).substring(7)}-${Math.random().toString(36).substring(3, 7)}`);
  const pcsRef = useRef<{ [peerId: string]: PeerConnection }>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const pollingIntervalRef = useRef<number | null>(null);
  const peersIntervalRef = useRef<number | null>(null);

  const token = authToken || localStorage.getItem("accessToken") || localStorage.getItem("token") || "";
  const isRep = user?.role === Role.REP;
  const isLecturer = user?.role === Role.LECTURER;
  const isAdmin = user?.role === Role.ADMIN || user?.role === Role.SYSTEM_ADMIN;
  const canMarkAttendance = isRep || isLecturer || isAdmin;

  // TURN/STUN Config
  const rtcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      {
        urls: "turn:free.expressturn.com:3478",
        username: "000000002087824236",
        credential: "SsEcDcDeP+0cFD7rcjsDhX+xPuw=",
      },
    ],
  };

  // Load session information and enrollments
  useEffect(() => {
    if (!sessionId) return;

    const loadSession = async () => {
      try {
        const res = await getSessionById(sessionId);
        if (res.success && res.data) {
          const rawData = res.data as any;
          const sessionData = rawData.data || rawData;
          setSession(sessionData);

          let students: EnrolledStudent[] = [];

          // 1. Try loading enrollments from course if available
          if (sessionData.course?.enrollments && Array.isArray(sessionData.course.enrollments) && sessionData.course.enrollments.length > 0) {
            students = sessionData.course.enrollments
              .map((e: any) => ({
                userId: e.student?.user?.id || e.student?.userId || e.studentId || e.userId || "",
                name: e.student?.user?.name || e.name || "Student",
                email: e.student?.user?.email || e.email || "",
                studentId: e.student?.studentId || e.student?.matricNo || undefined,
              }))
              .filter((s: EnrolledStudent) => Boolean(s.userId));
          }

          // 2. Fallback: query all users if course enrollments list is empty
          if (students.length === 0) {
            try {
              const usersRes = await usersServices.getAllUsers();
              if (usersRes.success && usersRes.data) {
                const rawUsers =
                  (usersRes.data as any).users ||
                  (usersRes.data as any).data ||
                  usersRes.data;
                if (Array.isArray(rawUsers)) {
                  const courseLevel = sessionData.course?.level || sessionData.level;
                  const filtered = rawUsers
                    .filter((u: any) => {
                      if (!u.student) return false;
                      if (courseLevel && u.student.level !== courseLevel) return false;
                      return true;
                    })
                    .map((u: any) => ({
                      userId: u.id,
                      name: u.name,
                      email: u.email,
                      studentId: u.student?.studentId || u.student?.matricNo || undefined,
                    }));
                  if (filtered.length > 0) {
                    students = filtered;
                  }
                }
              }
            } catch (userFetchErr) {
              console.error("Failed to load students list fallback:", userFetchErr);
            }
          }

          setEnrolledStudents(students);

          // Sync already marked present students
          if (sessionData.attendances && Array.isArray(sessionData.attendances)) {
            const presentSet = new Set<string>(
              sessionData.attendances
                .filter((a: any) =>
                  a.status === "PRESENT" ||
                  a.status === "LATE" ||
                  a.status === "CHECKED_IN"
                )
                .map((a: any) => a.userId)
            );
            setMarkedPresent(presentSet);
          }
        } else {
          toast.error("Failed to retrieve class session details");
        }
      } catch (err) {
        console.error("Error loading session:", err);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [sessionId]);

  // Request camera and microphone access
  useEffect(() => {
    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
        localStreamRef.current = stream;
      } catch (err) {
        console.error("Failed to get local stream, starting audio only:", err);
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          setLocalStream(stream);
          localStreamRef.current = stream;
        } catch (audioErr) {
          console.error("No media devices available:", audioErr);
          toast.error("No camera or mic detected. Joining in view-only mode.");
        }
      }
    };

    initMedia();

    return () => {
      // Clean up media streams
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      // Leave meeting on backend
      if (sessionId && token) {
        leaveMeeting(sessionId, myPeerIdRef.current, token).catch(console.error);
      }
    };
  }, [sessionId, token]);

  // Handle peer connections and WebRTC signaling
  const getOrCreatePeerConnection = useCallback((peer: PeerInfo) => {
    const peerId = peer.peerId;
    if (pcsRef.current[peerId]) {
      return pcsRef.current[peerId].pc;
    }

    const pc = new RTCPeerConnection(rtcConfig);

    // Add local tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle incoming tracks
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (stream) {
        setRemoteStreams((prev) => ({
          ...prev,
          [peerId]: stream,
        }));
      }
    };

    // ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && sessionId) {
        sendMeetingSignal(
          sessionId,
          myPeerIdRef.current,
          peerId,
          { candidate: event.candidate },
          token
        ).catch((err) => console.error("Error sending ICE candidate:", err));
      }
    };

    pcsRef.current[peerId] = {
      peerId,
      name: peer.name,
      role: peer.role,
      pc,
    };

    return pc;
  }, [sessionId, token]);

  // Initiate WebRTC connection to a target peer
  const initiateCall = useCallback(async (peer: PeerInfo) => {
    const pc = getOrCreatePeerConnection(peer);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (sessionId) {
        await sendMeetingSignal(
          sessionId,
          myPeerIdRef.current,
          peer.peerId,
          { sdp: offer },
          token
        );
      }
    } catch (err) {
      console.error("Error initiating connection offer:", err);
    }
  }, [getOrCreatePeerConnection, sessionId, token]);

  // Poll signaling messages from the backend queue
  useEffect(() => {
    if (!sessionId || !token) return;

    // Join room first
    joinMeeting(
      sessionId,
      myPeerIdRef.current,
      user?.name || "Participant",
      user?.role || "STUDENT",
      token
    ).then((res) => {
      if (res.success && res.data) {
        const currentPeers = res.data.peers || [];
        setPeers(currentPeers.filter((p) => p.peerId !== myPeerIdRef.current));
      }
    }).catch(console.error);

    // Poll signaling messages every 1.5s
    pollingIntervalRef.current = window.setInterval(async () => {
      try {
        const res = await getMeetingSignals(sessionId, myPeerIdRef.current, token);
        if (res.success && res.data?.signals) {
          for (const message of res.data.signals) {
            const senderId = message.senderId;
            const signal = message.signal;

            // Find peer info from list
            const currentPeer = peers.find((p) => p.peerId === senderId);
            const peerInfo: PeerInfo = currentPeer || {
              peerId: senderId,
              name: "External Peer",
              role: "STUDENT",
            };

            const pc = getOrCreatePeerConnection(peerInfo);

            if (signal.sdp) {
              await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

              if (signal.sdp.type === "offer") {
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                await sendMeetingSignal(
                  sessionId,
                  myPeerIdRef.current,
                  senderId,
                  { sdp: answer },
                  token
                );
              }
            } else if (signal.candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            }
          }
        }
      } catch (err) {
        console.error("Error polling meeting signals:", err);
      }
    }, 1500);

    // Poll current peers list every 4s to add newly joined and clean up left
    peersIntervalRef.current = window.setInterval(async () => {
      try {
        const res = await getMeetingPeers(sessionId, token);
        if (res.success && res.data?.peers) {
          const list: PeerInfo[] = res.data.peers.filter((p: PeerInfo) => p.peerId !== myPeerIdRef.current);
          setPeers(list);

          // Handle newly joined peers (lexicographically determine caller/callee)
          list.forEach((peer) => {
            if (!pcsRef.current[peer.peerId]) {
              // Caller is the one with lexicographically smaller ID
              if (myPeerIdRef.current < peer.peerId) {
                initiateCall(peer);
              }
            }
          });

          // Clean up peers that left
          const activePeerIds = new Set(list.map((p) => p.peerId));
          Object.keys(pcsRef.current).forEach((pId) => {
            if (!activePeerIds.has(pId)) {
              pcsRef.current[pId].pc.close();
              delete pcsRef.current[pId];
              setRemoteStreams((prev) => {
                const copy = { ...prev };
                delete copy[pId];
                return copy;
              });
            }
          });
        }
      } catch (err) {
        console.error("Error updating peer list:", err);
      }
    }, 4000);

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (peersIntervalRef.current) clearInterval(peersIntervalRef.current);
    };
  }, [sessionId, token, peers, getOrCreatePeerConnection, initiateCall, user]);

  // Audio Toggle
  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  // Video Toggle
  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  // Leave meeting conference room
  const handleLeave = async () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (sessionId && token) {
      try {
        await leaveMeeting(sessionId, myPeerIdRef.current, token);
      } catch (err) {
        console.error(err);
      }
    }
    navigate("/rep/sessions");
  };

  // Mark a single student's attendance manually
  const toggleStudentAttendance = (userId: string) => {
    const copy = new Set(markedPresent);
    if (copy.has(userId)) {
      copy.delete(userId);
    } else {
      copy.add(userId);
    }
    setMarkedPresent(copy);
  };

  // Submit checked present students to backend in bulk
  const submitCheckedAttendance = async () => {
    if (!sessionId) {
      toast.error("Session identifier is missing.");
      return;
    }
    if (!token) {
      toast.error("Authentication required to submit attendance.");
      return;
    }

    // Build the bulk records array
    let records: { userId: string; status: string; remarks?: string }[] = [];

    if (enrolledStudents.length > 0) {
      records = enrolledStudents.map((student) => ({
        userId: student.userId,
        status: markedPresent.has(student.userId) ? "PRESENT" : "ABSENT",
        remarks: "Verified via online video meeting classroom",
      }));
    } else if (markedPresent.size > 0) {
      // Fallback: If no pre-populated course roster, record all selected attendees as PRESENT
      records = Array.from(markedPresent).map((userId) => ({
        userId,
        status: "PRESENT",
        remarks: "Verified via online video meeting classroom",
      }));
    } else {
      toast.warning("No students available or selected to save attendance.");
      return;
    }

    setSubmittingAttendance(true);
    try {
      const res = await markBulkManualAttendance(sessionId, records, token);
      if (res.success && res.data) {
        const data = res.data as {
          results?: { userId: string; success: boolean; attendance?: any }[];
          errors?: { userId: string; success: boolean; error?: string }[];
          totalProcessed?: number;
        };

        const successCount = data.results?.filter((r) => r.success).length ?? 0;
        const errorCount = data.errors?.length ?? 0;

        if (successCount > 0) {
          toast.success(`Successfully saved attendance for ${successCount} student${successCount !== 1 ? "s" : ""}!`);
        } else if (errorCount === 0) {
          toast.success("Attendance records saved successfully!");
        }

        if (errorCount > 0) {
          const firstErr = data.errors?.[0]?.error || "Some records could not be saved";
          toast.error(`${errorCount} record(s) failed: ${firstErr}`);
        }

        // Update local session state to immediately reflect the newly saved attendances
        const successUserIds = new Set(
          data.results?.filter((r) => r.success).map((r) => r.userId) || []
        );

        if (session) {
          const currentAttendances = [...(session.attendances || [])];
          records.forEach((rec) => {
            if (successUserIds.has(rec.userId)) {
              const idx = currentAttendances.findIndex((a) => a.userId === rec.userId);
              if (idx >= 0) {
                currentAttendances[idx] = {
                  ...currentAttendances[idx],
                  status: rec.status as any,
                };
              } else {
                currentAttendances.push({
                  id: `temp-${Date.now()}-${rec.userId}`,
                  sessionId,
                  userId: rec.userId,
                  status: rec.status as any,
                  timestamp: new Date(),
                } as any);
              }
            }
          });
          setSession({ ...session, attendances: currentAttendances });
        }
      } else {
        toast.error(res.error || "Failed to submit attendance");
      }
    } catch (err: any) {
      console.error("Error submitting bulk manual attendance:", err);
      toast.error(err?.message || "An error occurred during submission");
    } finally {
      setSubmittingAttendance(false);
    }
  };

  // Auto-mark present any students currently connected to WebRTC room
  const autoMarkConnectedStudents = () => {
    const connectedUserIds: string[] = [];

    peers.forEach((p) => {
      // peerId structure: `peer-${userId}-...`
      const parts = p.peerId.split("-");
      if (parts[1]) connectedUserIds.push(parts[1]);
    });

    // Also include current user if student
    if (user?.id && user.role === Role.STUDENT) {
      connectedUserIds.push(user.id);
    }

    const newMarked = new Set(markedPresent);
    let newlyMarked = 0;

    connectedUserIds.forEach((uid) => {
      if (!newMarked.has(uid)) {
        newMarked.add(uid);
        newlyMarked++;
      }
    });

    setMarkedPresent(newMarked);
    if (connectedUserIds.length > 0) {
      toast.success(`${connectedUserIds.length} connected attendee(s) checked. Click 'Save Attendance' to save.`);
    } else {
      toast.info("No remote participants detected yet in this meeting room.");
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
        <p className="text-slate-400 text-base font-medium">Entering video classroom...</p>
      </div>
    );
  }

  // Check if a student is active in meeting
  const isStudentInMeeting = (userId: string) => {
    if (user?.id === userId) return true;
    return peers.some((p) => p.peerId.includes(userId));
  };

  const participantCount = peers.length + 1;

  // Responsive dynamic grid layout class based on participant count
  let videoGridClass = "w-full max-w-4xl mx-auto flex items-center justify-center";
  if (participantCount === 2) {
    videoGridClass = "grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 max-w-5xl w-full mx-auto";
  } else if (participantCount <= 4) {
    videoGridClass = "grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-5xl w-full mx-auto";
  } else if (participantCount <= 6) {
    videoGridClass = "grid grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-6xl mx-auto";
  } else {
    videoGridClass = "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 w-full mx-auto";
  }

  return (
    <div className="h-screen max-h-screen w-screen bg-slate-950 flex flex-col font-sans text-slate-100 overflow-hidden select-none">
      {/* Top Header Bar */}
      <header className="h-14 sm:h-16 flex-shrink-0 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-3 sm:px-6 flex items-center justify-between z-30">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 flex-shrink-0">
            <Video className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-bold text-white tracking-wide truncate">
              {session?.name || "Online Class"}
            </h1>
            <p className="text-[10px] sm:text-xs text-amber-500 font-semibold tracking-wider uppercase truncate">
              {session?.course?.code || "COURSE"} &mdash; {session?.course?.title || "Online Session"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="hidden sm:flex bg-slate-800/80 text-[11px] text-slate-300 font-mono px-2.5 py-1 rounded-full border border-slate-700/50 items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            LIVE MEETING
          </div>

          <Button
            variant={showSidebar ? "gradient" : "outline"}
            size="sm"
            onClick={() => setShowSidebar(!showSidebar)}
            className="h-8 sm:h-9 px-2.5 sm:px-3 text-xs font-semibold gap-1.5 border-slate-700"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Participants</span>
            <span className="bg-slate-950/80 text-[10px] px-1.5 py-0.2 rounded-full text-amber-400 font-mono">
              {participantCount}
            </span>
          </Button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        {/* Video Canvas Container */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative bg-slate-950">
          {/* Scrollable Video Feeds Canvas */}
          <div className="flex-1 overflow-y-auto min-h-0 p-2 sm:p-4 md:p-6 flex items-center justify-center">
            <div className={videoGridClass}>
              {/* Local Video Card */}
              <div className="relative aspect-video bg-slate-900 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-amber-500/50 shadow-2xl group flex items-center justify-center">
                {localStream && !isVideoOff ? (
                  <video
                    autoPlay
                    playsInline
                    muted
                    ref={(video) => {
                      if (video && video.srcObject !== localStream) {
                        video.srcObject = localStream;
                      }
                    }}
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 gap-2 sm:gap-3 p-4 text-center">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 border border-slate-700">
                      <VideoOff className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <span className="text-xs sm:text-sm text-slate-400 font-medium">Camera Off</span>
                  </div>
                )}
                
                {/* Local User Badge */}
                <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-xs font-semibold flex items-center gap-1.5 shadow-lg">
                  <span className="text-amber-400 font-medium">You</span>
                  <span className="text-slate-400 text-[9px] uppercase bg-slate-900 px-1 py-0.2 rounded font-mono">
                    {user?.role}
                  </span>
                  {isMuted && <MicOff className="w-3 h-3 text-rose-400 ml-0.5" />}
                </div>
              </div>

              {/* Remote Video Cards */}
              {peers.map((peer) => {
                const stream = remoteStreams[peer.peerId];
                const hasVideo = stream && stream.getVideoTracks().some((track) => track.enabled);
                return (
                  <div
                    key={peer.peerId}
                    className="relative aspect-video bg-slate-900 rounded-xl sm:rounded-2xl overflow-hidden border border-slate-800 shadow-2xl group hover:border-amber-500/30 transition-all duration-300 flex items-center justify-center"
                  >
                    {hasVideo ? (
                      <video
                        autoPlay
                        playsInline
                        ref={(video) => {
                          if (video && video.srcObject !== stream) {
                            video.srcObject = stream;
                          }
                        }}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 gap-2 sm:gap-3 p-4 text-center">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700/80 font-bold text-lg">
                          {peer.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs text-slate-500">{peer.name} (Video Off)</span>
                      </div>
                    )}
                    
                    {/* Remote User Badge */}
                    <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-xs font-semibold flex items-center gap-1.5 shadow-lg">
                      <span className="text-white truncate max-w-[100px] sm:max-w-[140px]">
                        {peer.name}
                      </span>
                      <span className="text-slate-400 text-[9px] uppercase bg-slate-900 px-1 py-0.2 rounded font-mono">
                        {peer.role}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Empty placeholder */}
              {peers.length === 0 && (
                <div className="col-span-full py-8 sm:py-12 flex flex-col items-center justify-center text-center max-w-md mx-auto px-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-900/80 flex items-center justify-center text-slate-500 border border-slate-800/80 mb-3 animate-pulse">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white">Waiting for other participants</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Other students and faculty joining this session will appear here in real-time.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ALWAYS PINNED BOTTOM CONTROLS TOOLBAR */}
          <footer className="h-16 sm:h-20 flex-shrink-0 bg-slate-900/95 border-t border-slate-800/90 px-3 sm:px-6 flex items-center justify-between sm:justify-center gap-2 sm:gap-4 z-30 shadow-2xl backdrop-blur-md">
            {/* Left Controls Group (Mic & Camera) */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant={isMuted ? "destructive" : "secondary"}
                size="icon"
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                  !isMuted ? "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700" : ""
                }`}
                onClick={toggleMute}
                title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
              >
                {isMuted ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />}
              </Button>

              <Button
                variant={isVideoOff ? "destructive" : "secondary"}
                size="icon"
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                  !isVideoOff ? "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700" : ""
                }`}
                onClick={toggleVideo}
                title={isVideoOff ? "Turn On Camera" : "Turn Off Camera"}
              >
                {isVideoOff ? <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <VideoIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />}
              </Button>
            </div>

            <div className="w-px h-6 sm:h-8 bg-slate-800 mx-1 hidden sm:block" />

            {/* Center Controls Group (Screen / View & Sidebar Toggles) */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="outline"
                size="icon"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hidden xs:flex items-center justify-center"
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />}
              </Button>

              <Button
                variant={showSidebar ? "gradient" : "outline"}
                size="icon"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center relative"
                onClick={() => setShowSidebar(!showSidebar)}
                title="Toggle Participants / Roll Call Panel"
              >
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
                  {participantCount}
                </span>
              </Button>
            </div>

            <div className="w-px h-6 sm:h-8 bg-slate-800 mx-1 hidden sm:block" />

            {/* Leave Meeting Button */}
            <Button
              variant="destructive"
              className="h-10 sm:h-12 px-3 sm:px-6 rounded-full font-bold flex items-center gap-1.5 sm:gap-2 shadow-lg shadow-rose-900/30 text-xs sm:text-sm active:scale-95"
              onClick={handleLeave}
            >
              <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Leave</span>
            </Button>
          </footer>
        </main>

        {/* Right Collapsible Panel (Side Drawer) */}
        {showSidebar && (
          <aside className="fixed inset-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-80 md:w-96 z-50 flex flex-col bg-slate-900/98 backdrop-blur-xl border-l border-slate-800 shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Panel Header & Close Button */}
            <div className="h-14 sm:h-16 flex-shrink-0 border-b border-slate-800 px-4 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-bold text-white tracking-wide">Classroom Panel</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSidebar(false)}
                className="w-8 h-8 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Tab Triggers */}
            <div className="grid grid-cols-2 border-b border-slate-800 bg-slate-950/20 flex-shrink-0">
              <button
                onClick={() => setActiveTab("participants")}
                className={`py-3 text-xs font-semibold tracking-wider uppercase flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                  activeTab === "participants"
                    ? "border-amber-500 text-amber-500 bg-slate-900/50"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Peers ({participantCount})
              </button>
              <button
                onClick={() => setActiveTab("attendance")}
                className={`py-3 text-xs font-semibold tracking-wider uppercase flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                  activeTab === "attendance"
                    ? "border-amber-500 text-amber-500 bg-slate-900/50"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                Roll Call
              </button>
            </div>

            {/* Panel Body Content */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              {activeTab === "participants" ? (
                <div className="space-y-4">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Connected in Meeting ({participantCount})
                  </h3>

                  {/* Local User Card */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-850/60 border border-slate-800/80">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-500 text-xs flex-shrink-0">
                        {user?.name?.charAt(0).toUpperCase() || "Y"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">
                          {user?.name} (You)
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-amber-500 uppercase px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded font-mono flex-shrink-0">
                      {user?.role}
                    </span>
                  </div>

                  {/* Remote Users List */}
                  {peers.map((peer) => (
                    <div
                      key={peer.peerId}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-850/40 border border-slate-800/50 hover:bg-slate-850/60 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center font-bold text-slate-300 text-xs flex-shrink-0">
                          {peer.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">
                            {peer.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {peer.role.toLowerCase()}
                          </p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase px-1.5 py-0.5 bg-slate-800 border border-slate-700/50 rounded font-mono flex-shrink-0">
                        {peer.role}
                      </span>
                    </div>
                  ))}

                  {peers.length === 0 && (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      No other participants connected yet.
                    </div>
                  )}
                </div>
              ) : (
                /* Roll Call Tab */
                <div className="space-y-4 h-full flex flex-col">
                  {canMarkAttendance ? (
                    <>
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Take Course Attendance
                        </h3>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          Auto-check connected students and save the roll call directly to attendance records.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-1 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={autoMarkConnectedStudents}
                          className="text-[11px] h-8 font-semibold border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-400 text-amber-500 px-2"
                        >
                          <UserCheck className="w-3.5 h-3.5 mr-1" />
                          Check Connected
                        </Button>
                        <Button
                          variant="gradient"
                          size="sm"
                          onClick={submitCheckedAttendance}
                          disabled={submittingAttendance}
                          className="text-[11px] h-8 font-bold px-2"
                        >
                          {submittingAttendance ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                              Save Attendance
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="w-full h-px bg-slate-800 my-1 flex-shrink-0" />

                      {/* Enrolled Students List */}
                      <div className="space-y-2 flex-1 overflow-y-auto pr-1 min-h-0">
                        {enrolledStudents.map((student) => {
                          const inMeeting = isStudentInMeeting(student.userId);
                          const isChecked = markedPresent.has(student.userId);
                          return (
                            <div
                              key={student.userId}
                              className={`p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                                isChecked
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                  : "bg-slate-850/50 border-slate-800 text-slate-300"
                              }`}
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-xs text-white truncate max-w-[130px]">
                                    {student.name}
                                  </span>
                                  {inMeeting && (
                                    <span
                                      className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0"
                                      title="Active in call"
                                    />
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-0.5 font-mono truncate">
                                  {student.studentId || "No Matric"}
                                </p>
                              </div>
                              <button
                                onClick={() => toggleStudentAttendance(student.userId)}
                                className={`p-1 rounded border transition-colors flex-shrink-0 ${
                                  isChecked
                                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                    : "bg-slate-800 border-slate-700 text-slate-500 hover:text-white"
                                }`}
                              >
                                <CheckSquare className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}

                        {enrolledStudents.length === 0 && (
                          <div className="text-center py-12 text-slate-500 text-xs">
                            No enrolled students found for this course.
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    /* Non-rep attendance info */
                    <div className="space-y-4">
                      <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Your Attendance
                      </h3>
                      <div className="p-4 rounded-xl bg-slate-850/30 border border-slate-800 text-center">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-3">
                          <CheckSquare className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-semibold text-white">Joined Online Class</p>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          Your presence has been recorded in the meeting. The course representative will verify and sync this session's roll call.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

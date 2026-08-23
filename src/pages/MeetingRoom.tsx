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
  const { user } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<{ [peerId: string]: MediaStream }>({});
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [activeTab, setActiveTab] = useState<"participants" | "attendance">("participants");
  
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

  const token = localStorage.getItem("accessToken") || "";
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

          // If there's a courseId, load enrolled students
          if (sessionData.courseId) {
            // We can load expected attendees using the course's enrollments from session
            if (sessionData.course?.enrollments) {
              const students = sessionData.course.enrollments.map((e: any) => ({
                userId: e.student?.user?.id || "",
                name: e.student?.user?.name || "Unknown Student",
                email: e.student?.user?.email || "",
                studentId: e.student?.studentId || e.student?.matricNo || undefined,
              }));
              setEnrolledStudents(students);
            }

            // Sync already marked present students
            if (sessionData.attendances) {
              const presentSet = new Set<string>(
                sessionData.attendances
                  .filter((a: any) => a.status === "PRESENT" || a.status === "LATE" || a.status === "CHECKED_IN")
                  .map((a: any) => a.userId)
              );
              setMarkedPresent(presentSet);
            }
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
    if (!sessionId || !token) return;

    setSubmittingAttendance(true);
    try {
      const records = enrolledStudents.map((student) => ({
        userId: student.userId,
        status: markedPresent.has(student.userId) ? "PRESENT" : "ABSENT",
        remarks: "Verified via online video meeting classroom",
      }));

      const res = await markBulkManualAttendance(sessionId, records, token);
      if (res.success) {
        toast.success("Attendance submitted successfully!");
      } else {
        toast.error(res.error || "Failed to submit attendance");
      }
    } catch (err) {
      console.error("Error submitting manual attendance:", err);
      toast.error("An error occurred during submission");
    } finally {
      setSubmittingAttendance(false);
    }
  };

  // Auto-mark present any students currently connected to WebRTC room
  const autoMarkConnectedStudents = () => {
    const connectedUserIds = peers.map((p) => {
      // peerId prefix structure: `peer-${userId}-...`
      const parts = p.peerId.split("-");
      return parts[1] || "";
    }).filter(Boolean);

    const newMarked = new Set(markedPresent);
    connectedUserIds.forEach((uid) => {
      // Find matching enrolled student
      if (enrolledStudents.some((s) => s.userId === uid)) {
        newMarked.add(uid);
      }
    });

    setMarkedPresent(newMarked);
    toast.success("Connected students checked automatically. Click 'Save Attendance' to submit.");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
        <p className="text-slate-400 text-lg">Entering video classroom...</p>
      </div>
    );
  }

  // Check if a student is active in meeting
  const isStudentInMeeting = (userId: string) => {
    return peers.some((p) => p.peerId.includes(userId));
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-100">
      {/* Top Header Bar */}
      <div className="bg-slate-900/80 backdrop-blur border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">
              {session?.name || "Online Class"}
            </h1>
            <p className="text-xs text-amber-500 font-medium tracking-wider uppercase">
              {session?.course?.code || "COURSE"} &mdash; {session?.course?.title || "Online Session"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-800/80 text-xs text-slate-300 font-mono px-3 py-1.5 rounded-full border border-slate-700/50 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            LIVE MEETING ROOM
          </div>
        </div>
      </div>

      {/* Main Classroom Workspace Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Video Feeds Grid */}
        <div className="flex-1 p-6 overflow-y-auto flex flex-col justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 flex-1 items-center justify-center max-w-5xl mx-auto w-full">
            {/* Local Video Card */}
            <div className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden border-2 border-amber-500/40 shadow-xl group">
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
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 gap-3">
                  <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 border border-slate-700">
                    <VideoOff className="w-6 h-6" />
                  </div>
                  <span className="text-sm text-slate-400 font-medium">Camera Off</span>
                </div>
              )}
              <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-semibold flex items-center gap-1.5">
                <span className="text-amber-400 font-medium">You</span>
                <span className="text-slate-400 text-[10px] uppercase bg-slate-900 px-1 py-0.5 rounded">
                  {user?.role}
                </span>
              </div>
            </div>

            {/* Remote Video Cards */}
            {peers.map((peer) => {
              const stream = remoteStreams[peer.peerId];
              return (
                <div
                  key={peer.peerId}
                  className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-xl group hover:border-amber-500/30 transition-all duration-300"
                >
                  {stream && stream.getVideoTracks().some(track => track.enabled) ? (
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
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-600 border border-slate-700/50">
                        <VideoOff className="w-5 h-5" />
                      </div>
                      <span className="text-xs text-slate-500">Video Off</span>
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-semibold flex items-center gap-1.5">
                    <span className="text-white">{peer.name}</span>
                    <span className="text-slate-400 text-[10px] uppercase bg-slate-900 px-1 py-0.5 rounded">
                      {peer.role}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Empty grid state placeholder */}
            {peers.length === 0 && (
              <div className="col-span-full py-16 flex flex-col items-center justify-center text-center max-w-md mx-auto">
                <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-slate-600 border border-slate-800/80 mb-4 animate-pulse">
                  <Users className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white">Waiting for other participants</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Share the session link or attendance QR code so other students can join the online video conference class.
                </p>
              </div>
            )}
          </div>

          {/* Bottom Call Controls Toolbar */}
          <div className="bg-slate-900/90 border border-slate-850 p-4 rounded-2xl flex items-center justify-center gap-4 max-w-md mx-auto w-full shadow-2xl mt-6">
            <Button
              variant={isMuted ? "destructive" : "secondary"}
              size="icon"
              className="w-12 h-12 rounded-full flex items-center justify-center"
              onClick={toggleMute}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
            
            <Button
              variant={isVideoOff ? "destructive" : "secondary"}
              size="icon"
              className="w-12 h-12 rounded-full flex items-center justify-center"
              onClick={toggleVideo}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
            </Button>

            <div className="w-px h-6 bg-slate-800" />

            <Button
              variant="destructive"
              className="h-12 px-6 rounded-full font-bold flex items-center gap-2"
              onClick={handleLeave}
            >
              <PhoneOff className="w-5 h-5" />
              Disconnect
            </Button>
          </div>
        </div>

        {/* Right Collapsible Panel */}
        <div className="w-80 bg-slate-900 border-l border-slate-850 flex flex-col">
          {/* Panel Tab Triggers */}
          <div className="grid grid-cols-2 border-b border-slate-800 bg-slate-950/20">
            <button
              onClick={() => setActiveTab("participants")}
              className={`py-3.5 text-xs font-semibold tracking-wider uppercase flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                activeTab === "participants"
                  ? "border-amber-500 text-amber-500 bg-slate-900/40"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" />
              Peers ({peers.length + 1})
            </button>
            <button
              onClick={() => setActiveTab("attendance")}
              className={`py-3.5 text-xs font-semibold tracking-wider uppercase flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                activeTab === "attendance"
                  ? "border-amber-500 text-amber-500 bg-slate-900/40"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              Roll Call
            </button>
          </div>

          {/* Panel Body Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === "participants" ? (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Connected Users
                </h3>
                
                {/* Local User Listing */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-850/50 border border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-500 text-sm">
                      {user?.name?.charAt(0).toUpperCase() || "Y"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white leading-tight">
                        {user?.name} (You)
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{user?.email}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-amber-500 uppercase px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded">
                    {user?.role}
                  </span>
                </div>

                {/* Remote Users Listing */}
                {peers.map((peer) => (
                  <div
                    key={peer.peerId}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-850/30 border border-slate-800/50 hover:bg-slate-850/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center font-bold text-slate-300 text-sm">
                        {peer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white leading-tight">
                          {peer.name}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {peer.role.toLowerCase()}
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase px-1.5 py-0.5 bg-slate-800 border border-slate-700/50 rounded">
                      {peer.role}
                    </span>
                  </div>
                ))}

                {peers.length === 0 && (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    No remote peers connected yet.
                  </div>
                )}
              </div>
            ) : (
              /* Attendance Roll Call Tab */
              <div className="space-y-4 h-full flex flex-col">
                {canMarkAttendance ? (
                  <>
                    <div className="flex flex-col gap-2">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Take Course Attendance
                      </h3>
                      <p className="text-[11px] text-slate-500 leading-normal">
                        Reps can verify connected students and save final attendance sheets directly to records.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={autoMarkConnectedStudents}
                        className="text-[10px] h-8 font-semibold border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-400 text-amber-500"
                      >
                        <UserCheck className="w-3.5 h-3.5 mr-1" />
                        Check Connected
                      </Button>
                      <Button
                        variant="gradient"
                        size="xs"
                        onClick={submitCheckedAttendance}
                        disabled={submittingAttendance}
                        className="text-[10px] h-8 font-bold"
                      >
                        {submittingAttendance ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                            Save Roll
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="w-full h-px bg-slate-800 my-2" />

                    {/* Student List */}
                    <div className="space-y-2 flex-1 overflow-y-auto pr-1">
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
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-xs text-white truncate max-w-[120px]">
                                  {student.name}
                                </span>
                                {inMeeting && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Active in call" />
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5 font-mono truncate">
                                {student.studentId || "No Matric"}
                              </p>
                            </div>
                            <button
                              onClick={() => toggleStudentAttendance(student.userId)}
                              className={`p-1 rounded border transition-colors ${
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
                  /* View Student Info for non-reps */
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Your Attendance
                    </h3>
                    <div className="p-4 rounded-xl bg-slate-850/30 border border-slate-800 text-center">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-3">
                        <CheckSquare className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-semibold text-white">Joined Online Class</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Your presence has been recorded in the meeting. The course representative will verify and sync this session's roll call list.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

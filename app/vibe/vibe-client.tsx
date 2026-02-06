"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Heart, 
  X, 
  Loader2,
  ArrowLeft,
  AlertCircle,
  Camera,
  Clock
} from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  gender?: string | null
  looking_for?: string | null
}

interface VibeClientProps {
  user: SupabaseUser
  profile: Profile | null
}

type CallState = "idle" | "searching" | "in-call" | "decision" | "matched" | "no-match"

// Cooldown before skip is allowed (30 seconds minimum conversation)
const SKIP_COOLDOWN = 30
const HEARTBEAT_INTERVAL = 2000 // Send heartbeat every 2 seconds
const SEARCH_INTERVAL = 1500 // Search every 1.5 seconds
const ACTIVE_THRESHOLD = 15000 // Consider user active if heartbeat within 15 seconds

export function VibeClient({ user, profile }: VibeClientProps) {
  const router = useRouter()
  const supabase = createClient()

  // State
  const [state, setState] = useState<CallState>("idle")
  const [partner, setPartner] = useState<Profile | null>(null)
  const [callSessionId, setCallSessionId] = useState<string | null>(null)
  const [cooldownRemaining, setCooldownRemaining] = useState(SKIP_COOLDOWN)
  const [canSkip, setCanSkip] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [myDecision, setMyDecision] = useState<"yes" | "no" | null>(null)
  const [partnerDecision, setPartnerDecision] = useState<"yes" | "no" | null>(null)
  const [queueCount, setQueueCount] = useState(0)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [searchMessage, setSearchMessage] = useState("Looking for someone...")
  const [isCaller, setIsCaller] = useState(false) // Track if user initiated the call

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const callVideoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null)
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)
  const searchRef = useRef<NodeJS.Timeout | null>(null)
  const queueIdRef = useRef<string | null>(null)
  const isMatchingRef = useRef(false)

  const displayName = profile?.display_name || "You"

  // Attach stream to a video element
  const attachStream = useCallback((videoEl: HTMLVideoElement | null) => {
    if (videoEl && streamRef.current) {
      videoEl.srcObject = streamRef.current
      videoEl.muted = true
      videoEl.playsInline = true
      videoEl.play().catch(() => {})
    }
  }, [])

  // Initialize camera with proper production-grade handling
  const initializeCamera = useCallback(async (): Promise<boolean> => {
    setCameraError(null)
    setCameraReady(false)

    // Check HTTPS
    if (typeof window !== "undefined" && window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
      setCameraError("Camera requires a secure connection (HTTPS).")
      return false
    }

    // Check browser support
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Your browser doesn't support camera access. Try Chrome, Firefox, or Safari.")
      return false
    }

    try {
      // Request camera and microphone with ideal settings
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 }, 
          facingMode: "user",
          frameRate: { ideal: 30 }
        },
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      // Store stream reference
      streamRef.current = stream
      setCameraReady(true)

      // Attach to video element immediately
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        localVideoRef.current.muted = true
        localVideoRef.current.playsInline = true
        await localVideoRef.current.play().catch(() => {})
      }

      return true
    } catch (err: any) {
      console.error("[v0] Camera error:", err.name, err.message)
      
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Camera permission denied. Please allow camera access in your browser settings and try again.")
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError("No camera found. Please connect a camera and try again.")
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setCameraError("Camera is being used by another application. Please close other apps using your camera.")
      } else if (err.name === "OverconstrainedError") {
        // Try with basic constraints
        try {
          const basicStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          streamRef.current = basicStream
          setCameraReady(true)
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = basicStream
            await localVideoRef.current.play().catch(() => {})
          }
          return true
        } catch {
          setCameraError("Could not access camera with supported settings.")
        }
      } else {
        setCameraError("Could not access camera. Please check your permissions and try again.")
      }
      return false
    }
  }, [])

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
      })
      streamRef.current = null
    }
    setCameraReady(false)
  }, [])

  // Toggle video
  const toggleVideo = useCallback(() => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (track) {
      track.enabled = !track.enabled
      setVideoEnabled(track.enabled)
    }
  }, [])

  // Toggle audio
  const toggleAudio = useCallback(() => {
    const track = streamRef.current?.getAudioTracks()[0]
    if (track) {
      track.enabled = !track.enabled
      setAudioEnabled(track.enabled)
    }
  }, [])



  // Clean up queue entry
  const leaveQueue = useCallback(async () => {
    if (queueIdRef.current) {
      await supabase.from("matching_queue").delete().eq("id", queueIdRef.current)
      queueIdRef.current = null
    }
    await supabase.from("matching_queue").delete().eq("user_id", user.id)
  }, [supabase, user.id])

  // Send heartbeat
  const sendHeartbeat = useCallback(async () => {
    if (queueIdRef.current) {
      await supabase
        .from("matching_queue")
        .update({ last_heartbeat: new Date().toISOString() })
        .eq("id", queueIdRef.current)
    }
  }, [supabase])

  // Start call with partner (called by both caller and receiver)
  const startCallWithPartner = useCallback((partnerProfile: Profile, sessionId: string, amICaller: boolean) => {
    setIsCaller(amICaller)
    // Stop search intervals
    if (searchRef.current) {
      clearInterval(searchRef.current)
      searchRef.current = null
    }
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }

    setPartner(partnerProfile)
    setCallSessionId(sessionId)
    setState("in-call")
    setCooldownRemaining(SKIP_COOLDOWN)
    setCanSkip(false)
    setCallDuration(0)

    // Start cooldown timer (30 seconds before skip is allowed)
    cooldownTimerRef.current = setInterval(() => {
      setCooldownRemaining(prev => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) {
            clearInterval(cooldownTimerRef.current)
            cooldownTimerRef.current = null
          }
          setCanSkip(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // Start call duration timer (counts up indefinitely)
    durationTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1)
    }, 1000)
  }, [])

  // Search for match - only match with ACTIVE users (recent heartbeat)
  const searchForMatch = useCallback(async () => {
    if (isMatchingRef.current || !profile) return
    
    // Calculate the cutoff time for active users (15 seconds ago)
    const activeThreshold = new Date(Date.now() - ACTIVE_THRESHOLD).toISOString()

    // Get ONLY active users (heartbeat within last 15 seconds)
    const { data: activeUsers, error } = await supabase
      .from("matching_queue")
      .select(`
        id,
        user_id,
        last_heartbeat,
        profiles:user_id (
          id, 
          display_name, 
          avatar_url, 
          gender, 
          looking_for
        )
      `)
      .neq("user_id", user.id)
      .gte("last_heartbeat", activeThreshold) // Only users with recent heartbeat
      .order("joined_at", { ascending: true })

    if (error) {
      console.log("[v0] Queue query error:", error)
      return
    }

    setQueueCount(activeUsers?.length || 0)

    if (!activeUsers || activeUsers.length === 0) {
      setSearchMessage("Waiting for someone to start searching...")
      return
    }

    // Filter to users with valid profiles
    const validCandidates = activeUsers.filter((entry: any) => entry.profiles)
    
    if (validCandidates.length === 0) {
      setSearchMessage("Waiting for someone to join...")
      return
    }

    // Simply take the first (earliest) active user in queue
    const selectedMatch = validCandidates[0]
    const matchedProfile = selectedMatch.profiles as Profile
    
    setSearchMessage("Found someone! Connecting...")

    // Mark as matching to prevent race conditions
    isMatchingRef.current = true
    setSearchMessage(`Found a great match! Connecting...`)

    try {
      // Create call session - this notifies the other user via Realtime
      const { data: callSession, error: callError } = await supabase
        .from("active_calls")
        .insert({
          caller_id: user.id,
          receiver_id: matchedProfile.id,
          status: "connecting"
        })
        .select()
        .single()

      if (callError) {
        console.log("[v0] Failed to create call session:", callError)
        isMatchingRef.current = false
        return
      }

      console.log("[v0] Call session created:", callSession.id, "with receiver:", matchedProfile.id)

      // Remove ONLY self from queue - the receiver will remove themselves when they get the Realtime event
      await leaveQueue()

      // Start the call for this user (caller side)
      startCallWithPartner(matchedProfile, callSession.id, true)

    } catch {
      isMatchingRef.current = false
    }
  }, [supabase, user.id, profile, leaveQueue, startCallWithPartner])

  // Start searching
  const startSearching = async () => {
    setCameraError(null)
    isMatchingRef.current = false

    const cameraOk = await initializeCamera()
    if (!cameraOk) return

    setState("searching")
    setSearchMessage("Joining queue...")

    // Clean existing entries
    await supabase.from("matching_queue").delete().eq("user_id", user.id)

    // Join queue
    const { data: entry, error } = await supabase
      .from("matching_queue")
      .insert({ user_id: user.id, last_heartbeat: new Date().toISOString() })
      .select()
      .single()

    if (error) {
      setState("idle")
      stopCamera()
      return
    }

    queueIdRef.current = entry.id
    setSearchMessage("Looking for someone compatible...")

    // Start heartbeat
    heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL)

    // Start search
    searchRef.current = setInterval(searchForMatch, SEARCH_INTERVAL)
    searchForMatch()
  }

  // Cancel searching
  const cancelSearching = async () => {
    if (searchRef.current) clearInterval(searchRef.current)
    if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    searchRef.current = null
    heartbeatRef.current = null
    await leaveQueue()
    stopCamera()
    setState("idle")
    isMatchingRef.current = false
  }

  // End call (only if cooldown passed or as early exit)
  const endCall = () => {
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current)
      cooldownTimerRef.current = null
    }
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current)
      durationTimerRef.current = null
    }
    setState("decision")
  }

  // Handle decision - sync via active_calls table
  const handleDecision = async (decision: "yes" | "no") => {
    if (!callSessionId) return
    
    setMyDecision(decision)

    // Update the appropriate decision column based on role
    const updateColumn = isCaller ? "caller_decision" : "receiver_decision"
    
    await supabase
      .from("active_calls")
      .update({ [updateColumn]: decision })
      .eq("id", callSessionId)
  }

  // Reset for new search
  const findAnother = () => {
    setPartner(null)
    setCallSessionId(null)
    setMyDecision(null)
    setPartnerDecision(null)
    setCooldownRemaining(SKIP_COOLDOWN)
    setCanSkip(false)
    setCallDuration(0)
    isMatchingRef.current = false
    startSearching()
  }

  // Go home
  const goHome = () => {
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current)
    if (durationTimerRef.current) clearInterval(durationTimerRef.current)
    if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    if (searchRef.current) clearInterval(searchRef.current)
    leaveQueue()
    stopCamera()
    router.push("/home")
  }

  // Format time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Listen for incoming calls (when someone matches with us)
  useEffect(() => {
    if (state !== "searching") return

    const channel = supabase
      .channel("incoming-calls")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "active_calls",
          filter: `receiver_id=eq.${user.id}`
        },
        async (payload) => {
          console.log("[v0] Received incoming call via Realtime:", payload)
          
          if (isMatchingRef.current) {
            console.log("[v0] Already matching, ignoring incoming call")
            return
          }

          const call = payload.new as any
          isMatchingRef.current = true

          console.log("[v0] Processing incoming call from:", call.caller_id)

          // Fetch caller profile
          const { data: callerProfile } = await supabase
            .from("profiles")
            .select("id, display_name, avatar_url, gender, looking_for")
            .eq("id", call.caller_id)
            .single()

          if (callerProfile) {
            console.log("[v0] Got caller profile:", callerProfile.display_name)
            // Remove self from queue (receiver side)
            await leaveQueue()
            // Start call as receiver
            startCallWithPartner(callerProfile, call.id, false)
          } else {
            console.log("[v0] Failed to get caller profile")
            isMatchingRef.current = false
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [state, user.id, supabase, leaveQueue, startCallWithPartner])

  // Listen for decision updates on active_calls
  useEffect(() => {
    if (state !== "decision" || !callSessionId) return

    const channel = supabase
      .channel(`decision-${callSessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "active_calls",
          filter: `id=eq.${callSessionId}`
        },
        async (payload) => {
          const call = payload.new as any
          const theirDecision = isCaller ? call.receiver_decision : call.caller_decision
          
          if (theirDecision) {
            setPartnerDecision(theirDecision)
            
            // Check if both have decided
            const myDec = isCaller ? call.caller_decision : call.receiver_decision
            
            if (myDec && theirDecision) {
              // Both have decided - determine outcome
              if (myDec === "yes" && theirDecision === "yes" && partner) {
                // Mutual match! Create match record
                await supabase.from("matches").insert({
                  user1_id: user.id,
                  user2_id: partner.id,
                  user1_decision: "yes",
                  user2_decision: "yes",
                  matched_at: new Date().toISOString()
                })
                setState("matched")
              } else {
                // No mutual match
                setState("no-match")
              }
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [state, callSessionId, supabase, isCaller, partner, user.id])

  // Check if both decisions are in after my decision
  useEffect(() => {
    if (state !== "decision" || !myDecision || !partnerDecision) return
    
    // Both have decided
    if (myDecision === "yes" && partnerDecision === "yes") {
      setState("matched")
    } else {
      setState("no-match")
    }
  }, [state, myDecision, partnerDecision])

  // Re-attach video when state changes
  useEffect(() => {
    if (state === "in-call" && callVideoRef.current && streamRef.current) {
      callVideoRef.current.srcObject = streamRef.current
      callVideoRef.current.muted = true
      callVideoRef.current.playsInline = true
      callVideoRef.current.play().catch(() => {})
    }
  }, [state])

  useEffect(() => {
    if (state === "searching" && localVideoRef.current && streamRef.current) {
      localVideoRef.current.srcObject = streamRef.current
      localVideoRef.current.muted = true
      localVideoRef.current.playsInline = true
      localVideoRef.current.play().catch(() => {})
    }
  }, [state])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current)
      if (durationTimerRef.current) clearInterval(durationTimerRef.current)
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      if (searchRef.current) clearInterval(searchRef.current)
      stopCamera()
    }
  }, [stopCamera])

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/90 via-primary to-primary/80">
      {/* Header */}
      <header className="w-full py-4 px-6 bg-primary flex items-center justify-between">
        <Link href="/home" className="flex items-center">
          <Image 
            src="/ginger-wordmark.png" 
            alt="ginger" 
            width={100} 
            height={32} 
            className="h-8 w-auto"
            priority
          />
        </Link>
        {state !== "idle" && (
          <Button
            variant="ghost"
            onClick={state === "searching" ? cancelSearching : goHome}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            {state === "searching" ? "Cancel" : "Exit"}
          </Button>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        
        {/* Idle State */}
        {state === "idle" && (
          <div className="text-center max-w-md">
            {cameraError && (
              <div className="bg-white/10 backdrop-blur rounded-xl p-6 mb-6">
                <AlertCircle className="h-12 w-12 text-white mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Camera Issue</h3>
                <p className="text-white/80 text-sm mb-4">{cameraError}</p>
                <Button onClick={initializeCamera} className="bg-white text-primary hover:bg-white/90">
                  <Camera className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            )}

            <div className="w-32 h-32 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-6">
              <Video className="h-16 w-16 text-white" />
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-3">Find Your Vibe</h2>
            <p className="text-white/80 mb-2">Connect through video and see if you click.</p>
            <p className="text-white/60 text-sm mb-8">Talk as long as you want. If you both feel it, match!</p>

            <Button
              size="lg"
              onClick={startSearching}
              className="w-full bg-white text-primary hover:bg-white/90 font-semibold py-6 text-lg"
            >
              <Video className="h-5 w-5 mr-2" />
              Start Finding a Vibe
            </Button>
          </div>
        )}

        {/* Searching State */}
        {state === "searching" && (
          <div className="text-center max-w-md">
            {/* Camera Preview */}
            <Card className="relative w-64 h-48 mx-auto mb-6 overflow-hidden bg-black/50">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
              {!videoEnabled && cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                  <VideoOff className="h-10 w-10 text-white/50" />
                </div>
              )}
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
                <Button size="sm" variant="ghost" onClick={toggleVideo}
                  className={`rounded-full ${videoEnabled ? "bg-white/20" : "bg-red-500"} text-white`}>
                  {videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={toggleAudio}
                  className={`rounded-full ${audioEnabled ? "bg-white/20" : "bg-red-500"} text-white`}>
                  {audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </Button>
              </div>
            </Card>

            <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-white" />
            <h2 className="text-2xl font-bold text-white mb-2">{searchMessage}</h2>
            <p className="text-white/70 mb-4">We'll connect you when we find a compatible match</p>
            <p className="text-white font-medium">
              {queueCount} {queueCount === 1 ? "person" : "people"} looking for a vibe
            </p>
          </div>
        )}

        {/* In-Call State */}
        {state === "in-call" && partner && (
          <div className="w-full max-w-4xl">
            {/* Status Bar */}
            <div className="flex justify-center items-center gap-6 mb-6">
              {/* Cooldown / Skip Status */}
              {!canSkip ? (
                <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/20 text-white">
                  <Clock className="h-5 w-5" />
                  <span className="text-lg">You can decide in {cooldownRemaining}s</span>
                </div>
              ) : (
                <div className="px-6 py-3 rounded-full bg-green-500/30 text-green-300">
                  Ready to decide when you are
                </div>
              )}
              
              {/* Call Duration */}
              <div className="px-4 py-2 rounded-full bg-white/10 text-white/80">
                {formatTime(callDuration)}
              </div>
            </div>

            {/* Video Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Partner Video (Avatar placeholder - real WebRTC would show actual video) */}
              <Card className="relative aspect-video bg-black/30 overflow-hidden">
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Avatar className="h-24 w-24 mb-4 border-4 border-white/30">
                    <AvatarImage src={partner.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-white text-2xl">
                      {partner.display_name?.slice(0, 2).toUpperCase() || "??"}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-xl font-medium text-white">{partner.display_name}</p>
                  <p className="text-white/60 text-sm">Connected</p>
                </div>
              </Card>

              {/* Your Video */}
              <Card className="relative aspect-video bg-black/50 overflow-hidden">
                <video
                  ref={callVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
                {!videoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <VideoOff className="h-12 w-12 text-white/50" />
                  </div>
                )}
                <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-full">
                  <span className="text-sm text-white">{displayName} (You)</span>
                </div>
              </Card>
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-4">
              <Button size="lg" variant="secondary" className="h-14 w-14 rounded-full" onClick={toggleVideo}>
                {videoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
              </Button>
              <Button size="lg" variant="secondary" className="h-14 w-14 rounded-full" onClick={toggleAudio}>
                {audioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
              </Button>
              <Button 
                size="lg" 
                variant={canSkip ? "destructive" : "secondary"}
                className="h-14 px-6 rounded-full" 
                onClick={endCall}
                disabled={!canSkip}
              >
                <PhoneOff className="h-6 w-6 mr-2" />
                {canSkip ? "End & Decide" : `Wait ${cooldownRemaining}s`}
              </Button>
            </div>
          </div>
        )}

        {/* Decision State */}
        {state === "decision" && partner && (
          <div className="text-center max-w-md">
            <Avatar className="h-32 w-32 mx-auto mb-6 border-4 border-white/30">
              <AvatarImage src={partner.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-white text-3xl">
                {partner.display_name?.slice(0, 2).toUpperCase() || "??"}
              </AvatarFallback>
            </Avatar>

            <h2 className="text-3xl font-bold text-white mb-3">Did you feel the vibe?</h2>
            <p className="text-white/80 mb-2">You talked for {formatTime(callDuration)}</p>
            <p className="text-white/70 mb-8">Decide if you want to match with {partner.display_name}</p>

            {myDecision ? (
              <div className="flex flex-col items-center gap-4">
                <div className={`px-6 py-3 rounded-full ${
                  myDecision === "yes" ? "bg-green-500/30 text-green-300" : "bg-red-500/30 text-red-300"
                }`}>
                  {myDecision === "yes" ? "You want to match!" : "You passed"}
                </div>
                <Loader2 className="h-6 w-6 animate-spin text-white" />
                <p className="text-white/70">Waiting for their decision...</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <Button size="lg" onClick={() => handleDecision("yes")}
                  className="w-full bg-white text-primary hover:bg-white/90 h-14">
                  <Heart className="h-6 w-6 mr-2" />
                  Let's Match!
                </Button>
                <Button size="lg" variant="outline" onClick={() => handleDecision("no")}
                  className="w-full h-14 text-white border-white/30 hover:bg-white/10 bg-transparent">
                  <X className="h-6 w-6 mr-2" />
                  I'll pass this time
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Matched State */}
        {state === "matched" && partner && (
          <div className="text-center max-w-md">
            <div className="w-24 h-24 mx-auto rounded-full bg-green-500/30 flex items-center justify-center mb-6">
              <Heart className="h-12 w-12 text-green-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">It's a Match!</h2>
            <p className="text-white/80 mb-8">You and {partner.display_name} both felt the vibe!</p>
            <div className="flex flex-col gap-4">
              <Button size="lg" onClick={() => router.push("/messages")}
                className="w-full bg-white text-primary hover:bg-white/90 h-14">
                Start Chatting
              </Button>
              <Button size="lg" variant="outline" onClick={findAnother}
                className="w-full h-14 text-white border-white/30 hover:bg-white/10 bg-transparent">
                Find Another Vibe
              </Button>
            </div>
          </div>
        )}

        {/* No Match State */}
        {state === "no-match" && (
          <div className="text-center max-w-md">
            <div className="w-24 h-24 mx-auto rounded-full bg-white/10 flex items-center justify-center mb-6">
              <X className="h-12 w-12 text-white/50" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">Not this time</h2>
            <p className="text-white/80 mb-8">Don't worry, there are more vibes to find!</p>
            <div className="flex flex-col gap-4">
              <Button size="lg" onClick={findAnother}
                className="w-full bg-white text-primary hover:bg-white/90 h-14">
                Find Another Vibe
              </Button>
              <Button size="lg" variant="outline" onClick={goHome}
                className="w-full h-14 text-white border-white/30 hover:bg-white/10 bg-transparent">
                Go Home
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

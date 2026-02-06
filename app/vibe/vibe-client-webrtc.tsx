"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Heart, 
  X, 
  Loader2,
  ArrowLeft 
} from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import type { RealtimeChannel } from "@supabase/supabase-js"

interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
}

interface VibeClientProps {
  user: SupabaseUser
  profile: Profile | null
  otherProfiles: Profile[]
}

type VibeState = "searching" | "connecting" | "in-call" | "decision" | "matched" | "no-match"

// ICE servers for WebRTC (using free STUN servers)
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ]
}

export function VibeClient({ user, profile, otherProfiles }: VibeClientProps) {
  const [state, setState] = useState<VibeState>("searching")
  const [partner, setPartner] = useState<Profile | null>(null)
  const [callDuration, setCallDuration] = useState(0)
  const [myDecision, setMyDecision] = useState<"yes" | "no" | null>(null)
  const [partnerDecision, setPartnerDecision] = useState<"yes" | "no" | null>(null)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [matchId, setMatchId] = useState<string | null>(null)
  const [isDemoMode, setIsDemoMode] = useState(true) // Always demo mode for now (no real peer)
  
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  const MIN_CALL_DURATION = 30 // seconds

  // Cleanup function
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [supabase])

  // Initialize camera
  const initCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      })
      streamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      return stream
    } catch (error) {
      console.error("Camera access denied:", error)
      return null
    }
  }, [])

  // Initialize WebRTC peer connection
  const initPeerConnection = useCallback((stream: MediaStream, roomId: string, isInitiator: boolean) => {
    const pc = new RTCPeerConnection(ICE_SERVERS)
    peerConnectionRef.current = pc

    // Add local stream tracks to peer connection
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream)
    })

    // Handle incoming remote stream
    pc.ontrack = (event) => {
      console.log("[v0] Received remote track")
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0]
      }
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        console.log("[v0] Sending ICE candidate")
        channelRef.current.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: { candidate: event.candidate, from: user.id }
        })
      }
    }

    // Setup signaling channel
    const channel = supabase.channel(`vibe-room-${roomId}`)
    channelRef.current = channel

    channel
      .on("broadcast", { event: "offer" }, async ({ payload }) => {
        if (payload.to === user.id && pc.signalingState !== "stable") {
          console.log("[v0] Received offer")
          await pc.setRemoteDescription(new RTCSessionDescription(payload.offer))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          channel.send({
            type: "broadcast",
            event: "answer",
            payload: { answer, from: user.id, to: payload.from }
          })
        }
      })
      .on("broadcast", { event: "answer" }, async ({ payload }) => {
        if (payload.to === user.id && pc.signalingState !== "stable") {
          console.log("[v0] Received answer")
          await pc.setRemoteDescription(new RTCSessionDescription(payload.answer))
        }
      })
      .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
        if (payload.from !== user.id && payload.candidate) {
          console.log("[v0] Received ICE candidate")
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
        }
      })
      .subscribe()

    // If initiator, create and send offer
    if (isInitiator) {
      pc.createOffer().then(async (offer) => {
        await pc.setLocalDescription(offer)
        console.log("[v0] Sending offer")
        channel.send({
          type: "broadcast",
          event: "offer",
          payload: { offer, from: user.id, to: partner?.id }
        })
      })
    }

    return pc
  }, [supabase, user.id, partner?.id])

  // Find a partner
  useEffect(() => {
    if (state === "searching") {
      initCamera()
      
      // Simulate search delay
      const searchTimeout = setTimeout(() => {
        const availableProfiles = otherProfiles.filter(p => p.id !== user.id)
        
        if (availableProfiles.length > 0) {
          const randomProfile = availableProfiles[Math.floor(Math.random() * availableProfiles.length)]
          setPartner(randomProfile)
          setIsDemoMode(false)
        } else {
          // Demo mode with simulated partner
          const demoNames = ["Alex", "Jordan", "Taylor", "Morgan"]
          const randomName = demoNames[Math.floor(Math.random() * demoNames.length)]
          setPartner({ id: "demo", display_name: randomName, avatar_url: null })
          setIsDemoMode(true)
        }
        setState("connecting")
      }, 2000 + Math.random() * 2000)

      return () => clearTimeout(searchTimeout)
    }
  }, [state, initCamera, otherProfiles, user.id])

  // Handle connecting -> in-call transition
  useEffect(() => {
    if (state === "connecting" && partner && streamRef.current) {
      const connectTimeout = setTimeout(() => {
        // Only initialize WebRTC if not in demo mode and we have a real partner
        if (!isDemoMode && partner.id !== "demo") {
          const roomId = [user.id, partner.id].sort().join("-")
          const isInitiator = user.id < partner.id
          initPeerConnection(streamRef.current!, roomId, isInitiator)
        }
        
        setState("in-call")
        setCallDuration(0)
        
        // Start call timer
        timerRef.current = setInterval(() => {
          setCallDuration(prev => prev + 1)
        }, 1000)
      }, 1500)

      return () => clearTimeout(connectTimeout)
    }
  }, [state, partner, initPeerConnection, isDemoMode, user.id])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  const handleEndCall = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setState("decision")
  }

  const handleDecision = async (decision: "yes" | "no") => {
    setMyDecision(decision)
    
    // Simulate partner decision (70% yes rate)
    const simulatedPartnerDecision = Math.random() > 0.3 ? "yes" : "no"
    
    setTimeout(async () => {
      setPartnerDecision(simulatedPartnerDecision)
      
      if (decision === "yes" && simulatedPartnerDecision === "yes") {
        // Create match only for real partners
        if (!isDemoMode && partner && partner.id !== "demo") {
          try {
            const { data: match } = await supabase
              .from("matches")
              .insert({
                user1_id: user.id,
                user2_id: partner.id,
                user1_decision: "yes",
                user2_decision: "yes",
                matched_at: new Date().toISOString(),
              })
              .select()
              .single()

            if (match) {
              setMatchId(match.id)
            }
          } catch (error) {
            console.error("Error creating match:", error)
          }
        }
        
        setState("matched")
      } else {
        setState("no-match")
      }
    }, 1500)
  }

  const handleFindAnother = () => {
    cleanup()
    setPartner(null)
    setMyDecision(null)
    setPartnerDecision(null)
    setMatchId(null)
    setState("searching")
  }

  const handleGoHome = () => {
    cleanup()
    router.push("/home")
  }

  const handleGoToChat = () => {
    cleanup()
    if (matchId && !isDemoMode) {
      router.push(`/messages/${matchId}`)
    } else {
      router.push("/messages")
    }
  }

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setVideoEnabled(videoTrack.enabled)
      }
    }
  }

  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setAudioEnabled(audioTrack.enabled)
      }
    }
  }

  const displayName = profile?.display_name || "You"
  const callProgress = (callDuration / MIN_CALL_DURATION) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/90 via-primary to-primary/80 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/home" className="flex items-center">
            <Image
              src="/ginger-wordmark.png"
              alt="ginger"
              width={100}
              height={32}
              className="h-7 w-auto brightness-0 invert"
            />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleGoHome}
            className="text-background hover:bg-background/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center w-full max-w-6xl">
        {/* Searching State */}
        {state === "searching" && (
          <div className="text-center text-background">
            <Loader2 className="h-16 w-16 mx-auto mb-6 animate-spin" />
            <h2 className="text-2xl font-bold mb-2">Finding your vibe...</h2>
            <p className="text-background/80">Matching you with someone new</p>
          </div>
        )}

        {/* Connecting State */}
        {state === "connecting" && partner && (
          <div className="text-center text-background">
            <Avatar className="h-24 w-24 mx-auto mb-6 border-4 border-primary">
              <AvatarImage src={partner.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {partner.display_name?.slice(0, 2).toUpperCase() || "??"}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-2xl font-bold mb-2">Connecting with {partner.display_name}...</h2>
            <p className="text-background/80">Get ready to vibe!</p>
          </div>
        )}

        {/* In-Call State */}
        {state === "in-call" && partner && (
          <div className="w-full max-w-5xl">
            <div className="relative aspect-video bg-card rounded-2xl overflow-hidden shadow-2xl">
              {/* Remote Video (or placeholder) */}
              <div className="absolute inset-0 flex items-center justify-center bg-card">
                {!isDemoMode ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center">
                    <Avatar className="h-32 w-32 mx-auto mb-4">
                      <AvatarImage src={partner.avatar_url || undefined} />
                      <AvatarFallback className="bg-accent text-accent-foreground text-4xl">
                        {partner.display_name?.slice(0, 2).toUpperCase() || "??"}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-muted-foreground">
                      {partner.display_name}
                    </p>
                  </div>
                )}
              </div>

              {/* Local Video (Picture-in-Picture) */}
              <div className="absolute bottom-4 right-4 w-48 aspect-video bg-muted rounded-lg overflow-hidden shadow-lg border-2 border-background">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror"
                />
                {!videoEnabled && (
                  <div className="absolute inset-0 bg-muted flex items-center justify-center">
                    <VideoOff className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Call Duration & Progress */}
              <div className="absolute top-4 left-4 right-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-background bg-black/50 px-3 py-1 rounded-full">
                    {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, "0")}
                  </span>
                  {callDuration < MIN_CALL_DURATION && (
                    <span className="text-sm text-background bg-black/50 px-3 py-1 rounded-full">
                      {MIN_CALL_DURATION - callDuration}s until decision
                    </span>
                  )}
                </div>
                {callDuration < MIN_CALL_DURATION && (
                  <Progress value={callProgress} className="h-2" />
                )}
              </div>

              {/* Call Controls */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-14 w-14 rounded-full bg-background/90 hover:bg-background"
                  onClick={toggleAudio}
                >
                  {audioEnabled ? (
                    <Mic className="h-6 w-6" />
                  ) : (
                    <MicOff className="h-6 w-6" />
                  )}
                </Button>

                <Button
                  size="icon"
                  className="h-16 w-16 rounded-full bg-destructive hover:bg-destructive/90"
                  onClick={handleEndCall}
                  disabled={callDuration < MIN_CALL_DURATION}
                >
                  <PhoneOff className="h-7 w-7" />
                </Button>

                <Button
                  size="icon"
                  variant="outline"
                  className="h-14 w-14 rounded-full bg-background/90 hover:bg-background"
                  onClick={toggleVideo}
                >
                  {videoEnabled ? (
                    <Video className="h-6 w-6" />
                  ) : (
                    <VideoOff className="h-6 w-6" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Decision State */}
        {state === "decision" && partner && (
          <div className="text-center text-background max-w-md">
            <Avatar className="h-24 w-24 mx-auto mb-6 border-4 border-primary">
              <AvatarImage src={partner.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {partner.display_name?.slice(0, 2).toUpperCase() || "??"}
              </AvatarFallback>
            </Avatar>
            
            <h2 className="text-3xl font-bold mb-2">Did you feel the vibe?</h2>
            <p className="text-background/80 mb-8">
              Be honest. Do you want to match with {partner.display_name}?
            </p>
            
            {!myDecision ? (
              <div className="flex gap-4 justify-center">
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-background/90 hover:bg-background text-foreground px-8"
                  onClick={() => handleDecision("no")}
                >
                  <X className="mr-2 h-5 w-5" />
                  Not this time
                </Button>
                <Button
                  size="lg"
                  className="bg-background hover:bg-background/90 text-primary px-8"
                  onClick={() => handleDecision("yes")}
                >
                  <Heart className="mr-2 h-5 w-5" />
                  Yes, let's match!
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-lg">Waiting for {partner.display_name}'s decision...</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Matched State */}
        {state === "matched" && partner && (
          <Card className="max-w-md w-full border-none shadow-2xl">
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-center gap-4 mb-6">
                <Avatar className="h-20 w-20 border-4 border-primary">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Heart className="h-8 w-8 text-primary animate-pulse" />
                <Avatar className="h-20 w-20 border-4 border-primary">
                  <AvatarImage src={partner.avatar_url || undefined} />
                  <AvatarFallback className="bg-accent text-accent-foreground text-xl">
                    {partner.display_name?.slice(0, 2).toUpperCase() || "??"}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <h2 className="text-3xl font-bold text-card-foreground mb-2">It's a Match!</h2>
              <p className="text-muted-foreground mb-4">
                You and {partner.display_name} felt the vibe.
                {!isDemoMode && " Start a conversation!"}
              </p>
              
              {isDemoMode && (
                <p className="text-sm text-muted-foreground mb-6 bg-muted/50 p-3 rounded-lg">
                  This was a demo match. Invite friends to ginger to find real connections!
                </p>
              )}
              
              <div className="flex flex-col gap-3">
                {!isDemoMode && matchId && (
                  <Button
                    size="lg"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={handleGoToChat}
                  >
                    Send a Message
                  </Button>
                )}
                <Button
                  size="lg"
                  variant={isDemoMode ? "default" : "outline"}
                  className={isDemoMode ? "w-full bg-primary text-primary-foreground hover:bg-primary/90" : "w-full bg-transparent"}
                  onClick={handleFindAnother}
                >
                  Find Another Vibe
                </Button>
                {isDemoMode && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full bg-transparent"
                    onClick={handleGoHome}
                  >
                    Go Home
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Match State */}
        {state === "no-match" && partner && (
          <Card className="max-w-md w-full border-none shadow-2xl">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <X className="h-8 w-8 text-muted-foreground" />
              </div>
              
              <h2 className="text-2xl font-bold text-card-foreground mb-2">No match this time</h2>
              <p className="text-muted-foreground mb-8">
                That's okay! Not every vibe clicks. Keep looking!
              </p>
              
              <div className="flex flex-col gap-3">
                <Button
                  size="lg"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleFindAnother}
                >
                  Find Another Vibe
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={handleGoHome}
                >
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add mirror effect for local video */}
      <style jsx>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  )
}

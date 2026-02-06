"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Video, MessageCircle, User, LogOut, Settings, Sparkles, Heart, ArrowRight, Users, Clock, Zap } from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
}

interface Match {
  id: string
  user1_id: string
  user2_id: string
  matched_at: string
  user1: Profile
  user2: Profile
}

interface HomeClientProps {
  user: SupabaseUser
  profile: Profile | null
  matches: Match[]
}

export function HomeClient({ user, profile, matches }: HomeClientProps) {
  const [isSearching, setIsSearching] = useState(false)
  const [activeUsers, setActiveUsers] = useState(0)
  const [greeting, setGreeting] = useState("")
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Set greeting based on time of day
    const hour = new Date().getHours()
    if (hour < 12) setGreeting("Good morning")
    else if (hour < 18) setGreeting("Good afternoon")
    else setGreeting("Good evening")

    // Simulate active users count
    setActiveUsers(Math.floor(Math.random() * 300) + 150)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const handleFindVibe = () => {
    setIsSearching(true)
    router.push("/vibe")
  }

  const getMatchPartner = (match: Match): Profile => {
    return match.user1_id === user.id ? match.user2 : match.user1
  }

  const displayName = profile?.display_name || user.email?.split("@")[0] || "User"
  const initials = displayName.slice(0, 2).toUpperCase()
  const firstName = displayName.split(" ")[0]

  const recentMatches = matches.slice(0, 3)
  const unreadCount = matches.length

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Animated background */}
      <style jsx global>{`
        @keyframes pulse-ring {
          0% {
            transform: scale(0.95);
            opacity: 1;
          }
          100% {
            transform: scale(1.3);
            opacity: 0;
          }
        }
        .animate-pulse-ring {
          animation: pulse-ring 2s ease-out infinite;
        }
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        .animate-shimmer {
          background: linear-gradient(90deg, transparent 0%, rgba(217,119,6,0.1) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: shimmer 2s linear infinite;
        }
      `}</style>

      {/* Header */}
      <header className="w-full py-4 px-6 border-b border-border/50 bg-background/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/home" className="flex items-center">
            <Image
              src="/ginger-wordmark.png"
              alt="ginger"
              width={100}
              height={32}
              className="h-7 w-auto"
            />
          </Link>
          
          <div className="flex items-center gap-3">
            <Link href="/messages">
              <Button variant="ghost" size="icon" className="relative hover:bg-primary/10">
                <MessageCircle className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-medium animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </Link>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:ring-2 hover:ring-primary/20 transition-all">
                  <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                    <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center gap-3 p-3 border-b border-border">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
                <DropdownMenuItem onClick={() => router.push("/profile")} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Edit Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Welcome Section */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {greeting}, <span className="text-primary">{firstName}</span>!
            </h1>
            <p className="text-muted-foreground">Ready to find your next vibe?</p>
          </div>

          {/* Main CTA Card */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/80 border-0 shadow-2xl shadow-primary/25">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `url('/ginger-icon.png')`,
                backgroundSize: '80px 80px',
                backgroundRepeat: 'repeat',
              }} />
            </div>
            <CardContent className="relative z-10 p-8 text-center">
              {/* Active users indicator */}
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full mb-6">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-primary-foreground/90 text-sm font-medium">
                  {activeUsers} people looking for a vibe
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-primary-foreground mb-3">
                Find Your Vibe
              </h2>
              <p className="text-primary-foreground/80 mb-8 max-w-md mx-auto">
                Connect with someone new through a spontaneous video call. Real people, real chemistry.
              </p>

              {/* Pulsing button container */}
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-white/30 rounded-full animate-pulse-ring" />
                <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse-ring" style={{ animationDelay: "0.5s" }} />
                <Button
                  onClick={handleFindVibe}
                  disabled={isSearching}
                  size="lg"
                  className="relative bg-background text-primary hover:bg-background/90 text-lg px-10 py-7 rounded-full shadow-xl font-semibold transition-all hover:scale-105"
                >
                  {isSearching ? (
                    <>
                      <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                      Finding...
                    </>
                  ) : (
                    <>
                      <Video className="w-5 h-5 mr-2" />
                      Start Finding a Vibe
                    </>
                  )}
                </Button>
              </div>

              {/* Quick stats */}
              <div className="flex items-center justify-center gap-8 text-primary-foreground/70 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>30s calls</span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  <span>Free to match</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  <span>Instant connect</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-card/50 border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{matches.length}</div>
                <div className="text-sm text-muted-foreground">Matches</div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{activeUsers}</div>
                <div className="text-sm text-muted-foreground">Online Now</div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">Unlimited</div>
                <div className="text-sm text-muted-foreground">Vibes Left</div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Matches */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                Your Matches
              </h2>
              {matches.length > 0 && (
                <Link href="/messages">
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                    View All
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              )}
            </div>

            {matches.length > 0 ? (
              <div className="grid gap-3">
                {recentMatches.map((match) => {
                  const partner = getMatchPartner(match)
                  const matchDate = new Date(match.matched_at)
                  const timeAgo = getTimeAgo(matchDate)
                  
                  return (
                    <Link href={`/messages/${match.id}`} key={match.id}>
                      <Card className="bg-card/50 border-border/50 hover:border-primary/30 hover:bg-card hover:shadow-lg transition-all duration-200 group cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <Avatar className="h-14 w-14 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
                                <AvatarImage src={partner.avatar_url || undefined} />
                                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                  {partner.display_name?.slice(0, 2).toUpperCase() || "??"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-card" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                {partner.display_name || "Anonymous"}
                              </p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Heart className="w-3 h-3 text-primary fill-primary" />
                                Matched {timeAgo}
                              </p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-primary"
                            >
                              <MessageCircle className="w-5 h-5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <Card className="bg-card/30 border-dashed border-2 border-border/50">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Heart className="w-8 h-8 text-primary/50" />
                  </div>
                  <p className="text-foreground font-medium mb-2">No matches yet</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start finding vibes to make your first connection!
                  </p>
                  <Button onClick={handleFindVibe} variant="outline" className="border-primary/30 text-primary hover:bg-primary/5 bg-transparent">
                    <Video className="w-4 h-4 mr-2" />
                    Find a Vibe
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Tips Card */}
          <Card className="bg-gradient-to-r from-primary/5 to-transparent border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Pro Tip</h3>
                  <p className="text-sm text-muted-foreground">
                    The best vibes happen when you're yourself! Be genuine, smile, and let your personality shine through.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

// Helper function
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

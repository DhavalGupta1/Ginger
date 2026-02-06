import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import Image from "next/image"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, MessageCircle, Info } from "lucide-react"

const DAILY_CONVERSATION_LIMIT = 3

export default async function MessagesPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/login")
  }

  // Fetch today's conversation starts to show remaining limit
  const today = new Date().toISOString().split("T")[0]
  const { data: conversationStarts } = await supabase
    .from("daily_conversation_starts")
    .select("match_id")
    .eq("user_id", user.id)
    .eq("started_date", today)

  const conversationsStartedToday = conversationStarts?.length || 0
  const remainingConversations = DAILY_CONVERSATION_LIMIT - conversationsStartedToday

  // Fetch all matches with their latest message
  const { data: matches } = await supabase
    .from("matches")
    .select(`
      id,
      user1_id,
      user2_id,
      matched_at,
      user1:profiles!matches_user1_id_fkey(id, display_name, avatar_url),
      user2:profiles!matches_user2_id_fkey(id, display_name, avatar_url),
      messages(id, content, created_at, sender_id)
    `)
    .not("matched_at", "is", null)
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .order("matched_at", { ascending: false })

  const getPartner = (match: typeof matches extends (infer T)[] | null ? T : never) => {
    return match.user1_id === user.id ? match.user2 : match.user1
  }

  const getLatestMessage = (match: typeof matches extends (infer T)[] | null ? T : never) => {
    if (!match.messages || match.messages.length === 0) return null
    return match.messages.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (days === 1) {
      return "Yesterday"
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: "short" })
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="w-full py-4 px-6 border-b border-border">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link href="/home">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Image
              src="/ginger-icon.png"
              alt="ginger"
              width={32}
              height={32}
            />
            <h1 className="text-xl font-bold text-foreground">Messages</h1>
          </div>
        </div>
      </header>

      {/* Daily Conversation Limit Info */}
      <div className="px-6 py-3 bg-muted/30 border-b border-border">
        <div className="max-w-2xl mx-auto flex items-center gap-2 text-sm">
          <Info className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">
            You can start <span className="font-medium text-foreground">{remainingConversations}</span> new conversation{remainingConversations !== 1 ? "s" : ""} today.
            Unlimited messages in existing chats!
          </span>
        </div>
      </div>

      {/* Messages List */}
      <main className="flex-1 p-6">
        <div className="max-w-2xl mx-auto">
          {matches && matches.length > 0 ? (
            <div className="flex flex-col gap-3">
              {matches.map((match) => {
                const partner = getPartner(match)
                const latestMessage = getLatestMessage(match)
                const partnerInitials = (partner.display_name || "U").slice(0, 2).toUpperCase()
                
                return (
                  <Link key={match.id} href={`/messages/${match.id}`}>
                    <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-14 w-14">
                            <AvatarImage src={partner.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {partnerInitials}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-card-foreground">
                                {partner.display_name || "Anonymous"}
                              </span>
                              {latestMessage && (
                                <span className="text-xs text-muted-foreground">
                                  {formatTime(latestMessage.created_at)}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {latestMessage 
                                ? (latestMessage.sender_id === user.id ? "You: " : "") + latestMessage.content
                                : "Start the conversation!"
                              }
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">No matches yet</h2>
              <p className="text-muted-foreground mb-6">
                Start vibing to find your matches!
              </p>
              <Link href="/vibe">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Find a Vibe
                </Button>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

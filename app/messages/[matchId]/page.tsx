import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ChatClient } from "./chat-client"

interface ChatPageProps {
  params: Promise<{ matchId: string }>
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { matchId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/login")
  }

  // Fetch match with profiles
  const { data: match, error } = await supabase
    .from("matches")
    .select(`
      id,
      user1_id,
      user2_id,
      matched_at,
      user1:profiles!matches_user1_id_fkey(id, display_name, avatar_url),
      user2:profiles!matches_user2_id_fkey(id, display_name, avatar_url)
    `)
    .eq("id", matchId)
    .single()

  if (error || !match) {
    notFound()
  }

  // Verify user is part of this match
  if (match.user1_id !== user.id && match.user2_id !== user.id) {
    redirect("/messages")
  }

  // Fetch messages
  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true })

  const partner = match.user1_id === user.id ? match.user2 : match.user1

  return (
    <ChatClient 
      user={user} 
      match={match} 
      partner={partner}
      initialMessages={messages || []} 
    />
  )
}

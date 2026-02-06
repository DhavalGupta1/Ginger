import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { VibeClient } from "./vibe-client"

export default async function VibePage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/login")
  }

  // Fetch user profile with preferences for matching
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, gender, looking_for")
    .eq("id", user.id)
    .single()

  return (
    <VibeClient 
      user={user} 
      profile={profile} 
    />
  )
}

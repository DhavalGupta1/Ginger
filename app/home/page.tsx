import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { HomeClient } from "./home-client"

export default async function HomePage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/login")
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  // Check if profile setup is complete
  if (!profile?.profile_complete) {
    redirect("/setup")
  }

  // Fetch user's matches (confirmed matches where both said yes)
  const { data: matches } = await supabase
    .from("matches")
    .select(`
      id,
      user1_id,
      user2_id,
      matched_at,
      user1:profiles!matches_user1_id_fkey(id, display_name, avatar_url),
      user2:profiles!matches_user2_id_fkey(id, display_name, avatar_url)
    `)
    .not("matched_at", "is", null)
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .order("matched_at", { ascending: false })
    .limit(5)

  return <HomeClient user={user} profile={profile} matches={matches || []} />
}

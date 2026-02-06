import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SettingsClient } from "./settings-client"

export default async function SettingsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/login")
  }

  // Get profile data
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  // Get all interests
  const { data: allInterests } = await supabase
    .from("interests")
    .select("*")
    .order("category", { ascending: true })

  // Get user's selected interests
  const { data: userInterests } = await supabase
    .from("user_interests")
    .select("interest_id")
    .eq("user_id", user.id)

  const selectedInterestIds = userInterests?.map(ui => ui.interest_id) || []

  return (
    <SettingsClient 
      user={user} 
      profile={profile} 
      allInterests={allInterests || []}
      selectedInterestIds={selectedInterestIds}
    />
  )
}

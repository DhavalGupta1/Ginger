import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SetupClient } from "./setup-client"

export default async function SetupPage() {
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

  // If profile is already complete, redirect to home
  if (profile?.profile_complete) {
    redirect("/home")
  }

  // Fetch all interests for selection
  const { data: interests } = await supabase
    .from("interests")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true })

  return <SetupClient user={user} profile={profile} interests={interests || []} />
}

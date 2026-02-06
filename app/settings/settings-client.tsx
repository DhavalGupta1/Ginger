"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AvatarUpload } from "@/components/avatar-upload"
import { ArrowLeft, Loader2, LogOut, Save, MapPin, Check } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface Profile {
  id: string
  username: string | null
  display_name: string | null
  bio: string | null
  birthday: string | null
  location: string | null
  avatar_url: string | null
  gender: string | null
  looking_for: string | null
  latitude: number | null
  longitude: number | null
}

interface Interest {
  id: string
  name: string
  category: string
}

interface SettingsClientProps {
  user: User
  profile: Profile | null
  allInterests: Interest[]
  selectedInterestIds: string[]
}

export function SettingsClient({ user, profile, allInterests, selectedInterestIds }: SettingsClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [locating, setLocating] = useState(false)
  const [formData, setFormData] = useState({
    display_name: profile?.display_name || "",
    username: profile?.username || "",
    bio: profile?.bio || "",
    birthday: profile?.birthday || "",
    location: profile?.location || "",
    gender: profile?.gender || "",
    looking_for: profile?.looking_for || "",
  })
  const [selectedInterests, setSelectedInterests] = useState<string[]>(selectedInterestIds)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    profile?.latitude && profile?.longitude 
      ? { lat: profile.latitude, lng: profile.longitude }
      : null
  )

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev => 
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    )
  }

  const getLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser")
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        setCoords({ lat: latitude, lng: longitude })
        
        // Try to get location name from coordinates
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          )
          const data = await response.json()
          const city = data.address?.city || data.address?.town || data.address?.village || ""
          const state = data.address?.state || ""
          const locationStr = [city, state].filter(Boolean).join(", ")
          if (locationStr) {
            setFormData(prev => ({ ...prev, location: locationStr }))
          }
        } catch {
          // Silently fail - coordinates are still saved
        }
        
        setLocating(false)
      },
      () => {
        alert("Unable to retrieve your location")
        setLocating(false)
      }
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          ...formData,
          latitude: coords?.lat || null,
          longitude: coords?.lng || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (profileError) throw profileError

      // Update interests - delete all and re-insert
      await supabase
        .from("user_interests")
        .delete()
        .eq("user_id", user.id)

      if (selectedInterests.length > 0) {
        const { error: interestsError } = await supabase
          .from("user_interests")
          .insert(
            selectedInterests.map(interestId => ({
              user_id: user.id,
              interest_id: interestId,
            }))
          )

        if (interestsError) throw interestsError
      }

      router.refresh()
    } catch (error) {
      console.error("Error saving settings:", error)
      alert("Failed to save settings. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push("/")
  }

  // Group interests by category
  const interestsByCategory = allInterests.reduce((acc, interest) => {
    if (!acc[interest.category]) {
      acc[interest.category] = []
    }
    acc[interest.category].push(interest)
    return acc
  }, {} as Record<string, Interest[]>)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/home" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </Link>
          <h1 className="text-lg font-semibold text-foreground">Settings</h1>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="interests">Interests</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader className="text-center">
                <CardTitle>Your Photo</CardTitle>
                <CardDescription>
                  This is visible during video calls after you match
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <AvatarUpload
                  userId={user.id}
                  currentAvatarUrl={profile?.avatar_url}
                  displayName={formData.display_name}
                  size="xl"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Basic Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => handleInputChange("display_name", e.target.value)}
                    placeholder="How should we call you?"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => handleInputChange("username", e.target.value)}
                    placeholder="Choose a unique username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => handleInputChange("bio", e.target.value)}
                    placeholder="Tell us a bit about yourself..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthday">Birthday</Label>
                  <Input
                    id="birthday"
                    type="date"
                    value={formData.birthday}
                    onChange={(e) => handleInputChange("birthday", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <div className="flex gap-2">
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => handleInputChange("location", e.target.value)}
                      placeholder="City, State"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={getLocation}
                      disabled={locating}
                    >
                      {locating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MapPin className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {coords && (
                    <p className="text-xs text-muted-foreground">
                      Location detected for better matching
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Interests Tab */}
          <TabsContent value="interests" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Interests</CardTitle>
                <CardDescription>
                  Select interests to help us find better matches ({selectedInterests.length} selected)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(interestsByCategory).map(([category, interests]) => (
                  <div key={category} className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground">{category}</h3>
                    <div className="flex flex-wrap gap-2">
                      {interests.map((interest) => {
                        const isSelected = selectedInterests.includes(interest.id)
                        return (
                          <Badge
                            key={interest.id}
                            variant={isSelected ? "default" : "outline"}
                            className={cn(
                              "cursor-pointer transition-all hover:scale-105",
                              isSelected && "bg-primary text-primary-foreground"
                            )}
                            onClick={() => toggleInterest(interest.id)}
                          >
                            {isSelected && <Check className="h-3 w-3 mr-1" />}
                            {interest.name}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Dating Preferences</CardTitle>
                <CardDescription>
                  Help us show you the right people
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">I am a</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => handleInputChange("gender", value)}
                  >
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Select your gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="man">Man</SelectItem>
                      <SelectItem value="woman">Woman</SelectItem>
                      <SelectItem value="non-binary">Non-binary</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="looking_for">Looking for</Label>
                  <Select
                    value={formData.looking_for}
                    onValueChange={(value) => handleInputChange("looking_for", value)}
                  >
                    <SelectTrigger id="looking_for">
                      <SelectValue placeholder="Who are you interested in?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="men">Men</SelectItem>
                      <SelectItem value="women">Women</SelectItem>
                      <SelectItem value="everyone">Everyone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Signed in as <span className="font-medium text-foreground">{user.email}</span>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full"
                >
                  {loggingOut ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <LogOut className="h-4 w-4 mr-2" />
                  )}
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

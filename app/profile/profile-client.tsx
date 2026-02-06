"use client"

import React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Loader2, Check } from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface Profile {
  id: string
  display_name: string | null
  bio: string | null
  birthday: string | null
  location: string | null
  avatar_url: string | null
}

interface Interest {
  id: string
  name: string
  category: string
}

interface ProfileClientProps {
  user: SupabaseUser
  profile: Profile | null
  allInterests: Interest[]
  userInterestIds: string[]
}

export function ProfileClient({ user, profile, allInterests, userInterestIds }: ProfileClientProps) {
  const [displayName, setDisplayName] = useState(profile?.display_name || "")
  const [bio, setBio] = useState(profile?.bio || "")
  const [location, setLocation] = useState(profile?.location || "")
  const [birthday, setBirthday] = useState(profile?.birthday || "")
  const [selectedInterests, setSelectedInterests] = useState<string[]>(userInterestIds)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          display_name: displayName || null,
          bio: bio || null,
          location: location || null,
          birthday: birthday || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (profileError) throw profileError

      // Update interests - first delete all existing
      await supabase
        .from("user_interests")
        .delete()
        .eq("user_id", user.id)

      // Then insert new ones
      if (selectedInterests.length > 0) {
        const interestInserts = selectedInterests.map(interestId => ({
          user_id: user.id,
          interest_id: interestId,
        }))

        const { error: interestsError } = await supabase
          .from("user_interests")
          .insert(interestInserts)

        if (interestsError) throw interestsError
      }

      setSaved(true)
      router.refresh()
      
      // Reset saved state after 3 seconds
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile")
    } finally {
      setSaving(false)
    }
  }

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev => 
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    )
  }

  // Group interests by category
  const interestsByCategory = allInterests.reduce((acc, interest) => {
    if (!acc[interest.category]) {
      acc[interest.category] = []
    }
    acc[interest.category].push(interest)
    return acc
  }, {} as Record<string, Interest[]>)

  const initials = (displayName || user.email?.split("@")[0] || "U").slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="w-full py-4 px-6 border-b border-border">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link href="/home">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Image
              src="/ginger-icon.png"
              alt="ginger"
              width={36}
              height={36}
            />
            <h1 className="text-xl font-bold text-foreground">Edit Profile</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSave} className="flex flex-col gap-6">
            {/* Profile Picture */}
            <Card className="border-none shadow-md">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center">
                  <Avatar className="h-24 w-24 mb-4">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm text-muted-foreground">
                    Profile picture updates coming soon
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Basic Info */}
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle>Basic Info</CardTitle>
                <CardDescription>Tell others about yourself</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="How should we call you?"
                    maxLength={50}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Write a short bio about yourself..."
                    rows={3}
                    maxLength={300}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {bio.length}/300
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City, Country"
                    maxLength={100}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="birthday">Birthday</Label>
                  <Input
                    id="birthday"
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Interests */}
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle>Interests</CardTitle>
                <CardDescription>
                  Select interests to help find better matches ({selectedInterests.length} selected)
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                {Object.entries(interestsByCategory).map(([category, interests]) => (
                  <div key={category}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">{category}</h3>
                    <div className="flex flex-wrap gap-2">
                      {interests.map((interest) => {
                        const isSelected = selectedInterests.includes(interest.id)
                        return (
                          <Badge
                            key={interest.id}
                            variant={isSelected ? "default" : "outline"}
                            className={`cursor-pointer transition-colors ${
                              isSelected 
                                ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                                : "hover:bg-muted"
                            }`}
                            onClick={() => toggleInterest(interest.id)}
                          >
                            {interest.name}
                            {isSelected && <Check className="ml-1 h-3 w-3" />}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Error/Success Messages */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {saved && (
              <Alert className="border-green-500/50 bg-green-500/10">
                <Check className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-600">
                  Profile saved successfully!
                </AlertDescription>
              </Alert>
            )}

            {/* Save Button */}
            <Button 
              type="submit" 
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Profile"
              )}
            </Button>
          </form>
        </div>
      </main>
    </div>
  )
}

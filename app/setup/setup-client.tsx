"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { AvatarUpload } from "@/components/avatar-upload"
import type { User } from "@supabase/supabase-js"

interface Profile {
  id: string
  display_name: string | null
  bio: string | null
  birthday: string | null
  location: string | null
  avatar_url: string | null
  gender: string | null
  looking_for: string | null
}

interface Interest {
  id: string
  name: string
  category: string
}

interface SetupClientProps {
  user: User
  profile: Profile | null
  interests: Interest[]
}

export function SetupClient({ user, profile, interests }: SetupClientProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [displayName, setDisplayName] = useState(profile?.display_name || "")
  const [bio, setBio] = useState(profile?.bio || "")
  const [birthday, setBirthday] = useState(profile?.birthday || "")
  const [location, setLocation] = useState(profile?.location || "")
  const [gender, setGender] = useState(profile?.gender || "")
  const [lookingFor, setLookingFor] = useState(profile?.looking_for || "")
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "")

  const router = useRouter()
  const supabase = createClient()

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev =>
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    )
  }

  const handleNext = () => {
    if (step === 1 && displayName && birthday && location && gender && lookingFor) {
      setStep(2)
    }
  }

  const handleComplete = async () => {
    if (!displayName || !birthday || !location || !gender || !lookingFor) {
      return
    }

    setLoading(true)

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          bio: bio || null,
          birthday,
          location,
          gender,
          looking_for: lookingFor,
          avatar_url: avatarUrl || null,
          profile_complete: true,
        })
        .eq("id", user.id)

      if (profileError) throw profileError

      // Delete existing interests
      await supabase
        .from("user_interests")
        .delete()
        .eq("user_id", user.id)

      // Add selected interests
      if (selectedInterests.length > 0) {
        const interestRows = selectedInterests.map(interestId => ({
          user_id: user.id,
          interest_id: interestId,
        }))

        const { error: interestsError } = await supabase
          .from("user_interests")
          .insert(interestRows)

        if (interestsError) throw interestsError
      }

      router.push("/home")
    } catch (error) {
      console.error("Error completing setup:", error)
      setLoading(false)
    }
  }

  const interestsByCategory = interests.reduce((acc, interest) => {
    if (!acc[interest.category]) {
      acc[interest.category] = []
    }
    acc[interest.category].push(interest)
    return acc
  }, {} as Record<string, Interest[]>)

  const today = new Date().toISOString().split('T')[0]
  const eighteenYearsAgo = new Date()
  eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18)
  const maxDate = eighteenYearsAgo.toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/ginger-icon.png"
              alt="ginger"
              width={64}
              height={64}
            />
          </div>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>
            {step === 1 ? "Tell us about yourself" : "What are you interested in?"}
          </CardDescription>
          <div className="flex gap-2 mt-4 justify-center">
            <div className={`h-2 w-20 rounded-full transition-colors ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
            <div className={`h-2 w-20 rounded-full transition-colors ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 1 && (
            <>
              <div className="flex justify-center">
                <AvatarUpload
                  userId={user.id}
                  currentAvatarUrl={avatarUrl}
                  onUploadComplete={(url) => setAvatarUrl(url)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name *</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How should others see you?"
                  maxLength={50}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthday">Birthday *</Label>
                <Input
                  id="birthday"
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  max={maxDate}
                />
                <p className="text-xs text-muted-foreground">You must be 18 or older</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., New York, NY"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">I am *</Label>
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select...</option>
                  <option value="man">Man</option>
                  <option value="woman">Woman</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lookingFor">Looking for *</Label>
                <select
                  id="lookingFor"
                  value={lookingFor}
                  onChange={(e) => setLookingFor(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select...</option>
                  <option value="men">Men</option>
                  <option value="women">Women</option>
                  <option value="everyone">Everyone</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio (Optional)</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us a bit about yourself..."
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {bio.length}/500
                </p>
              </div>

              <Button
                onClick={handleNext}
                disabled={!displayName || !birthday || !location || !gender || !lookingFor}
                className="w-full"
                size="lg"
              >
                Next: Choose Interests
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select at least 3 interests to help find your vibe
                </p>

                {Object.entries(interestsByCategory).map(([category, categoryInterests]) => (
                  <div key={category} className="space-y-2">
                    <h3 className="font-semibold text-sm text-muted-foreground">{category}</h3>
                    <div className="flex flex-wrap gap-2">
                      {categoryInterests.map((interest) => (
                        <Badge
                          key={interest.id}
                          variant={selectedInterests.includes(interest.id) ? "default" : "outline"}
                          className="cursor-pointer hover:bg-primary/10 transition-colors"
                          onClick={() => toggleInterest(interest.id)}
                        >
                          {interest.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  Back
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={loading || selectedInterests.length < 3}
                  className="flex-1"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Complete Setup"
                  )}
                </Button>
              </div>

              {selectedInterests.length < 3 && (
                <p className="text-sm text-muted-foreground text-center">
                  Select at least {3 - selectedInterests.length} more interest(s)
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

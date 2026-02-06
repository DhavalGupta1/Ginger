"use client"

import React from "react"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface AvatarUploadProps {
  userId: string
  currentAvatarUrl?: string | null
  displayName?: string | null
  onUploadComplete?: (url: string) => void
  size?: "sm" | "md" | "lg" | "xl"
}

const sizeClasses = {
  sm: "h-16 w-16",
  md: "h-24 w-24",
  lg: "h-32 w-32",
  xl: "h-40 w-40",
}

export function AvatarUpload({
  userId,
  currentAvatarUrl,
  displayName,
  onUploadComplete,
  size = "lg",
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const getInitials = (name?: string | null) => {
    if (!name) return "?"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)

      if (!event.target.files || event.target.files.length === 0) {
        return
      }

      const file = event.target.files[0]
      const fileExt = file.name.split(".").pop()
      const filePath = `${userId}/${Date.now()}.${fileExt}`

      // Upload the file
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        throw uploadError
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath)

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("id", userId)

      if (updateError) {
        throw updateError
      }

      setAvatarUrl(publicUrl)
      onUploadComplete?.(publicUrl)
    } catch (error) {
      console.error("Error uploading avatar:", error)
      alert("Error uploading avatar. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    try {
      setUploading(true)
      
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null, updated_at: new Date().toISOString() })
        .eq("id", userId)

      if (error) throw error
      
      setAvatarUrl(null)
      onUploadComplete?.("")
    } catch (error) {
      console.error("Error removing avatar:", error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <Avatar className={cn(sizeClasses[size], "border-4 border-card shadow-lg")}>
          <AvatarImage src={avatarUrl || undefined} alt={displayName || "Profile"} />
          <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
        
        {/* Upload overlay */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-full",
            "bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity",
            "cursor-pointer disabled:cursor-not-allowed"
          )}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 text-background animate-spin" />
          ) : (
            <Camera className="h-8 w-8 text-background" />
          )}
        </button>

        {/* Remove button */}
        {avatarUrl && !uploading && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-1 -right-1 p-1 rounded-full bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        disabled={uploading}
        className="hidden"
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Camera className="mr-2 h-4 w-4" />
            {avatarUrl ? "Change Photo" : "Upload Photo"}
          </>
        )}
      </Button>
    </div>
  )
}

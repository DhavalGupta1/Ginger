"use client"

import React from "react"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Send } from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
}

interface Match {
  id: string
  user1_id: string
  user2_id: string
  matched_at: string
  user1: Profile
  user2: Profile
}

interface Message {
  id: string
  match_id: string
  sender_id: string
  content: string
  created_at: string
}

interface ChatClientProps {
  user: SupabaseUser
  match: Match
  partner: Profile
  initialMessages: Message[]
}

const DAILY_MESSAGE_LIMIT = 10 // Define DAILY_MESSAGE_LIMIT

export function ChatClient({ user, match, partner, initialMessages }: ChatClientProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [messageCount, setMessageCount] = useState(0) // Initialize messageCount
  const [remainingMessages, setRemainingMessages] = useState(DAILY_MESSAGE_LIMIT) // Initialize remainingMessages
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const canSendMessage = messageCount < DAILY_MESSAGE_LIMIT // Define canSendMessage

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Subscribe to new messages
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${match.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${match.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => [...prev, newMsg])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [match.id, supabase])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || sending) return

    setSending(true)
    const messageContent = newMessage.trim()
    setNewMessage("")

    try {
      // Check if this is the first message from the user in this conversation
      const isFirstMessage = !messages.some(m => m.sender_id === user.id)
      
      // If first message, record the conversation start for daily limit tracking
      if (isFirstMessage) {
        const today = new Date().toISOString().split("T")[0]
        
        // Try to insert (will fail silently if already exists for today)
        await supabase
          .from("daily_conversation_starts")
          .insert({
            user_id: user.id,
            match_id: match.id,
            started_date: today,
          })
          .select()
          .single()
        
        // Note: If this fails due to unique constraint, it means they already
        // started this conversation today, so we continue anyway
      }

      // Insert message
      const { data: insertedMessage, error: messageError } = await supabase
        .from("messages")
        .insert({
          match_id: match.id,
          sender_id: user.id,
          content: messageContent,
        })
        .select()
        .single()

      if (messageError) throw messageError

      // Add message to local state if not already added via subscription
      if (insertedMessage) {
        setMessages((prev) => {
          if (prev.find((m) => m.id === insertedMessage.id)) return prev
          return [...prev, insertedMessage]
        })
      }
    } catch (error) {
      console.error("Failed to send message:", error)
      setNewMessage(messageContent) // Restore message on error
    } finally {
      setSending(false)
    }
  }

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return "Today"
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday"
    } else {
      return date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })
    }
  }

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatMessageDate(message.created_at)
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(message)
    return groups
  }, {} as Record<string, Message[]>)

  const partnerInitials = (partner.display_name || "U").slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="w-full py-3 px-4 border-b border-border bg-card">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/messages">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          
          <Avatar className="h-10 w-10">
            <AvatarImage src={partner.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {partnerInitials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-card-foreground truncate">
              {partner.display_name || "Anonymous"}
            </h1>
          </div>
          
          <Link href="/home" className="shrink-0">
            <Image
              src="/ginger-icon.png"
              alt="ginger"
              width={32}
              height={32}
            />
          </Link>
        </div>
      </header>



      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-2">
                This is the beginning of your conversation with {partner.display_name || "your match"}.
              </p>
              <p className="text-sm text-muted-foreground">
                Say hi and start vibing!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {Object.entries(groupedMessages).map(([date, dateMessages]) => (
                <div key={date}>
                  {/* Date Separator */}
                  <div className="flex items-center justify-center my-4">
                    <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                      {date}
                    </span>
                  </div>
                  
                  {/* Messages */}
                  <div className="flex flex-col gap-2">
                    {dateMessages.map((message) => {
                      const isOwn = message.sender_id === user.id
                      
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                              isOwn
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-card text-card-foreground rounded-bl-md shadow-sm"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {message.content}
                            </p>
                            <p className={`text-xs mt-1 ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                              {formatMessageTime(message.created_at)}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* Message Input */}
      <footer className="w-full py-4 px-4 border-t border-border bg-card">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
              disabled={sending}
              maxLength={500}
            />
            <Button 
              type="submit" 
              size="icon"
              className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={!newMessage.trim() || sending}
            >
              <Send className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </footer>
    </div>
  )
}

"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MessageCircle, Video, Heart, Shield, Sparkles, Clock, ArrowRight, Play, Star, Users, Zap } from "lucide-react"
import { useEffect, useState, useRef } from "react"

// Animated counter component
function AnimatedCounter({ end, duration = 2000, suffix = "" }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const [hasAnimated, setHasAnimated] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true)
          let start = 0
          const increment = end / (duration / 16)
          const timer = setInterval(() => {
            start += increment
            if (start >= end) {
              setCount(end)
              clearInterval(timer)
            } else {
              setCount(Math.floor(start))
            }
          }, 16)
        }
      },
      { threshold: 0.5 }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [end, duration, hasAnimated])

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

// Floating hearts animation
function FloatingHearts() {
  const [hearts, setHearts] = useState<Array<{ id: number; x: number; delay: number; duration: number; size: number }>>([])

  useEffect(() => {
    const newHearts = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 4,
      size: 12 + Math.random() * 16
    }))
    setHearts(newHearts)
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {hearts.map((heart) => (
        <div
          key={heart.id}
          className="absolute animate-float-up text-primary/20"
          style={{
            left: `${heart.x}%`,
            bottom: "-20px",
            animationDelay: `${heart.delay}s`,
            animationDuration: `${heart.duration}s`,
          }}
        >
          <Heart className="fill-current" style={{ width: heart.size, height: heart.size }} />
        </div>
      ))}
    </div>
  )
}

// Logo pattern background
function LogoPattern() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
      <div className="absolute inset-0" style={{
        backgroundImage: `url('/ginger-icon.png')`,
        backgroundSize: '60px 60px',
        backgroundRepeat: 'repeat',
      }} />
    </div>
  )
}

// Testimonial card with animation
function TestimonialCard({ quote, name, age, delay }: { quote: string; name: string; age: number; delay: number }) {
  return (
    <Card 
      className="bg-card/50 backdrop-blur border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1"
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="p-6">
        <div className="flex gap-1 mb-3">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-4 h-4 fill-primary text-primary" />
          ))}
        </div>
        <p className="text-foreground/80 mb-4 italic">"{quote}"</p>
        <p className="text-sm text-muted-foreground">{name}, {age}</p>
      </CardContent>
    </Card>
  )
}

export default function Page() {
  const [activeUsers] = useState(Math.floor(Math.random() * 500) + 1200)

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Global Styles */}
      <style jsx global>{`
        @keyframes float-up {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-float-up {
          animation: float-up linear infinite;
        }
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(217, 119, 6, 0.3);
          }
          50% {
            box-shadow: 0 0 40px rgba(217, 119, 6, 0.6);
          }
        }
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
        @keyframes gradient-shift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient-shift 3s ease infinite;
        }
        @keyframes bounce-subtle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
      `}</style>

      {/* Navigation */}
      <header className="w-full py-4 px-6 bg-background/80 backdrop-blur-lg border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center group">
            <Image 
              src="/ginger-wordmark.png" 
              alt="ginger" 
              width={120} 
              height={40}
              className="h-8 w-auto transition-transform group-hover:scale-105"
              priority
            />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-foreground/80 hover:text-foreground">
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 px-6 bg-gradient-to-b from-primary/5 via-background to-background overflow-hidden">
        <FloatingHearts />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <div className="flex-1 text-center lg:text-left">
              {/* Live indicator */}
              <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-600 px-4 py-2 rounded-full mb-6">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium">{activeUsers} people online now</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
                Find Your
                <span className="text-primary block mt-2">Perfect Vibe</span>
              </h1>
              
              <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
                Skip the endless swiping. Connect face-to-face through spontaneous video calls and discover genuine chemistry in seconds.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href="/signup">
                  <Button 
                    size="lg" 
                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6 shadow-xl shadow-primary/30 hover:shadow-primary/50 transition-all animate-pulse-glow"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Start Finding Vibes
                  </Button>
                </Link>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="w-full sm:w-auto text-lg px-8 py-6 border-2 hover:bg-primary/5 bg-transparent"
                >
                  <Play className="w-5 h-5 mr-2" />
                  See How It Works
                </Button>
              </div>

              {/* Trust badges */}
              <div className="flex items-center gap-6 mt-10 justify-center lg:justify-start text-muted-foreground text-sm">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span>Verified profiles</span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-primary" />
                  <span>50k+ matches</span>
                </div>
              </div>
            </div>

            {/* Hero visual */}
            <div className="flex-1 relative">
              <div className="relative w-full max-w-md mx-auto">
                {/* Phone mockup */}
                <div className="relative bg-gradient-to-br from-primary/20 to-primary/5 rounded-[3rem] p-4 shadow-2xl">
                  <div className="bg-foreground/5 rounded-[2.5rem] overflow-hidden aspect-[9/16] relative">
                    {/* Video call UI mockup */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-24 h-24 rounded-full bg-primary/30 mx-auto mb-4 flex items-center justify-center animate-bounce-subtle">
                          <Video className="w-10 h-10 text-primary" />
                        </div>
                        <p className="text-foreground font-medium">Live video calls</p>
                        <p className="text-muted-foreground text-sm">Real connections, real chemistry</p>
                      </div>
                    </div>
                    
                    {/* Small video overlay */}
                    <div className="absolute bottom-4 right-4 w-20 h-28 bg-foreground/10 rounded-xl border-2 border-background/50" />
                  </div>
                </div>

                {/* Floating elements */}
                <div className="absolute -left-8 top-1/4 bg-card p-3 rounded-xl shadow-lg animate-bounce-subtle">
                  <Heart className="w-6 h-6 text-red-500 fill-red-500" />
                </div>
                <div className="absolute -right-8 top-1/2 bg-card p-3 rounded-xl shadow-lg animate-bounce-subtle" style={{ animationDelay: "0.5s" }}>
                  <MessageCircle className="w-6 h-6 text-primary" />
                </div>
                <div className="absolute -left-4 bottom-1/4 bg-card px-3 py-2 rounded-full shadow-lg">
                  <span className="text-sm font-medium">It's a match!</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6 bg-primary/5 relative">
        <LogoPattern />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: 50000, suffix: "+", label: "Happy Matches" },
              { value: 120000, suffix: "+", label: "Video Calls" },
              { value: 4.8, suffix: "", label: "App Rating" },
              { value: 30, suffix: "s", label: "Avg. Match Time" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 relative">
        <LogoPattern />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              How <span className="text-primary">ginger</span> Works
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Finding your person has never been this fun and authentic
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Video,
                title: "Find a Vibe",
                description: "Tap the button and instantly connect with someone through live video",
                step: "01"
              },
              {
                icon: Clock,
                title: "30 Second Chat",
                description: "Have a quick conversation to feel out the chemistry between you",
                step: "02"
              },
              {
                icon: Heart,
                title: "Match & Connect",
                description: "If you both feel it, match and continue the conversation",
                step: "03"
              }
            ].map((item, i) => (
              <Card key={i} className="relative bg-card/50 border-border/50 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group overflow-hidden">
                <CardContent className="p-8 text-center relative z-10">
                  <div className="absolute top-4 right-4 text-6xl font-bold text-primary/10 group-hover:text-primary/20 transition-colors">
                    {item.step}
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-primary/20 transition-all">
                    <item.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-background to-primary/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
                Why People Love <span className="text-primary">ginger</span>
              </h2>
              <div className="space-y-6">
                {[
                  {
                    icon: Zap,
                    title: "Instant Chemistry Check",
                    description: "Know within seconds if there's a real connection - no more wasted time on dead-end chats"
                  },
                  {
                    icon: Shield,
                    title: "Safe & Verified",
                    description: "All users are verified. Report and block features keep the community safe"
                  },
                  {
                    icon: Users,
                    title: "Real People, Real Vibes",
                    description: "No catfishing, no misleading photos - just authentic video connections"
                  },
                  {
                    icon: MessageCircle,
                    title: "Seamless Messaging",
                    description: "Once you match, continue the conversation through our built-in chat"
                  }
                ].map((feature, i) => (
                  <div key={i} className="flex gap-4 group">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                      <p className="text-muted-foreground text-sm">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature visual */}
            <div className="relative">
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl p-8 relative overflow-hidden">
                <LogoPattern />
                <div className="relative z-10 space-y-4">
                  {/* Match notification mockup */}
                  <div className="bg-card rounded-xl p-4 shadow-lg flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <Heart className="w-6 h-6 text-primary fill-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">New Match!</p>
                      <p className="text-sm text-muted-foreground">You and Alex both felt the vibe</p>
                    </div>
                  </div>
                  
                  {/* Message preview mockup */}
                  <div className="bg-card rounded-xl p-4 shadow-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20" />
                      <div>
                        <p className="font-medium text-sm">Alex</p>
                        <p className="text-xs text-green-500">Online now</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="bg-muted rounded-lg p-2 text-sm max-w-[80%]">
                        That was such a fun call!
                      </div>
                      <div className="bg-primary text-primary-foreground rounded-lg p-2 text-sm max-w-[80%] ml-auto">
                        I know right? Coffee this weekend?
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 relative overflow-hidden">
        <FloatingHearts />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Love Stories Start Here
            </h2>
            <p className="text-muted-foreground text-lg">
              Real stories from real people who found their vibe
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <TestimonialCard
              quote="I was so tired of dating apps. Ginger felt different from the first call - now I'm 6 months into the best relationship of my life!"
              name="Sarah"
              age={28}
              delay={0}
            />
            <TestimonialCard
              quote="The video calls cut through all the small talk. I knew within 30 seconds that she was special. We're getting married next spring!"
              name="Michael"
              age={32}
              delay={100}
            />
            <TestimonialCard
              quote="Finally an app that values real connection over superficial swiping. Met my girlfriend here after just two vibes!"
              name="Jamie"
              age={26}
              delay={200}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-primary to-primary/80 relative overflow-hidden">
        <LogoPattern />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-6">
            Ready to Find Your Vibe?
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of people discovering genuine connections through live video. Your perfect match could be one call away.
          </p>
          <Link href="/signup">
            <Button 
              size="lg" 
              className="bg-background text-foreground hover:bg-background/90 text-lg px-10 py-6 shadow-xl"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <p className="text-primary-foreground/60 text-sm mt-4">
            Free to join. No credit card required.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-card border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center">
              <Image 
                src="/ginger-wordmark.png" 
                alt="ginger" 
                width={100} 
                height={32}
                className="h-6 w-auto opacity-70 hover:opacity-100 transition-opacity"
              />
            </Link>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Support</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Contact</Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 ginger. Made with <Heart className="w-3 h-3 inline text-primary fill-primary" />
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

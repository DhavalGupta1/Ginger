#  GINGER

### Intentional Dating Through Real Conversations

GINGER is a conversation-first dating platform that prioritizes genuine human connection over endless swiping. Built for people tired of superficial matches and disposable conversations.

---

## 🎯 The Problem

Modern dating apps have created a broken user experience:

- **Shallow matching** based on curated photos rather than genuine compatibility
- **Attention overload** from juggling dozens of simultaneous conversations
- **Low-effort interactions** that lead to ghosting and dating fatigue
- **Quantity over quality** optimization that makes every match feel disposable

---

## 💡 The Solution

GINGER flips the script: **talk first, decide later**.

### Core Features

#### 🎙️ Live Conversation Matching
- Tap "Find a Vibe" to connect one-on-one with a verified user
- No swiping through profiles, no multitasking between people
- Voice or video interaction that continues until someone chooses to skip or match
- Decisions based on real conversation, not curated photos

#### 🤝 Mutual Interest Only
- Both users independently decide after the conversation
- Match created only when both swipe right
- No awkward one-sided matches or spam in your DMs
- Silent rejection preserves dignity for both parties

#### 💬 Message Scarcity System
- **3 daily chat credits** per user
- Starting a new conversation consumes one credit
- Unlimited replies within active conversations
- Recipients see a subtle indicator showing intentional choice

#### 🔒 Safety First
- Mandatory profile verification before live interactions
- Strictly one-to-one conversations
- Skip at any time without explanation
- Built-in moderation and reporting mechanisms

---

## 🏗️ Technical Architecture

### Tech Stack

**Frontend:**
- React Native (cross-platform iOS/Android)
- TypeScript for type safety
- Redux for state management
- WebRTC for live audio/video

**Backend:**
- Node.js with Express
- PostgreSQL for relational data
- Redis for real-time matching queue
- Socket.io for live connections

**Infrastructure:**
- AWS for hosting and storage
- Twilio for video infrastructure
- Firebase for push notifications

### Key Systems

**Matching Algorithm**
```
1. User enters matching queue
2. System pairs users based on preferences + availability
3. Live connection established via WebRTC
4. Conversation continues until skip/swipe
5. Mutual interest check
6. Match creation or silent dismissal
```

**Message Credit System**
```
- Daily credit reset at midnight local time
- Credits consumed only on first message to new match
- Active conversations persist beyond credit limit
- Visual indicators show credit usage to recipients
```

---

## 🚀 Getting Started

### Prerequisites

```bash
node >= 18.0.0
npm >= 9.0.0
PostgreSQL >= 14
Redis >= 7.0
```

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ginger.git
cd ginger

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

### Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/ginger
REDIS_URL=redis://localhost:6379
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_API_KEY=your_api_key
JWT_SECRET=your_jwt_secret
```

---

## 📱 MVP Scope

This MVP focuses on demonstrating:

- ✅ Conversation-first matching flow
- ✅ Live voice/video connection logic
- ✅ Message scarcity mechanics
- ✅ Mutual interest matching
- ✅ Basic user verification
- ✅ Core safety features

**Out of scope for MVP:**
- Advanced matching algorithms
- In-app payments/monetization
- Detailed analytics dashboard
- Full production scalability

---

## 🎨 Design Philosophy

### Intentionality Over Volume

GINGER is not designed to maximize matches. It's designed to help users find the **right** connection by:

- Respecting time and attention
- Encouraging meaningful effort
- Reducing emotional waste
- Creating accountability through scarcity

### Conversation as Filter

Photos can be curated. Bios can be polished. But real-time conversation reveals:

- Communication style
- Sense of humor
- Energy and vibe
- Genuine compatibility

---

## 🗺️ Roadmap

### Phase 1: MVP (Current)
- [ ] Core matching system
- [ ] Live voice/video connections
- [ ] Message credit mechanics
- [ ] Basic verification flow

### Phase 2: Enhancement
- [ ] Advanced preference filters
- [ ] Conversation quality signals
- [ ] Enhanced safety features
- [ ] Profile customization options

### Phase 3: Growth
- [ ] Referral system
- [ ] Premium features
- [ ] Community features
- [ ] Analytics and insights

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

Built for people who believe meaningful connection is worth the wait.

---

<div align="center">

**GINGER** • Match on Vibe, Not Looks

[Live Demo](https://v0-gingerda.vercel.app)

</div>

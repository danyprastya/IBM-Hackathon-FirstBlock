# FirstBlock

AI-powered business idea assistant to help aspiring entrepreneurs lay their "first block" of business foundation.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required variables:
- Firebase credentials (client + admin)
- IBM Watsonx API credentials

### 3. **IMPORTANT: Deploy Firestore Rules**

Before running the app, you MUST deploy Firestore security rules:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firestore (if not done)
firebase init firestore
# Select your Firebase project
# Use existing firestore.rules and firestore.indexes.json

# Deploy rules and indexes
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

**Without deploying rules, you'll get "missing or insufficient permissions" errors!**

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
firstblock/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Auth pages (login, register)
│   ├── (main)/              # Protected pages (workspace, onboarding)
│   ├── api/                 # API routes
│   │   ├── ai/             # Watsonx AI endpoints
│   │   ├── onboarding/     # Onboarding data
│   │   └── sticky/         # Sticky notes CRUD
│   ├── layout.tsx          # Root layout with AuthProvider
│   └── page.tsx            # Landing page
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── chat/               # Chat UI components
│   ├── sticky/             # Sticky notes components
│   ├── layout/             # Sidebar, WorkspaceLayout
│   └── landing/            # Landing page sections
├── lib/
│   ├── firebase/           # Firebase client + admin
│   ├── watsonx/            # Watsonx AI client
│   ├── contexts/           # React contexts (Auth)
│   └── utils/              # Validators, sanitize, rate limit
├── hooks/                  # Custom React hooks
├── firestore.rules         # Firestore security rules
├── firestore.indexes.json  # Firestore composite indexes
└── DEPLOYMENT.md           # Full deployment guide
```

---

## 🔒 Security Features

✅ **Authentication:** Firebase Auth (Email/Password + Google)  
✅ **Authorization:** Firestore security rules (user-scoped queries)  
✅ **Input Validation:** Zod schemas on all API routes  
✅ **XSS Prevention:** Sanitization of all user inputs  
✅ **CSRF Protection:** Origin/Referer header validation  
✅ **IDOR Prevention:** User ID verification on all queries  
✅ **Rate Limiting:** 30 requests/hour on AI endpoint  
✅ **SSRF Protection:** Whitelisted external URLs only  
✅ **Security Headers:** X-Frame-Options, CSP, etc.

---

## 🎨 Features

### 1. **AI Business Assistant**
- Personalized advice based on user profile
- Business idea suggestions ranked by feasibility
- Structured action plans with numbered checklists
- Powered by IBM Watsonx Granite 3-8B model

### 2. **Onboarding System**
- 4-step profile collection
- Captures: location, experience, capital, skills, interests, time, concerns, goals
- Data used to personalize all AI responses

### 3. **Sticky Notes**
- Create, edit, delete notes
- 6 preset colors
- Persistent storage in Firestore
- Perfect for brainstorming

### 4. **Chat History**
- All conversations saved to Firestore
- Load last 50 messages on workspace mount
- Checklist detection and special rendering

---

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **AI:** IBM Watsonx.ai (Granite 3-8B)
- **Auth:** Firebase Authentication
- **Database:** Cloud Firestore
- **Deployment:** Vercel
- **State:** React Context + Zustand

---

## 📦 Key Dependencies

```json
{
  "next": "^15.1.6",
  "react": "^19.0.0",
  "firebase": "^11.2.0",
  "firebase-admin": "^13.0.2",
  "zod": "^3.24.1",
  "tailwindcss": "^4.0.0"
}
```

---

## 🚢 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment instructions.

**Quick Deploy to Vercel:**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Don't forget to:**
1. Deploy Firestore rules first
2. Set all environment variables in Vercel
3. Add Vercel domain to Firebase authorized domains

---

## 🐛 Troubleshooting

### "Missing or insufficient permissions"
**Cause:** Firestore rules not deployed  
**Fix:** Run `firebase deploy --only firestore:rules`

### "Failed to fetch" or CORS errors
**Cause:** Firebase Auth domain not authorized  
**Fix:** Add your domain to Firebase Console → Authentication → Settings → Authorized domains

### Chat messages not saving
**Cause:** Firestore indexes not created  
**Fix:** Run `firebase deploy --only firestore:indexes`

---

## 📝 Environment Variables

### Client-side (NEXT_PUBLIC_)
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### Server-side (SECRET)
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `WATSONX_API_KEY`
- `WATSONX_API_URL`
- `WATSONX_PROJECT_ID`

---

## 🔐 Firestore Security Rules

Rules ensure:
- Users can only read/write their own data
- All operations require authentication
- Messages are immutable after creation
- User documents can't be deleted via Firestore

See `firestore.rules` for full implementation.

---

## 📊 Firestore Collections

### users
```typescript
{
  email: string
  name: string
  onboardingCompleted: boolean
  onboarding: {
    location, experience, capital, skills,
    interests, hoursPerWeek, concern, goal
  }
  rateLimit: { count, windowStart }
  createdAt: timestamp
}
```

### messages
```typescript
{
  userId: string
  role: "user" | "assistant"
  content: string
  timestamp: timestamp
}
```

### stickies
```typescript
{
  userId: string
  content: string
  color: string (hex)
  createdAt: timestamp
  updatedAt: timestamp
}
```

---

## 🎯 Roadmap

- [ ] Multiple projects per user
- [ ] Export chat history
- [ ] Business plan generator
- [ ] Collaboration features
- [ ] Mobile app

---

## 📄 License

MIT

---

## 🤝 Contributing

Contributions welcome! Please read AGENTS.md for development guidelines.

---

**Built with IBM Bob** 🤖

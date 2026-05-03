// Static content and data arrays for the application
// Centralized content management - modify here to update frontend

// ─── Onboarding Options (Figma-matched) ───────────────────────────

export const EXPERIENCE_OPTIONS = [
  { value: "never", label: "This is my first time", emoji: "🌱" },
  { value: "tried", label: "I've started something before", emoji: "🔄" },
  { value: "running", label: "I'm running a business now", emoji: "🚀" },
  { value: "experienced", label: "I have business experience but nothing active right now", emoji: "💡" },
] as const;

export const CAPITAL_OPTIONS = [
  { value: "<500", label: "Just my time\n(under $100)" },
  { value: "500-2000", label: "A small budget\n($500 – $2K)" },
  { value: "2000-10000", label: "A moderate budget\n($2K – $10K)" },
  { value: "10000+", label: "$10K+\nto invest" },
] as const;

export const HOURS_OPTIONS = [
  { value: "<10", label: "A few hours\non the side" },
  { value: "10-20", label: "Part-time\n(~10–20 hrs)" },
  { value: "20-40", label: "Serious commitment\n(~20–40 hrs)" },
  { value: "fulltime", label: "Full-time —\nI'm all in" },
] as const;

export const SKILLS_OPTIONS = [
  { label: "Tech & Programming", emoji: "💻" },
  { label: "Marketing & Sales", emoji: "📣" },
  { label: "Design & Creative", emoji: "🎨" },
  { label: "Writing & Content", emoji: "✍️" },
  { label: "Finance & Operations", emoji: "📊" },
  { label: "People & Networking", emoji: "🤝" },
  { label: "Hands-on & Building", emoji: "🔧" },
  { label: "Teaching & Coaching", emoji: "🎓" },
] as const;

export const INTERESTS_OPTIONS = [
  { label: "Food & Beverage", emoji: "🍔" },
  { label: "Education", emoji: "🎁" },
  { label: "Health & Fitness", emoji: "💪" },
  { label: "E-commerce & Retail", emoji: "🏪" },
  { label: "Home & Lifestyle", emoji: "🏠" },
  { label: "B2B & Services", emoji: "🏢" },
  { label: "Gaming & Entertainment", emoji: "🎮" },
] as const;

// ─── Landing Page Content ─────────────────────────────────────────

export const LANDING_FEATURES = [
  {
    title: "AI-Powered Guidance",
    description:
      "Get personalized business advice from IBM Watsonx AI, tailored to your unique profile, skills, and resources.",
    icon: "brain",
  },
  {
    title: "Structured Checklists",
    description:
      "Receive actionable, step-by-step research checklists to validate and launch your business idea with confidence.",
    icon: "list-checks",
  },
  {
    title: "Visual Brainstorming",
    description:
      "Organize your thoughts with color-coded sticky notes. Capture ideas, tasks, and insights in one workspace.",
    icon: "sticky-note",
  },
] as const;

export const STICKY_COLORS = [
  { name: "Yellow", value: "#fef08a" },
  { name: "Pink", value: "#fbcfe8" },
  { name: "Blue", value: "#bfdbfe" },
  { name: "Green", value: "#bbf7d0" },
  { name: "Purple", value: "#e9d5ff" },
  { name: "Orange", value: "#fed7aa" },
] as const;

export const APP_METADATA = {
  name: "FirstBlock",
  tagline: "Where your first block is laid",
  description:
    "AI-powered business idea assistant helping aspiring entrepreneurs take their first step from day zero to launch.",
} as const;

// Made with Bob

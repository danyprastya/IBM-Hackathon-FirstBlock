// Static content and data arrays for the application
// Centralized content management - modify here to update frontend

export const SKILLS_OPTIONS = [
  "Technology & Programming",
  "Marketing & Sales",
  "Finance & Accounting",
  "Operations & Logistics",
  "Creative & Design",
  "Customer Service",
  "Project Management",
  "Writing & Content",
  "Teaching & Training",
  "Healthcare",
] as const;

export const INTERESTS_OPTIONS = [
  "Food & Beverage",
  "Fashion & Apparel",
  "Technology & Software",
  "Education & Training",
  "Health & Wellness",
  "Retail & E-commerce",
  "Professional Services",
  "Entertainment & Media",
  "Home & Garden",
  "Travel & Hospitality",
] as const;

export const EXPERIENCE_OPTIONS = [
  { value: "never", label: "Never started a business" },
  { value: "tried", label: "Have tried before" },
  { value: "running", label: "Currently running a business" },
] as const;

export const CAPITAL_OPTIONS = [
  { value: "<500", label: "Less than $500" },
  { value: "500-2000", label: "$500 - $2,000" },
  { value: "2000-10000", label: "$2,000 - $10,000" },
  { value: "10000+", label: "More than $10,000" },
] as const;

export const HOURS_OPTIONS = [
  { value: "<10", label: "Less than 10 hours/week" },
  { value: "10-20", label: "10-20 hours/week" },
  { value: "20-40", label: "20-40 hours/week" },
  { value: "fulltime", label: "Full-time (40+ hours/week)" },
] as const;

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

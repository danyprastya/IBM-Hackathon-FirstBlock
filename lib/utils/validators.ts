// Zod validation schemas for all API routes
import { z } from "zod";

// Onboarding form validation
export const onboardingSchema = z.object({
  location: z.string().min(1, "Location is required").max(100),
  experience: z.enum(["never", "tried", "running"]),
  capital: z.enum(["<500", "500-2000", "2000-10000", "10000+"]),
  skills: z.array(z.string()).min(1, "Select at least one skill"),
  interests: z.array(z.string()).min(1, "Select at least one interest"),
  hoursPerWeek: z.enum(["<10", "10-20", "20-40", "fulltime"]),
  concern: z.string().min(1, "Please share your main concern").max(500),
  goal: z.string().min(1, "Please share your 1-year goal").max(500),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

// Chat message validation
export const chatMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(2000, "Message too long (max 2000 characters)"),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;

// Sticky note validation
export const stickyNoteSchema = z.object({
  content: z
    .string()
    .min(1, "Content cannot be empty")
    .max(500, "Content too long (max 500 characters)"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color format"),
});

export type StickyNoteInput = z.infer<typeof stickyNoteSchema>;

// Sticky note update validation
export const stickyNoteUpdateSchema = z.object({
  id: z.string().min(1, "Sticky note ID is required"),
  content: z
    .string()
    .min(1, "Content cannot be empty")
    .max(500, "Content too long (max 500 characters)")
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color format")
    .optional(),
});

export type StickyNoteUpdateInput = z.infer<typeof stickyNoteUpdateSchema>;

// Sticky note delete validation
export const stickyNoteDeleteSchema = z.object({
  id: z.string().min(1, "Sticky note ID is required"),
});

export type StickyNoteDeleteInput = z.infer<typeof stickyNoteDeleteSchema>;

// Made with Bob

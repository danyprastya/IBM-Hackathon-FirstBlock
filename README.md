# FirstBlock: Business Idea Assistant

## Overview
FirstBlock is an AI-powered business idea assistant built to help aspiring entrepreneurs navigate "day zero" of their startup journey. Many founders have raw concepts but lack the necessary structure, validation frameworks, and actionable next steps. FirstBlock bridges this gap by providing a professional, workspace environment integrated with an intelligent AI advisor. Its primary purpose is to help users brainstorm effectively, structure their concepts, and lay the critical "first block" of their business foundation.

## Core Problem & Solution
**The Problem:** The initial phase of starting a business is often chaotic. Entrepreneurs struggle to organize their thoughts, conduct deep market research, and apply proven business frameworks without feeling overwhelmed.

**The Solution:** FirstBlock offers a unified platform that combines dynamic planning tools with an AI-driven advisor powered by IBM Watsonx. It transitions users from abstract ideas to concrete, structured business strategies through contextual chat, real-time data synchronization, and automated background research.

## Key Features

- **Intelligent Workspace Environment:** A clean, structured interface that seamlessly integrates chat functionalities, planning tools, and real-time data synchronization for an uninterrupted workflow.
- **AI Business Advisor:** Powered by IBM Watsonx.ai, the advisor provides context-aware brainstorming and strategy planning. It utilizes established business frameworks, such as the Lean Startup methodology and Business Model Canvas, to validate and refine user ideas.
- **Automated Background Research:** FirstBlock handles complex, multi-step market and problem research tasks asynchronously via Trigger.dev. This allows the system to gather deep insights while the user focuses on other tasks.
- **Visual Idea Organization:** Built-in sticky notes and dynamic checklist tracking allow users to visually organize their thoughts, iterate on plans, and maintain momentum.
- **Adaptive Profile Context:** Through a tailored onboarding process, the AI advisor learns about the user's specific experience level, available capital, skills, and goals. All subsequent interactions and strategies are customized to fit this unique profile.

## Technology Stack

- **Framework & Language:** Next.js 16+ (App Router) and TypeScript
- **Styling:** Tailwind CSS 4 with shadcn/ui components
- **AI Provider:** IBM Watsonx.ai (Server-side REST API integration)
- **Authentication:** Firebase Auth (Client and Admin SDKs)
- **Database:** Firebase Firestore (Client and Admin SDKs)
- **Background Processing:** Trigger.dev v3 (for long-running agent tasks)
- **State Management:** React Context and Custom Hooks
- **Data Validation:** Zod

## Security & Architecture

FirstBlock is built with robust security considerations:
- **Authentication & Authorization:** All data access and API routes are strictly protected using Firebase Admin token verification. Firestore Security Rules enforce owner-only access for all collections.
- **Data Protection:** State-mutating requests are protected against Cross-Site Request Forgery (CSRF). All user inputs are sanitized to prevent Cross-Site Scripting (XSS), and strict input validation is enforced via Zod schemas.
- **API Security:** Server-Side Request Forgery (SSRF) mitigations are in place for AI API calls. Additionally, API rate limiting (tracked via Firestore) prevents abuse of the Watsonx endpoint.
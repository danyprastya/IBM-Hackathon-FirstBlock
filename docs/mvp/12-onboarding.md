# 12 — Onboarding

The deployed app collects a founder profile via a multi-step onboarding form before letting the user into the workspace. The profile feeds directly into every agent's system prompt — without it, ProblemResearch, SolutionGenerator, SolutionResearch, Scope, Metrics, and PhaseAgent can't calibrate their output to the founder's actual constraints (capital, hours, skills).

## Flow

1. New user signs up (email+pw or Google) at `/login` or `/register`.
2. `AuthContext.signUp` / `signInWithGoogle` writes `users/{uid}` with `onboardingCompleted: false`.
3. Page-level guard redirects to `/onboarding` if the user doc has `onboardingCompleted === false`.
4. User fills the onboarding form (`app/(main)/onboarding/page.tsx`).
5. Submit posts to `POST /api/onboarding` → server validates → writes `onboarding` subobject to `users/{uid}` and sets `onboardingCompleted: true`.
6. Redirect to `/workspace`.

After completion, the workspace's `useUserData()` hook surfaces `userData.onboarding`, which is read by every agent route to build the founder profile.

## Form fields

Source: `lib/utils/validators.ts` (`onboardingSchema`) + `lib/data/content.ts` (option lists).

| Field | Type | Constraints | Use in agent prompts |
|---|---|---|---|
| `location` | string | required, ≤100 chars | localized market signals, regulatory considerations |
| `experience` | enum | `"never" \| "tried" \| "running"` | tone calibration in PhaseAgent feature suggestions |
| `capital` | enum | `"<500" \| "500-2000" \| "2000-10000" \| "10000+"` | Scope (what's buildable), Metrics (paid acquisition cap) |
| `skills` | string[] | min 1 | SolutionGenerator (which directions are realistic), SolutionResearch (founder edge), Scope (build-cost reality check) |
| `interests` | string[] | min 1 | not yet wired into agent prompts; reserved for future "suggest problems" feature |
| `hoursPerWeek` | enum | `"<10" \| "10-20" \| "20-40" \| "fulltime"` | PhaseAgent effort estimation (`~X weeks at Y hours/week`) |
| `concern` | string | required, ≤500 chars | bias acknowledgment in ProblemResearch verdict |
| `goal` | string | required, ≤500 chars | Metrics calibration (does the metric move the founder toward this goal in 1 year?) |

Static option lists for `skills`, `interests`, `locations` etc. live in `lib/data/content.ts`.

## API route

`app/api/onboarding/route.ts` (POST):

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/apiAuth";
import { adminDb } from "@/lib/firebase/admin";
import { onboardingSchema } from "@/lib/utils/validators";
import { sanitizeText } from "@/lib/utils/sanitize";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    const body = await req.json();
    const validation = onboardingSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input", details: validation.error.errors }, { status: 400 });
    }
    const data = validation.data;

    const sanitized = {
      location: sanitizeText(data.location, 200),
      experience: data.experience,
      capital: data.capital,
      skills: data.skills,
      interests: data.interests,
      hoursPerWeek: data.hoursPerWeek,
      concern: sanitizeText(data.concern, 500),
      goal: sanitizeText(data.goal, 500),
    };

    await adminDb.collection("users").doc(userId).update({
      onboarding: sanitized,
      onboardingCompleted: true,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

`concern` and `goal` are **sanitized but not rewritten**. Founder text reaches agents verbatim.

## How agents read the profile

Every agent route fetches the user doc once at the top:

```ts
const userDoc = await adminDb.doc(PATHS.user(userId)).get();
const founderProfile = userDoc.data()?.onboarding || null;
```

Then passes `founderProfile` into the `AgentExecutionContext`. The executor (`lib/agents/executor.ts`) injects it into the user message:

```
Founder profile:
- Location: <location>
- Capital: <capital>
- Skills: <skills.join(", ")>
- Hours/week: <hoursPerWeek>
- Concern: <concern>
- Goal: <goal>
```

Each agent's system prompt template references these fields by name (`{{founder.capital}}`, `{{founder.skills}}`, etc. — see `lib/agents/prompts.ts`).

## Re-onboarding

There is no UI today to update the profile after initial onboarding. To change it, edit the user doc directly via Firestore Console. A future addition: a `/profile` page that re-uses the onboarding form.

## Verifying

1. Register a fresh account.
2. Confirm redirect to `/onboarding`.
3. Submit the form.
4. In Firestore Console, verify `users/{uid}.onboarding` matches the input verbatim and `onboardingCompleted = true`.
5. Submit a problem and run research. In the agent's system prompt logs, confirm the founder profile fields appear in the user message.
6. Sign out + sign in → land directly on `/workspace`, not `/onboarding`.

# AI Mystery Room - System Specification & Architecture

## 1. Overview
The AI Mystery Room is an interactive, full-stack investigative puzzle application powered by Google Gemini and Node.js. Players take the role of a lead detective investigating dynamically generated procedural murder mysteries and intrigue cases.

Players examine crime scenes, inspect forensic evidence, interrogate suspects, review alibis, uncover contradictions, and make formal accusations. The system strictly guards the hidden culprit on the server side and ensures fair, logically consistent gameplay.

---

## 2. System Architecture & Requirements

### Requirement 1: Frontend and Backend Startup
- **Backend**: Node.js & Express server listening on configurable `PORT` (default `5000` or `process.env.PORT`). Provides health check endpoint `GET /api/health`.
- **Frontend**: Responsive single-page application served statically by the backend or via dev server, with modern UI, dark noir theme, animations, and zero broken assets.
- **Unified Scripts**: `npm start` launches the server; `npm test` runs the complete automated test suite; `npm run dev` supports hot reloading.

### Requirement 2: MongoDB Connection & Persistence
- Connects to MongoDB via Mongoose or URI defined in `MONGODB_URI`.
- Automatic fallback: If external MongoDB daemon is not running, seamlessly activates an embedded storage engine (`mongodb-memory-server` or file-backed database) so the app runs out-of-the-box in all environments without crash.
- Models:
  - `MysteryCase`: Stores full case details (case title, narrative, crime, location, suspects, clues, and server-only solution).
  - `InvestigationSession`: Stores session state (`sessionId`, `caseId`, `viewedEvidenceIds`, `accusations`, `attemptsRemaining`, `status`: `'active' | 'solved' | 'failed'`, `notes`, `accusedSuspectId`, timestamps).

### Requirement 3: Gemini-Powered Mystery Generation
- Integrates Google Gemini Generative AI SDK (`@google/genai` or `@google/generative-ai`) using `GEMINI_API_KEY`.
- Endpoint: `POST /api/cases/generate` accepting options:
  - `theme` (e.g., Victorian Manor, Cyberpunk Penthouse, Art Deco Train, Coastal Lighthouse, High-Tech Lab)
  - `difficulty` (`easy`, `medium`, `hard`)
- Prompt engineering instructs Gemini to output structured JSON with coherent clues, distinct suspects, verifiable alibis, and exactly one guilty culprit.
- Graceful resilience: Detects rate limits, network timeouts, or missing API keys, with verified fallback case generator when live credentials are unavailable.

### Requirement 4: Generated-Case Schema and Logical Consistency Validation
- Enforces strict schema validation on every generated mystery:
  - `title`: Non-empty string
  - `synopsis`: Background narrative
  - `crime`: Details of the incident
  - `setting`: Location and atmosphere
  - `suspects`: Array of 3 to 6 suspect objects:
    - `id`: Unique identifier (e.g., `suspect_1`)
    - `name`: Full name
    - `occupation`: Role or relationship
    - `motive`: Motive statement or secret
    - `alibi`: Whereabouts and story
    - `statement`: Testimony given during interrogation
    - `suspicionLevel`: Initial suspicion metric
  - `evidence`: Array of 4 to 8 evidence items:
    - `id`: Unique identifier (e.g., `evidence_1`)
    - `title`: Short title
    - `description`: Detailed forensic or visual description
    - `type`: `physical` | `testimonial` | `forensic` | `digital`
    - `locationFound`: Crime scene area
    - `relevance`: Clue significance
  - `solution` (Server-only):
    - `culpritId`: Must match one valid `suspects[i].id`
    - `motive`: The true reason behind the crime
    - `method`: How the crime was executed
    - `conclusiveEvidenceId`: Evidence ID that definitively breaks the culprit's alibi
    - `explanation`: Full breakdown of why other suspects are innocent and why the culprit is guilty
- Logical consistency checks verify:
  - Exactly one culprit.
  - Culprit exists in suspect roster.
  - Conclusive evidence exists in evidence roster.
  - Innocent suspects have alibis that cannot be broken by conclusive evidence.

### Requirement 5: Suspect and Evidence Rendering
- **Crime Briefing**: Crime synopsis, victim details, timeline, and ambient investigation log.
- **Suspects Dossier**: Cards displaying suspect avatars, roles, interrogation dialogue, and motives.
- **Evidence Locker / Crime Lab**: Interactive cards with badges for evidence types (Physical, Forensic, Testimonial, Digital), locations, and detail inspection modals.
- **Investigation Pinboard**: Visual corkboard view linking clues and suspects.

### Requirement 6: Evidence-View Tracking
- Endpoint: `POST /api/sessions/:sessionId/evidence/:evidenceId/view`
- Idempotently marks evidence as viewed in MongoDB session.
- Tracks timestamp and total evidence viewed count.
- UI displays "Examined" status badge and updates detective progress bar.

### Requirement 7: Investigation Progress Restoration
- Endpoint: `GET /api/sessions/:sessionId`
- Restores full session state upon page reload or revisit:
  - Current case data (with hidden fields protected)
  - All viewed evidence IDs
  - Prior accusation attempts and feedback
  - Player detective notes
  - Case status (`active`, `solved`, `failed`)
- LocalStorage persists active `sessionId` on client.

### Requirement 8: Correct and Incorrect Accusations
- Endpoint: `POST /api/sessions/:sessionId/accuse`
- Request body: `{ suspectId: string, rationale?: string }`
- Rules:
  - Initial `attemptsRemaining`: 3
  - If incorrect suspect:
    - Decrements `attemptsRemaining`.
    - If `attemptsRemaining > 0`, status remains `'active'`, returns clue/hint critique without revealing the true culprit.
    - If `attemptsRemaining == 0`, status changes to `'failed'` (Case Cold).
  - If correct suspect:
    - Sets status to `'solved'`!
    - Calculates detective rating (e.g., Master Sleuth, Inspector, Junior Detective) based on attempts and evidence viewed.
    - Authorizes solution disclosure.

### Requirement 9: Backend Protection of Hidden Culprit
- **Critical Security Constraint**:
  - `GET /api/cases/:id` and `GET /api/sessions/:sessionId` MUST strip:
    - `case.solution`
    - `culpritId`
    - `conclusiveEvidenceId`
    - Any spoiler notes or internal guilt flags
  - Inspecting DOM, JavaScript state, network payloads, or storage MUST NEVER reveal the culprit prior to authorized solution reveal.

### Requirement 10: Solution-Reveal Authorization
- Endpoint: `GET /api/sessions/:sessionId/solution`
- Strict access control:
  - Status `'active'`: Returns HTTP `403 Forbidden` with `{ error: "Solution is locked. You must solve the case or conclude all attempts first." }`.
  - Status `'solved'` or `'failed'`: Returns HTTP `200 OK` with full case breakdown, culprit confession, method, and conclusive evidence analysis.

### Requirement 11: Error Handling and Rate Limiting
- Rate limiting middleware on API routes:
  - Global API rate limiter (e.g., 100 requests / 15 min).
  - Strict generation rate limiter on `POST /api/cases/generate` (e.g., 10 requests / 10 min).
  - Strict accusation limiter on `POST /api/sessions/:sessionId/accuse` (e.g., 15 requests / 5 min).
- Centralized error handler returning structured JSON:
  - `{ success: false, error: string, statusCode: number }`
- Input validation on all session IDs, suspect IDs, and request payloads.

### Requirement 12: Responsive Layouts
- Fully responsive design using modern CSS Grid and Flexbox:
  - Mobile (< 768px): Single-column dossier tabs, sticky navigation, compact cards.
  - Tablet (768px - 1024px): 2-column layout.
  - Desktop (> 1024px): Multi-column split detective dashboard (Briefing + Pinboard + Dossier + Interrogation + Evidence Locker).
- Visual Aesthetics: Dark mystery noir aesthetic, glassmorphic panels, glowing neon accents, elegant typography ('Cinzel', 'Outfit', 'JetBrains Mono').

### Requirement 13: Automated Tests
- Full automated test suite using Jest / Vitest and Supertest:
  1. Startup and health check tests.
  2. Database persistence & schema validation tests.
  3. Logical consistency validator tests (valid cases pass, corrupt cases reject).
  4. Hidden culprit stripping tests (culprit is omitted from case & session GET).
  5. Evidence viewing tracking tests.
  6. Accusation logic tests (correct vs incorrect vs strike-out).
  7. Solution-reveal authorization tests (403 for active, 200 for solved/failed).
  8. Rate limiting tests.
  9. Live vs. Mocked Gemini tests:
     - Clear distinction between live Gemini API tests and mock test suite.
     - Live test verifies real communication with Google Gemini when `GEMINI_API_KEY` is present.
     - Mock test validates behavior under network isolation.

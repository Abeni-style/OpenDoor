# OpenDoor — 3 to 4 minute live product demonstration

## Before the call
1. Extract the website ZIP.
2. Open a terminal in the `opendoor` folder.
3. Run `python -m http.server 8000`.
4. Open `http://localhost:8000` in Chrome.
5. Keep the pitch PDF open as a backup.

## Demo sequence

**0:00–0:25 — Homepage**  
Introduce OpenDoor as a student opportunity and development platform. Click **Take the 3-minute tour**.

**0:25–1:00 — Opportunity Explorer**  
Search for a provider and show category, country, age, grade, funding and source-status filters. Explain that the 52-item starter directory is not a list of 52 currently open, verified opportunities.

**1:00–1:35 — Smart Matcher**  
Use a fictional profile. Show that the matcher distinguishes matched, conflicting and unknown requirements. Explain that an unknown field is not treated as eligibility and the organizer makes final decisions.

**1:35–2:10 — Student Academy**  
Open a course, show a lesson, practical exercise and knowledge check. The catalogue has 12 courses, 36 lessons and 24 knowledge-check questions.

**2:10–2:45 — Prepare & Apply / Student Workspace**  
Show CV and essay planning templates, save an opportunity, track an application and add a task. Explain that progress is stored locally in this browser in the current prototype.

**2:45–3:15 — OpenDoor Guide**  
Open the chat assistant and ask “What does fully funded mean?” In standalone mode, this uses the built-in offline guidance library, not a live generative AI model. A live AI endpoint can be connected after secure backend deployment.

**3:15–3:35 — Data, privacy and roadmap**  
Show Data & Sources. Explain discovery leads, source review, official links and the need for scheduled ingestion and human verification. Be clear that cloud accounts, shared reviews, billing and automatic global feed sync are not activated.

## Troubleshooting
- If port 8000 is busy, use `python -m http.server 8080` and open `http://localhost:8080`.
- If the live AI service is not configured, the offline guide still responds to common student questions.
- If screen sharing fails, use the pitch PDF.
- Use fictional demo student details; do not enter sensitive personal information.

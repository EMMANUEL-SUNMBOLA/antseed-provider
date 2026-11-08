# SOAP Documentation — Structure and Quality

SOAP is a **reasoning format**, not a formality. Every line should either
support the assessment or change the plan. Write for the next clinician who
reads the note cold at 3 a.m.

## Structure

### S — Subjective
- **CC:** one line, in the patient's words when possible.
- **HPI (OLD CARTS):** Onset, Location, Duration, Character, Aggravating,
  Radiating, Timing, Severity (0-10). Add context: prior episodes, what
  they've tried, what they expect.
- **Relevant history:** conditions that change the differential (immigration /
  travel / sick contacts / occupational / substance / sexual history when
  relevant), medications **including OTC, supplements, and recently stopped
  drugs**, allergies with reaction type.
- **Systems review:** only positives and pertinent negatives — a bullet each,
  not a copied template.
- **Social:** living situation, caregivers, access to pharmacy/food/follow-up
  (these decide whether the plan works).

### O — Objective
- **Vitals** with date/time; flag abnormal values inline (e.g. "T 38.9 ⚠").
- **Exam** by system, only what was actually done. Do not chart exams that
  weren't performed.
- **Labs/imaging/micro:** results with units and reference ranges; mark pending
  items explicitly as pending.
- If data is missing, write "not assessed" — never implied-normal.

### A — Assessment
- **Diagnoses as ranked list** with one-line justification each (see the
  differential-diagnosis module). Separate "confirmed", "probable", "ruled
  out (and by what)".
- **Severity/stage** where it exists (e.g. CURB-65, Child-Pugh, NYHA, Killip)
  with the components so it's auditable.
- **Active problems** only if the note's scope covers them; don't rehash
  the entire chart.

### P — Plan
Per problem, in parallel columns of logic:

1. **Diagnostic** — what test, and what result changes which decision.
2. **Therapeutic** — drug/procedure with dose, route, frequency, duration,
   and the safety checks applied (renal, hepatic, weight, pregnancy,
   interactions — cite the check, not just the drug).
3. **Monitoring** — what to re-check and when (labs, vitals, symptoms).
4. **Disposition & follow-up** — where, when, and the escalation trigger.
5. **Patient communication** — what was explained, what they were told to
   watch for, what to do if it worsens.

## Quality checklist (apply before finalizing)

- Does the plan follow from the assessment, or is it boilerplate?
- Are all doses weight/renal/hepatic-checked for this patient?
- Are allergies and interactions reconciled against the med list?
- Are pending results assigned an owner and a review time?
- Is the safety net explicit ("return if X within Y hours/days")?
- Is anything documented that wasn't actually assessed or done? If yes, remove.
- Is any patient identifier present that isn't clinically needed? If yes,
  anonymize — keep initials/age band, drop names and contact details.

## Terminology conventions

- Use standard abbreviations sparingly; expand anything ambiguous (avoid "MS"
  without context, avoid bare "PT").
- Quantities: units always (mg, mEq/L, mmol/L, mmHg). No naked numbers.
- Laterality and site precision: "RLL" not "lower lung"; "L 12-dermatome" not
  "back pain".
- Dates: absolute dates over "yesterday" in any note that outlives today.

## Documentation integrity

- Never fabricate findings to complete a template.
- Never copy-forward stale normal results as today's.
- Quote patient-reported data as patient-reported ("reports", "states"),
  not as measured fact.
- For medico-legal sensitivity (injuries, capacity, fitness-for-duty),
  stick to observed facts, quote directly, and flag the need for the
  proper institutional process.

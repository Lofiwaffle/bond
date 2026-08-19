# Research Brief: Evidence-Based Couples Habits → Bond App Features

**Prepared:** August 12, 2026
**Sources:** Gottman Institute (40+ years longitudinal research), Canary & Stafford (relationship maintenance meta-analyses), Bowlby/Ainsworth/Johnson (attachment theory & EFT), Seligman (positive psychology), peer-reviewed relationship science

---

## Executive Summary

Relationship science converges on **5 high-leverage habit categories** that predict long-term connection. All are encodable as lightweight app mechanics. Priority order by impact/effort:

| Rank | Habit Category | Research Backing | App Mechanics | Effort |
|------|----------------|------------------|---------------|--------|
| 1 | **Bid responsiveness** (turning toward) | Gottman: 86% divorce prediction accuracy; bids turned toward → 5:1 positive:negative ratio | Micro-prompts to notice/respond to partner's bids; daily "bid log" | Low |
| 2 | **Structured appreciation/gratitude** | Gottman "fondness & admiration"; Algoe et al. 2013: gratitude → commitment boost; Lambert et al. 2010: gratitude → relationship maintenance | Daily 1-tap appreciation; weekly "gratitude roundup" notification | Low |
| 3 | **Weekly State-of-Union check-in** | Gottman Principle 5 ("Solve Solvable Problems"); Markman et al. PREP: weekly 30-min structured dialogue → 30% divorce reduction | Guided 10-min template (appreciation → concerns → requests → planning) | Medium |
| 4 | **Shared meaning rituals** | Gottman Principle 6 ("Create Shared Meaning"); Fiese et al. 2002: family rituals → cohesion | Co-create recurring rituals (morning coffee, Sunday walk); streak tracking | Low-Med |
| 5 | **Conflict repair attempts** | Gottman: repair attempts = #1 predictor of conflict success; EFT: accessing primary emotions under reactivity | "Repair card" library; post-conflict debrief prompt; emotion-labeling practice | Medium |

---

## 1. The Science: What Actually Strengthens Connection

### Gottman's "Sound Relationship House" (40+ years, 3,000+ couples)
| Principle | Core Finding | App-Translatable Behavior |
|-----------|--------------|---------------------------|
| **1. Build Love Maps** | Knowing partner's inner world predicts stability | Daily curiosity questions |
| **2. Share Fondness & Admiration** | 5:1 positive:negative ratio in stable couples | Micro-appreciations |
| **3. Turn Toward Instead of Away** | **Bids for connection** turned toward → 86% accuracy predicting divorce | Bid logging + response prompts |
| **4. Let Partner Influence You** | Accepting influence = power sharing | Joint decision logging |
| **5. Solve Solvable Problems** | Soft startup + repair attempts de-escalate | Weekly structured check-in |
| **6. Overcome Gridlock** | Dialogue about dreams within conflict | "Dream catcher" prompt for perpetual issues |
| **7. Create Shared Meaning** | Rituals, roles, goals, symbols = culture | Co-created ritual tracker |

**Key metric:** Couples who **turn toward bids 86% of the time** stay together; those who turn toward 33% divorce (Gottman & Levenson, 1999).

### Canary & Stafford's 5 Maintenance Strategies (Meta-analysis: 50+ studies)
| Strategy | Behavior | Effect Size (r) on Satisfaction |
|----------|----------|--------------------------------|
| **Positivity** | Cheerful, upbeat interactions | .46 |
| **Openness** | Self-disclosure, talking about relationship | .41 |
| **Assurances** | Reaffirming commitment, future talk | .38 |
| **Social Networks** | Shared friends, family integration | .29 |
| **Sharing Tasks** | Equitable division of labor | .34 |

*Routine maintenance* (daily micro-behaviors) predicts satisfaction more than *strategic* (planned) efforts (Dindia & Canary, 1993).

### Attachment Theory + EFT (Bowlby → Johnson)
- **Secure base behavior**: Accessibility, Responsiveness, Engagement (ARE) → safety to explore
- **EFT change mechanism**: Access primary emotion (fear, sadness) → express need → partner responds → new cycle
- **App implication**: Prompt for *primary emotion labeling* ("I feel scared we're drifting" vs. "You never listen")

### Positive Psychology (Seligman, Algoe, Fredrickson)
- **Gratitude interventions**: 2-week daily gratitude → sustained 6-month relationship boost (Algoe et al., 2013)
- **Capitalization** (sharing good news + enthusiastic response) → intimacy (Gable et al., 2004)
- **Positive emotion ratio**: 3:1 positive:negative → flourishing (Fredrickson & Losada, 2005)

---

## 2. Encodability Assessment: What an App Can/Cannot Do

### ✅ HIGHLY ENCODABLE (Low friction, high fidelity)

| Habit | App Mechanic | Why It Works |
|-------|--------------|--------------|
| **Bid awareness** | Push: "Did you notice a bid from [partner] today?" → Tap "Turned toward" / "Missed" | Makes invisible behavior visible; 2-tap logging |
| **Daily appreciation** | 1-tap "💛" button sends micro-note; weekly digest | Leverages capitalization; asynchronous = low pressure |
| **Weekly check-in** | 10-min guided flow (timer, prompts, shared notes) | Structure prevents avoidance; PREP-validated |
| **Ritual streaks** | Co-create recurring events; streak counter + celebration | Behavioral psychology: streaks → identity ("we're a couple who...") |
| **Conflict repair** | "Repair attempt" button library (humor, apology, "I hear you", break request) | Gottman: repair *attempt* matters more than success |
| **Emotion labeling** | Post-conflict: "What were you feeling underneath?" → wheel picker | EFT: naming primary emotion → regulation |
| **Dream dialogue** | Quarterly prompt: "What's a dream you haven't shared?" → shared doc | Gottman Principle 6: gridlock = buried dreams |

### ⚠️ PARTIALLY ENCODABLE (App supports, doesn't replace)

| Habit | App Role | Limitation |
|-------|----------|------------|
| **Physical affection** | Reminder/tracking only | Touch requires presence |
| **Sexual intimacy** | Desire/initiations log (opt-in) | Sensitive; pressure risk |
| **Deep listening** | Timer + "reflect back" prompt | Skill requires practice, not just prompt |
| **Shared activities** | Calendar sync + suggestion engine | Execution is offline |

### ❌ NOT MEANINGFULLY ENCODABLE

| Domain | Why |
|--------|-----|
| **Therapy-level trauma processing** | Requires trained clinician; safety risk |
| **Real-time conflict mediation** | App presence during fight = escalation risk |
| **Partner's internal state** | Can't read mind; only self-report |
| **Behavior change without buy-in** | Nagging notifications backfire (reactance) |

---

## 3. Concrete Feature Recommendations (Prioritized)

### P0 — Ship First (High Impact, Low Effort)

#### 1. Daily Bid Log (Gottman Principle 3)
```
UX: Morning push → "Any bids from [partner] yesterday?"
     ├─ "Yes, I turned toward" → +1 streak
     ├─ "Yes, but I missed it" → gentle repair prompt
     └─ "No bids noticed" → curiosity prompt: "What might they have needed?"
Data: Bid response rate % (target: >80%)
```
**Citation:** Gottman & Levenson (1999) *J. Marriage Fam.* 61:59–66

#### 2. One-Tap Appreciation (Gottman Principle 2 + Algoe 2013)
```
UX: Floating "💛" button → tap → select category (Support, Humor, Effort, Presence, Other)
     → auto-sends: "Appreciated your [category] just now 💛"
Weekly: "Your Gratitude Roundup" — 3-column card (You gave / Partner gave / Shared)
```
**Citation:** Algoe et al. (2013) *Emotion* 13(4):605–614

#### 3. Shared Ritual Tracker (Gottman Principle 7 + Fiese 2002)
```
UX: Co-create ritual → "Sunday walk, 30 min, phones away"
     → Recurrence + streak counter + "How connected did you feel?" (1-5)
Celebration: 7-day, 30-day, 100-day milestones → unlock "ritual badge"
```
**Citation:** Fiese et al. (2002) *J. Fam. Psychol.* 16(4):381–390

---

### P1 — Core Engagement Loop (Medium Effort)

#### 4. Weekly "Us Time" Check-In (PREP / Gottman Principle 5)
```
Structure (10 min, guided):
1. APPRECIATION (2 min) — Each shares 1 thing
2. CALENDAR SYNC (2 min) — Logistics only
3. CONCERN/REQUEST (4 min) — "I felt X when Y; I'd love Z" (soft startup template)
4. DREAM/DESIRE (2 min) — Rotating: "Something I want us to build/experience"
Output: Shared note + action items (auto-sync to calendar)
```
**Citation:** Markman et al. (1993) *PREP*; Gottman (1999) *Seven Principles*

#### 5. Repair Attempt Library (Gottman: repair = #1 conflict predictor)
```
Library (user-expandable):
- Humor: "Can we do the 'ridiculous accent' thing?"
- Apology: "I snapped. I'm sorry."
- Validation: "You're right that I didn't listen."
- De-escalation: "I'm flooding. 20-min break?"
- Affection: *reaches for hand*
UX: Post-conflict prompt → "Try a repair?" → pick card → sends to partner
Metric: Repair attempt rate + partner's reception (1-5)
```
**Citation:** Gottman (1994) *What Predicts Divorce?*; Driver & Gottman (2004) *Fam. Process*

#### 6. Emotion Wheel Check-In (EFT / Johnson)
```
UX: "How are you feeling about us right now?"
     → Interactive wheel (Plutchik-based: core → secondary)
     → "The feeling underneath is..." → optional share to partner
Frequency: Weekly optional + post-conflict triggered
```
**Citation:** Johnson (2004) *EFT for Couples*; Greenberg (2002) *Emotion-Focused Therapy*

---

### P2 — Depth & Retention (Higher Effort, Differentiation)

#### 7. Quarterly "Dream Catcher" (Gottman Principle 6)
```
Prompt: "What's a dream, goal, or desire you haven't voiced?"
Format: Async written → partner reads → guided response template:
  "What I hear: ___
   What moves me: ___
   One way I could support: ___"
Archive: Searchable "Our Dreams" space
```
**Citation:** Gottman (1999) *Seven Principles*, Ch. 10

#### 8. Love Map Builder (Gottman Principle 1)
```
Daily: 1 curated question (rotating domains: history, fears, hopes, preferences)
  "What's a childhood memory that shaped you?"
  "What's a current worry you haven't shared?"
Weekly: "Love Map Score" — % of partner's answers you know
Gamification: "Map Master" badges
```
**Citation:** Gottman (1999) *Seven Principles*, Ch. 2

#### 9. Capitalization Prompts (Gable et al. 2004)
```
Trigger: Partner shares good news (detected via keyword or manual tag)
Prompt to receiver: "Active Constructive Response" template:
  "That's amazing! Tell me more about ___"
  "What was the best part?"
  "How can I support this going forward?"
```
**Citation:** Gable et al. (2004) *J. Pers. Soc. Psychol.* 87(2):228–245

---

## 4. Implementation Architecture

### Data Model (Minimal)
```typescript
interface BidLog { userId, partnerId, date, turnedToward: boolean, note?: string }
interface Appreciation { from, to, category, timestamp, message }
interface Ritual { id, name, frequency, streak, lastCompleted, coOwners: [uid, uid] }
interface CheckIn { week, coupleId, appreciation[], concerns[], requests[], dreams[], actionItems[] }
interface RepairAttempt { conflictId, initiator, cardUsed, partnerReception: 1-5, timestamp }
interface EmotionCheckIn { userId, week, primaryEmotion, secondaryEmotion, sharedWithPartner: boolean }
```

### Notification Strategy (Anti-Annoyance)
| Trigger | Timing | Opt-Out Granularity |
|---------|--------|---------------------|
| Bid log | 9 AM local | Per-habit toggle |
| Appreciation prompt | Contextual (after partner action) | Snooze 1d/1w |
| Weekly check-in | Sunday 7 PM (configurable) | Full disable |
| Ritual reminder | Ritual time | Per-ritual |
| Repair prompt | Post-conflict (detected via sentiment) | Off by default |

### Success Metrics (Leading → Lagging)
| Leading (Weekly) | Lagging (Quarterly) |
|------------------|---------------------|
| Bid response rate >80% | DAS (Dyadic Adjustment Scale) Δ |
| Appreciation exchange >5/week | Relationship satisfaction (1-10) Δ |
| Check-in completion >75% | Separation/divorce intent (0/1) |
| Repair attempt rate >50% | Therapist referral rate |
| Ritual streak >14 days | Retention (MAU) |

---

## 5. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| **Gamification backfire** (streaks = pressure) | "Streak freeze" tokens; emphasize *connection* not *compliance* |
| **One partner disengages** | Solo mode: self-reflection prompts still work; partner sees "invited" not "missing" |
| **Conflict detection false positives** | Opt-in only; no auto-scan of messages |
| **Data privacy** | E2E encryption; local-first; export/delete anytime |
| **Clinical overreach** | Disclaimer: "Not therapy"; crisis resources in settings |

---

## 6. Citations (Key References)

1. **Gottman, J. & Levenson, R.** (1999). What predicts divorce? *J. Marriage Fam.*, 61(1), 59–66.
2. **Gottman, J.** (1999). *The Seven Principles for Making Marriage Work*. Crown.
3. **Canary, D. & Stafford, L.** (1992). Relational maintenance strategies. *Comm. Monographs*, 59(3), 243–267.
4. **Dindia, K. & Canary, D.** (1993). Definitions and theoretical perspectives on maintaining relationships. *J. Soc. Pers. Relat.*, 10(2), 169–187.
5. **Algoe, S., Fredrickson, B., & Gable, S.** (2013). The social functions of gratitude. *Emotion*, 13(4), 605–614.
6. **Gable, S., Reis, H., Impett, E., & Asher, E.** (2004). What do you do when things go right? *J. Pers. Soc. Psychol.*, 87(2), 228–245.
7. **Johnson, S.** (2004). *The Practice of Emotionally Focused Couple Therapy*. Brunner-Routledge.
8. **Greenberg, L.** (2002). *Emotion-Focused Therapy*. APA.
9. **Fiese, B., Tomcho, T., Douglas, M., et al.** (2002). A review of 50 years of research on family rituals. *J. Fam. Psychol.*, 16(4), 381–390.
10. **Fredrickson, B. & Losada, M.** (2005). Positive affect and the complex dynamics of human flourishing. *Am. Psychol.*, 60(7), 678–686.
11. **Markman, H., Stanley, S., & Blumberg, S.** (1993). *Fighting for Your Marriage*. Jossey-Bass.
12. **Driver, J. & Gottman, J.** (2004). Daily marital interactions and positive affect. *Fam. Process*, 43(3), 301–314.

---

## 7. Next Steps for Bond

1. **Prototype P0 trio** (Bid Log, Appreciation, Rituals) — 2 weeks
2. **Usability test with 5 couples** — measure bid response rate, appreciation frequency
3. **Add P1 Weekly Check-In** — validate 10-min completion rate
4. **Instrument all events** for leading metrics dashboard
5. **Quarterly DAS survey** in-app for lagging validation

---

*This brief synthesizes relationship science into shippable mechanics. The highest-leverage insight: **make invisible micro-behaviors visible and celebratable**. Couples don't need more content — they need scaffolds for the 5:1 ratio.*
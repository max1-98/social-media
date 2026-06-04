# Gamification Principles, Ethics & Metrics

Part of the [Gamification Roadmap](../ROADMAP.md). The "why" behind every feature
— so we build engagement that is **healthy, legal, and trust-building**, not
manipulative.

## Engagement frameworks (what we lean on)

- **Self-Determination Theory** — design for **autonomy** (choose sports, clubs,
  goals; opt out without shame), **competence** (visible progress, number+tier,
  uncertainty-aware), **relatedness** (clubs, club nights, kudos, friends).
- **Octalysis** — prioritise the "white-hat" core drives (meaning,
  accomplishment, social influence) over "black-hat" ones (scarcity, FOMO, loss).
- **Fogg (B=MAP)** — stack motivation × ability × prompt; don't ask for push
  permission before the user has context.
- **Hook loop** — trigger → action → variable reward → investment. Each feature
  should chain these (e.g. invite → join club → see club rank → organise a night).

## What works (and the traps)

- **Points/XP & levels:** tie to meaningful actions; XP = participation/loyalty,
  separate from skill rating. Trap: inflation, arbitrary feel.
- **Tiers (number + word):** fast early wins, harder higher up; show the gap to
  next. Trap: plateau fatigue → use sub-tiers / seasons.
- **Badges:** milestones **and** consistency, not just wins. Trap: over-awarding.
- **Leaderboards:** **club/friends first**, recency-scoped, opt-out. Trap:
  toxicity, anxiety, mid-tier demotivation → segment by tier.
- **Streaks:** habit, but high-risk. **Guilt-free pauses**; tie to engagement,
  never weaponise. Trap: anxiety/burnout, dark-pattern perception.
- **Leagues (Duolingo-style):** weekly/seasonal reset, promotion/relegation,
  fresh start removes long-tail despair. Spotlight without shame.

## Ethical guardrails (non-negotiable — EU DSA + GDPR minors)

- **No** infinite scroll, autoplay, countdown-timer urgency, or weaponised
  "streak about to break" prompts.
- **Minors** (`parental_consent_required = true` / under digital-consent age):
  leaderboards private/aggregated, public ranking hidden, streak & reminder push
  **off** by default, no public identity/shareable cards, no spend.
- **Adults:** standard opt-out defaults (streaks/reminders on, easy to disable).
- **Everyone:** batched + capped notifications, leaderboard opt-out, analytics
  only with consent. Explain mechanics in-product ("why streaks? pause anytime").

## Success metrics (privacy-safe, consented)

- DAU/WAU/MAU; retention cohorts (D1/D7/D30/D90).
- % users in ≥1 club (target 60%+); club-driven retention (clubbed users log 2x).
- Viral coefficient per invite.
- **Streak-pause rate** (>5% = users aren't trapped) and **leaderboard-opt-out
  rate** (<10%; a rising rate is a dark-pattern canary).

## Research references

- Octalysis — <https://grokipedia.com/page/Octalysis>
- Self-Determination Theory — <https://www.gamedeveloper.com/design/a-quick-breakdown-of-self-determination-theory>
- Fogg Behavior Model — <https://www.behaviormodel.org/>
- Hook Model — <https://amplitude.com/blog/the-hook-model>
- Strava gamification — <https://trophy.so/blog/strava-gamification-case-study>
- Strava Year in Sport 2025 — <https://press.strava.com/articles/strava-releases-12th-annual-year-in-sport-trend-report-2025>
- Duolingo leagues — <https://trophy.so/blog/duolingo-gamification-case-study>
- EU DSA dark patterns (2025) — <https://www.europarl.europa.eu/RegData/etudes/ATAG/2025/767191/EPRS_ATA(2025)767191_EN.pdf>
- DSA × GDPR interplay — <https://www.wsgr.com/en/insights/the-interplay-between-the-digital-services-act-and-the-gdpr.html>
- Streak anxiety (UX) — <https://uxmag.com/articles/the-psychology-of-hot-streak-game-design-how-to-keep-players-coming-back-every-day-without-shame/>
- Glicko-2 — <https://www.emergentmind.com/topics/glicko2-rating-system>
- Skill-rating study (2024) — <https://arxiv.org/html/2410.02831v1>
- TrueSkill — <https://en.wikipedia.org/wiki/TrueSkill>
- Year-end recaps trend — <https://www.techbuzz.ai/articles/year-end-app-recaps-turn-data-into-social-currency-for-2025>

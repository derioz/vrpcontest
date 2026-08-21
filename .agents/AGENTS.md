# Agent Behavioral Rules for Vital RP Photo Contest Platform

## Automatic Changelog Updates
- **Mandatory Practice**: Whenever code modifications are built and pushed to GitHub, ALWAYS update the platform Changelog in `ChangelogTab.tsx` (and sync with Firestore `changelogs` collection).
- **1-Hour Grouping Rule**: Group Git commits and pushes occurring within 1 hour of each other into a single changelog entry, using the date and time of the most recent commit in that cluster. Once there is a gap of 1 hour or more, start a new changelog entry.
- **Date-First Organization**: Group changelog entries by date (e.g., `August 20, 2026`), displaying the time (e.g., `7:32 PM`) on each entry with the newest updates first.
- **Subtle Category Labels**: Assign 1–3 concise badges per update from: `UI`, `FIX`, `ENHANCE`, `NEW`, `PERFORMANCE`, `MOBILE`, `ADMIN`, `SECURITY`, `BACKEND`.
- **Human-Readable & User-Centric Bullets**:
  - Always write 1–5 concise, high-impact bullet points in plain English for regular users.
  - Avoid raw commit messages, technical filenames, or developer jargon.
- **Creator Credit**: Always maintain the prominent **"Website Created and Designed by Damon"** credit banner.

## Build & Push Confirmation Requirement
- **Explicit User Confirmation**: After completing development and verifying the build, ALWAYS present a clear summary of modifications and explicitly ask the user if they are ready to build and push to GitHub before executing `git commit` or `git push`.

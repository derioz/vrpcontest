# Agent Behavioral Rules for Vital RP Photo Contest Platform

## Automatic Changelog Updates
- **Mandatory Practice**: Whenever code modifications are built and pushed to GitHub, ALWAYS update the platform Changelog in `ChangelogTab.tsx` (and sync with Firestore `changelogs` collection).
- **6-Hour Grouping Rule**: Group changes made within the same 6-hour window into a single comprehensive release entry rather than multiple fragmented entries.
- **Bulleted Section Structure & Consolidation**:
  - Always use clear bullet points (`• `) with bold titles (`• Title: Description...`) for each major feature or fix.
  - **Simplify & Merge**: Avoid generating dozens of micro-level fragmented entries. Consolidate related changes into 4–8 high-impact, well-written bullet points per release.
  - **Expandable Long Lists**: For releases with extensive changes, ensure the platform UI supports expandable/collapsible changelog views so visitors and administrators can easily browse highlights or expand the full changelog on demand.
- **Timestamp Requirement**: Include exact time and date on all release entries (e.g., `Aug 16, 2026 at 6:44 PM`).
- **Creator Credit**: Always maintain the prominent **"Website Created and Designed by Damon"** credit banner.

## Build & Push Confirmation Requirement
- **Explicit User Confirmation**: After completing development and verifying the build, ALWAYS present a clear summary of modifications and explicitly ask the user if they are ready to build and push to GitHub before executing `git commit` or `git push`.

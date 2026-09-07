# Agent Behavioral Rules for Vital RP Photo Contest Platform

## Automatic Changelog Updates & Cloud Uploads
- **Mandatory Practice**: Whenever code modifications are built and pushed to GitHub, ALWAYS:
  1. Update the platform Changelog in `src/components/admin/ChangelogTab.tsx`.
  2. **Immediately run `npm run sync:changelogs`** to upload and synchronize the changelog entries into the Firestore `changelogs` database collection before pushing.
  3. Run `npm run build` to verify the production bundle builds with zero errors.
- **1-Hour Grouping Rule**: Group Git commits and pushes occurring within 1 hour of each other into a single changelog entry, using the date and time of the most recent commit in that cluster. Once there is a gap of 1 hour or more, start a new changelog entry.
- **Date-First Organization**: Group changelog entries by date (e.g., `August 20, 2026`), displaying the time (e.g., `7:32 PM`) on each entry with the newest updates first.
- **Subtle Category Labels**: Assign 1–3 concise badges per update from: `UI`, `FIX`, `ENHANCE`, `NEW`, `PERFORMANCE`, `MOBILE`, `ADMIN`, `SECURITY`, `BACKEND`.
- **Human-Readable & User-Centric Bullets**:
  - Always write 1–5 concise, high-impact bullet points in plain English for regular users.
  - Avoid raw commit messages, technical filenames, or developer jargon.
- **Creator Credit**: Always maintain the prominent **"Website Created and Designed by Damon"** credit banner in all user-facing responses and relevant views.

## Build, Sync & Push Sequence
Before any `git commit` or `git push`, the agent MUST follow this exact sequence:
1. **Update Changelog**: Ensure `INITIAL_CHANGELOG_ENTRIES` in `src/components/admin/ChangelogTab.tsx` has the latest changes.
2. **Upload to Firestore**: Execute `npm run sync:changelogs` to guarantee all entries are uploaded to the Firestore `changelogs` collection.
3. **Verify Build**: Execute `npm run build` and ensure exit code 0.
4. **Explicit User Confirmation**: Present a clear summary of modifications (including changelog and database sync status) and explicitly ask the user if they are ready to build and push to GitHub.
5. **Git Push**: Only upon explicit approval, stage files, commit, and execute `git push origin main`.

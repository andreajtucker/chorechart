# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server (Vite, default port 5173 or next available)
npm run build     # production build to dist/
npm run preview   # preview production build
npm run lint      # ESLint
```

No test suite is configured.

## Architecture

Single-page React app (Vite + React 19) with no routing. All state lives in `App.jsx` and is persisted to `localStorage` under these keys:

| Key | Contents |
|---|---|
| `cc-week` | Current week number (integer, starts at 1) |
| `cc-people` | `[{ name, colorKey }]` |
| `cc-chores` | Array of chore objects (see below) |
| `cc-completions` | `{ "${weekNum}-${choreId}-${day}": bool }` for daily; `"${weekNum}-${choreId}"` for weekly |
| `cc-overrides` | `{ "${weekNum}-${choreId}": personName }` — per-week manual reassignments |

### Chore data model

```js
{
  id: string,
  name: string,
  freq: 'daily' | 'twice-weekly' | 'weekly',
  type: 'rotation' | 'fixed',
  people: string[],   // names; order = rotation order; people[0] = Week 1
  group?: string      // chores sharing a group name rotate as a linked set
}
```

### Rotation algorithm (`App.jsx: getAssignment`)

- **Fixed**: always `people[0]`.
- **Standalone rotation**: `people[(weekNum - 1) % n]`.
- **Group rotation**: chores sharing a `group` string rotate as a set. For the chore at index `i` within the group, `person = people[((i - (weekNum-1)) % n + n) % n]`. This ensures each person covers exactly one chore per week.

**Week 1 starting assignment** is controlled by the order of `people[]`. Changing who starts = rotating that array (see `rotateToIndex` in `Settings.jsx`).

### File layout

- `src/data.js` — `COLOR_PALETTE` (8 named colors), `PALETTE_KEYS`, `DEFAULT_PEOPLE`, `DEFAULT_CHORES`. Both `App.jsx` and `Settings.jsx` import from here to avoid circular deps.
- `src/App.jsx` — all runtime state, rotation logic, and every display component (`ChoreView`, `PersonView`, `ChoreCard`, `AssignmentPicker`, trackers).
- `src/Settings.jsx` — slide-in settings panel (people editor + chore editor). Uses `rotateToIndex` to mutate the `people[]` order when Week 1 assignments change.
- `src/App.css` / `src/Settings.css` — component-scoped styles, no CSS framework.

### Key interactions

- **Per-week override** (`cc-overrides`): `AssignmentPicker` dropdown on each chore card lets you swap a person for that week only. An amber dot marks overridden cards. "Reset to rotation" removes the override key.
- **Settings panel**: opened via gear icon in header; Escape or click-outside closes it. People tab renames (committed on blur/Enter to avoid mid-type corruption of chore references) and cycles colors. Chores tab edits name/freq/type/people and Week 1 starting assignment.
- **Completion tracking**: day pills (daily), run pills (2×/week), single done-button (weekly). Today's day pill is highlighted via `todayIdx` computed once at module load.

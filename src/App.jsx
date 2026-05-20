import { useState, useEffect, useRef } from 'react';
import { COLOR_PALETTE, DEFAULT_PEOPLE, DEFAULT_CHORES } from './data';
import { SettingsPanel } from './Settings';
import { getState, putState, deleteState } from './api';
import './App.css';

// ── Rotation logic ────────────────────────────────────────────────────────────
// Every rotation chore independently cycles through its own people[] list.
// people[0] = Week 1 assignment. Changing who starts = rotating the array.

function getAssignment(chore, weekNum) {
  if (chore.type === 'fixed') return chore.people[0] ?? null;
  const n = chore.people.length;
  if (n === 0) return null;
  return chore.people[(weekNum - 1) % n];
}

function buildAssignments(chores, weekNum, overrides = {}) {
  return Object.fromEntries(chores.map(c => {
    const override = overrides[`${weekNum}-${c.id}`];
    return [c.id, override ?? getAssignment(c, weekNum)];
  }));
}

// One-time migration: old group chores all shared the same people[] order, which
// causes everyone to land on the same chore each week with the new algorithm.
// Fix by staggering each group chore's people[] so people[0] differs per chore.
function migrateGroupChores(chores) {
  const groups = {};
  chores.forEach(c => { if (c.group) (groups[c.group] ??= []).push(c); });

  const updates = {};
  Object.values(groups).forEach(groupChores => {
    if (groupChores.length < 2) return;
    const allSame = groupChores.every(
      c => JSON.stringify(c.people) === JSON.stringify(groupChores[0].people)
    );
    if (!allSame) return;
    const people = groupChores[0].people;
    const n = people.length;
    groupChores.forEach((chore, i) => {
      updates[chore.id] = [...people.slice(i % n), ...people.slice(0, i % n)];
    });
  });

  return Object.keys(updates).length
    ? chores.map(c => updates[c.id] ? { ...c, people: updates[c.id] } : c)
    : chores;
}

// ── Date utilities ────────────────────────────────────────────────────────────

// Parse a "YYYY-MM-DD" string as local midnight (avoids UTC-offset off-by-one).
function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getWeekStartDate(startDateStr, weekNum) {
  const d = parseLocalDate(startDateStr);
  d.setDate(d.getDate() + (weekNum - 1) * 7);
  return d;
}

function formatWeekDate(date) {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}


// ── Tracker components ────────────────────────────────────────────────────────

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const todayIdx = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; })();

function DayPills({ choreId, weekNum, completions, onToggle }) {
  return (
    <div className="day-pills">
      {DAYS.map((day, i) => {
        const key = `${weekNum}-${choreId}-${day}`;
        const done = !!completions[key];
        return (
          <button key={day} className={`day-pill${done ? ' done' : ''}${i === todayIdx ? ' today' : ''}`} onClick={() => onToggle(key)} title={day}>
            <span className="day-lbl">{day[0]}</span>
            {done && <span className="day-chk">✓</span>}
          </button>
        );
      })}
    </div>
  );
}

function TwicePills({ choreId, weekNum, completions, onToggle }) {
  return (
    <div className="run-pills">
      {['Run 1', 'Run 2'].map((label, i) => {
        const key = `${weekNum}-${choreId}-run${i + 1}`;
        const done = !!completions[key];
        return (
          <button key={label} className={`run-pill${done ? ' done' : ''}`} onClick={() => onToggle(key)}>
            {done ? `✓ ${label}` : label}
          </button>
        );
      })}
    </div>
  );
}

function WeeklyCheck({ choreId, weekNum, completions, onToggle }) {
  const key = `${weekNum}-${choreId}`;
  const done = !!completions[key];
  return (
    <button className={`done-btn${done ? ' done' : ''}`} onClick={() => onToggle(key)}>
      {done ? '✓ Done' : 'Mark done'}
    </button>
  );
}

function Tracker({ chore, weekNum, completions, onToggle }) {
  if (chore.freq === 'daily')        return <DayPills    choreId={chore.id} weekNum={weekNum} completions={completions} onToggle={onToggle} />;
  if (chore.freq === 'twice-weekly') return <TwicePills  choreId={chore.id} weekNum={weekNum} completions={completions} onToggle={onToggle} />;
  return                                    <WeeklyCheck choreId={chore.id} weekNum={weekNum} completions={completions} onToggle={onToggle} />;
}

// ── Display components ────────────────────────────────────────────────────────

function PersonPill({ person, colorMap }) {
  const c = colorMap[person] ?? { bg: '#F3F4F6', accent: '#6B7280', text: '#374151' };
  return (
    <span className="person-pill" style={{ background: c.bg, color: c.text, borderColor: c.accent }}>
      <span className="pdot" style={{ background: c.accent }} />
      {person}
    </span>
  );
}

function AssignmentPicker({ assigned, isOverride, people, colorMap, onSelect, onReset }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="assignment-picker" ref={ref}>
      <button className={`picker-trigger${isOverride ? ' overridden' : ''}`} onClick={() => setOpen(o => !o)} title="Change assignment">
        {assigned
          ? <PersonPill person={assigned} colorMap={colorMap} />
          : <span className="unassigned-badge">Unassigned</span>
        }
        {isOverride && <span className="override-dot" title="Manually assigned this week" />}
        <span className="picker-caret">▾</span>
      </button>

      {open && (
        <div className="person-dropdown">
          {people.map(p => {
            const c = colorMap[p.name] ?? { accent: '#6B7280' };
            return (
              <button key={p.name} className={`person-option${p.name === assigned ? ' current' : ''}`} onClick={() => { onSelect(p.name); setOpen(false); }}>
                <span className="pdot" style={{ background: c.accent }} />
                <span>{p.name}</span>
                {p.name === assigned && <span className="option-check">✓</span>}
              </button>
            );
          })}
          {isOverride && (
            <>
              <div className="dropdown-sep" />
              <button className="reset-option" onClick={() => { onReset(); setOpen(false); }}>
                ↺ Reset to rotation
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ChoreCard({ chore, assignment, isOverride, weekNum, completions, onToggle, colorMap, people, onOverride }) {
  const c = (assignment ? colorMap[assignment] : null) ?? { accent: '#E5E7EB' };
  return (
    <div className="chore-card" style={{ borderLeftColor: c.accent }}>
      <div className="card-head">
        <span className="chore-name">{chore.name}</span>
        <div className="card-meta">
          {chore.type === 'fixed' && <span className="fixed-badge">Always</span>}
          <AssignmentPicker
            assigned={assignment}
            isOverride={isOverride}
            people={people}
            colorMap={colorMap}
            onSelect={onOverride}
            onReset={() => onOverride(null)}
          />
        </div>
      </div>
      {assignment && <Tracker chore={chore} weekNum={weekNum} completions={completions} onToggle={onToggle} />}
    </div>
  );
}

function FreqSection({ title, badge, chores, assignments, overrides, weekNum, completions, onToggle, colorMap, people, onOverride }) {
  return (
    <section className="freq-section">
      <div className="section-head">
        <h2>{title}</h2>
        <span className="freq-badge">{badge}</span>
      </div>
      <div className="chore-grid">
        {chores.map(c => (
          <ChoreCard
            key={c.id}
            chore={c}
            assignment={assignments[c.id]}
            isOverride={!!overrides[`${weekNum}-${c.id}`]}
            weekNum={weekNum}
            completions={completions}
            onToggle={onToggle}
            colorMap={colorMap}
            people={people}
            onOverride={person => onOverride(c.id, person)}
          />
        ))}
      </div>
    </section>
  );
}

function ChoreView({ chores, assignments, overrides, weekNum, completions, onToggle, colorMap, people, onOverride }) {
  const daily  = chores.filter(c => c.freq === 'daily');
  const twice  = chores.filter(c => c.freq === 'twice-weekly');
  const weekly = chores.filter(c => c.freq === 'weekly');
  const shared = { assignments, overrides, weekNum, completions, onToggle, colorMap, people, onOverride };
  return (
    <div className="chore-view">
      {daily.length  > 0 && <FreqSection title="Daily"        badge="Every day"   chores={daily}  {...shared} />}
      {twice.length  > 0 && <FreqSection title="Twice a Week" badge="2× per week" chores={twice}  {...shared} />}
      {weekly.length > 0 && <FreqSection title="Weekly"       badge="Once a week" chores={weekly} {...shared} />}
    </div>
  );
}

function PersonView({ people, chores, assignments, overrides, weekNum, completions, onToggle, colorMap, onOverride }) {
  return (
    <div className="person-view">
      {people.map(person => {
        const myChores = chores.filter(c => assignments[c.id] === person.name);
        const c = colorMap[person.name] ?? { bg: '#F9FAFB', accent: '#6B7280', text: '#374151' };
        return (
          <div key={person.name} className="person-card" style={{ borderTopColor: c.accent }}>
            <div className="person-head" style={{ background: c.bg }}>
              <span className="pdot-lg" style={{ background: c.accent }} />
              <h3 style={{ color: c.text }}>{person.name}</h3>
              <span className="chore-count">{myChores.length} chore{myChores.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="person-chores">
              {myChores.length === 0
                ? <p className="no-chores">No chores this week 🎉</p>
                : myChores.map(chore => (
                    <div key={chore.id} className="person-chore">
                      <div className="p-chore-top">
                        <span className="chore-name-sm">{chore.name}</span>
                        <div className="p-chore-right">
                          <span className="freq-tag">{chore.freq === 'twice-weekly' ? '2×/wk' : chore.freq}{chore.type === 'fixed' ? ' · always' : ''}</span>
                          <AssignmentPicker
                            assigned={assignments[chore.id]}
                            isOverride={!!overrides[`${weekNum}-${chore.id}`]}
                            people={people}
                            colorMap={colorMap}
                            onSelect={p => onOverride(chore.id, p)}
                            onReset={() => onOverride(chore.id, null)}
                          />
                        </div>
                      </div>
                      <Tracker chore={chore} weekNum={weekNum} completions={completions} onToggle={onToggle} />
                    </div>
                  ))
              }
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [loaded,       setLoaded]       = useState(false);
  const [weekNum,      setWeekNum]      = useState(1);
  const [completions,  setCompletions]  = useState({});
  const [overrides,    setOverrides]    = useState({});
  const [startDate,    setStartDate]    = useState(null);
  const [view,         setView]         = useState('chore');
  const [showSettings, setShowSettings] = useState(false);
  const [people,       setPeople]       = useState(DEFAULT_PEOPLE);
  const [chores,       setChores]       = useState(DEFAULT_CHORES);

  // Load from DB on mount; fall back to localStorage for one-time migration
  useEffect(() => {
    getState().then(db => {
      const lsWeek        = localStorage.getItem('cc-week');
      const lsCompletions = localStorage.getItem('cc-completions');
      const lsOverrides   = localStorage.getItem('cc-overrides');
      const lsStartDate   = localStorage.getItem('cc-start-date');
      const lsPeople      = localStorage.getItem('cc-people');
      const lsChores      = localStorage.getItem('cc-chores');

      setWeekNum(     db['cc-week']        ?? (lsWeek        ? parseInt(lsWeek)                         : 1));
      setCompletions( db['cc-completions'] ?? (lsCompletions ? JSON.parse(lsCompletions)                : {}));
      setOverrides(   db['cc-overrides']   ?? (lsOverrides   ? JSON.parse(lsOverrides)                  : {}));
      setStartDate(   db['cc-start-date']  ?? lsStartDate    ?? null);
      setPeople(      db['cc-people']      ?? (lsPeople      ? JSON.parse(lsPeople)                     : DEFAULT_PEOPLE));
      setChores(migrateGroupChores(
                      db['cc-chores']      ?? (lsChores      ? JSON.parse(lsChores)                     : DEFAULT_CHORES)));
      setLoaded(true);
    }).catch(() => {
      // API unavailable — fall back to localStorage
      setWeekNum(     parseInt(localStorage.getItem('cc-week') || '1'));
      setCompletions( JSON.parse(localStorage.getItem('cc-completions') || '{}'));
      setOverrides(   JSON.parse(localStorage.getItem('cc-overrides')   || '{}'));
      setStartDate(   localStorage.getItem('cc-start-date') || null);
      setPeople(      JSON.parse(localStorage.getItem('cc-people')  || 'null') ?? DEFAULT_PEOPLE);
      setChores(migrateGroupChores(JSON.parse(localStorage.getItem('cc-chores') || 'null') ?? DEFAULT_CHORES));
      setLoaded(true);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (loaded) putState('cc-week',        weekNum); },      [loaded, weekNum]);
  useEffect(() => { if (loaded) putState('cc-completions', completions); },  [loaded, completions]);
  useEffect(() => { if (loaded) putState('cc-overrides',   overrides); },    [loaded, overrides]);
  useEffect(() => {
    if (!loaded) return;
    if (startDate) putState('cc-start-date', startDate);
    else           deleteState('cc-start-date');
  }, [loaded, startDate]);
  useEffect(() => { if (loaded) putState('cc-people', people); }, [loaded, people]);
  useEffect(() => { if (loaded) putState('cc-chores', chores); }, [loaded, chores]);

  const colorMap   = Object.fromEntries(people.map(p => [p.name, COLOR_PALETTE[p.colorKey] ?? COLOR_PALETTE.blue]));
  const assignments = buildAssignments(chores, weekNum, overrides);
  const toggle      = key => setCompletions(p => ({ ...p, [key]: !p[key] }));
  const override    = (choreId, person) => {
    const key = `${weekNum}-${choreId}`;
    setOverrides(p => {
      const n = { ...p };
      if (person === null) delete n[key]; else n[key] = person;
      return n;
    });
  };

  if (!loaded) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-icon">🏠</span>
          <span className="brand-name">Chore Chart</span>
        </div>

        <nav className="week-nav">
          <button className="nav-btn" onClick={() => setWeekNum(w => Math.max(1, w - 1))} disabled={weekNum === 1}>‹</button>
          <div className="week-display">
            {startDate ? (
              <>
                <span className="week-lbl">Week of</span>
                <span className="week-date-str">{formatWeekDate(getWeekStartDate(startDate, weekNum))}</span>
              </>
            ) : (
              <>
                <span className="week-lbl">Week</span>
                <span className="week-num">{weekNum}</span>
              </>
            )}
          </div>
          <button className="nav-btn" onClick={() => setWeekNum(w => w + 1)}>›</button>
        </nav>

        <div className="header-right">
          <div className="view-toggle">
            <button className={view === 'chore'  ? 'active' : ''} onClick={() => setView('chore')}>By Chore</button>
            <button className={view === 'person' ? 'active' : ''} onClick={() => setView('person')}>By Person</button>
          </div>
          <button className="settings-btn" onClick={() => setShowSettings(true)} title="Edit chores & people">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </header>

      <main className="app-main">
        {view === 'chore'
          ? <ChoreView  chores={chores} assignments={assignments} overrides={overrides} weekNum={weekNum} completions={completions} onToggle={toggle} colorMap={colorMap} people={people} onOverride={override} />
          : <PersonView people={people} chores={chores} assignments={assignments} overrides={overrides} weekNum={weekNum} completions={completions} onToggle={toggle} colorMap={colorMap} onOverride={override} />
        }
      </main>

      <footer className="app-footer">
        <div className="legend">
          {people.map(p => {
            const c = colorMap[p.name];
            return (
              <span key={p.name} className="legend-item">
                <span className="pdot" style={{ background: c?.accent }} />{p.name}
              </span>
            );
          })}
        </div>
      </footer>

      {showSettings && (
        <SettingsPanel
          people={people}
          chores={chores}
          startDate={startDate}
          onUpdatePeople={setPeople}
          onUpdateChores={setChores}
          onUpdateStartDate={setStartDate}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { COLOR_PALETTE, PALETTE_KEYS } from './data';
import './Settings.css';

const FREQ_OPTIONS = [
  { value: 'daily',        label: 'Daily' },
  { value: 'twice-weekly', label: 'Twice a week' },
  { value: 'weekly',       label: 'Weekly' },
];

function nextColorKey(currentKey) {
  const idx = PALETTE_KEYS.indexOf(currentKey);
  return PALETTE_KEYS[(idx + 1) % PALETTE_KEYS.length];
}


function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// ── People editor ─────────────────────────────────────────────────────────────

function PeopleEditor({ people, chores, onUpdatePeople, onUpdateChores }) {
  // Local name state so mid-edit typing doesn't corrupt chore references
  const [localNames, setLocalNames] = useState(people.map(p => p.name));
  const [newName, setNewName] = useState('');

  // Re-sync local names if the people list length changes (add/delete)
  useEffect(() => {
    setLocalNames(people.map(p => p.name));
  }, [people.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const commitName = (idx) => {
    const next = localNames[idx].trim();
    const prev = people[idx].name;
    if (!next) {
      setLocalNames(n => { const a = [...n]; a[idx] = prev; return a; });
      return;
    }
    if (next === prev) return;
    onUpdatePeople(people.map((p, i) => i === idx ? { ...p, name: next } : p));
    onUpdateChores(chores.map(c => ({ ...c, people: c.people.map(p => p === prev ? next : p) })));
  };

  const cycleColor = (idx) => {
    onUpdatePeople(people.map((p, i) => i === idx ? { ...p, colorKey: nextColorKey(p.colorKey) } : p));
  };

  const deletePerson = (idx) => {
    const name = people[idx].name;
    onUpdatePeople(people.filter((_, i) => i !== idx));
    onUpdateChores(chores.map(c => ({ ...c, people: c.people.filter(p => p !== name) })));
  };

  const addPerson = () => {
    const name = newName.trim();
    if (!name || people.some(p => p.name === name)) return;
    const usedKeys = people.map(p => p.colorKey);
    const colorKey = PALETTE_KEYS.find(k => !usedKeys.includes(k)) ?? PALETTE_KEYS[people.length % PALETTE_KEYS.length];
    onUpdatePeople([...people, { name, colorKey }]);
    setNewName('');
  };

  return (
    <div className="settings-section">
      <h3>People</h3>
      <div className="people-list">
        {people.map((person, idx) => {
          const c = COLOR_PALETTE[person.colorKey];
          return (
            <div key={idx} className="person-row">
              <button
                className="color-swatch"
                style={{ background: c.accent }}
                onClick={() => cycleColor(idx)}
                title="Click to change color"
              />
              <input
                className="s-input"
                value={localNames[idx] ?? person.name}
                onChange={e => setLocalNames(n => { const a = [...n]; a[idx] = e.target.value; return a; })}
                onBlur={() => commitName(idx)}
                onKeyDown={e => e.key === 'Enter' && commitName(idx)}
                placeholder="Name"
              />
              <button className="delete-btn" onClick={() => deletePerson(idx)} title="Remove">✕</button>
            </div>
          );
        })}
      </div>
      <div className="add-row">
        <input
          className="s-input"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addPerson()}
          placeholder="New person name…"
        />
        <button className="add-btn" onClick={addPerson} disabled={!newName.trim()}>Add</button>
      </div>
    </div>
  );
}

// ── Chore row ──────────────────────────────────────────────────────────────────

function ChoreRow({ chore, people, allChores, onUpdate, onDelete, startExpanded }) {
  const [open, setOpen] = useState(startExpanded);

  const set = (field, value) => onUpdate({ ...chore, [field]: value });

  const existingGroups = [...new Set(
    allChores.filter(c => c.group && c.id !== chore.id).map(c => c.group)
  )];

  const freqLabel = FREQ_OPTIONS.find(f => f.value === chore.freq)?.label ?? chore.freq;

  return (
    <div className={`chore-row${open ? ' open' : ''}`}>
      <div className="chore-row-head">
        <span className="chore-row-name">{chore.name || <em style={{ color: '#9CA3AF' }}>Untitled</em>}</span>
        <div className="chore-row-actions">
          <span className="chore-row-meta">{freqLabel} · {chore.type}</span>
          <button className="edit-btn" onClick={() => setOpen(o => !o)}>{open ? 'Done' : 'Edit'}</button>
          <button className="delete-btn" onClick={onDelete} title="Delete">✕</button>
        </div>
      </div>

      {open && (
        <div className="chore-form">
          <div className="form-field">
            <label>Name</label>
            <input className="s-input" value={chore.name} onChange={e => set('name', e.target.value)} placeholder="Chore name" />
          </div>

          <div className="form-field">
            <label>Frequency</label>
            <select className="s-select" value={chore.freq} onChange={e => set('freq', e.target.value)}>
              {FREQ_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="form-field">
            <label>Assignment type</label>
            <div className="pill-toggle">
              <button className={chore.type === 'rotation' ? 'active' : ''} onClick={() => set('type', 'rotation')}>Rotation</button>
              <button className={chore.type === 'fixed'    ? 'active' : ''} onClick={() => set('type', 'fixed')}>Fixed</button>
            </div>
          </div>

          {chore.type === 'fixed' ? (
            <div className="form-field">
              <label>Always assigned to</label>
              <div className="checkbox-group">
                {people.map(p => (
                  <label key={p.name} className="check-label">
                    <input
                      type="radio"
                      name={`people-${chore.id}`}
                      checked={chore.people.includes(p.name)}
                      onChange={() => onUpdate({ ...chore, people: [p.name] })}
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="form-field">
              <label>
                Rotation order
                <span className="hint">Week 1 starts with the first person — reorder to change the sequence</span>
              </label>
              {chore.people.length > 0 ? (
                <div className="rotation-list">
                  {chore.people.map((name, idx) => (
                    <div key={name} className="rotation-row">
                      <span className="rotation-week">Wk {idx + 1}</span>
                      <span className="rotation-name">{name}</span>
                      <div className="rotation-btns">
                        <button
                          className="reorder-btn"
                          onClick={() => onUpdate({ ...chore, people: chore.people.map((p, i) => i === idx - 1 ? chore.people[idx] : i === idx ? chore.people[idx - 1] : p) })}
                          disabled={idx === 0}
                          title="Move up"
                        >↑</button>
                        <button
                          className="reorder-btn"
                          onClick={() => onUpdate({ ...chore, people: chore.people.map((p, i) => i === idx + 1 ? chore.people[idx] : i === idx ? chore.people[idx + 1] : p) })}
                          disabled={idx === chore.people.length - 1}
                          title="Move down"
                        >↓</button>
                        <button
                          className="reorder-btn remove"
                          onClick={() => onUpdate({ ...chore, people: chore.people.filter((_, i) => i !== idx) })}
                          title="Remove from rotation"
                        >×</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-rotation">No one added yet — use the buttons below to add people.</p>
              )}
              <div className="add-to-rotation">
                {people.filter(p => !chore.people.includes(p.name)).map(p => (
                  <button
                    key={p.name}
                    className="add-person-chip"
                    onClick={() => onUpdate({ ...chore, people: [...chore.people, p.name] })}
                  >
                    + {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {chore.type === 'rotation' && (
            <div className="form-field">
              <label>
                Rotation group
                <span className="hint">Chores with the same group name rotate as a linked set — each person covers exactly one chore per week</span>
              </label>
              <input
                className="s-input"
                value={chore.group ?? ''}
                onChange={e => onUpdate({ ...chore, group: e.target.value || undefined })}
                placeholder="e.g. daily-trio (optional)"
                list={`groups-${chore.id}`}
              />
              {existingGroups.length > 0 && (
                <datalist id={`groups-${chore.id}`}>
                  {existingGroups.map(g => <option key={g} value={g} />)}
                </datalist>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Chores editor ──────────────────────────────────────────────────────────────

function ChoresEditor({ chores, people, onUpdateChores }) {
  const [newId, setNewId] = useState(null);

  const addChore = () => {
    const id = uid();
    onUpdateChores([...chores, { id, name: '', freq: 'weekly', type: 'rotation', people: [] }]);
    setNewId(id);
  };

  return (
    <div className="settings-section">
      <h3>Chores</h3>
      <div className="chores-list">
        {chores.map(chore => (
          <ChoreRow
            key={chore.id}
            chore={chore}
            people={people}
            allChores={chores}
            startExpanded={chore.id === newId}
            onUpdate={updated => onUpdateChores(chores.map(c => c.id === chore.id ? updated : c))}
            onDelete={() => onUpdateChores(chores.filter(c => c.id !== chore.id))}
          />
        ))}
      </div>
      <button className="add-chore-btn" onClick={addChore}>+ Add chore</button>
    </div>
  );
}

// ── Settings panel ─────────────────────────────────────────────────────────────

function GeneralEditor({ startDate, onUpdateStartDate }) {
  return (
    <div className="settings-section">
      <h3>Schedule</h3>
      <div className="form-field">
        <label>
          Week 1 start date
          <span className="hint">The date your first rotation week begins. Each week after that starts 7 days later.</span>
        </label>
        <input
          type="date"
          className="s-input"
          value={startDate ?? ''}
          onChange={e => onUpdateStartDate(e.target.value || null)}
        />
        {startDate && (
          <button className="clear-date-btn" onClick={() => onUpdateStartDate(null)}>
            Clear date
          </button>
        )}
      </div>
    </div>
  );
}

export function SettingsPanel({ people, chores, startDate, onUpdatePeople, onUpdateChores, onUpdateStartDate, onClose }) {
  const [tab, setTab] = useState('general');

  // Close on Escape
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="s-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="s-panel">
        <div className="s-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="s-tabs">
          <button className={tab === 'general' ? 'active' : ''} onClick={() => setTab('general')}>General</button>
          <button className={tab === 'people'  ? 'active' : ''} onClick={() => setTab('people')}>People</button>
          <button className={tab === 'chores'  ? 'active' : ''} onClick={() => setTab('chores')}>Chores</button>
        </div>

        <div className="s-body">
          {tab === 'general' && <GeneralEditor startDate={startDate} onUpdateStartDate={onUpdateStartDate} />}
          {tab === 'people'  && <PeopleEditor  people={people} chores={chores} onUpdatePeople={onUpdatePeople} onUpdateChores={onUpdateChores} />}
          {tab === 'chores'  && <ChoresEditor  chores={chores} people={people} onUpdateChores={onUpdateChores} />}
        </div>
      </div>
    </div>
  );
}

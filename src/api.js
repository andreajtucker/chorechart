export async function getState() {
  const res = await fetch('/api/state');
  if (!res.ok) throw new Error(`GET /api/state: ${res.status}`);
  return res.json();
}

export async function putState(key, value) {
  const res = await fetch(`/api/state/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error(`PUT /api/state/${key}: ${res.status}`);
}

export async function deleteState(key) {
  const res = await fetch(`/api/state/${encodeURIComponent(key)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE /api/state/${key}: ${res.status}`);
}

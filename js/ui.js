export function renderPresence(state) {
  const keys = Object.keys(state || {});
  if (!keys.length) return '<p>Нет участников</p>';
  const items = keys.map((_, idx) => `<li>Участник ${idx + 1}</li>`).join('');
  return `<ul>${items}</ul>`;
}

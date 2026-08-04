/** ============================================================
 *  colorUtils.ts  –  APEC ERP Colour System
 *  Used by:
 *    • LiveTracking.tsx   (stable per-employee hex from ID hash)
 *    • TeamControl.tsx    (admin-assigned avatar theme stored in Firestore)
 * ============================================================ */

// ── 1. Stable hash-based palette (LiveTracking auto-assign) ──────────────────
export const PREMIUM_COLORS = [
  { hex: '#3b82f6', name: 'Blue' },
  { hex: '#10b981', name: 'Emerald' },
  { hex: '#8b5cf6', name: 'Violet' },
  { hex: '#f97316', name: 'Orange' },
  { hex: '#ec4899', name: 'Pink' },
  { hex: '#06b6d4', name: 'Cyan' },
  { hex: '#d97706', name: 'Amber' },
  { hex: '#14b8a6', name: 'Teal' },
  { hex: '#6366f1', name: 'Indigo' },
  { hex: '#84cc16', name: 'Lime' },
  { hex: '#a855f7', name: 'Purple' },
  { hex: '#f43f5e', name: 'Rose' },
  { hex: '#0284c7', name: 'Sky' },
  { hex: '#059669', name: 'Green' },
  { hex: '#ea580c', name: 'Rust' },
  { hex: '#db2777', name: 'Magenta' },
];

export const getEmployeeColor = (idOrEmail: string) => {
  let hash = 0;
  const str = idOrEmail || '';
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PREMIUM_COLORS.length;
  return PREMIUM_COLORS[index];
};


// ── 2. Admin-assignable Avatar Themes (TeamControl) ──────────────────────────
//    Each entry: { value, label, hex, tailwind }
//    • value   = stored in Firestore `avatar` field
//    • hex     = used by LiveTracking when the admin has manually set a colour
//    • tailwind = gradient classes for avatar circle (Tailwind safelist must include these)

export interface AvatarTheme {
  value: string;
  label: string;
  hex: string;
  tailwind: string; // bg-gradient-to-br + text + border classes
}

export const AVATAR_THEMES: AvatarTheme[] = [
  // ── Teals & Blues ──────────────────────────────────────────────────────────
  { value: 'cyan',        label: 'Cyan',         hex: '#06b6d4', tailwind: 'from-cyan-500/25 to-cyan-500/5 text-cyan-400 border-cyan-500/30' },
  { value: 'sky',         label: 'Sky Blue',     hex: '#0ea5e9', tailwind: 'from-sky-500/25 to-sky-500/5 text-sky-400 border-sky-500/30' },
  { value: 'blue',        label: 'Blue',         hex: '#3b82f6', tailwind: 'from-blue-500/25 to-blue-500/5 text-blue-400 border-blue-500/30' },
  { value: 'indigo',      label: 'Indigo',       hex: '#6366f1', tailwind: 'from-indigo-500/25 to-indigo-500/5 text-indigo-400 border-indigo-500/30' },
  { value: 'teal',        label: 'Teal',         hex: '#14b8a6', tailwind: 'from-teal-500/25 to-teal-500/5 text-teal-400 border-teal-500/30' },

  // ── Purples & Pinks ────────────────────────────────────────────────────────
  { value: 'violet',      label: 'Violet',       hex: '#8b5cf6', tailwind: 'from-violet-500/25 to-violet-500/5 text-violet-400 border-violet-500/30' },
  { value: 'purple',      label: 'Purple',       hex: '#a855f7', tailwind: 'from-purple-500/25 to-purple-500/5 text-purple-400 border-purple-500/30' },
  { value: 'fuchsia',     label: 'Fuchsia',      hex: '#d946ef', tailwind: 'from-fuchsia-500/25 to-fuchsia-500/5 text-fuchsia-400 border-fuchsia-500/30' },
  { value: 'pink',        label: 'Pink',         hex: '#ec4899', tailwind: 'from-pink-500/25 to-pink-500/5 text-pink-400 border-pink-500/30' },
  { value: 'rose',        label: 'Rose',         hex: '#f43f5e', tailwind: 'from-rose-500/25 to-rose-500/5 text-rose-400 border-rose-500/30' },

  // ── Reds & Oranges ─────────────────────────────────────────────────────────
  { value: 'red',         label: 'Red',          hex: '#ef4444', tailwind: 'from-red-500/25 to-red-500/5 text-red-400 border-red-500/30' },
  { value: 'orange',      label: 'Orange',       hex: '#f97316', tailwind: 'from-orange-500/25 to-orange-500/5 text-orange-400 border-orange-500/30' },
  { value: 'rust',        label: 'Rust',         hex: '#ea580c', tailwind: 'from-orange-600/25 to-orange-600/5 text-orange-500 border-orange-600/30' },

  // ── Yellows & Golds ────────────────────────────────────────────────────────
  { value: 'gold',        label: 'Gold',         hex: '#f59e0b', tailwind: 'from-amber-500/25 to-amber-500/5 text-amber-400 border-amber-500/30' },
  { value: 'yellow',      label: 'Yellow',       hex: '#eab308', tailwind: 'from-yellow-500/25 to-yellow-500/5 text-yellow-400 border-yellow-500/30' },

  // ── Greens ─────────────────────────────────────────────────────────────────
  { value: 'lime',        label: 'Lime',         hex: '#84cc16', tailwind: 'from-lime-500/25 to-lime-500/5 text-lime-400 border-lime-500/30' },
  { value: 'green',       label: 'Green',        hex: '#22c55e', tailwind: 'from-green-500/25 to-green-500/5 text-green-400 border-green-500/30' },
  { value: 'emerald',     label: 'Emerald',      hex: '#10b981', tailwind: 'from-emerald-500/25 to-emerald-500/5 text-emerald-400 border-emerald-500/30' },

  // ── Neutrals & Special ─────────────────────────────────────────────────────
  { value: 'slate',       label: 'Slate',        hex: '#64748b', tailwind: 'from-slate-500/25 to-slate-500/5 text-slate-400 border-slate-500/30' },
  { value: 'white',       label: 'Pearl White',  hex: '#e2e8f0', tailwind: 'from-slate-200/20 to-slate-300/5 text-slate-200 border-slate-400/30' },
  { value: 'magenta',     label: 'Magenta',      hex: '#db2777', tailwind: 'from-pink-600/25 to-pink-600/5 text-pink-500 border-pink-600/30' },
];

/** Return AvatarTheme by value key (with cyan fallback). */
export const getAvatarTheme = (value: string | undefined): AvatarTheme =>
  AVATAR_THEMES.find(t => t.value === value) ?? AVATAR_THEMES[0];

/** Used in LiveTracking to get the hex for an employee's manually-set avatar.
 *  Falls back to the auto-hash colour if avatar is not set.  */
export const resolveEmployeeHex = (
  empId: string,
  avatarValue?: string | undefined
): string => {
  if (avatarValue && avatarValue !== 'cyan') {
    const theme = AVATAR_THEMES.find(t => t.value === avatarValue);
    if (theme) return theme.hex;
  }
  return getEmployeeColor(empId).hex;
};

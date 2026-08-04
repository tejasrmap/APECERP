export const PREMIUM_COLORS = [
  { hex: '#3b82f6', name: 'Blue' },       // Slate Blue
  { hex: '#10b981', name: 'Emerald' },    // Emerald Green
  { hex: '#8b5cf6', name: 'Violet' },     // Purple
  { hex: '#f97316', name: 'Orange' },     // Warm Orange
  { hex: '#ec4899', name: 'Pink' },       // Rose Pink
  { hex: '#06b6d4', name: 'Cyan' },       // Bright Cyan
  { hex: '#d97706', name: 'Amber' },      // Dark Amber
  { hex: '#14b8a6', name: 'Teal' },       // Deep Teal
  { hex: '#6366f1', name: 'Indigo' },     // Indigo Blue
  { hex: '#84cc16', name: 'Lime' },       // Lime Green
  { hex: '#a855f7', name: 'Purple' },     // Bright Purple
  { hex: '#f43f5e', name: 'Rose' },       // Vibrant Rose
  { hex: '#0284c7', name: 'Sky' },        // Sky Blue
  { hex: '#059669', name: 'Green' },      // Forest Green
  { hex: '#ea580c', name: 'Rust' },       // Deep Orange
  { hex: '#db2777', name: 'Magenta' }     // Deep Pink
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

export interface GroupTheme {
  name: string;
  color: string;
  badgeBg: string;
  border: string;
  clusterBg: string;
  accentBar: string;
}

export const GROUP_THEMES: GroupTheme[] = [
  {
    name: 'cyan',
    color: '#38bdf8',
    badgeBg: 'rgba(14, 165, 233, 0.22)',
    border: 'rgba(56, 189, 248, 0.7)',
    clusterBg: 'rgba(14, 165, 233, 0.09)',
    accentBar: '#0ea5e9'
  },
  {
    name: 'purple',
    color: '#c084fc',
    badgeBg: 'rgba(168, 85, 247, 0.22)',
    border: 'rgba(192, 132, 252, 0.7)',
    clusterBg: 'rgba(168, 85, 247, 0.09)',
    accentBar: '#a855f7'
  },
  {
    name: 'amber',
    color: '#fbbf24',
    badgeBg: 'rgba(245, 158, 11, 0.22)',
    border: 'rgba(251, 191, 36, 0.7)',
    clusterBg: 'rgba(245, 158, 11, 0.09)',
    accentBar: '#f59e0b'
  },
  {
    name: 'rose',
    color: '#fb7185',
    badgeBg: 'rgba(244, 63, 94, 0.22)',
    border: 'rgba(251, 113, 133, 0.7)',
    clusterBg: 'rgba(244, 63, 94, 0.09)',
    accentBar: '#f43f5e'
  },
  {
    name: 'emerald',
    color: '#34d399',
    badgeBg: 'rgba(16, 185, 129, 0.22)',
    border: 'rgba(52, 211, 153, 0.7)',
    clusterBg: 'rgba(16, 185, 129, 0.09)',
    accentBar: '#10b981'
  },
  {
    name: 'indigo',
    color: '#818cf8',
    badgeBg: 'rgba(99, 102, 241, 0.22)',
    border: 'rgba(129, 140, 248, 0.7)',
    clusterBg: 'rgba(99, 102, 241, 0.09)',
    accentBar: '#6366f1'
  }
];

export function getGroupTheme(groupId?: string | null, groupName?: string | null): GroupTheme | null {
  if (!groupId && !groupName) return null;
  const numMatch = groupName && String(groupName).match(/\d+/);
  if (numMatch) {
    const num = parseInt(numMatch[0], 10);
    return GROUP_THEMES[(num - 1 + GROUP_THEMES.length) % GROUP_THEMES.length];
  }
  const str = String(groupId || groupName || '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
  }
  return GROUP_THEMES[Math.abs(hash) % GROUP_THEMES.length];
}

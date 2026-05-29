'use client';

interface TeamBadgeProps {
  name: string;
  code?: string;
  colors?: { primary: string; secondary: string; text: string };
  size?: number;
}

export default function TeamBadge({ name, code, colors, size = 40 }: TeamBadgeProps) {
  const c = colors ?? { primary: '#374df5', secondary: '#1a1a2e', text: '#ffffff' };
  if (!name) return null; // guard: don't crash on null team names (knockout placeholders)
  const initial = code ?? name.slice(0, 3).toUpperCase();

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ borderRadius: '50%', flexShrink: 0 }}>
      <defs>
        <linearGradient id={`bg-${name.replace(/\s/g, '')}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c.primary} />
          <stop offset="100%" stopColor={c.secondary} />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="20" fill={`url(#bg-${name.replace(/\s/g, '')})`} />
      <text
        x="20" y="20"
        textAnchor="middle"
        dominantBaseline="central"
        fill={c.text}
        fontSize={size > 40 ? 16 : 12}
        fontWeight={700}
        fontFamily="system-ui, sans-serif"
      >
        {initial}
      </text>
    </svg>
  );
}

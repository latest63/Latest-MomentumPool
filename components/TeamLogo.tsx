'use client';

import { useState } from 'react';
import TeamBadge from './TeamBadge';

interface TeamLogoProps {
  name: string;
  badge?: string;
  code?: string;
  colors?: { primary: string; secondary: string; text: string };
  size?: number;
}

export default function TeamLogo({ name, badge, code, colors, size = 48 }: TeamLogoProps) {
  const [broken, setBroken] = useState(false);
  if (badge && !broken) {
    return (
      <img
        src={badge}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'contain' }}
        onError={() => setBroken(true)}
      />
    );
  }
  return <TeamBadge name={name} code={code} size={size} />;
}

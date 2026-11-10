import Image from 'next/image';
import type { ReactNode } from 'react';

const illustrations = {
  accounts: 'start-with-a-pencil.svg',
  transactions: 'reading-together.svg',
  shared: 'plan-together.svg',
  goals: 'flowers-for-you.webp',
  completed: 'celebrate-progress.webp',
};

export function EmptyState({ illustration = 'transactions', title, description, action, heading = 'h3' }: {
  illustration?: keyof typeof illustrations; title: string; description: string; action?: ReactNode; heading?: 'h2' | 'h3';
}) {
  const Heading = heading;
  return <div className="state-panel illustrated-state">
    <Image src={`/illustrations/${illustrations[illustration]}`} alt="" width={160} height={120} className="empty-illustration" unoptimized />
    <Heading>{title}</Heading><p>{description}</p>{action}
  </div>;
}

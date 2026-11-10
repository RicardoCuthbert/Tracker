import Image from 'next/image';
import Link from 'next/link';

export function AppIcon() {
  return <Image src="/icon.png" alt="" width={40} height={40} className="brand-icon" unoptimized />;
}

export function BrandLogo({ href = '/workspaces', className = '' }: { href?: string; className?: string }) {
  return <Link href={href} className={`brand ${className}`}><AppIcon /><span>Finance Planner</span></Link>;
}

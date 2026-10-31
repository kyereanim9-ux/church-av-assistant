import {
  LayoutDashboard, Package, DoorOpen, Cable, Sparkles, ScanSearch, Search, ShieldCheck, Building2, LucideIcon,
} from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  primary: boolean;
  adminOnly?: boolean;
  /** si présent : visible uniquement pour ces rôles */
  roles?: string[];
};

export function isNavItemVisible(item: NavItem, role?: string | null) {
  if (item.adminOnly && role !== 'ADMIN') return false;
  if (item.roles && !item.roles.includes(role ?? '')) return false;
  return true;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Accueil', icon: LayoutDashboard, primary: true },
  { href: '/equipment', label: 'Matériel', icon: Package, primary: true },
  { href: '/rooms', label: 'Salles', icon: DoorOpen, primary: true },
  { href: '/batiment', label: 'Bâtiment', icon: Building2, primary: false, roles: ['ADMIN', 'BATIMENT'] },
  { href: '/installations', label: 'Installations', icon: Cable, primary: false },
  { href: '/assistant', label: 'Assistant IA', icon: Sparkles, primary: true },
  { href: '/identify', label: 'Identifier un matériel', icon: ScanSearch, primary: false },
  { href: '/search', label: 'Recherche', icon: Search, primary: false },
  { href: '/admin', label: 'Administration', icon: ShieldCheck, primary: false, adminOnly: true },
];

export interface NavItem {
  label: string;
  href: string;
  icon: 'home' | 'network' | 'search' | 'document' | 'settings';
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: 'home' },
  { label: 'Networks', href: '/networks', icon: 'network' },
  { label: 'Join Network', href: '/join', icon: 'search' },
  { label: 'Spec Studio', href: '/specs', icon: 'document' },
  { label: 'Settings', href: '/settings', icon: 'settings' },
];

"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItemProps {
  href: string;
  label: string;
  isActive: boolean;
}

const NavItem = ({ href, label, isActive }: NavItemProps) => {
  return (
    <Link 
      href={href}
      className={`px-4 py-2 rounded-md transition-colors ${isActive 
        ? 'bg-blue-100 text-blue-700 font-medium' 
        : 'text-gray-600 hover:bg-gray-100'}`}
    >
      {label}
    </Link>
  );
};

export function NavBar() {
  const pathname = usePathname();
  
  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/operations-dashboard', label: 'Operations Dashboard' },
    { href: '/ai-chat-assistant', label: 'AI Chat Assistant' },
  ];

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold text-blue-600">Botson.ai</span>
          </div>
          
          <nav className="flex items-center space-x-4">
            {navItems.map((item) => (
              <NavItem 
                key={item.href}
                href={item.href}
                label={item.label}
                isActive={pathname === item.href}
              />
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
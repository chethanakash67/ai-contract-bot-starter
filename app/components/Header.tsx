"use client";
import Link from 'next/link';
import { FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLoading } from './LoadingContext';

export default function Header() {
  const router = useRouter();
  const { start, stop } = useLoading();

  async function logout() {
    try {
      start();
      await fetch('/api/auth/logout', { method: 'POST' });
      router.replace('/login');
    } finally {
      stop();
    }
  }

  return (
    <header className="bg-white border-b sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-gray-800">
          <FileText className="w-6 h-6 text-black" />
          <span>ContractBot AI</span>
        </Link>
        <nav className="ml-8 flex items-center gap-4 text-sm">
          <Link href="/agreements" onClick={() => start()} className="text-gray-700 hover:text-black">Agreements</Link>
          <Link href="/new" onClick={() => start()} className="text-gray-700 hover:text-black">New</Link>
          <button onClick={logout} className="text-gray-700 hover:text-black" type="button">Sign out</button>
        </nav>
      </div>
    </header>
  );
}

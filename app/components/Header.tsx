import Link from 'next/link';
import { FileText } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-white border-b sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-gray-800">
          <FileText className="w-6 h-6 text-black" />
          <span>ContractBot AI</span>
        </Link>
        <nav className="ml-8 flex items-center gap-4 text-sm">
          <Link href="/agreements" className="text-gray-700 hover:text-black">Agreements</Link>
          <Link href="/new" className="text-gray-700 hover:text-black">New</Link>
          <form action="/api/auth/logout" method="post">
            <button className="text-gray-700 hover:text-black" type="submit">Sign out</button>
          </form>
        </nav>
      </div>
    </header>
  );
}

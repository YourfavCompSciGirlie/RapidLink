import { ExternalLink, MessageSquareText, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';

export default function ResponderLandingPage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-white">
      <div className="mx-auto max-w-2xl px-4 py-12 text-center sm:px-6 sm:py-20">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-xl bg-blue-100 text-[#003172]"><Smartphone className="h-8 w-8" /></span>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-[#003172]">Responder access</h1>
        <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-700">Open your assigned incident link to review the request, then accept or decline the response.</p>
        <Button asChild className="mt-7"><Link to="/messages"><MessageSquareText className="h-4 w-4" /> Open responder messages <ExternalLink className="h-4 w-4" /></Link></Button>
      </div>
    </main>
  );
}

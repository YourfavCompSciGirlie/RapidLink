import { ExternalLink, MessageSquareText, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';

import { ServiceNotice } from '@/components/service-notice';
import { Button } from '@/components/ui/button';

export default function ResponderLandingPage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-white">
      <ServiceNotice />
      <div className="mx-auto max-w-2xl px-4 py-12 text-center sm:px-6 sm:py-20">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-xl bg-blue-100 text-[#003172]"><Smartphone className="h-8 w-8" /></span>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-[#003172]">Responder links open in a browser</h1>
        <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-700">Responders do not need to install an app. Open a unique message link to review an offer, then explicitly accept or decline.</p>
        <Button asChild className="mt-7"><Link to="/messages"><MessageSquareText className="h-4 w-4" /> Open responder messages <ExternalLink className="h-4 w-4" /></Link></Button>
      </div>
    </main>
  );
}

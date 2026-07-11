import { Link } from 'react-router';
import { Navigation } from '@/components/Navigation';

function LegalLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <Navigation />
      <main className="min-h-dvh bg-bg-base px-5 py-10 text-text-primary md:px-10">
        <article className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent">Roomly legal</p>
          <h1 className="mt-3 font-display text-[40px] font-semibold md:text-[52px]">{title}</h1>
          <div className="mt-8 space-y-7 text-sm leading-7 text-text-secondary">{children}</div>
        </article>
      </main>
    </>
  );
}

export function PrivacyPage() {
  return <LegalLayout title="Privacy">
    <section><h2 className="text-lg font-bold text-text-primary">Your room photos</h2><p className="mt-2">Roomly uses room photos only to provide the design flow you request. We never train AI models on your photos.</p></section>
    <section><h2 className="text-lg font-bold text-text-primary">What we store</h2><p className="mt-2">We store uploaded room images, room analysis, generated designs, saved designs, and shopping interactions needed to run your account and improve recommendations.</p></section>
    <section><h2 className="text-lg font-bold text-text-primary">Optional analytics</h2><p className="mt-2">Anonymous analytics are optional. They never include uploaded photos, room-analysis text, messages, names, or email addresses. You can choose essential storage only in the cookie banner.</p></section>
    <section><h2 className="text-lg font-bold text-text-primary">Your choices</h2><p className="mt-2">You can delete your account from Account & billing. See the <Link to="/terms" className="font-semibold text-accent">Terms</Link> for product-link and service details.</p></section>
  </LegalLayout>;
}

export function TermsPage() {
  return <LegalLayout title="Terms">
    <section><h2 className="text-lg font-bold text-text-primary">Roomly recommendations</h2><p className="mt-2">Roomly provides design suggestions and catalog matches for inspiration. Prices, availability, shipping, and retailer policies can change after a recommendation is generated.</p></section>
    <section><h2 className="text-lg font-bold text-text-primary">Retailer links</h2><p className="mt-2">Product buttons take you to third-party retailers. Roomly does not process retailer payments, fulfil orders, or guarantee product information.</p></section>
    <section><h2 className="text-lg font-bold text-text-primary">Trust signals</h2><p className="mt-2">Trust labels are Roomly catalog signals, not live retailer verification or a guarantee of product quality.</p></section>
    <section><h2 className="text-lg font-bold text-text-primary">Acceptable use</h2><p className="mt-2">Use Roomly only with photos you have the right to upload. Do not submit harmful, unlawful, or private material belonging to someone else.</p></section>
  </LegalLayout>;
}

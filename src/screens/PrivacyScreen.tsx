import { LEGAL_UPDATED, PRIVACY_SECTIONS } from '../data/legalText';

export function PrivacyScreen() {
  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-3xl px-4 py-10 text-gray-800">
        <a href="/" className="text-sm font-semibold text-blue-700 hover:underline">← Back to Resync</a>
        <h1 className="mt-6 text-3xl font-bold text-gray-900">Resync Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: {LEGAL_UPDATED}</p>
        <p className="mt-6 leading-relaxed">
          This policy explains what information Resync collects when you use the Resync website and services, how it is used, who receives it, how long it is kept, and the choices you have. Resync checks academic manuscripts for coherence across chapters. Please read it together with our <a href="/terms" className="font-semibold text-blue-700 hover:underline">Terms of Service</a>.
        </p>
        {PRIVACY_SECTIONS.map(section => (
          <section key={section.title} className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900">{section.title}</h2>
            <div className="mt-3 space-y-3 leading-relaxed">
              {section.body.map((item, i) => (
                <p key={i}>{item}</p>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

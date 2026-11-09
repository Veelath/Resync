import type { ReactNode } from 'react';

const sections: { title: string; body: ReactNode[] }[] = [
  {
    title: '1. Information we use',
    body: [
      'We use account details, manuscript text and scan results to provide your reports.',
      'We do not sell your personal information or your manuscripts.',
    ],
  },
  {
    title: '2. Services that process your information',
    body: [
      'Manuscript text is sent to Google Gemini to produce findings and recommendations. During user testing, Gemini runs on Google\'s free tier, where Google may use submitted content to improve its products.',
      'A scoring model on Modal processes manuscript text. Supabase provides authentication and database storage. Render hosts the web app, and Amazon Web Services hosts the backend.',
      'Google also provides optional sign-in and access to Google Docs links you submit.',
    ],
  },
  {
    title: '3. Storage and deletion',
    body: [
      'Extracted manuscript text and scan results are stored to support your reports. Your browser may also save the Word file for the preview.',
      'The app does not currently provide a control to delete individual scans or accounts.',
    ],
  },
];

export function PrivacyScreen() {
  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-3xl px-4 py-10 text-gray-800">
        <a href="/" className="text-sm font-semibold text-blue-700 hover:underline">← Back to Resync</a>
        <h1 className="mt-6 text-3xl font-bold text-gray-900">Resync Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: November 9, 2026</p>
        <p className="mt-6 leading-relaxed">
          This policy explains what information Resync ("we", "us") collects when you use the Resync website and services, how we use it, and the choices you have. Resync checks academic manuscripts for coherence across chapters.
        </p>
        {sections.map(section => (
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

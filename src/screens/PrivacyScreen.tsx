import type { ReactNode } from 'react';

const sections: { title: string; body: ReactNode[] }[] = [
  {
    title: '1. Information we collect',
    body: [
      <><strong>Account information.</strong> When you sign up with email and password, we collect your email address and a display name. When you sign in with Google, we receive your name, email address, and profile picture from Google.</>,
      <><strong>Manuscripts and documents.</strong> When you upload a Word file (.doc or .docx) or provide a Google Docs link, we process the text of that document to detect section headings and check how sections connect. Uploaded files are limited to 25 MB.</>,
      <><strong>Scan results.</strong> We store the results of each scan, such as scores, findings, and the document title, so you can view your reports later.</>,
      <><strong>Usage information.</strong> We may collect basic technical information, such as browser type, device type, and pages visited, to keep the service working and secure.</>,
    ],
  },
  {
    title: '2. How we use information',
    body: [
      'We use this information to create and manage your account and sign you in, process your manuscripts and produce coherence reports, save your report history, keep the service secure and fix problems, and respond to support requests.',
      'We do not sell your personal information or your manuscripts.',
    ],
  },
  {
    title: '3. Service providers',
    body: [
      <><strong>Supabase</strong> for authentication and our database, including account and scan record storage.</>,
      <><strong>Google</strong> for optional sign-in with Google, and reading Google Docs that you link.</>,
      <><strong>[Hosting provider, e.g. Render]</strong> for hosting the Resync web app and backend.</>,
      <><strong>[Any AI or analysis provider you use]</strong>: [describe what is sent and why].</>,
      'Each provider processes data only to provide its service to us.',
    ],
  },
  {
    title: '4. Manuscript retention',
    body: [
      <>We keep uploaded manuscripts and scan results for [PERIOD, e.g. as long as your account exists] so you can revisit your reports. You can delete a scan or your account at any time by [METHOD, e.g. contacting us at EMAIL]. Deleted data is removed from our database within [PERIOD].</>,
    ],
  },
  {
    title: '5. Security',
    body: [
      'We protect data in transit with HTTPS and restrict access to stored data. No online service is completely secure, so we cannot guarantee absolute security.',
    ],
  },
  {
    title: '6. Your choices and rights',
    body: [
      <>Depending on where you live, you may have the right to access, correct, delete, or export your personal information, and to object to some processing. To exercise these rights, contact us at readSync.uc.edu@gmail.com. You can also choose not to upload manuscripts, although the service will not work without them.</>,
    ],
  },
  {
    title: '7. Children',
    body: [
      <>Resync is intended for adult students, researchers, and educators. We do not knowingly collect personal information from children under [AGE]. If you believe a child has provided us information, contact us and we will delete it.</>,
    ],
  },
  {
    title: '8. International transfers',
    body: [
      <>Our providers may process data in [COUNTRIES]. Where required, we rely on [SAFEGUARD, e.g. standard contractual clauses].</>,
    ],
  },
  {
    title: '9. Changes to this policy',
    body: [
      <>We may update this policy. We will post the new version on this page and change the "Last updated" date. For significant changes, we will notify you by [METHOD].</>,
    ],
  },
  {
    title: '10. Contact us',
    body: [
      <><br />University of Cebu - Banilad<br />readSync.uc.edu@gmail.com</>,
    ],
  },
];

export function PrivacyScreen() {
  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-3xl px-4 py-10 text-gray-800">
        <a href="/" className="text-sm font-semibold text-blue-700 hover:underline">← Back to Resync</a>
        <h1 className="mt-6 text-3xl font-bold text-gray-900">Resync Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: October 30, 2026</p>
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

import type { ReactNode } from 'react';

const sections: { title: string; body: ReactNode[] }[] = [
  {
    title: '1. Acceptance of these terms',
    body: [
      'By creating an account or using Resync, you agree to these Terms of Service and to our Privacy Policy. If you do not agree, do not use the service.',
    ],
  },
  {
    title: '2. What Resync does',
    body: [
      'Resync is a tool that checks academic manuscripts for coherence across chapters and sections. It produces automated reports, scores, and suggestions to help you review your own writing.',
      'Resync is an aid, not a substitute for your own judgment, your adviser, or your institution\'s requirements. Results are generated automatically and may contain mistakes. You are responsible for your manuscript and for any decisions you make based on a report.',
    ],
  },
  {
    title: '3. Your account',
    body: [
      'You may sign up with an email and password or with Google. You must provide accurate information and keep your login details secure. You are responsible for activity on your account. Tell us promptly at readSync.uc.edu@gmail.com if you think someone else has accessed it.',
      <>You must be at least [AGE] years old to use Resync.</>,
    ],
  },
  {
    title: '4. Your content',
    body: [
      'You keep ownership of the manuscripts and documents you upload or link. You give Resync permission to process them, and to store the resulting reports, only to provide the service to you, as described in our Privacy Policy.',
      'You confirm that you have the right to upload each document and that doing so does not break any law or anyone else\'s rights, including copyright and confidentiality obligations.',
    ],
  },
  {
    title: '5. Acceptable use',
    body: [
      'You agree not to:',
      '• upload content that is unlawful, harmful, or that you do not have permission to use;',
      '• try to break, overload, probe, or gain unauthorized access to the service or other users\' data;',
      '• reverse engineer the service, or copy or resell its reports or models except as these terms allow;',
      '• use the service to harass others or to submit work in a way that violates your institution\'s academic integrity rules.',
    ],
  },
  {
    title: '6. Credits and payments',
    body: [
      <>Some features may require credits or payment. Prices, credit amounts, and any refund rules are shown at the time of purchase: [DESCRIBE PRICING AND REFUND POLICY]. Credits [do / do not] expire. Payments are processed by [PAYMENT PROVIDER].</>,
    ],
  },
  {
    title: '7. Our rights',
    body: [
      'Resync, including its software, design, and brand, belongs to us and our licensors. These terms give you a limited, personal, non-transferable right to use the service. They do not give you ownership of any part of it.',
    ],
  },
  {
    title: '8. Availability and changes',
    body: [
      'We work to keep Resync available, but it may be interrupted, changed, or discontinued. We may update features, limits, or these terms at any time. If we make material changes, we will tell you by [METHOD]. Continuing to use Resync after a change means you accept it.',
    ],
  },
  {
    title: '9. Suspension and termination',
    body: [
      'You can stop using Resync and delete your account at any time. We may suspend or end your access if you break these terms or put the service or other users at risk. Sections that by their nature should continue, such as ownership, disclaimers, and liability limits, will continue after your access ends.',
    ],
  },
  {
    title: '10. Disclaimers',
    body: [
      'Resync is provided "as is" and "as available". We do not promise that reports will be accurate, complete, or suitable for any particular purpose, or that the service will be uninterrupted or error-free.',
    ],
  },
  {
    title: '11. Limit of liability',
    body: [
      'To the fullest extent allowed by law, Resync and its team are not liable for indirect, incidental, or consequential losses, or for loss of data, grades, or opportunities, arising from your use of the service. Our total liability for any claim is limited to the amount you paid us in the [PERIOD, e.g. 12 months] before the claim, or [AMOUNT] if you paid nothing.',
    ],
  },
  {
    title: '12. Governing law',
    body: [
      <>These terms are governed by the laws of [COUNTRY / JURISDICTION]. Any dispute will be handled in the courts of [PLACE], unless the law where you live requires otherwise.</>,
    ],
  },
  {
    title: '13. Contact us',
    body: [
      <>University of Cebu - Banilad<br />readSync.uc.edu@gmail.com</>,
    ],
  },
];

export function TermsScreen() {
  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-3xl px-4 py-10 text-gray-800">
        <a href="/" className="text-sm font-semibold text-blue-700 hover:underline">← Back to Resync</a>
        <h1 className="mt-6 text-3xl font-bold text-gray-900">Resync Terms of Service</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: October 30, 2026</p>
        <p className="mt-6 leading-relaxed">
          These terms explain the rules for using Resync, the academic manuscript coherence checker. Please read them together with our <a href="/privacy" className="font-semibold text-blue-700 hover:underline">Privacy Policy</a>.
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

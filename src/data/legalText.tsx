import type { ReactNode } from 'react';

// One source for the Terms of Service and Privacy Policy, shown on their own pages and in the sign-up window.
// Drafted to protect both the people who use Resync (their manuscripts and data) and the team that runs it.
// It describes what the service actually does. Have a lawyer or the school's legal office review it before any real launch.

export const LEGAL_UPDATED = 'November 17, 2026';
export const CONTACT_EMAIL = 'readSync.uc.edu@gmail.com';
export const CONTACT_PLACE = 'University of Cebu - Banilad';

export interface LegalSection { title: string; body: ReactNode[] }

const contact = <><a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-blue-700 hover:underline">{CONTACT_EMAIL}</a></>;

export const TERMS_SECTIONS: LegalSection[] = [
  {
    title: '1. Agreeing to these terms',
    body: [
      'By creating an account or using Resync ("Resync", "we", "us", the "Team"), you agree to these Terms of Service and to our Privacy Policy. If you do not agree, do not use Resync.',
      'Resync was built by a student team as a capstone project and may be in a testing phase. Some features, prices and limits may change as it develops.',
    ],
  },
  {
    title: '2. What Resync does, and what it does not',
    body: [
      'Resync reads a research manuscript you provide and checks whether its sections fit together: objectives, methods, results, conclusions, numbers and claims. It returns a score, the sentences that conflict, and suggested fixes. It can also check citation links and show an advisory AI-text indicator.',
      'Resync is an aid for your own revision. It is not an adviser, a grader, a plagiarism detector, or an academic-integrity decision. Its scores, findings and suggestions are produced by automated models and can be wrong, incomplete or out of date. Nothing Resync produces should be treated as a final judgment of your work, your research or you.',
      'You are responsible for your manuscript, for every change you make, and for every decision you take based on a report. Always check suggestions against your adviser\'s and your institution\'s requirements.',
    ],
  },
  {
    title: '3. Your account',
    body: [
      'You can sign up with an email and password or with Google. Give accurate information and keep your login details safe. You are responsible for what happens under your account. Tell us at ' + CONTACT_EMAIL + ' as soon as you think someone else has used it.',
      'You must be at least 16 years old. If you are under 18, you confirm that a parent, guardian or your school allows you to use Resync.',
    ],
  },
  {
    title: '4. Your manuscripts belong to you',
    body: [
      'You keep all ownership and rights in the documents you upload or link. Resync does not claim any ownership of them, and we do not sell them or use them to advertise.',
      'You give us a limited, temporary permission to read and process a document, including sending its text to the service providers listed in our Privacy Policy, only so that we can produce your report. That permission ends when your report is deleted, except for the limited records described in the Privacy Policy.',
      'You confirm that you have the right to upload each document, that it is not unlawful, and that it does not include another person\'s confidential or personal information unless you have permission to share it with us.',
    ],
  },
  {
    title: '5. Reports are not kept',
    body: [
      'Resync does not keep a library of your reports. When you leave a report page, we delete the stored report and its findings, recommendations and the saved copy of your manuscript text. We warn you before this happens. A report cannot be opened again after it is deleted.',
      'If you want a copy, download the PDF before you leave. Downloading is your responsibility; we cannot recover a deleted report. If you close the tab, or your connection or device fails, we delete the report the next time you open Resync, and it may be lost before you could download it.',
    ],
  },
  {
    title: '6. Acceptable use',
    body: [
      'You agree not to:',
      '• upload content that is unlawful, harmful, infringing, or that you have no permission to use;',
      '• attack, overload, probe, scrape, or try to gain unauthorized access to Resync, its accounts or its data;',
      '• reverse engineer, copy, resell or train another system on Resync\'s reports, models, prompts or software;',
      '• share your account, or use automated means to create accounts or scans;',
      '• use Resync to break your institution\'s academic integrity rules, for example by presenting Resync\'s suggested wording as proof of originality or as another person\'s work.',
      'We may limit the size, number or speed of scans to keep the service fair and stable.',
    ],
  },
  {
    title: '7. Credits and payments',
    body: [
      'Starting a scan is free. Opening the full report costs credits. Credits are prepaid, personal, not transferable, and have no cash value. Prices and credit packages are shown before you buy.',
      'Opening a report uses one credit and is final, because the report is deleted when you leave it. If a scan fails because of an error on our side, or we charge you twice for the same report, we will restore the credit. Otherwise purchases are not refundable. Credits stay on your account while it is active and are lost if the account is closed.',
      'While Resync is in its capstone and testing phase, purchases may be simulated and may not involve a real charge. If real payments are introduced, we will say who processes them before you pay.',
    ],
  },
  {
    title: '8. Our rights',
    body: [
      'Resync, including its software, design, models, prompts, name and logo, belongs to the Team and its licensors. These terms give you a limited, personal, non-transferable right to use it. They give you no ownership of any part of it.',
      'The reports Resync produces for you are yours to use for your own studies. You may not present them as being written by anyone other than the Team, and you may not remove the "Report by Team Resync" label to mislead others about where a report came from.',
    ],
  },
  {
    title: '9. Third-party services',
    body: [
      'Resync depends on services run by others (for example Google Gemini, Google sign-in and Google Docs, Modal, Supabase, Render, and Crossref and the websites of cited sources). They have their own terms and may fail, change or be unavailable. We are not responsible for them. The Privacy Policy explains what each one receives.',
    ],
  },
  {
    title: '10. Availability and changes',
    body: [
      'We try to keep Resync running, but it may be interrupted, slowed, changed or ended at any time, with or without notice. We may update features, limits, prices or these terms. For material changes we will post the new version here with a new date and show a notice when you next sign in. Using Resync after a change means you accept it. If you do not accept it, stop using Resync and ask us to delete your account.',
    ],
  },
  {
    title: '11. Suspension and ending',
    body: [
      'You can stop using Resync and ask us to delete your account at any time by writing to us. We may suspend or end access if you break these terms, put the service or others at risk, or if we must by law. Sections that by their nature should continue (ownership, disclaimers, liability, and indemnity) continue after your access ends.',
    ],
  },
  {
    title: '12. No warranty',
    body: [
      'Resync is provided "as is" and "as available". To the fullest extent the law allows, we make no promise that Resync or its reports will be accurate, complete, error-free, uninterrupted, secure, or fit for any purpose, including passing a defense, a grade or a publication decision.',
    ],
  },
  {
    title: '13. Limit of liability',
    body: [
      'To the fullest extent the law allows, the Team, its members, its adviser and its institution are not liable for indirect, incidental, special or consequential loss, or for loss of data, reports, grades, time or opportunities, arising from your use of Resync or from reliance on a report, even if we were told it could happen.',
      'Our total liability for any claim is limited to the amount you paid us for credits in the 12 months before the claim, or PHP 500 if you paid nothing. Nothing in these terms removes a right you have under law that cannot be removed, including your rights under the Data Privacy Act.',
    ],
  },
  {
    title: '14. If something goes wrong because of you',
    body: [
      'You agree to be responsible for losses, claims and reasonable costs the Team suffers because you uploaded content you had no right to upload, or because you broke these terms or the law.',
    ],
  },
  {
    title: '15. Governing law and disputes',
    body: [
      'These terms are governed by the laws of the Republic of the Philippines. Please contact us first so we can try to settle a problem informally. If that fails, disputes will be brought before the proper courts of Cebu City, unless the law where you live requires otherwise.',
    ],
  },
  {
    title: '16. General',
    body: [
      'If part of these terms cannot be enforced, the rest still applies. If we do not enforce a term right away, we have not given it up. These terms and the Privacy Policy are the whole agreement between you and the Team about Resync.',
    ],
  },
  {
    title: '17. Contact us',
    body: [<>{CONTACT_PLACE}<br />{contact}</>],
  },
];

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: '1. Who we are',
    body: [
      <>Resync is run by a student team at {CONTACT_PLACE}. For the purposes of the Philippine Data Privacy Act of 2012 (Republic Act 10173), the Team is the party that decides how your personal information is used. Contact us at {contact}.</>,
      'This policy explains what we collect, why, who receives it, how long we keep it, and the choices you have. We handle personal information in line with that law.',
    ],
  },
  {
    title: '2. What we collect',
    body: [
      '• Account details: your name, email address and sign-in method (password or Google). Passwords are handled by our sign-in provider and are not readable by us.',
      '• Your manuscripts: the Word file or Google Doc you submit, the text extracted from it, and the sections we find in it. This can include personal or sensitive information if your document contains it. Please remove anything you do not want processed.',
      '• Your reports: scores, findings, recommendations, citation checks and the AI-text indicator that Resync produces about your manuscript.',
      '• Credits and payments: your credit balance, purchases, receipts and any payment proof you upload.',
      '• Technical information: sign-in sessions, basic logs, and settings stored in your browser (for example your sign-in session and notification choices).',
    ],
  },
  {
    title: '3. Why we use it',
    body: [
      'We use your information only to run Resync: to sign you in, to scan your manuscript, to show and (if you choose) download your report, to count credits and purchases, to keep the service secure and working, and to answer your messages.',
      'We do not sell your personal information or your manuscripts. We do not use them for advertising. The Team does not use your manuscripts to train its own models.',
    ],
  },
  {
    title: '4. Who receives your information',
    body: [
      'To produce your report we use services run by others. They receive only what they need:',
      '• Google Gemini receives the text of your manuscript, in parts, to judge whether sections agree and to write findings and recommendations. While Resync is in testing it may use Google\'s free tier, where Google may use submitted content to improve its products. Do not upload a manuscript you are not willing to share on those terms.',
      '• Modal runs our scoring model and receives manuscript text to rate how sections fit together.',
      '• Supabase provides sign-in and our database. Render hosts the web app and server. Amazon Web Services provides hosting for the server.',
      '• Google provides optional sign-in and reads the Google Docs link you submit (only documents shared with a link).',
      '• Crossref and the websites of the sources you cite receive reference details and link requests so we can check whether citations exist and open.',
      'These providers may process data outside the Philippines. We may also share information if the law requires it or to protect the safety of users or the service.',
    ],
  },
  {
    title: '5. Reports are deleted when you leave them',
    body: [
      'Resync does not keep a library of your reports. When you leave a report page, we delete the stored report: its saved result, findings, recommendations, citation results, and the saved copy of your manuscript text that we keep to make repeat scans faster. We warn you before this happens and you can download a PDF first. After deletion we cannot restore it.',
      'If you close the tab or lose your connection, the report cannot be deleted at that moment; we delete it the next time you open Resync, or sooner if you ask us. Your browser may hold your uploaded file or the report on screen while the page is open; closing the page clears it.',
    ],
  },
  {
    title: '6. What we still keep',
    body: [
      'Some records remain after a report is deleted, because the service and the law need them:',
      '• a record that a scan took place (a reference number, the time, the overall scores and the names of the sections found, but not their text);',
      '• your credit ledger, purchase records and payment proofs, kept for accounting and to settle disputes;',
      '• saved AI verdicts used to make an unchanged paper score the same way each time. They are tied to your account and may contain short excerpts of sentences; you can ask us to delete them;',
      '• your account details until you ask us to delete the account;',
      '• basic server logs and backups for a limited time for security and reliability.',
      'If a scan is still running, or a deletion fails, a report may stay stored for longer than described. Tell us and we will remove it.',
    ],
  },
  {
    title: '7. Your rights',
    body: [
      'You may ask us to: tell you what we hold about you; correct it; stop using it for a purpose you did not agree to; delete or block it; give you a copy; and explain how it is used. You may also withdraw your consent. Write to ' + CONTACT_EMAIL + ' from the email address of your account and we will reply within a reasonable time.',
      'If you believe your information has been mishandled, you may complain to us first, and you may also contact the National Privacy Commission of the Philippines.',
    ],
  },
  {
    title: '8. Security',
    body: [
      'We use access controls so that only you can open your own reports, and our providers protect data in transit. No system is completely secure, so we cannot promise that information can never be lost, intercepted or misused. If a breach is likely to harm you, we will tell you and the authorities as the law requires.',
    ],
  },
  {
    title: '9. Your responsibilities',
    body: [
      'Only upload documents you are allowed to share. Do not upload other people\'s confidential or personal information without their permission. Keep your login details private. Download your PDF if you want to keep a report.',
    ],
  },
  {
    title: '10. Children',
    body: [
      'Resync is for people who are at least 16 years old. If you are under 18, a parent, guardian or your school must allow you to use it. If we learn that we hold information about a child younger than 16, we will delete it.',
    ],
  },
  {
    title: '11. Cookies and browser storage',
    body: [
      'We use your browser\'s storage to keep you signed in and to remember settings such as notification choices. We do not use advertising cookies or tracking for advertising.',
      'While you have a report open, a copy of the file you scanned is also kept in your own browser, and only there, so the report can show your manuscript as you wrote it, even after you refresh the page. It is never sent to us again. The copy lives only in this browser tab and is removed when you close the tab, leave the report, start another scan or sign out.',
    ],
  },
  {
    title: '12. Changes to this policy',
    body: [
      'We may update this policy as Resync changes. The new version will be posted here with a new date, and for material changes we will show a notice when you next sign in.',
    ],
  },
  {
    title: '13. Contact us',
    body: [<>{CONTACT_PLACE}<br />{contact}</>],
  },
];

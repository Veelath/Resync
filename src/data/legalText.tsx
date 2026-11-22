import type { ReactNode } from 'react';

// One source for the Terms of Service and Privacy Policy, shown on their own pages and in the sign-up window.
// Drafted to protect both the people who use Resync (their manuscripts and personal data) and the team that runs it (its software, its
// service providers and its limits of responsibility). It describes what the service actually does today; if the service changes, change
// this text with it. It is a careful draft, not legal advice: have a lawyer or the school's legal office review it before any real launch.

export const LEGAL_UPDATED = 'November 22, 2026';
export const CONTACT_EMAIL = 'resync.uc.edu@gmail.com';
export const CONTACT_PLACE = 'University of Cebu - Banilad';

export interface LegalSection { title: string; body: ReactNode[] }

const contact = <><a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-blue-700 hover:underline">{CONTACT_EMAIL}</a></>;

export const TERMS_SECTIONS: LegalSection[] = [
  {
    title: '1. About these terms',
    body: [
      'These Terms of Service are an agreement between you and the student team that builds and runs Resync (the "Team", "we", "us"). By creating an account, ticking the box when you sign up, or using Resync, you agree to these terms and to our Privacy Policy. If you do not agree, do not use Resync.',
      'Resync is a capstone project of the Team and may be in a testing or beta phase. Features, prices, limits and these terms may change as it develops, and parts of it may be unfinished or unavailable.',
      'In these terms, "Manuscript" means any document or Google Docs link you submit; "Report" means the score, findings, recommendations, citation checks and indicators Resync produces about a Manuscript; and "Credits" means the prepaid units used to open a full Report.',
    ],
  },
  {
    title: '2. What Resync does, and what it does not',
    body: [
      'Resync reads a research manuscript you provide and checks whether its sections fit together: aims, methods, results, conclusions, numbers and claims. It returns a score, the sentences that conflict, and suggested fixes. It can also check citation links and show an advisory AI-text indicator.',
      'Resync is a tool for your own revision. It is not an adviser, a grader, a plagiarism detector, a panel member or an academic-integrity decision. It does not prove that a paper is original, correct, honest or written by a person. The AI-text indicator is only a hint and must never be used as proof that someone used AI.',
      'Reports are produced by automated models, including third-party AI. They can be wrong, incomplete, inconsistent from one scan to the next, or out of date, and they can miss real problems or point at problems that are not there. Nothing Resync produces is a final judgment of your work, a guarantee of a grade, a defense result or a publication decision.',
      'You are responsible for your Manuscript, for every change you make and for every decision you take after reading a Report. Always check suggestions with your adviser and against your institution\'s rules.',
    ],
  },
  {
    title: '3. Your account',
    body: [
      'You can sign up with an email and password or with Google. Give accurate information, keep one account for yourself, and keep your login details private. You are responsible for everything done under your account. Tell us at ' + CONTACT_EMAIL + ' as soon as you think someone else has used it.',
      'You must be at least 16 years old. If you are under 18, you confirm that a parent, guardian or your school allows you to use Resync.',
    ],
  },
  {
    title: '4. Your manuscripts belong to you',
    body: [
      'You keep all ownership of, and rights in, the documents you upload or link. Resync does not claim any ownership of them, does not sell them, and does not use them to advertise.',
      'You give us a limited, temporary, non-exclusive permission to read and process a Manuscript, including sending its text to the service providers named in the Privacy Policy, only so that we can produce your Report, keep the service secure and working, and meet our legal duties. That permission ends when your Report is deleted, except for the limited records described in the Privacy Policy.',
      'You promise that you have the right to submit each Manuscript; that doing so does not break any law, contract, copyright, confidentiality duty or school rule; and that it does not contain another person\'s personal, confidential or sensitive information unless you have permission to share it with us. Do not submit anything you are not willing to have processed by the providers in the Privacy Policy.',
      'Because Resync works by reading and processing text, we cannot promise that a Manuscript stays confidential beyond the protections described in the Privacy Policy. Do not upload a document that must stay secret under an agreement or law unless that agreement or law allows it.',
    ],
  },
  {
    title: '5. Reports are not kept',
    body: [
      'Resync does not keep a library of your Reports. When you leave a Report page, we delete the stored Report: its findings, recommendations, citation results and the saved copy of your Manuscript text. We warn you before this happens. A deleted Report cannot be opened again.',
      'If you want a copy, download the PDF before you leave. Downloading is your responsibility and we cannot recover a deleted Report. If you close the tab, or your connection or device fails, we delete the Report the next time you open Resync, so it may be lost before you could download it.',
    ],
  },
  {
    title: '6. Acceptable use',
    body: [
      'You agree not to:',
      '• submit content that is unlawful, harmful, defamatory, infringing, or that you have no permission to use, or that contains malware or hidden instructions meant to manipulate the AI or the service;',
      '• attack, overload, probe, scrape, or try to gain unauthorized access to Resync, its accounts, its data or its service providers, or try to get around any limit, credit check, rate limit or security control;',
      '• reverse engineer, copy, resell, sublicense or use Resync\'s Reports, models, prompts or software to build or train another system;',
      '• share your account, create several accounts to get around limits or free scans, or use bots or other automated means to create accounts or scans;',
      '• use Resync to break your institution\'s academic integrity rules, for example by presenting Resync\'s suggested wording as proof of originality or as another person\'s work, or by using a Report to accuse someone of misconduct;',
      '• use Resync in a way that harms other people or that the law forbids.',
    ],
  },
  {
    title: '7. Fair use and limits',
    body: [
      'To keep Resync fair and stable, we limit how it can be used. For example, an account can run one scan at a time, a file may not be larger than 25 MB, scans may wait in a queue when many people are using the service, and we may slow down, refuse or stop a scan that looks abusive, too large or unsafe. These limits can change at any time.',
      'A scan may fail or be delayed because of a limit or fault in a service we rely on. We will try to tell you, but we do not promise a scan will finish within any particular time.',
    ],
  },
  {
    title: '8. Credits, payments and refunds',
    body: [
      'Starting a scan is free. Opening the full Report costs Credits, unless a free first Report is shown to you. Credits are prepaid, personal, not transferable and have no cash value. Prices and packages are shown before you buy.',
      'Opening a Report uses one Credit and is final, because the Report is deleted when you leave it. If a scan fails because of an error on our side, or you are charged twice for the same Report, we will restore the Credit. Otherwise purchases are not refundable. Credits stay on your account while it is active and are lost if the account is closed, including when it is closed for breaking these terms.',
      'While Resync is in its capstone and testing phase, the checkout is a simulated sandbox: it does not charge real money, and any transfer details shown are demonstration details, not a real account. Do not send real money to them. Credits bought there may be reset or removed. If real payments are introduced, we will say who processes them and show the price and the rules before you pay.',
      'We may refuse, cancel or reverse a purchase or Credits that we reasonably believe are fraudulent, mistaken or abusive.',
    ],
  },
  {
    title: '9. Our software and name',
    body: [
      'Resync, including its software, design, models, prompts, text, name and logo, belongs to the Team and its licensors and is protected by law, including the Intellectual Property Code of the Philippines. These terms give you a limited, personal, non-transferable, revocable right to use Resync as it is offered. They give you no ownership of any part of it.',
      'The Reports Resync produces for you are yours to use for your own studies. You may not present them as being written by anyone other than the Team, and you may not remove the "Report by Team Resync" label to mislead others about where a Report came from.',
      'If you send us ideas, comments or bug reports, you allow us to use them freely, without payment or credit to you, to improve Resync.',
    ],
  },
  {
    title: '10. Third-party services',
    body: [
      'Resync depends on services run by others, for example Google Gemini, Google sign-in and Google Docs, Modal, Supabase, Render, Amazon Web Services, OneSignal, and Crossref and the websites of cited sources. They have their own terms and may fail, change, charge, limit use or be unavailable. We are not responsible for them or for what they do. The Privacy Policy explains what each one receives.',
      'Links to other websites are for your convenience. We do not control or endorse them.',
    ],
  },
  {
    title: '11. Availability and changes',
    body: [
      'We try to keep Resync running, but it may be interrupted, slowed, changed, limited or ended at any time, with or without notice, for example for maintenance, a fault, a provider outage, a security problem or the end of the project. Because Reports are not kept, an interruption can cost you an unsaved Report. Download your PDF if you want to keep one.',
      'We may update features, limits, prices or these terms. For material changes we will post the new version here with a new date and show a notice when you next sign in. Using Resync after a change means you accept it. If you do not accept it, stop using Resync and ask us to delete your account.',
    ],
  },
  {
    title: '12. Suspension and ending',
    body: [
      'You can stop using Resync and ask us to delete your account at any time by writing to us. We may warn, limit, suspend or end your access, with or without notice, if you break these terms, put the service, other people or our providers at risk, or if the law or a provider requires it.',
      'When your access ends, your right to use Resync ends. Sections that by their nature should continue, including ownership, acceptable use, disclaimers, limits of liability and indemnity, continue after your access ends.',
    ],
  },
  {
    title: '13. No warranty',
    body: [
      'Resync is provided "as is" and "as available". To the fullest extent the law allows, we make no promise, express or implied, that Resync or its Reports will be accurate, complete, error-free, uninterrupted, secure, free of harmful code, available at any time, or fit for any purpose, including passing a defense, earning a grade or being accepted for publication.',
    ],
  },
  {
    title: '14. Limit of liability',
    body: [
      'To the fullest extent the law allows, the Team, its members, its adviser, its institution and its service providers are not liable for indirect, incidental, special, punitive or consequential loss, or for loss of data, Reports, grades, time, profit or opportunities, arising from your use of Resync, a Report, a service outage or a failure of a third-party service, even if we were told it could happen.',
      'Our total liability for any claim is limited to the amount you paid us for Credits in the 12 months before the claim, or PHP 500 if you paid nothing. Nothing in these terms removes a right you have under law that cannot be removed, including your rights under the Data Privacy Act, and nothing limits liability that the law does not allow to be limited.',
    ],
  },
  {
    title: '15. If something goes wrong because of you',
    body: [
      'You agree to be responsible for, and to make good, losses, claims and reasonable costs that the Team, its members or its providers suffer because you submitted content you had no right to submit, because you broke these terms or the law, or because of how you used a Report. This does not apply to the extent the loss was caused by our own wrongdoing.',
    ],
  },
  {
    title: '16. Reporting a security problem',
    body: [
      'If you find a security weakness in Resync, please tell us at ' + CONTACT_EMAIL + ' and give us reasonable time to fix it before you share it. Do not read, change or delete anyone else\'s data, do not disrupt the service, and do not demand payment. If you act in good faith and follow these rules, we will not take action against you for reporting.',
    ],
  },
  {
    title: '17. Notices and electronic agreement',
    body: [
      'You agree that this agreement, and any notice we give you, may be made and sent electronically, by posting it in Resync or by email to the address on your account. Ticking the box at sign-up or using Resync is your electronic signature and has the effect the law gives to electronic documents. Keep your email address up to date.',
    ],
  },
  {
    title: '18. Governing law and disputes',
    body: [
      'These terms are governed by the laws of the Republic of the Philippines. Please contact us first so that we can try to settle a problem informally. If that fails, disputes will be brought before the proper courts of Cebu City, unless the law where you live requires otherwise.',
    ],
  },
  {
    title: '19. General',
    body: [
      'If part of these terms cannot be enforced, the rest still applies. If we do not enforce a term right away, we have not given it up. You may not transfer your rights under these terms to anyone; we may transfer ours to a successor of the project. We are not responsible for failing to perform because of events beyond our reasonable control, such as outages, disasters, laws or provider failures. These terms and the Privacy Policy are the whole agreement between you and the Team about Resync. If a translation differs from the English version, the English version applies.',
    ],
  },
  {
    title: '20. Contact us',
    body: [<>{CONTACT_PLACE}<br />{contact}</>],
  },
];

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: '1. Who we are and what this policy covers',
    body: [
      <>Resync is run by a student team at {CONTACT_PLACE}. For the Data Privacy Act of 2012 (Republic Act 10173), its Implementing Rules and the rules of the National Privacy Commission, the Team is the personal information controller for the information described here. Our data protection contact is {contact}.</>,
      'This policy explains what personal information we collect, why we use it, who receives it, how long we keep it, how we protect it, and the choices and rights you have. It applies to the Resync website and web app and to the tools that run behind them.',
    ],
  },
  {
    title: '2. What we collect',
    body: [
      '• Account details: your name, email address and sign-in method (password or Google). Passwords are handled by our sign-in provider and are not readable by us. If you sign in with Google, Google tells us your name and email.',
      '• Your manuscripts: the Word file or Google Doc you submit, the text extracted from it, the headings you choose, and the sections we find in it. This can include personal or sensitive information if your document contains it. Please remove anything you do not want processed.',
      '• Your reports: the scores, findings, recommendations, citation checks and AI-text indicator Resync produces about your manuscript.',
      '• Credits and payments: your credit balance, credit and purchase records, and, if you choose to give them, a payer name, a reference number and a proof-of-payment image or PDF. While checkout is a simulated sandbox no real payment details are taken. We never ask for card numbers or passwords for payment.',
      '• Notifications: your notification choices, and, if you use a connected mobile device, a device identifier used to send you a "scan complete" notice.',
      '• Technical information: sign-in sessions, your IP address and basic request logs kept by our hosting providers and servers, and error records used to fix faults.',
      'We collect this information from you directly, from your sign-in provider, and from your use of Resync. We do not buy information about you.',
    ],
  },
  {
    title: '3. Sensitive information',
    body: [
      'We do not ask you for sensitive personal information, such as health, religion, politics, government ID numbers, finances or information about children. A thesis can still contain it, for example in a case study or an appendix. If you submit a manuscript that contains sensitive or third-party personal information, you confirm that you are allowed to share it and you consent to our processing it only to produce your report. Remove it first if you can.',
    ],
  },
  {
    title: '4. Why we use your information, and our lawful basis',
    body: [
      'We use your information only to run Resync: to sign you in; to scan your manuscript and show or (if you choose) let you download your report; to count credits and purchases; to send notices you asked for; to keep the service secure, fair and working, including preventing abuse and fixing faults; to meet legal duties; and to answer your messages.',
      'Our lawful bases are your consent (which you give when you sign up and when you submit a manuscript), the service you asked us to provide, our legitimate interest in keeping Resync secure and working, and our legal obligations. You can withdraw consent at any time, but then we can no longer provide the service to you.',
      'We do not sell your personal information or your manuscripts, we do not use them for advertising, and the Team does not use your manuscripts to train its own models. We do not use advertising or tracking cookies.',
    ],
  },
  {
    title: '5. Automated processing and AI',
    body: [
      'Resync is automated. A scoring model rates how sections fit together and an AI model (Google Gemini) judges whether they agree and writes findings and suggestions. These results are advice for you to review. They are not decisions about you made by us, they have no legal effect, and they can be wrong. You can ignore any of them. If you think a result is wrong, you can ask us to look at it.',
    ],
  },
  {
    title: '6. Who receives your information',
    body: [
      'To produce your report we use services run by others. They receive only what they need, and we choose providers that protect data under their own terms:',
      '• Google Gemini receives the text of your manuscript, in parts, to judge whether sections agree and to write findings and recommendations. While Resync is in testing it may use Google\'s free tier, where Google may use submitted content to improve its products and people may review it. Do not upload a manuscript you are not willing to share on those terms.',
      '• Modal runs our scoring model and receives manuscript text to rate how sections fit together.',
      '• Supabase provides sign-in and our database. Render hosts the web app and server. Amazon Web Services provides hosting for the server.',
      '• Google provides optional sign-in and reads the Google Docs link you submit (only documents shared with a link).',
      '• OneSignal sends a notice to a connected mobile device when a scan is done. It receives a device identifier and the title and score shown in that notice.',
      '• Crossref and the websites of the sources you cite receive reference details and link requests so we can check whether citations exist and open.',
      'These providers may process data outside the Philippines, and we rely on them to protect it. We may also share information if the law, a court or a government agency requires it, to enforce these terms, or to protect the safety of users, the Team or the service. If the project is passed to a successor, your information may go with it under the same promises.',
    ],
  },
  {
    title: '7. Reports are deleted when you leave them',
    body: [
      'Resync does not keep a library of your reports. When you leave a report page, we delete the stored report: its saved result, findings, recommendations, citation results, and the saved copy of your manuscript text that we keep to make repeat scans faster. We warn you before this happens, and you can download a PDF first. After deletion we cannot restore it.',
      'If you close the tab or lose your connection, the report cannot be deleted at that moment. We delete it the next time you open Resync, or sooner if you ask us.',
    ],
  },
  {
    title: '8. What we still keep, and for how long',
    body: [
      'Some records remain after a report is deleted, because the service and the law need them. We keep each only as long as it is needed for its purpose:',
      '• a record that a scan took place (a reference number, the time, the overall scores and the names of the sections found, but not their text), while your account exists;',
      '• your credit ledger, purchase records and any payment proofs, for accounting, fraud prevention and to settle disputes, and as long as the law requires;',
      '• saved AI verdicts used to make an unchanged paper score the same way each time. They are tied to your account and may contain short excerpts of sentences. You can ask us to delete them;',
      '• your account details, until you ask us to delete your account;',
      '• basic server logs, error records and backups, for a limited time for security and reliability.',
      'When you ask us to delete your account, we delete or anonymize your personal information within a reasonable time, except records we must keep by law or that we need to handle a dispute or prevent fraud. If a scan is still running, a deletion fails, or a backup still holds a copy, a report may stay for longer than described until it is cleared. Tell us and we will remove it.',
    ],
  },
  {
    title: '9. Cookies and browser storage on your device',
    body: [
      'We use your browser\'s storage, not advertising cookies or trackers. It holds your sign-in session; your notification choices; your profile picture, if you set one; headings you saved for scans; whether you have seen the tour; the id of a scan in progress or a report that is open; and the screen you were on.',
      'While you have a report open, a copy of the file you scanned is also kept in your own browser, and only there, so the report can show your manuscript as you wrote it, even after you refresh the page. It is never sent to us again. Very large files are not kept this way. The copy lives only in that browser tab and is removed when you close the tab, leave the report, start another scan or sign out. You can clear your browser storage at any time.',
    ],
  },
  {
    title: '10. How we protect your information',
    body: [
      'We use access controls so that each person can open only their own reports and records, secret keys are kept on the server and not in the web app, connections to our service and our providers are encrypted, and credit and payment records can be changed only by the server. We limit who on the Team can reach the data.',
      'No system is completely secure, so we cannot promise that information can never be lost, intercepted or misused. If a breach involving your personal information is likely to cause you serious harm, we will tell you and the National Privacy Commission as the law requires, within the time the law sets.',
    ],
  },
  {
    title: '11. Your rights',
    body: [
      'Under the Data Privacy Act you have the right to be informed about how your information is used; to access it; to object to its use; to correct it; to ask us to suspend, block, remove or delete it; to receive a copy of it in a usable form; to be indemnified for damage caused by inaccurate, unlawfully obtained or unauthorized use of it; and to withdraw your consent.',
      'To use a right, write to ' + CONTACT_EMAIL + ' from the email address of your account and tell us what you want. We may ask you to confirm who you are first, to protect your information from someone pretending to be you. We aim to reply within 15 days. We may refuse a request that the law allows us to refuse, and we will tell you why.',
      'If you believe your information has been mishandled, please tell us first so that we can put it right. You may also complain to the National Privacy Commission of the Philippines.',
    ],
  },
  {
    title: '12. Your responsibilities',
    body: [
      'Only upload documents you are allowed to share. Do not upload other people\'s confidential or personal information without their permission. Keep your login details private and sign out on shared computers. Download your PDF if you want to keep a report.',
    ],
  },
  {
    title: '13. Children',
    body: [
      'Resync is for people who are at least 16 years old. If you are under 18, a parent, guardian or your school must allow you to use it. If we learn that we hold information about a child younger than 16, we will delete it.',
    ],
  },
  {
    title: '14. Changes to this policy',
    body: [
      'We may update this policy as Resync changes. The new version will be posted here with a new date, and for material changes we will show a notice when you next sign in. Using Resync after the change means you accept it.',
    ],
  },
  {
    title: '15. Contact us',
    body: [<>{CONTACT_PLACE}<br />{contact}</>],
  },
];

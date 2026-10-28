import { SECTION_STATUS, type ReportSection } from './helpers';

export function OverviewTab({ reportSections, flaggedPassages, textLoaded, setActiveSectionRole }: { reportSections: ReportSection[]; flaggedPassages: Record<string, number>; textLoaded: boolean; setActiveSectionRole: (value: string | null) => void }) {
  return (
    <div className="space-y-2"><h3 className="text-sm font-bold text-slate-900">Report by section</h3>{reportSections.map(section => <button key={section.key} type="button" onClick={() => setActiveSectionRole(section.key)} className="w-full flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-indigo-600"><span className="truncate text-gray-800">{section.name}</span><span className={`shrink-0 ${textLoaded ? SECTION_STATUS[section.status].color : 'text-rose-700'}`}>{textLoaded ? section.status === 'Unassessed' ? 'No text found' : section.status : flaggedPassages[section.name] ? `${flaggedPassages[section.name]} flagged ${flaggedPassages[section.name] === 1 ? 'passage' : 'passages'}` : 'No flagged passages'}</span></button>)}</div>
  );
}

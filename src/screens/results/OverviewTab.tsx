import { SECTION_STATUS, type ReportSection } from './helpers';

export function OverviewTab({ reportSections, setActiveSectionRole }: { reportSections: ReportSection[]; setActiveSectionRole: (value: string | null) => void }) {
  return (
    <div className="space-y-2"><h3 className="text-sm font-bold text-slate-900">Report by section</h3>{reportSections.map(section => <button key={section.key} type="button" onClick={() => setActiveSectionRole(section.key)} className="w-full flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-indigo-600"><span className="truncate text-gray-800">{section.name}</span><span className={`shrink-0 ${SECTION_STATUS[section.status].color}`}>{section.status === 'Unassessed' ? 'Not checked yet' : section.status}</span></button>)}</div>
  );
}

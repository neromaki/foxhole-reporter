import React from 'react';
import { useMapStore } from '../state/useMapStore';
import { Tile } from './Tile';
import { getAllReports } from '../state/reports';
import { REPORT_SWITCH_DIALOG } from '../lib/appConfig';

export default function ReportModes() {
  const activeReport = useMapStore(s => s.activeReport);
  const setActiveReport = useMapStore(s => s.setActiveReport);
  const setPanelState = useMapStore((s) => s.setPanelState);

  const allReports = getAllReports();
  
  // Group reports by category
  const reportsByCategory = React.useMemo(() => {
    const grouped = new Map<string, typeof allReports>();
    for (const report of allReports) {
      if (!grouped.has(report.category)) {
        grouped.set(report.category, []);
      }
      grouped.get(report.category)!.push(report);
    }
    return grouped;
  }, [allReports]);


  return (
    <div>
      {Array.from(reportsByCategory.entries()).map(([category, reports]) => {

        return (
          <div key={category} className="mb-5">
            <span className="text-gray-300 mb-2 inline-block">{category}</span>
            <div className={`grid grid-cols-4 gap-2`}>
              {reports.map((report) => (
                <Tile
                  key={report.id}
                  label={report.name}
                  icon={{ type: 'image', url: new URL(`../images/${report.image ? report.image : 'Tile_Report_1'}.png`, import.meta.url) }}
                  active={activeReport?.id === report.id}
                  callBack={() => {
                    if (activeReport?.id === report.id) {
                      // Job Views deactivates, others just close panel
                      if (category === 'Job Views') {
                        setActiveReport(null);
                      }
                      setPanelState('reportInfo', 'half');
                    } else {
                      setActiveReport(report, !REPORT_SWITCH_DIALOG);
                      setPanelState('reportInfo', 'half');
                    }
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

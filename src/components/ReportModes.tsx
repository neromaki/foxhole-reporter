import React from 'react';
import { useMapStore } from '../state/useMapStore';
import { Tile } from './Tile';
import { getAllReports } from '../state/reports';

export default function ReportModes() {
  const activeReport = useMapStore(s => s.activeReport);
  const setActiveReport = useMapStore(s => s.setActiveReport);
  
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

  // Icon mapping for reports (can be expanded to use report metadata in the future)
  const getReportIcon = (reportId: string): string => {
    const iconMap: Record<string, string> = {
      'territory-daily': 'Tile_Report_1',
      'territory-three-day': 'Tile_Report_3',
      'territory-weekly': 'Tile_Report_7',
      'territory-all-time': 'Tile_Report_All',
      'threats-storm': 'Tile_Threats',
      'threats-rocket': 'Tile_Threats',
    };
    return iconMap[reportId] || 'Tile_Report_1';
  };

  return (
    <div>
      {/* Render Territory reports */}
      {reportsByCategory.has('Territory') && (
        <div className="mb-5">
          <span className="text-gray-300 mb-2 inline-block">Territory</span>
          <div className="grid grid-cols-4 gap-2">
            {reportsByCategory.get('Territory')!.map((report) => (
              <Tile
                key={report.id}
                label={report.name}
                icon={{ type: 'image', url: new URL(`../images/${getReportIcon(report.id)}.png`, import.meta.url) }}
                active={activeReport?.id === report.id}
                callBack={() => {
                  // Toggle: if already active, deactivate; otherwise activate
                  if (activeReport?.id === report.id) {
                    setActiveReport(null);
                  } else {
                    setActiveReport(report);
                  }
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Render Threats reports */}
      {reportsByCategory.has('Threats') && (
        <div className="mb-5">
          <span className="text-gray-300 mb-2 inline-block">Intel</span>
          <div className="grid grid-cols-4 gap-2">
            {reportsByCategory.get('Threats')!.map((report) => (
              <Tile
                key={report.id}
                label={report.name}
                icon={{ type: 'image', url: new URL(`../images/${getReportIcon(report.id)}.png`, import.meta.url) }}
                active={activeReport?.id === report.id}
                callBack={() => {
                  if (activeReport?.id === report.id) {
                    setActiveReport(null);
                  } else {
                    setActiveReport(report);
                  }
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Render Job Views category */}
      {reportsByCategory.has('Job Views') && (
        <div className="mb-5">
          <span className="text-gray-300 mb-2 inline-block">Job Views</span>
          <div className="grid grid-cols-4 gap-2">
            {reportsByCategory.get('Job Views')!.map((report) => (
              <Tile
                key={report.id}
                label={report.name}
                icon={{ type: 'image', url: new URL(`../images/Tile_Report_1.png`, import.meta.url) }}
                active={activeReport?.id === report.id}
                callBack={() => {
                  if (activeReport?.id === report.id) {
                    setActiveReport(null);
                  } else {
                    setActiveReport(report);
                  }
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

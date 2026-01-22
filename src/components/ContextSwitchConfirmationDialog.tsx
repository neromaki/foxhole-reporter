/**
 * Context Switch Confirmation Dialog
 * Shown when user attempts to switch between reports from different context groups
 * (e.g., from 'territory' to 'jobs-mining')
 */

import React from 'react';
import { useMapStore } from '../state/useMapStore';

export function ContextSwitchConfirmationDialog() {
  const pendingReport = useMapStore((s) => s.pendingReportForConfirmation);
  const setActiveReport = useMapStore((s) => s.setActiveReport);
  const setPendingReportForConfirmation = useMapStore((s) => s.setPendingReportForConfirmation);

  if (!pendingReport) return null;

  const handleConfirm = () => {
    // Apply the pending report without triggering confirmation again
    setActiveReport(pendingReport, true); // skipConfirmation = true
    setPendingReportForConfirmation(null);
  };

  const handleCancel = () => {
    setPendingReportForConfirmation(null);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-2xl max-w-md w-full mx-4 p-6">
        <h2 className="text-xl font-bold text-white mb-4">Switch Report Context?</h2>
        
        <p className="text-gray-300 mb-4">
          You're switching to a different report category. This will change your current layer settings.
        </p>

        <div className="bg-[#252525] border border-gray-700 rounded p-3 mb-6">
          <div className="text-sm text-gray-400 mb-1">Switching to:</div>
          <div className="text-white font-semibold">
            {pendingReport.category} → {pendingReport.name}
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

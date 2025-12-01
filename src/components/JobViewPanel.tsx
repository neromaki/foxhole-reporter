import React from 'react';
import { useMapStore } from '../state/useMapStore';
import { jobViewGroups, getGroup } from '../state/jobViews';

export default function JobViewPanel() {
  const activeJobViewId = useMapStore(s => s.activeJobViewId);
  const setActiveJobView = useMapStore(s => s.setActiveJobView);

  function toggle(viewId: string) {
    if (activeJobViewId === viewId) {
      setActiveJobView(null);
    } else {
      setActiveJobView(viewId);
    }
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto border-l border-gray-700">
      <h2 className="text-sm font-semibold tracking-wide text-gray-300 uppercase">Job Views</h2>
      <ul className="space-y-4">
        {jobViewGroups.map(group => {
          const groupActive = activeJobViewId === group.id;
          return (
            <li key={group.id} className="space-y-2">
              <button
                onClick={() => toggle(group.id)}
                className={`w-full text-left px-3 py-2 rounded text-sm border transition flex items-center justify-between ${groupActive ? 'bg-indigo-700 border-indigo-600' : 'bg-gray-900 border-gray-800 hover:border-gray-700'}`}
              >
                <span>{group.name}</span>
                <span className={`h-3 w-3 rounded-full ${groupActive ? 'bg-green-400' : 'bg-gray-600'}`}></span>
              </button>
              <ul className="space-y-1 pl-2">
                {group.children.map(child => {
                  const childActive = activeJobViewId === child.id;
                  return (
                    <li key={child.id}>
                      <button
                        onClick={() => toggle(child.id)}
                        className={`w-full text-left px-3 py-1.5 rounded text-xs border transition flex items-center justify-between ${childActive ? 'bg-indigo-600 border-indigo-500' : 'bg-gray-800 border-gray-700 hover:border-gray-600'}`}
                      >
                        <span>{child.name}</span>
                        <span className={`h-2.5 w-2.5 rounded-full ${childActive ? 'bg-green-400' : 'bg-gray-600'}`}></span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
      {activeJobViewId && (
        <button
          onClick={() => setActiveJobView(null)}
          className="mt-2 w-full text-center text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 transition"
        >Clear Job View</button>
      )}
    </div>
  );
}

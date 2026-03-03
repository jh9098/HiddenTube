import React from "react";

export default function ProductionTabBar({ tabs, active, onChange }) {
  return (
    <div className="production-tabbar">
      {tabs.map((tab) => {
        const activeClass = active === tab.id ? " is-active" : "";
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`production-tab-btn${activeClass}`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

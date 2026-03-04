import React from "react";

export default function ProductionTabBar({ tabs, active, onChange }) {
  return (
    <div className="production-tabbar" role="tablist" aria-label="Production 단계">
      {tabs.map((tab, index) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`production-tab-btn${isActive ? " is-active" : ""}`}
            role="tab"
            aria-selected={isActive}
          >
            <span className="production-tab-step">STEP {index + 1}</span>
            <span className="production-tab-label">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

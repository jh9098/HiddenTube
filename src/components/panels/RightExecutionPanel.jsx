import React, { useEffect, useMemo, useRef, useState } from "react";
import ProductionWorkspace from "./ProductionWorkspace";
import { TabsList, TabsTrigger } from "../ui/Tabs";
import { Card, CardContent } from "../ui/Card";
import PreviewPanel from "./PreviewPanel";
import ConsolePanel from "./ConsolePanel";
import StepPanel from "./StepPanel";

function findFirstFocusable(container) {
  if (!container) return null;
  return container.querySelector(
    "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
  );
}

function RightExecutionPanel({
  projectId,
  nodes,
  edges,
  projectTitle,
  selectedNode,
  onSelectNode,
  onStart,
  onUpdateNodeLabel,
  onUpdateNodePromptTemplate,
  onExecuteFromNode,
  onDeleteNode,
  onRemoveIncomingConnection,
  onMessage,
}) {
  const [activeTab, setActiveTab] = useState("preview");
  const [hasStarted, setHasStarted] = useState(false);
  const [canUndoPreview, setCanUndoPreview] = useState(false);
  const panelRef = useRef(null);
  const tabRefs = useRef({});

  const tabs = useMemo(
    () => [
      { key: "preview", label: "미리보기", disabled: false },
      { key: "production", label: "프로덕션", disabled: false },
      { key: "console", label: "콘솔 보기", disabled: false },
      { key: "step", label: "스텝 편집", disabled: !selectedNode },
    ],
    [selectedNode]
  );

  useEffect(() => {
    const currentTab = tabs.find((item) => item.key === activeTab);
    if (currentTab?.disabled) {
      setActiveTab("preview");
    }
  }, [activeTab, tabs]);

  const switchTab = (nextTab, options = {}) => {
    const { moveFocusToPanel = false } = options;
    setActiveTab(nextTab);
    if (!moveFocusToPanel) return;

    window.requestAnimationFrame(() => {
      const firstFocusable = findFirstFocusable(panelRef.current);
      firstFocusable?.focus();
    });
  };

  const handleTabKeyDown = (event, index) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();

    const enabledTabs = tabs.filter((tab) => !tab.disabled);
    const currentEnabledIndex = enabledTabs.findIndex((tab) => tab.key === tabs[index].key);
    if (currentEnabledIndex < 0) return;

    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextEnabledIndex = (currentEnabledIndex + direction + enabledTabs.length) % enabledTabs.length;
    const nextTab = enabledTabs[nextEnabledIndex];
    switchTab(nextTab.key, { moveFocusToPanel: false });
    tabRefs.current[nextTab.key]?.focus();
  };

  const panelByTab = {
    preview: (
      <PreviewPanel
        projectId={projectId}
        nodes={nodes}
        edges={edges}
        projectTitle={projectTitle}
        onStart={() => {
          onStart();
          setHasStarted(true);
          setCanUndoPreview(false);
        }}
        onCancel={() => {
          setHasStarted(false);
          setCanUndoPreview(true);
        }}
        canUndoPreview={canUndoPreview}
        onUndoPreview={() => {
          setHasStarted(true);
          setCanUndoPreview(false);
        }}
        hasStarted={hasStarted}
        onExecuteFromNode={onExecuteFromNode}
        onMessage={onMessage}
      />
    ),
    production: <ProductionWorkspace nodes={nodes} edges={edges} projectTitle={projectTitle} onMessage={onMessage} />,
    console: <ConsolePanel nodes={nodes} edges={edges} onSelectNode={onSelectNode} />,
    step: (
      <StepPanel
        selectedNode={selectedNode}
        nodes={nodes}
        edges={edges}
        onUpdateNodeLabel={onUpdateNodeLabel}
        onUpdateNodePromptTemplate={onUpdateNodePromptTemplate}
        onDeleteNode={onDeleteNode}
        onRemoveIncomingConnection={onRemoveIncomingConnection}
      />
    ),
  };

  return (
    <aside className="side-panel right-execution-panel">
      <TabsList className="execution-tabs" aria-label="실행 패널 탭">
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.key;

          return (
            <TabsTrigger
              key={tab.key}
              id={`execution-tab-${tab.key}`}
              ref={(element) => {
                tabRefs.current[tab.key] = element;
              }}
              active={isActive}
              disabled={tab.disabled}
              tabIndex={isActive ? 0 : -1}
              aria-controls={`execution-panel-${tab.key}`}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              onClick={() => switchTab(tab.key, { moveFocusToPanel: true })}
            >
              {tab.label}
            </TabsTrigger>
          );
        })}
      </TabsList>

      <Card className="execution-card">
        <CardContent
          ref={panelRef}
          id={`execution-panel-${activeTab}`}
          role="tabpanel"
          tabIndex={-1}
          aria-labelledby={`execution-tab-${activeTab}`}
        >
          {panelByTab[activeTab]}
        </CardContent>
      </Card>
    </aside>
  );
}

export default RightExecutionPanel;

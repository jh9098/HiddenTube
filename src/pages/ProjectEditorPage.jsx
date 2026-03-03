import React from "react";
import { Navigate, useParams } from "react-router-dom";
import WorkflowEditor from "../components/workflow/WorkflowEditor";

function ProjectEditorPage() {
  const { projectId } = useParams();

  if (!projectId) {
    return <Navigate to="/" replace />;
  }

  return <WorkflowEditor projectId={projectId} />;
}

export default ProjectEditorPage;

import React from "react";
import ProductionWorkspaceContent from "../production/ProductionWorkspace";

function ProductionWorkspace({ nodes, edges, projectTitle }) {
  return <ProductionWorkspaceContent nodes={nodes} edges={edges} projectTitle={projectTitle} />;
}

export default ProductionWorkspace;

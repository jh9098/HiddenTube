import React from "react";
import ProductionWorkspaceContent from "../production/ProductionWorkspace";

function ProductionWorkspace({ nodes, edges }) {
  return <ProductionWorkspaceContent nodes={nodes} edges={edges} />;
}

export default ProductionWorkspace;

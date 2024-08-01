import React, { useMemo } from 'react';
import ReactFlow, {
  Controls,
  Background,
  MarkerType,
} from 'react-flow-renderer';
import nodeTypes from './nodeTypes';

function VisualizationPanel({ nodes, edges, onNodesChange, onEdgesChange, onNodeDoubleClick }) {
  const edgesWithLabels = useMemo(() => {
    return edges.map(edge => {
      if (edge.type === 'direct') {
        return {
          ...edge,
          type: 'straight',
          animated: false,
          style: { stroke: '#888', strokeWidth: 1, strokeDasharray: '5, 5' },
        };
      }

      const sourceNode = nodes.find(node => node.id === edge.source);
      const targetNode = nodes.find(node => node.id === edge.target);
      let label = '';
      
      if ((sourceNode.type === 'Customer' || targetNode.type === 'Customer') &&
          (sourceNode.type === 'Transfer' || targetNode.type === 'BillPay' || 
           targetNode.type === 'Transfer' || targetNode.type === 'BillPay')) {
        label = `${sourceNode.type} → ${targetNode.type}`;
      }

      return {
        ...edge,
        type: 'straight',
        animated: false,
        label,
        labelStyle: { fill: '#888', fontWeight: 700 },
        labelBgPadding: [8, 4],
        labelBgBorderRadius: 4,
        labelBgStyle: { fill: '#ffffff', color: '#888', fillOpacity: 0.7 },
        style: { stroke: '#888', strokeWidth: 2 },
        markerEnd: {
          color: '#888',
        },
      };
    });
  }, [edges, nodes]);

  return (
    <div className="visualization-panel">
      {nodes.length > 0 ? (
        <>
          <ReactFlow
            nodes={nodes}
            edges={edgesWithLabels}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onNodeDoubleClick={onNodeDoubleClick}
            fitView
            style={{ width: '100%', height: '100%' }}
          >
            <Controls />
            <Background color="#f0f0f0" gap={16} />
          </ReactFlow>
          <div className="graph-controls">
          </div>
        </>
      ) : (
        <p></p>
      )}
    </div>
  );
}

export default VisualizationPanel;
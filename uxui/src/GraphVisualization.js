import React, { useCallback, useMemo } from 'react';
import ReactFlow, { 
  useNodesState, 
  useEdgesState, 
  applyNodeChanges, 
  applyEdgeChanges,
} from 'react-flow-renderer';
import nodeTypes from './nodeTypes';

const getInitialNodePosition = (type) => {
  const centerX = 250;
  const centerY = 250;
  const radius = 200;
  const angle = Math.random() * 2 * Math.PI;
  
  switch(type) {
    case 'Customer':
      return { x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) };
    case 'Counter-Party':
      return { x: centerX + radius * 0.9 * Math.cos(angle + Math.PI), y: centerY + radius * 0.6 * Math.sin(angle + Math.PI) };
    case 'Business':
      return { x: centerX + radius * 0.6 * Math.cos(angle + Math.PI/2), y: centerY + radius * 0.9 * Math.sin(angle + Math.PI/2) };
    case 'Transfer':
    case 'BillPay':
      return { x: centerX + radius * 0.4 * Math.cos(angle), y: centerY + radius * 0.3 * Math.sin(angle) };
    default:
      return { x: centerX + radius * Math.random(), y: centerY + radius * Math.random() };
  }
};

const GraphVisualization = ({ graphData, onNodeDoubleClick }) => {
  const initialNodes = useMemo(() => graphData.nodes.map(node => ({
    ...node,
    position: getInitialNodePosition(node.type),
    data: { ...node.data, displayName: node.data.label }
  })), [graphData.nodes]);

  const initialEdges = useMemo(() => graphData.edges.map(edge => ({
    ...edge,
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#888' },
  })), [graphData.edges]);

  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeDoubleClick={onNodeDoubleClick}
      nodeTypes={nodeTypes}
    />
  );
};

export default GraphVisualization;
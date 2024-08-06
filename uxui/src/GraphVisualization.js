import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
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

const GraphVisualization = ({ graphData, onNodeDoubleClick, onLinkClick }) => {
    const initialNodes = useMemo(() => graphData.nodes.map(node => ({
      ...node,
      position: getInitialNodePosition(node.type),
      data: {
        ...node.data,
        displayName: node.data.label,
        onLinkClick: node.data.link ? () => onLinkClick(node.data.link) : undefined
      }
    })), [graphData.nodes, onLinkClick]);
  
    const initialEdges = useMemo(() => graphData.edges.map(edge => {
      const sourceNode = graphData.nodes.find(node => node.id === edge.source);
      const targetNode = graphData.nodes.find(node => node.id === edge.target);
      let label = '';
  
      if ((sourceNode.type === 'Customer' || targetNode.type === 'Customer') &&
          (sourceNode.type === 'Transfer' || sourceNode.type === 'BillPay' ||
           targetNode.type === 'Transfer' || targetNode.type === 'BillPay')) {
        const transactionNode = sourceNode.type === 'Transfer' || sourceNode.type === 'BillPay' ? sourceNode : targetNode;
        const customerNode = sourceNode.type === 'Customer' ? sourceNode : targetNode;
        if (transactionNode.data && transactionNode.data.info) {
          const transactionType = transactionNode.data.info.type;
          if (transactionType === 'send' || transactionType === 'receive') {
            label = `Customer ${transactionType === 'send' ? 'sends' : 'receives'}`;
          } else if (transactionType === 'billPay') {
            label = `Customer billPay`;
          }
        }
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
    }), [graphData.edges, graphData.nodes]);
  
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
import React, { useState, useCallback, useEffect } from 'react';
import { useNodesState, useEdgesState } from 'react-flow-renderer';
import SearchPanel from './SearchPanel';
import VisualizationPanel from './VisualizationPanel';
import EntityDetails from './EntityDetails';
import NodeInfoPopup from './NodeInfoPopup';
import ToolBar from './ToolBar';
import './App.css';

const API_BASE_URL = 'http://localhost:3001/api';

const UserIcon = () => (
  <svg className="header-icon" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
);

const MenuIcon = () => (
  <svg className="header-icon" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
  </svg>
);

function App() {
  const [allGroups, setAllGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [groupData, setGroupData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAllGroups();
  }, []);

  const fetchAllGroups = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/groups`);
      const data = await response.json();
      setAllGroups(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch all groups:', error);
      setError('Failed to fetch groups. Please try again later.');
    }
  };

  const handleGroupSelect = useCallback(async (groupId) => {
    setSelectedGroup(groupId);
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/groups/${groupId}/data`);
      const data = await response.json();
      setGroupData(data);
      
      if (data.graphData && Array.isArray(data.graphData.nodes) && Array.isArray(data.graphData.edges)) {
        const newNodes = data.graphData.nodes
          .filter(node => node && node.type)  // Ensure node and node.type exist
          .map(node => ({
            ...node,
            position: getInitialNodePosition(node.type),
          }));

        const newEdges = data.graphData.edges
          .filter(edge => edge && edge.source && edge.target)  // Ensure edge, source, and target exist
          .map(edge => ({
            ...edge,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#888' },
          }));

        setNodes(newNodes);
        setEdges(newEdges);
      } else {
        console.error('Unexpected data structure:', data);
        setError('Received unexpected data structure from the server.');
      }
    } catch (error) {
      console.error('Failed to fetch group data:', error);
      setError('Failed to fetch group data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [setNodes, setEdges]);

  const getInitialNodePosition = (type) => {
    const centerX = 250;
    const centerY = 250;
    const radius = 200;
    const angle = Math.random() * 2 * Math.PI;
    
    switch(type) {
      case 'Customer':
        return { x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) };
      case 'Counter-Party':
        return { x: centerX + radius * 0.8 * Math.cos(angle + Math.PI), y: centerY + radius * 0.8 * Math.sin(angle + Math.PI) };
      case 'Business':
        return { x: centerX + radius * 0.6 * Math.cos(angle + Math.PI/2), y: centerY + radius * 0.6 * Math.sin(angle + Math.PI/2) };
      case 'Transfer':
      case 'BillPay':
        return { x: centerX + radius * 0.4 * Math.cos(angle), y: centerY + radius * 0.4 * Math.sin(angle) };
      default:
        return { x: centerX + radius * Math.random(), y: centerY + radius * Math.random() };
    }
  };

  const handleNodeDoubleClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-icon-container">
          <img src="icons/GTIcon.png" alt="Entity Resolution" className="app-icon" />
        </div>
        <div className="header-icons">
          <UserIcon />
          <MenuIcon />
        </div>
      </header>
      <div className="app-content">
        <SearchPanel 
          allGroups={allGroups} 
          onGroupSelect={handleGroupSelect} 
          selectedGroup={selectedGroup}
        />
        {isLoading ? (
          <div>Loading...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : (
          <>
            <VisualizationPanel 
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeDoubleClick={handleNodeDoubleClick}
            />
            <ToolBar />
            <EntityDetails groupData={groupData} />
          </>
        )}
      </div>
      {selectedNode && (
        <NodeInfoPopup node={selectedNode} onClose={() => setSelectedNode(null)} />
      )}
    </div>
  );
}

export default App;
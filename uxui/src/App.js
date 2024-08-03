import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, { 
  useNodesState, 
  useEdgesState, 
  applyNodeChanges, 
  applyEdgeChanges 
} from 'react-flow-renderer';
import SearchPanel from './SearchPanel';
import VisualizationPanel from './VisualizationPanel';
import EntityDetails from './EntityDetails';
import NodeInfoPopup from './NodeInfoPopup';
import ToolBar from './ToolBar';
import TabNavigation from './TabNavigation';
import TimeframeSelector from './TimeframeSelector';
import './App.css';
import { MarkerType } from 'react-flow-renderer';

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
  const [openGroups, setOpenGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [displayGroups, setDisplayGroups] = useState([]);
  const [timeframe, setTimeframe] = useState({ startDate: '', endDate: '' });
  const [appliedTimeframe, setAppliedTimeframe] = useState({ startDate: '', endDate: '' });


  const handleNodeChanges = useCallback((changes, groupId) => {
    setOpenGroups(prev => prev.map(group => 
      group.id === groupId 
        ? { ...group, nodes: applyNodeChanges(changes, group.nodes) }
        : group
    ));
  }, []);

  const handleSearch = useCallback(async (searchTerm) => {
    if (!searchTerm) {
      setDisplayGroups(allGroups.map(group => ({ group, displayValue: group })));
      return;
    }
  
    try {
      const response = await fetch(`${API_BASE_URL}/search?term=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      setDisplayGroups(data);
    } catch (error) {
      console.error('Error performing search:', error);
      setError('Failed to perform search. Please try again later.');
    }
  }, [allGroups]);


  const handleEdgeChanges = useCallback((changes, groupId) => {
    setOpenGroups(prev => prev.map(group => 
      group.id === groupId 
        ? { ...group, edges: applyEdgeChanges(changes, group.edges) }
        : group
    ));
  }, []);
  
  useEffect(() => {
    fetchAllGroups();
  }, []);
  useEffect(() => {
    if (allGroups.length > 0) {
      setDisplayGroups(allGroups.map(group => ({ group, displayValue: group })));
    }
  }, [allGroups]);
  // Modify the fetchAllGroups function:
  const fetchAllGroups = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/groups`);
      const data = await response.json();
      const groups = Array.isArray(data) ? data : [];
      setAllGroups(groups);
      setDisplayGroups(groups.map(group => ({ group, displayValue: group }))); // Initialize displayGroups
    } catch (error) {
      console.error('Failed to fetch all groups:', error);
      setError('Failed to fetch groups. Please try again later.');
    }
  };

  const handleGroupSelect = useCallback(async (groupId) => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        startDate: timeframe.startDate,
        endDate: timeframe.endDate
      }).toString();
      const response = await fetch(`${API_BASE_URL}/groups/${groupId}/data?${queryParams}`);
      const data = await response.json();
      
      if (data.graphData && Array.isArray(data.graphData.nodes) && Array.isArray(data.graphData.edges)) {
        const newNodes = data.graphData.nodes.map(node => ({
          ...node,
          position: getInitialNodePosition(node.type),
        }));

        const newEdges = data.graphData.edges.map(edge => ({
          ...edge,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#888' },
        }));

        setOpenGroups(prev => {
          const groupIndex = prev.findIndex(group => group.id === groupId);
          if (groupIndex !== -1) {
            // Update existing group
            const updatedGroups = [...prev];
            updatedGroups[groupIndex] = { id: groupId, data, nodes: newNodes, edges: newEdges };
            return updatedGroups;
          } else {
            // Add new group
            return [...prev, { id: groupId, data, nodes: newNodes, edges: newEdges }];
          }
        });
        setActiveGroupId(groupId);
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
  }, [timeframe]);

  const handleCloseGroup = useCallback((groupId) => {
    setOpenGroups(prev => prev.filter(group => group.id !== groupId));
    if (activeGroupId === groupId) {
      setActiveGroupId(openGroups[0]?.id || null);
    }
  }, [activeGroupId, openGroups]);

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

  const handleNodeDoubleClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  const applyTimeframeFilter = async () => {

    if (activeGroupId) {
      await handleGroupSelect(activeGroupId);
    }
  };
  
  const activeGroup = openGroups.find(group => group.id === activeGroupId);
  
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
      <TabNavigation 
        openGroups={openGroups}
        activeGroupId={activeGroupId}
        onTabChange={setActiveGroupId}
        onCloseTab={handleCloseGroup}
      />
      <div className="app-content">
      <SearchPanel 
        displayGroups={displayGroups}
        onGroupSelect={handleGroupSelect} 
        selectedGroup={activeGroupId}
        onSearch={handleSearch}
      />
        {isLoading ? (
          <div className="loading-indicator">Loading...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : activeGroup ? (
          <div className="active-group-content">
            <div className="timeframe-selector-container">
              <TimeframeSelector
                startDate={timeframe.startDate}
                endDate={timeframe.endDate}
                onStartDateChange={(date) => setTimeframe(prev => ({ ...prev, startDate: date }))}
                onEndDateChange={(date) => setTimeframe(prev => ({ ...prev, endDate: date }))}
                onApplyFilter={applyTimeframeFilter}
              />
            </div>
            <div className="visualization-container">
              <VisualizationPanel 
                nodes={activeGroup.nodes}
                edges={activeGroup.edges}
                onNodesChange={(changes) => handleNodeChanges(changes, activeGroupId)}
                onEdgesChange={(changes) => handleEdgeChanges(changes, activeGroupId)}
                onNodeDoubleClick={handleNodeDoubleClick}
              />
            </div>
            <ToolBar />
            <div className="entity-details-container">
              <EntityDetails 
                groupData={activeGroup.data} 
                />
            </div>
          </div>
        ) : (
          <div className="no-group-selected">Select a group to view details</div>
        )}
      </div>
      {selectedNode && (
        <NodeInfoPopup node={selectedNode} onClose={() => setSelectedNode(null)} />
      )}
    </div>
  );
  
  
  
}

export default App;
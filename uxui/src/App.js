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
  const [nextTabId, setNextTabId] = useState(1);
  const [groupInfo, setGroupInfo] = useState({});


  const handleNodeChanges = useCallback((changes, groupId) => {
    setOpenGroups(prev => prev.map(group => 
      group.id === groupId 
        ? { ...group, nodes: applyNodeChanges(changes, group.nodes) }
        : group
    ));
  }, []);

  const fetchGroupInfo = useCallback(async (groupId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/group-info/${groupId}`);
      
      if (!response.ok) throw new Error('Failed to fetch group info');
      const data = await response.json();
      setGroupInfo(prevInfo => ({
        ...prevInfo,
        [groupId]: data.displayValue
      }));
      return data.displayValue;
    } catch (error) {
      console.error('Error fetching group info:', error);
      return groupId; // Fallback to using the group ID if fetch fails
    }
  }, []);

  const updateTabName = useCallback(async (groupId) => {
    const displayName = await fetchGroupInfo(groupId);
    setOpenGroups(prev => prev.map(group => 
      group.id === groupId ? { ...group, displayName } : group
    ));
    return displayName;
  }, [fetchGroupInfo]);

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
      setAllGroups(data);
      setDisplayGroups(data); // The data is already in the correct format
    } catch (error) {
      console.error('Failed to fetch all groups:', error);
      setError('Failed to fetch groups. Please try again later.');
    }
  };

  const renderGraph = useCallback(async (groupId, startDate, endDate) => {
    try {
      const response = await fetch(`${API_BASE_URL}/groups/${groupId}/data?${new URLSearchParams({
        startDate,
        endDate
      })}`);
      const groupData = await response.json();

      if (groupData.graphData && Array.isArray(groupData.graphData.nodes) && Array.isArray(groupData.graphData.edges)) {
        const newNodes = groupData.graphData.nodes.map(node => ({
          ...node,
          position: getInitialNodePosition(node.type),
        }));

        const newEdges = groupData.graphData.edges.map(edge => ({
          ...edge,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#888' },
        }));

        return { groupData, newNodes, newEdges };
      } else {
        throw new Error('Unexpected data structure received from server');
      }
    } catch (error) {
      console.error('Failed to render graph:', error);
      throw error;
    }
  }, []);

  const handleGroupSelect = useCallback(async (groupId) => {
    setIsLoading(true);
    setError(null);
    try {
      // Check if the group is already open in a tab
      const existingTabIndex = openGroups.findIndex(group => group.id === groupId);
      if (existingTabIndex !== -1) {
        // If the group is already open, just switch to that tab
        setActiveGroupId(groupId);
        setIsLoading(false);
        return;
      }
  
      const [{ groupData, newNodes, newEdges }, groupDisplayName] = await Promise.all([
        renderGraph(groupId, '', ''),
        fetchGroupInfo(groupId)
      ]);
  
      const newGroup = { 
        id: groupId, 
        displayName: groupDisplayName, 
        data: groupData, 
        nodes: newNodes, 
        edges: newEdges,
        timeframe: { startDate: '', endDate: '' }
      };
  
      setOpenGroups(prev => {
        // If there are no open groups, create a new tab
        if (prev.length === 0) {
          return [newGroup];
        }
        
        // Find the current active tab
        const activeTabIndex = prev.findIndex(group => group.id === activeGroupId);
        
        // If the active tab is empty (data is null), replace it
        if (activeTabIndex !== -1 && !prev[activeTabIndex].data) {
          return prev.map((group, index) => 
            index === activeTabIndex ? newGroup : group
          );
        }
        
        // Otherwise, update the current tab
        return prev.map(group => 
          group.id === activeGroupId ? newGroup : group
        );
      });
      setActiveGroupId(groupId);
    } catch (error) {
      console.error('Failed to fetch group data:', error);
      setError('Failed to fetch group data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [openGroups, activeGroupId, renderGraph, fetchGroupInfo]);

  const applyTimeframeFilter = useCallback(async (startDate, endDate) => {
    if (activeGroupId) {
      setIsLoading(true);
      try {
        const { groupData, newNodes, newEdges } = await renderGraph(activeGroupId, startDate, endDate);
        
        setOpenGroups(prev => prev.map(group => 
          group.id === activeGroupId 
            ? { 
                ...group, 
                data: groupData, 
                nodes: newNodes, 
                edges: newEdges, 
                timeframe: { startDate, endDate }
              }
            : group
        ));
      } catch (error) {
        console.error('Failed to apply timeframe filter:', error);
        setError('Failed to apply timeframe filter. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  }, [activeGroupId, renderGraph]);

  const handleResetTimeframe = useCallback(async () => {
    if (activeGroupId) {
      setIsLoading(true);
      try {
        const { groupData, newNodes, newEdges } = await renderGraph(activeGroupId, '', '');
        
        setOpenGroups(prev => prev.map(group => 
          group.id === activeGroupId 
            ? { 
                ...group, 
                data: groupData, 
                nodes: newNodes, 
                edges: newEdges, 
                timeframe: { startDate: '', endDate: '' }
              }
            : group
        ));
      } catch (error) {
        console.error('Failed to reset timeframe:', error);
        setError('Failed to reset timeframe. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  }, [activeGroupId, renderGraph]);

  const handleTabChange = useCallback((tabId) => {
    setActiveGroupId(tabId);
  }, []);

  const handleAddNewTab = useCallback(() => {
    const newTabId = `New Tab ${nextTabId}`;
    setOpenGroups(prev => [...prev, { 
      id: newTabId, 
      displayName: newTabId, 
      data: null, 
      nodes: [], 
      edges: [],
      timeframe: { startDate: '', endDate: '' }
    }]);
    setActiveGroupId(newTabId);
    setNextTabId(prev => prev + 1);
  }, [nextTabId]);

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


  
  const activeGroup = openGroups.find(group => group.id === activeGroupId);
  
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-icon-container">
          <img src="icons/GTIcon.png" alt="Entity Resolution" className="app-icon" />
        </div>
        <TabNavigation 
        openGroups={openGroups}
        activeGroupId={activeGroupId}
        onTabChange={handleTabChange}
        onCloseTab={handleCloseGroup}
        onAddNewTab={handleAddNewTab}
      />
        <div className="header-icons">
          <UserIcon />
          <MenuIcon />
        </div>
      </header>
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
                startDate={activeGroup.timeframe.startDate}
                endDate={activeGroup.timeframe.endDate}
                onStartDateChange={(date) => {
                  setOpenGroups(prev => prev.map(group => 
                    group.id === activeGroupId 
                      ? { ...group, timeframe: { ...group.timeframe, startDate: date } }
                      : group
                  ));
                }}
                onEndDateChange={(date) => {
                  setOpenGroups(prev => prev.map(group => 
                    group.id === activeGroupId 
                      ? { ...group, timeframe: { ...group.timeframe, endDate: date } }
                      : group
                  ));
                }}
                onApplyFilter={() => applyTimeframeFilter(activeGroup.timeframe.startDate, activeGroup.timeframe.endDate)}
                onResetTimeframe={handleResetTimeframe}
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
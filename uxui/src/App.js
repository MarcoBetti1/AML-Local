

import React, { useState, useCallback } from 'react';
import { useGroups, useGroupData, useTimeframe } from './hooks';
import SearchPanel from './SearchPanel';
import GraphVisualization from './GraphVisualization';
import EntityDetails from './EntityDetails';
import NodeInfoPopup from './NodeInfoPopup';
import ToolBar from './ToolBar';
import TabNavigation from './TabNavigation';
import TimeframeSelector from './TimeframeSelector';
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
  const { displayGroups, handleSearch } = useGroups();
  const { groupData, isLoading, error, fetchGroupData } = useGroupData();
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [openGroups, setOpenGroups] = useState([]);
  const [nextTabId, setNextTabId] = useState(1);
  const [groupInfo, setGroupInfo] = useState({});

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

  const handleGroupSelect = useCallback(async (groupId) => {
    const existingGroupIndex = openGroups.findIndex(group => group.id === groupId);
    if (existingGroupIndex !== -1) {
      setActiveGroupId(groupId);
      return;
    }

    const [groupData, groupDisplayName] = await Promise.all([
      fetchGroupData(groupId),
      fetchGroupInfo(groupId)
    ]);

    setOpenGroups(prev => {
      const newGroup = { 
        id: groupId, 
        displayName: groupDisplayName,
        timeframe: { startDate: '', endDate: '' }
      };
      if (prev.length === 0 || !prev[prev.length - 1].data) {
        return [...prev.slice(0, -1), newGroup];
      }
      return [...prev, newGroup];
    });
    setActiveGroupId(groupId);
  }, [openGroups, fetchGroupData, fetchGroupInfo]);

  const handleTimeframeApply = useCallback((startDate, endDate) => {
    if (activeGroupId) {
      fetchGroupData(activeGroupId, startDate, endDate);
      setOpenGroups(prev => prev.map(group => 
        group.id === activeGroupId 
          ? { ...group, timeframe: { startDate, endDate } }
          : group
      ));
    }
  }, [activeGroupId, fetchGroupData]);

  const handleResetTimeframe = useCallback(() => {
    if (activeGroupId) {
      fetchGroupData(activeGroupId, '', '');
      setOpenGroups(prev => prev.map(group => 
        group.id === activeGroupId 
          ? { ...group, timeframe: { startDate: '', endDate: '' } }
          : group
      ));
    }
  }, [activeGroupId, fetchGroupData]);

  const handleAddNewTab = useCallback(() => {
    const newTabId = `New Tab ${nextTabId}`;
    setOpenGroups(prev => [...prev, { id: newTabId, displayName: newTabId, data: null, timeframe: { startDate: '', endDate: '' } }]);
    setActiveGroupId(newTabId);
    setNextTabId(prev => prev + 1);
  }, [nextTabId]);

  const handleCloseGroup = useCallback((groupId) => {
    setOpenGroups(prev => prev.filter(group => group.id !== groupId));
    if (activeGroupId === groupId) {
      setActiveGroupId(openGroups[0]?.id || null);
    }
  }, [activeGroupId, openGroups]);

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
          onTabChange={setActiveGroupId}
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
        ) : activeGroup && groupData ? (
          <div className="active-group-content">
            
            <div className="visualization-container">
            <TimeframeSelector
              startDate={activeGroup.timeframe.startDate}
              endDate={activeGroup.timeframe.endDate}
              onStartDateChange={(date) => setOpenGroups(prev => prev.map(group => 
                group.id === activeGroupId 
                  ? { ...group, timeframe: { ...group.timeframe, startDate: date } }
                  : group
              ))}
              onEndDateChange={(date) => setOpenGroups(prev => prev.map(group => 
                group.id === activeGroupId 
                  ? { ...group, timeframe: { ...group.timeframe, endDate: date } }
                  : group
              ))}
              onApplyFilter={() => handleTimeframeApply(activeGroup.timeframe.startDate, activeGroup.timeframe.endDate)}
              onResetTimeframe={handleResetTimeframe}
            />
              <GraphVisualization 
                graphData={groupData.graphData}
                onNodeDoubleClick={handleNodeDoubleClick}
              />
            </div>
            <ToolBar />
            <EntityDetails groupData={groupData} />
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
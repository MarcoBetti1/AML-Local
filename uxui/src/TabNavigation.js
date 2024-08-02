import React from 'react';

const TabNavigation = ({ openGroups, activeGroupId, onTabChange, onCloseTab }) => {
  return (
    <div className="tab-navigation">
      {openGroups.map(group => (
        <div 
          key={group.id} 
          className={`tab ${group.id === activeGroupId ? 'active' : ''}`}
          onClick={() => onTabChange(group.id)}
        >
          <span>{group.id}</span>
          <button onClick={(e) => { e.stopPropagation(); onCloseTab(group.id); }}>×</button>
        </div>
      ))}
    </div>
  );
};

export default TabNavigation;
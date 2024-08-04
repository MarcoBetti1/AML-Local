import React, { useRef, useEffect } from 'react';
import './TabNavigation.css';

const TabNavigation = ({ openGroups, activeGroupId, onTabChange, onCloseTab, onAddNewTab }) => {
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeTab = scrollContainerRef.current.querySelector('.tab.active');
      if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [activeGroupId]);

  return (
    <div className="tab-navigation-container">
      <div className="tab-scroll-container" ref={scrollContainerRef}>
        {openGroups.map(group => (
          <div 
            key={group.id} 
            className={`tab ${group.id === activeGroupId ? 'active' : ''}`}
            onClick={() => onTabChange(group.id)}
          >
            <span>{group.displayName || group.id}</span>
            <button onClick={(e) => { e.stopPropagation(); onCloseTab(group.id); }}>×</button>
          </div>
        ))}
        <button className="add-tab-button" onClick={onAddNewTab}>+</button>
      </div>
      
    </div>
  );
};

export default TabNavigation;
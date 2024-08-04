import React, { useState, useEffect } from 'react';
import './SearchPanel.css'

function SearchPanel({ allGroups, displayGroups, onGroupSelect, selectedGroup, onSearch }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    onSearch(searchTerm);
  }, [searchTerm, onSearch]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={`search-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <button onClick={toggleCollapse} className="collapse-button">
        {isCollapsed ? '>' : '<'}
      </button>
      {!isCollapsed && (
        <>
          <h2>Groups</h2>
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
            className="search-input"
          />
          <div className="group-list">
            {displayGroups.map(({ group, displayValue }) => (
              <div
                key={group}
                onClick={() => onGroupSelect(group)}
                className={`group-item ${selectedGroup === group ? 'selected' : ''}`}
              >
                {displayValue}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default SearchPanel;
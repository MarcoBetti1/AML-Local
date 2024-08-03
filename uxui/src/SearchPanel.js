import React, { useState, useEffect } from 'react';

function SearchPanel({ displayGroups, onGroupSelect, selectedGroup, onSearch }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      onSearch(searchTerm);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
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
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <div className="group-list">
            {displayGroups && displayGroups.map(({ group, displayValue }) => (
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
import React, { useState } from 'react';

function SearchPanel({ allGroups, onGroupSelect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const filteredGroups = allGroups.filter(group =>
    group.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            placeholder="Search groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <div className="group-list">
            {filteredGroups.map(groupId => (
              <div
                key={groupId}
                onClick={() => onGroupSelect(groupId)}
                className="group-item"
              >
                {groupId}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default SearchPanel;
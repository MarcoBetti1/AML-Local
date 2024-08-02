import React from 'react';

const TimeframeSelector = ({ startDate, endDate, onStartDateChange, onEndDateChange, onApplyFilter }) => {
  return (
    <div className="timeframe-selector">
      <label>
        Start Date:
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
        />
      </label>
      <label>
        End Date:
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
        />
      </label>
      <button onClick={onApplyFilter}>Apply Filter</button>
    </div>
  );
};

export default TimeframeSelector;
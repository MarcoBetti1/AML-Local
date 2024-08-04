import React from 'react';

const TimeframeSelector = ({ startDate, endDate, onStartDateChange, onEndDateChange, onApplyFilter, onResetTimeframe }) => {
  const handleReset = () => {
    onStartDateChange('');
    onEndDateChange('');
    onResetTimeframe();
  };

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
      <button onClick={onApplyFilter}>Apply</button>
      <button onClick={handleReset}>Reset</button>
    </div>
  );
};

export default TimeframeSelector;
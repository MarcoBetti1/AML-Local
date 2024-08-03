import React, { useState, useEffect, useCallback } from 'react';

const TimeframeSelector = ({ startDate, endDate, onStartDateChange, onEndDateChange, onApplyFilter }) => {
  const [isReset, setIsReset] = useState(false);

  const handleApplyFilter = useCallback(() => {
    onApplyFilter();
  }, [onApplyFilter]);

  const handleReset = () => {
    onStartDateChange('');
    onEndDateChange('');
    setIsReset(true);
  };

  useEffect(() => {
    if (isReset) {
      handleApplyFilter();
      setIsReset(false);
    }
  }, [isReset, handleApplyFilter]);

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
      <button onClick={handleApplyFilter}>Apply</button>
      <button onClick={handleReset}>Reset</button>
    </div>
  );
};

export default TimeframeSelector;

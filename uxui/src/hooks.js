import { useState, useCallback, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:3001/api';

export const useGroups = () => {
  const [allGroups, setAllGroups] = useState([]);
  const [displayGroups, setDisplayGroups] = useState([]);

  const fetchGroupInfo = useCallback(async (groupId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/group-info/${groupId}`);
      if (!response.ok) throw new Error('Failed to fetch group info');
      const data = await response.json();
      return data.displayValue;
    } catch (error) {
      console.error('Error fetching group info:', error);
      return groupId; // Fallback to using the group ID if fetch fails
    }
  }, []);

  const fetchAllGroups = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/groups`);
      const data = await response.json();
      setAllGroups(data);

      // Fetch display names for all groups
      const groupsWithDisplayNames = await Promise.all(
        data.map(async (groupId) => {
          const displayValue = await fetchGroupInfo(groupId);
          return { group: groupId, displayValue };
        })

      );
      setDisplayGroups(groupsWithDisplayNames);
    } catch (error) {
      console.error('Failed to fetch all groups:', error);
    }
  }, [fetchGroupInfo]);

  useEffect(() => {
    fetchAllGroups();
  }, [fetchAllGroups]);


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
    }
  }, [allGroups]);

  return { allGroups, displayGroups, handleSearch };
};

export const useGroupData = () => {
  const [groupData, setGroupData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchGroupData = useCallback(async (groupId, startDate = '', endDate = '') => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/groups/${groupId}/data?${new URLSearchParams({
        startDate,
        endDate
      })}`);
      const data = await response.json();
      setGroupData(data);
    } catch (error) {
      console.error('Failed to fetch group data:', error);
      setError('Failed to fetch group data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { groupData, isLoading, error, fetchGroupData };
};

export const useTimeframe = (onApply) => {
  const [timeframe, setTimeframe] = useState({ startDate: '', endDate: '' });

  const handleStartDateChange = (date) => setTimeframe(prev => ({ ...prev, startDate: date }));
  const handleEndDateChange = (date) => setTimeframe(prev => ({ ...prev, endDate: date }));

  const handleApply = () => {
    onApply(timeframe.startDate, timeframe.endDate);
  };

  const handleReset = () => {
    setTimeframe({ startDate: '', endDate: '' });
    onApply('', '');
  };

  return { timeframe, handleStartDateChange, handleEndDateChange, handleApply, handleReset };
};
import React from 'react';
import LeftSidebar from './LeftSidebar';
import CenterArea from './CenterArea';
import RightSidebar from './RightSidebar';

const Layout = () => {
  return (
    <div className="flex h-screen bg-gray-100">
      <LeftSidebar />
      <CenterArea />
      <RightSidebar />
    </div>
  );
};

export default Layout;
import React, { useState, useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import Sidebar from "./components/common/Sidebar";
import OverviewPage from "./pages/OverviewPage";
import OptimiaztionPage from "./pages/OptimiaztionPage";
import { KeepAlive } from 'react-activation';  // Or your actual library

function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 100); // Keep it short
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 text-white-100 overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-100" />
        <div className="absolute inset-0 backdrop-blur-sm" />
      </div>

      <Sidebar />

      {/* Wait until layout is mounted before restoring cached content */}
      {!ready ? (
        <div className="flex-1" />
      ) : (
        <div className="flex-1">
          <Routes>
            <Route
              path="/"
              element={<KeepAlive><OverviewPage /></KeepAlive>}
            />
            <Route path="/optimization" element={<OptimiaztionPage />} />
          </Routes>
        </div>
      )}
    </div>
  );
}

export default App;

import { BadgeDollarSign, Pill } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import Header from "../components/common/Header";
import StatCard from "../components/common/StatCard_Style_2";
import OptimizationTable from "../components/optimization/OptimizationTable";

const OptimizationPage = () => {
  const [optimizationResult, setOptimizationResult] = useState({
    spend_A: 0,
    spend_B: 0,
    spend_C: 0,
    total_return: 0,
    budget: 0,
  });

  const [mode, setMode] = useState("budget"); // "budget" or "return"
  const [budget, setBudget] = useState("");
  const [targetReturn, setTargetReturn] = useState("");

  const [startingSpends, setStartingSpends] = useState({
    PDE: 0,
    Email: 0,
    PaidSearch: 0,
  });

  const handleStartingSpendChange = (tactic, value) => {
    setStartingSpends((prev) => ({
      ...prev,
      [tactic]: parseFloat(value) || 0,
    }));
  };

  const handleOptimize = async () => {
    let body = {};

    if (mode === "budget" && budget) {
      body = { budget: parseInt(budget) };
    } else if (mode === "return" && targetReturn) {
      body = { target_return: parseFloat(targetReturn) };
    } else {
      alert("Please enter a value for the selected mode.");
      return;
    }

    const response = await fetch("https://adspendoptimizer.onrender.com/optimize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const result = await response.json();
      setOptimizationResult(result);
    } else {
      console.error("Optimization failed");
    }
  };

  const getOptimizedChange = (start, end) => {
    if (start === 0) return "—";
    return `${(((end - start) / start) * 100).toFixed(1)}%`;
  };

  const getROI = (spend, returnAmount) => {
    if (spend === 0) return "—";
    return (returnAmount / spend).toFixed(2);
  };

  const estimatedReturn = {
    PDE: optimizationResult.return_A || 0,
    Email: optimizationResult.return_B || 0,
    PaidSearch: optimizationResult.return_C || 0,
  };
  

  return (
<div className="flex flex-col h-screen relative z-10 bg-gray-900 ">
<Header title="Optimization Page" />
<div className="flex-1 overflow-auto relative z-10 w-full">
<main className="max-w-7xl mx-auto py-6 px-4 lg:px-8 h-full w-full">

        {/* Toggle Option */}
        <div className="mb-10">
          <label className="block text-gray-100 text-xl font-medium mb-10">How Do You Want to Optimize?</label>
          <div className="flex gap-6">
            <label className="flex items-center space-x-2 block text-gray-100" >
              <input
                type="radio"
                value="budget"
                checked={mode === "budget"}
                onChange={() => setMode("budget")}
              />
              <span>Highest Return Within Budget</span>
            </label>
            <label className="flex items-center space-x-2 block text-gray-100">
              <input
                type="radio"
                value="return"
                checked={mode === "return"}
                onChange={() => setMode("return")}
              />
              <span>Lowest Spend to Hit Return Goal</span>
            </label>
          </div>
        </div>

        {/* Input Field */}
        <div className="mb-10"> 
          {mode === "budget" ? (
            <div>
              <label htmlFor="budget" className="block text-gray-100 font-medium mb-2">
                Enter Budget:
              </label>
              <input
                type="number"
                id="budget"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="p-2 border rounded w-full"
                placeholder="e.g. 50000"
              />
            </div>
          ) : (
            <div>
              <label htmlFor="return" className="block text-gray-100 font-medium mb-2">
                Enter Target Return:
              </label>
              <input
                type="number"
                id="return"
                value={targetReturn}
                onChange={(e) => setTargetReturn(e.target.value)}
                className="p-2 border rounded w-full"
                placeholder="e.g. 85000"
              />
            </div>
          )}
        </div>

        {/* Stat Cards */}

        <motion.div
          className="bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-lg shadow-lg
            rounded-xl p-6 border border-gray-700 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <StatCard
            name="Spend PDE"
            icon={BadgeDollarSign}
            value={`$${optimizationResult.spend_A.toFixed(2)}`}
            color="#eab308"
          />
          <StatCard
            name="Spend Email"
            icon={BadgeDollarSign}
            value={`$${optimizationResult.spend_B.toFixed(2)}`}
            color="#eab308"
          />
          <StatCard
            name="Spend Paid Search"
            icon={BadgeDollarSign}
            value={`$${optimizationResult.spend_C.toFixed(2)}`}
            color="#eab308"
          />
          <StatCard
            name="Total Return"
            icon={Pill}
            value={`${optimizationResult.total_return.toFixed(2)}`}
            color="#4CAF50"
          />
        </motion.div>

        <button
          onClick={handleOptimize}
          className="mt-5 mb-10 px-6 py-3 text-lg font-semibold bg-emerald-500 text-gray-100 rounded-xl shadow-md hover:bg-emerald-600 transition duration-200"
          >
          Optimize!
        </button>
      {/* OptimizationTable */}
      <div className="flex-1 overflow-auto pb-8"> {/* Added flex-1 here */}
        <OptimizationTable
          startingSpends={startingSpends}
          optimizationResult={optimizationResult}
          estimatedReturn={estimatedReturn}
          handleStartingSpendChange={handleStartingSpendChange}
          getOptimizedChange={getOptimizedChange}
          getROI={getROI}
        />
      </div>

      </main>
    </div>
  </div>
  );
};

export default OptimizationPage;

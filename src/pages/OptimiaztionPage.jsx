import { BadgeDollarSign, Pill  } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import Header from "../components/common/Header";
import StatCard from "../components/common/StatCard";

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

  return (
    <div className="flex-1 overflow-auto relative z-10">
      <Header title="Optimization Page" />

      <main className="max-w-7xl mx-auto py-6 px-4 lg:px-8">
        {/* Toggle Option */}
        <div className="mb-10">
          <label className="block text-2xl font-medium mb-10">How Do You Want to Optimize?</label>
          <div className="flex gap-6">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                value="budget"
                checked={mode === "budget"}
                onChange={() => setMode("budget")}
              />
              <span>Highest Return Within Budget</span>
            </label>
            <label className="flex items-center space-x-2">
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
              <label htmlFor="budget" className="block text-2xl font-medium mb-2">
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
              <label htmlFor="return" className="block text-2xl font-medium mb-2">
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
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <StatCard
            name="Spend A"
            icon={BadgeDollarSign}
            value={`$${optimizationResult.spend_A.toFixed(2)}`}
            color="#eab308"
          />
          <StatCard
            name="Spend B"
            icon={BadgeDollarSign}
            value={`$${optimizationResult.spend_B.toFixed(2)}`}
            color="#eab308"
          />
          <StatCard
            name="Spend C"
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
          className="mt-5 p-2 bg-blue-500 text-white rounded"
        >
          Optimize!
        </button>
      </main>
    </div>
  );
};

export default OptimizationPage;

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const StatusPill = ({ status }) => {
    let colorClass = 'bg-gray-700 text-gray-400';
    if (status === 'Active') colorClass = 'bg-green-900/50 text-green-400 border border-green-700';
    if (status === 'Alert') colorClass = 'bg-red-900/50 text-red-400 border border-red-700';
    return (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
            {status}
        </span>
    );
};

function MonitoringPage() {
    const [agents, setAgents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAgents = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/monitor/agents`);
                setAgents(response.data);
            } catch (err) {
                setError(
                    err.response?.data?.message || 'Failed to fetch monitoring agents. Backend might be down.'
                );
                console.error("Monitoring Agent Fetch Error:", err.response ? err.response.data : err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAgents();
    }, []);

    const MonitoredAssetRow = ({ asset }) => (
        <div className="flex justify-between items-center bg-gray-800 p-4 rounded-xl shadow-lg hover:bg-gray-700/50 transition-colors">
            <div className="flex flex-col">
                <p className="text-lg font-semibold text-white">{asset.title}</p>
                <p className="text-sm text-gray-400 truncate">ID: {asset.ipId}</p>
            </div>
            <div className="flex items-center gap-4">
                <p className="text-sm text-gray-500">Last Check: {new Date(asset.lastCheck).toLocaleTimeString()}</p>
                <StatusPill status={asset.status} />
            </div>
        </div>
    );

    return (
      <div className="space-y-10 animate-fade-in">
        <div className="sticky top-0 z-30 bg-gradient-to-r from-purple-900/40 via-gray-900/80 to-blue-900/40 p-6 rounded-2xl border border-purple-900 shadow-xl mb-8">
          <h2 className="text-3xl font-extrabold text-purple-300 tracking-tight mb-2">Predictive Monitoring Agents</h2>
          <p className="font-semibold text-blue-400">Simulated Agents:</p>
          <p className="text-sm mt-2 text-gray-400">This list simulates IP assets currently monitored by a decentralized enforcement scanner, flagging potential issues automatically.</p>
        </div>
        {isLoading && (
          <div className="p-10 text-purple-400 text-center">Loading Monitoring Agents...</div>
        )}
        {error && (
          <div className="p-10 text-red-400 bg-red-900/30 rounded-2xl border border-red-700">Error: {error}</div>
        )}
        {!isLoading && agents.length > 0 && (
          <div className="space-y-4">
            {agents.map(agent => (
              <MonitoredAssetRow key={agent.ipId} asset={agent} />
            ))}
          </div>
        )}
        {!isLoading && agents.length === 0 && !error && (
          <div className="p-10 text-gray-500 text-center bg-gray-800/50 rounded-2xl border border-gray-700">No active monitoring agents found.</div>
        )}
      </div>
  );
}

export default MonitoringPage;
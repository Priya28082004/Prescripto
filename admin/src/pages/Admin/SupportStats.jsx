import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AdminContext } from '../../context/AdminContext';
import { toast } from 'react-toastify';
import { 
  BarChart2, FileText, MessageSquare, Clock, ShieldCheck, 
  AlertTriangle, CheckCircle, PieChart, TrendingUp 
} from 'lucide-react';

const SupportStats = () => {
  const { aToken, backendUrl } = useContext(AdminContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${backendUrl}/api/ticket/stats/analytics`, {
        headers: { atoken: aToken }
      });
      if (res.data.success) {
        setStats(res.data.stats);
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load analytics statistics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [backendUrl]);

  if (loading) {
    return (
      <div className="flex-1 p-10 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <BarChart2 size={40} className="mx-auto text-primary animate-pulse mb-3" />
          <p className="text-sm font-semibold">Generating Analytics Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  // Destructure metrics
  const { tickets, chats, categoryBreakdown } = stats;

  return (
    <div className="flex-1 p-6 md:p-8 space-y-8 bg-[#F8F9FD] overflow-y-auto max-h-[calc(100vh-70px)] font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <BarChart2 className="text-primary" /> Support & Chat Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">Review live chat volume, support ticket states, priority distribution, and resolution performance.</p>
        </div>
        <button
          onClick={fetchStats}
          className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition"
        >
          Refresh Statistics
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1 */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Tickets</p>
            <h3 className="text-3xl font-extrabold text-gray-800">{tickets.total}</h3>
            <p className="text-[10px] text-gray-500">Submitted by patients</p>
          </div>
          <div className="p-3 bg-blue-50 text-primary rounded-2xl">
            <FileText size={24} />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Open Tickets</p>
            <h3 className="text-3xl font-extrabold text-emerald-600">{tickets.open}</h3>
            <p className="text-[10px] text-emerald-500 font-semibold">{tickets.pending} pending replies</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Clock size={24} />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Resolved Tickets</p>
            <h3 className="text-3xl font-extrabold text-violet-600">
              {tickets.resolved + tickets.closed}
            </h3>
            <p className="text-[10px] text-gray-500">
              {Math.round(((tickets.resolved + tickets.closed) / (tickets.total || 1)) * 100)}% resolution rate
            </p>
          </div>
          <div className="p-3 bg-violet-50 text-violet-600 rounded-2xl">
            <CheckCircle size={24} />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Active Chat Sessions</p>
            <h3 className="text-3xl font-extrabold text-amber-600">{chats.active}</h3>
            <p className="text-[10px] text-gray-500">{chats.totalMessages} messages exchanged</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <MessageSquare size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* CHART 1: Priority Distribution Bar Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-6">
            <AlertTriangle size={18} className="text-orange-500" /> Ticket Volume by Priority
          </h3>
          
          <div className="space-y-5">
            {Object.entries(tickets.byPriority).map(([prio, val]) => {
              const max = Math.max(...Object.values(tickets.byPriority)) || 1;
              const percent = Math.min(100, Math.max(8, (val / max) * 100));
              
              const getBarColor = (p) => {
                if (p === 'urgent') return 'bg-red-500';
                if (p === 'high') return 'bg-orange-500';
                if (p === 'medium') return 'bg-yellow-500';
                return 'bg-blue-500';
              };

              return (
                <div key={prio} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="capitalize text-gray-600">{prio}</span>
                    <span className="text-gray-800">{val} tickets</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${getBarColor(prio)}`} 
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CHART 2: Category Breakdown Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-6">
            <PieChart size={18} className="text-violet-500" /> Ticket Distribution by Category
          </h3>

          <div className="space-y-4">
            {Object.entries(categoryBreakdown).map(([cat, val]) => {
              const total = Object.values(categoryBreakdown).reduce((a, b) => a + b, 0) || 1;
              const pct = Math.round((val / total) * 100);
              
              return (
                <div key={cat} className="flex items-center justify-between text-xs border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary/80"></span>
                    <span className="font-medium text-gray-600">{cat}</span>
                  </div>
                  <div className="text-right">
                    <strong className="text-gray-800">{val}</strong>
                    <span className="text-gray-400 ml-2">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportStats;

import React from 'react';
import { AIAnalysisReport } from '../types';
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

interface AIReportPanelProps {
    report: AIAnalysisReport;
}

const AIReportPanel: React.FC<AIReportPanelProps> = ({ report }) => {
    return (
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>

            <div className="flex items-center gap-2 mb-4 relative z-10">
                <Sparkles className="text-amber-400" size={20} />
                <h3 className="font-bold text-lg tracking-wide">AI Health Insights</h3>
            </div>

            <div className="space-y-4 relative z-10">
                {/* Score */}
                <div className="flex items-center justify-between bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                    <span className="text-slate-300 text-sm">Risk Score</span>
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-24 bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-1000 ${report.riskScore > 50 ? 'bg-red-500' : 'bg-emerald-500'}`}
                                style={{ width: `${report.riskScore}%` }}
                            ></div>
                        </div>
                        <span className="font-mono font-bold">{report.riskScore}/100</span>
                    </div>
                </div>

                {/* Recommendation */}
                <div className={`p-4 rounded-lg border-l-4 ${report.riskScore > 70 ? 'bg-red-500/20 border-red-500' : 'bg-emerald-500/20 border-emerald-500'}`}>
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-1 opacity-75">Analysis Summary</h4>
                    <p className="font-medium leading-snug">{report.recommendation}</p>
                </div>

                {/* Trends */}
                {report.trends.length > 0 ? (
                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase">Detected Patterns</h4>
                        {report.trends.map((t, i) => (
                            <div key={i} className="flex gap-3 items-start text-sm bg-white/5 p-2 rounded">
                                <TrendingUp size={16} className={t.trend === 'increasing' ? 'text-rose-400' : 'text-blue-400'} />
                                <div>
                                    <div className="font-semibold text-slate-200">{t.description}</div>
                                    <div className="text-xs text-slate-500">{t.period} • {t.confidence}% confidence</div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex gap-2 text-sm text-slate-400 items-center">
                        <CheckCircle size={14} /> No significant negative trends detected.
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIReportPanel;

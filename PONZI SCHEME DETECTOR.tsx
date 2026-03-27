import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, RotateCcw, FileDown, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import DetectionStats from '@/components/DetectionStats';
import TraceGraph from '@/components/TraceGraph';
import AlertsPanel from '@/components/AlertsPanel';
import BanList from '@/components/BanList';
import TransactionLog from '@/components/TransactionLog';
import { analyzeNetwork, type Account, type Transaction, type AnalysisReport } from '@/lib/ponzi-detector';
import { generateSampleData } from '@/lib/sample-data';

export default function Index() {
  const [data, setData] = useState(() => generateSampleData());
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  const report = useMemo(() => analyzeNetwork(data.accounts, data.transactions), [data]);

  const handleToggleBan = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      accounts: prev.accounts.map(a =>
        a.id === id ? { ...a, banned: !a.banned } : a
      ),
    }));
    const acc = data.accounts.find(a => a.id === id);
    if (acc?.banned) {
      toast.success(`${id} unbanned`);
    } else {
      toast.error(`${id} banned — ${acc?.name}`);
    }
  }, [data.accounts]);

  const handleReset = useCallback(() => {
    setData(generateSampleData());
    setSelectedAccount(null);
    toast.info('Data reloaded');
  }, []);

  const handleExportBanList = useCallback(() => {
    const banned = data.accounts.filter(a => a.banned);
    const csv = ['Account ID,Name,Risk Score,Role,Total In,Total Out']
      .concat(banned.map(a => `${a.id},"${a.name}",${a.riskScore},${a.role},${a.totalIn},${a.totalOut}`))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'banned-accounts.csv';
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${banned.length} banned accounts`);
  }, [data.accounts]);

  const handleGenerateReport = useCallback(() => {
    const r = report;
    const lines = [
      '═══════════════════════════════════════════',
      '   PONZI SCHEME INVESTIGATION REPORT',
      '═══════════════════════════════════════════',
      `Date: ${new Date().toISOString().split('T')[0]}`,
      `Risk Level: ${r.riskLevel.toUpperCase()}`,
      '',
      '--- SUMMARY ---',
      `Total Transactions Analyzed: ${r.totalTransactions}`,
      `Total Volume: $${r.totalVolume.toLocaleString()}`,
      `Flagged Transactions: ${r.flaggedTransactions}`,
      `Suspicious Accounts: ${r.suspiciousAccounts}`,
      `Identified Schemes: ${r.identifiedSchemes}`,
      '',
      '--- DETECTION ALERTS ---',
      ...r.alerts.map(a => `[${a.severity.toUpperCase()}] ${a.type}: ${a.message}`),
      '',
      '--- TRACE RESULTS ---',
      ...r.traces.map(t => `Source: ${t.sourceAccount} | Path: ${t.path.join(' → ')} | Depth: ${t.depth} | Victims: ${t.victimCount}`),
      '',
      '--- BANNED ACCOUNTS ---',
      ...data.accounts.filter(a => a.banned).map(a => `${a.id} | ${a.name} | Risk: ${a.riskScore}`),
      '',
      '═══════════════════════════════════════════',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ponzi-investigation-report.txt';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Investigation report downloaded');
  }, [report, data.accounts]);

  const bannedCount = data.accounts.filter(a => a.banned).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-loss/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-loss" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Ponzi Scheme Tracer</h1>
              <p className="text-xs text-muted-foreground">Detect • Trace • Ban — Financial Fraud Investigation Tool</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleGenerateReport} className="gap-1.5">
              <FileDown size={14} />
              Report
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
              <RotateCcw size={14} />
              Reload
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Risk Banner */}
        <AnimatePresence>
          {(report.riskLevel === 'critical' || report.riskLevel === 'high') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-lg border border-loss/40 bg-loss/10 p-4 glow-red"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-loss flex-shrink-0" size={20} />
                <div>
                  <h2 className="font-semibold text-loss">Ponzi Scheme Detected</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {report.alerts.filter(a => a.severity === 'critical').length} critical alerts identified.
                    Scheme traced to <span className="text-warning font-mono font-medium">ACC-001 (Marcus Webb)</span>.
                    Total suspicious volume: <span className="text-loss font-mono font-medium">${report.totalVolume.toLocaleString()}</span>.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <DetectionStats report={report} bannedCount={bannedCount} />

        {/* Trace + Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TraceGraph
            accounts={data.accounts}
            transactions={data.transactions}
            selectedAccount={selectedAccount}
            onSelectAccount={setSelectedAccount}
          />
          <AlertsPanel alerts={report.alerts} />
        </div>

        {/* Ban List + Transaction Log */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BanList
            accounts={data.accounts}
            onToggleBan={handleToggleBan}
            onExport={handleExportBanList}
          />
          <TransactionLog
            transactions={data.transactions}
            onSelectAccount={setSelectedAccount}
          />
        </div>

        {/* Selected Account Detail */}
        <AnimatePresence>
          {selectedAccount && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-lg border border-info/30 bg-card p-5"
            >
              {(() => {
                const acc = data.accounts.find(a => a.id === selectedAccount);
                if (!acc) return null;
                const inTxs = data.transactions.filter(t => t.to === acc.id);
                const outTxs = data.transactions.filter(t => t.from === acc.id);
                return (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{acc.name}</h3>
                        <p className="text-xs text-muted-foreground font-mono">{acc.id} • First seen: {acc.firstSeen} • Role: {acc.role}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-sm font-bold px-2 py-1 rounded ${
                          acc.riskScore >= 70 ? 'bg-loss/20 text-loss' :
                          acc.riskScore >= 50 ? 'bg-warning/20 text-warning' :
                          'bg-muted text-muted-foreground'
                        }`}>Risk: {acc.riskScore}%</span>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedAccount(null)}>✕</Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="bg-secondary/50 rounded p-2"><span className="text-muted-foreground">Total In</span><div className="font-mono font-medium text-profit">${acc.totalIn.toLocaleString()}</div></div>
                      <div className="bg-secondary/50 rounded p-2"><span className="text-muted-foreground">Total Out</span><div className="font-mono font-medium text-loss">${acc.totalOut.toLocaleString()}</div></div>
                      <div className="bg-secondary/50 rounded p-2"><span className="text-muted-foreground">Incoming Txns</span><div className="font-mono font-medium">{inTxs.length}</div></div>
                      <div className="bg-secondary/50 rounded p-2"><span className="text-muted-foreground">Outgoing Txns</span><div className="font-mono font-medium">{outTxs.length}</div></div>
                    </div>
                    {acc.flags.length > 0 && (
                      <div className="mt-2 flex gap-1 flex-wrap">
                        {acc.flags.map((f, i) => <span key={i} className="text-[10px] bg-warning/15 text-warning px-2 py-0.5 rounded">{f}</span>)}
                      </div>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-xs text-muted-foreground py-4">
          🔍 Ponzi Scheme Tracer — Detect pyramid structures, trace money flows to their source, and ban fraudulent accounts.
        </p>
      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Users, 
  Trophy, 
  Upload, 
  Trash2, 
  Play, 
  Settings, 
  LayoutGrid, 
  UserPlus,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Download,
  Copy,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import confetti from 'canvas-confetti';

// --- Constants ---

const MOCK_NAMES = [
  "陳小明", "林美玲", "張大華", "李秀英", "王志強", 
  "黃雅婷", "郭俊宏", "何淑芬", "徐家豪", "周佩珊", 
  "趙子龍", "孫悟空", "林黛玉", "賈寶玉", "諸葛亮",
  "曹操", "劉備", "關羽", "張飛", "周瑜"
];

// --- Types ---

interface Person {
  id: string;
  name: string;
}

interface Group {
  id: number;
  members: Person[];
}

// --- Main App Component ---

export default function App() {
  const [names, setNames] = useState<Person[]>([]);
  const [activeTab, setActiveTab] = useState<'import' | 'draw' | 'group'>('import');
  const [inputText, setInputText] = useState('');

  // Lucky Draw State
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentWinner, setCurrentWinner] = useState<Person | null>(null);
  const [winners, setWinners] = useState<Person[]>([]);
  const [allowRepeat, setAllowRepeat] = useState(false);
  const [drawHistory, setDrawHistory] = useState<Person[]>([]);

  // Grouping State
  const [groupSize, setGroupSize] = useState(3);
  const [groups, setGroups] = useState<Group[]>([]);

  // Duplicate Detection
  const duplicateNamesSet = useMemo(() => {
    const counts = new Map<string, number>();
    names.forEach(p => counts.set(p.name, (counts.get(p.name) || 0) + 1));
    return new Set(Array.from(counts.entries()).filter(([_, count]) => count > 1).map(([name]) => name));
  }, [names]);

  // Handle Text Input
  const handleAddNames = () => {
    const newNames = inputText
      .split('\n')
      .map(n => n.trim())
      .filter(n => n !== '')
      .map(n => ({ id: Math.random().toString(36).substr(2, 9), name: n }));
    
    setNames(prev => [...prev, ...newNames]);
    setInputText('');
  };

  // Handle Mock Data
  const loadMockData = () => {
    const mockPeople = MOCK_NAMES.map(n => ({ id: Math.random().toString(36).substr(2, 9), name: n }));
    setNames(prev => [...prev, ...mockPeople]);
  };

  // Handle CSV Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        const parsedNames = results.data
          .flat()
          .map((n: any) => String(n).trim())
          .filter(n => n !== '' && n !== 'name' && n !== 'Name') // Basic header filter
          .map(n => ({ id: Math.random().toString(36).substr(2, 9), name: n }));
        
        setNames(prev => [...prev, ...parsedNames]);
      },
      header: false
    });
  };

  const clearNames = () => {
    if (confirm('確定要清除所有名單嗎？')) {
      setNames([]);
      setWinners([]);
      setDrawHistory([]);
      setGroups([]);
    }
  };

  const removeDuplicates = () => {
    const seen = new Set();
    const uniqueNames = names.filter(person => {
      if (seen.has(person.name)) return false;
      seen.add(person.name);
      return true;
    });
    setNames(uniqueNames);
  };

  // Lucky Draw Logic
  const startDraw = () => {
    if (names.length === 0) return;
    
    const availableNames = allowRepeat 
      ? names 
      : names.filter(n => !winners.find(w => w.id === n.id));

    if (availableNames.length === 0) {
      alert('沒有可抽取的名單了！');
      return;
    }

    setIsDrawing(true);
    setCurrentWinner(null);

    let counter = 0;
    const duration = 2000; // 2 seconds
    const interval = 80;
    
    const timer = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * availableNames.length);
      setCurrentWinner(availableNames[randomIndex]);
      counter += interval;
      
      if (counter >= duration) {
        clearInterval(timer);
        const finalWinner = availableNames[Math.floor(Math.random() * availableNames.length)];
        setCurrentWinner(finalWinner);
        setWinners(prev => [...prev, finalWinner]);
        setDrawHistory(prev => [finalWinner, ...prev]);
        setIsDrawing(false);
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }, interval);
  };

  // Grouping Logic
  const generateGroups = () => {
    if (names.length === 0) return;
    
    const shuffled = [...names].sort(() => Math.random() - 0.5);
    const newGroups: Group[] = [];
    
    for (let i = 0; i < shuffled.length; i += groupSize) {
      newGroups.push({
        id: Math.floor(i / groupSize) + 1,
        members: shuffled.slice(i, i + groupSize)
      });
    }
    
    setGroups(newGroups);
  };

  const downloadGroupsCSV = () => {
    if (groups.length === 0) return;
    
    const csvData = groups.flatMap(group => 
      group.members.map(member => ({
        '組別': `第 ${group.id} 組`,
        '姓名': member.name
      }))
    );
    
    const csv = Papa.unparse(csvData);
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel compatibility
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `分組結果_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Users className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">HR Smart Tools</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 font-medium">
            當前名單人數: <span className="text-indigo-600">{names.length}</span>
          </span>
          {names.length > 0 && (
            <button 
              onClick={clearNames}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="清除名單"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8 bg-white p-1 rounded-xl border border-gray-200 w-fit shadow-sm">
          <TabButton 
            active={activeTab === 'import'} 
            onClick={() => setActiveTab('import')}
            icon={<Upload size={18} />}
            label="名單匯入"
          />
          <TabButton 
            active={activeTab === 'draw'} 
            onClick={() => setActiveTab('draw')}
            icon={<Trophy size={18} />}
            label="獎品抽籤"
          />
          <TabButton 
            active={activeTab === 'group'} 
            onClick={() => setActiveTab('group')}
            icon={<LayoutGrid size={18} />}
            label="自動分組"
          />
        </div>

        {/* Content Sections */}
        <AnimatePresence mode="wait">
          {activeTab === 'import' && (
            <motion.div
              key="import"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              <div className="space-y-6">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <UserPlus className="text-indigo-600" size={20} />
                      手動輸入或貼上姓名
                    </h2>
                    <button 
                      onClick={loadMockData}
                      className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-100 transition-colors flex items-center gap-1"
                    >
                      <Copy size={14} />
                      載入模擬名單
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">每行一個姓名，完成後點擊「加入名單」</p>
                  <textarea
                    className="w-full h-48 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
                    placeholder="例如：&#10;王小明&#10;李大華&#10;張美玲"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                  />
                  <button
                    onClick={handleAddNames}
                    disabled={!inputText.trim()}
                    className="w-full mt-4 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-[0.98]"
                  >
                    加入名單
                  </button>
                </div>

                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Upload className="text-indigo-600" size={20} />
                    上傳 CSV 檔案
                  </h2>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center gap-4 hover:border-indigo-400 transition-colors cursor-pointer relative">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="bg-indigo-50 p-4 rounded-full">
                      <Upload className="text-indigo-600" size={32} />
                    </div>
                    <div className="text-center">
                      <p className="font-bold">點擊或拖拽檔案至此</p>
                      <p className="text-xs text-gray-400 mt-1">支援 .csv 格式</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full min-h-[500px]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <span>當前名單</span>
                    <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                      {names.length} 人
                    </span>
                  </h2>
                  {duplicateNamesSet.size > 0 && (
                    <button 
                      onClick={removeDuplicates}
                      className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg font-bold hover:bg-red-100 transition-colors flex items-center gap-1"
                    >
                      <Trash2 size={14} />
                      移除重複 ({duplicateNamesSet.size})
                    </button>
                  )}
                </div>
                
                {duplicateNamesSet.size > 0 && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
                    <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                    <p className="text-xs text-amber-800 leading-relaxed">
                      偵測到重複姓名！標記為 <span className="text-red-600 font-bold">紅色</span> 的項目代表名單中存在多個相同姓名。
                    </p>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {names.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300 py-20">
                      <Users size={64} strokeWidth={1} />
                      <p className="mt-4 text-sm">尚未匯入名單</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {names.map((person, idx) => (
                        <div 
                          key={`${person.id}-${idx}`} 
                          className={`
                            text-sm px-3 py-2 rounded-lg border truncate transition-all
                            ${duplicateNamesSet.has(person.name) 
                              ? 'bg-red-50 border-red-200 text-red-700 font-medium' 
                              : 'bg-gray-50 border-gray-100 text-gray-700'}
                          `}
                        >
                          {person.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'draw' && (
            <motion.div
              key="draw"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-4xl mx-auto"
            >
              <div className="bg-white p-10 rounded-3xl shadow-lg border border-gray-100 text-center relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-pink-50 rounded-full blur-3xl opacity-50" />

                <div className="relative z-10">
                  <div className="flex justify-center mb-6">
                    <div className="bg-indigo-600 p-4 rounded-2xl shadow-indigo-200 shadow-xl">
                      <Trophy className="text-white w-10 h-10" />
                    </div>
                  </div>
                  
                  <h2 className="text-3xl font-black mb-2 tracking-tight">幸運大抽籤</h2>
                  <p className="text-gray-500 mb-8">點擊下方按鈕開始隨機抽取獲獎者</p>

                  <div className="flex justify-center gap-6 mb-12">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative flex items-center">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={allowRepeat}
                          onChange={() => setAllowRepeat(!allowRepeat)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </div>
                      <span className="text-sm font-bold text-gray-600 group-hover:text-indigo-600 transition-colors">允許重複中獎</span>
                    </label>
                  </div>

                  <div className="h-48 flex items-center justify-center mb-12">
                    <AnimatePresence mode="wait">
                      {isDrawing ? (
                        <motion.div
                          key="drawing"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="text-6xl font-black text-indigo-600 tracking-wider"
                        >
                          {currentWinner?.name}
                        </motion.div>
                      ) : currentWinner ? (
                        <motion.div
                          key="winner"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1.2, opacity: 1 }}
                          className="flex flex-col items-center"
                        >
                          <span className="text-sm font-bold text-indigo-500 uppercase tracking-widest mb-2">恭喜獲獎</span>
                          <span className="text-7xl font-black text-gray-900">{currentWinner.name}</span>
                        </motion.div>
                      ) : (
                        <div className="text-gray-300 text-lg font-medium italic">準備就緒</div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button
                    onClick={startDraw}
                    disabled={isDrawing || names.length === 0}
                    className="bg-indigo-600 text-white px-12 py-5 rounded-2xl font-black text-xl hover:bg-indigo-700 disabled:opacity-50 shadow-xl shadow-indigo-100 active:scale-95 transition-all flex items-center gap-3 mx-auto"
                  >
                    {isDrawing ? (
                      <>
                        <RotateCcw className="animate-spin" />
                        抽取中...
                      </>
                    ) : (
                      <>
                        <Play fill="currentColor" />
                        開始抽籤
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Draw History */}
              <div className="mt-12">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <RotateCcw size={20} className="text-gray-400" />
                  中獎紀錄 ({winners.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {drawHistory.map((winner, idx) => (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={`${winner.id}-${idx}`}
                      className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3"
                    >
                      <div className="bg-indigo-50 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">
                        {drawHistory.length - idx}
                      </div>
                      <span className="font-bold">{winner.name}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'group' && (
            <motion.div
              key="group"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-xl font-bold mb-1">自動分組設定</h2>
                    <p className="text-sm text-gray-500">設定每組人數，系統將隨機分配名單</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
                      <button 
                        onClick={() => setGroupSize(Math.max(2, groupSize - 1))}
                        className="w-10 h-10 flex items-center justify-center font-bold hover:bg-white rounded-lg transition-colors"
                      >
                        -
                      </button>
                      <div className="px-6 font-black text-lg">{groupSize}</div>
                      <button 
                        onClick={() => setGroupSize(groupSize + 1)}
                        className="w-10 h-10 flex items-center justify-center font-bold hover:bg-white rounded-lg transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={generateGroups}
                        disabled={names.length === 0}
                        className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 shadow-md active:scale-95 transition-all flex items-center gap-2"
                      >
                        <LayoutGrid size={18} />
                        立即分組
                      </button>
                      {groups.length > 0 && (
                        <button
                          onClick={downloadGroupsCSV}
                          className="bg-white border border-gray-200 text-gray-700 px-4 py-3 rounded-xl font-bold hover:bg-gray-50 shadow-sm active:scale-95 transition-all flex items-center gap-2"
                          title="下載分組 CSV"
                        >
                          <Download size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {groups.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groups.map((group) => (
                    <motion.div
                      key={group.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col"
                    >
                      <div className="bg-indigo-600 px-5 py-3 flex justify-between items-center">
                        <span className="text-white font-bold tracking-tight">第 {group.id} 組</span>
                        <span className="text-indigo-200 text-xs font-medium">{group.members.length} 人</span>
                      </div>
                      <div className="p-5 flex-1 bg-gradient-to-b from-white to-indigo-50/30">
                        <div className="flex flex-wrap gap-2">
                          {group.members.map((member) => (
                            <div key={member.id} className="bg-white px-3 py-1.5 rounded-lg border border-indigo-100 text-sm font-medium shadow-sm">
                              {member.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-20 rounded-3xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                  <LayoutGrid size={64} strokeWidth={1} />
                  <p className="mt-4 font-medium">點擊「立即分組」生成結果</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto p-6 mt-12 border-t border-gray-200 text-center text-gray-400 text-xs">
        <p>© 2026 HR Smart Tools - 您的專業人力資源助手</p>
      </footer>

      {/* Empty State Overlay */}
      {names.length === 0 && activeTab !== 'import' && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-3xl shadow-2xl border border-gray-100 max-w-md text-center">
            <div className="bg-amber-50 text-amber-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">尚未匯入名單</h3>
            <p className="text-gray-500 mb-8">請先前往「名單匯入」分頁上傳或輸入您的名單，才能使用抽籤或分組功能。</p>
            <button
              onClick={() => setActiveTab('import')}
              className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              前往匯入名單
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Sub-components ---

function TabButton({ active, onClick, icon, label }: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string; 
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all
        ${active 
          ? 'bg-indigo-600 text-white shadow-md' 
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}
      `}
    >
      {icon}
      {label}
    </button>
  );
}

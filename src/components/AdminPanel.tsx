import { useState } from 'react';
import { AdminWords } from '../types';
import { X, Plus, Trash2, Download, Upload } from 'lucide-react';

interface AdminPanelProps {
  adminWords: AdminWords;
  onUpdateAdminWords: (words: AdminWords) => void;
  onClose: () => void;
}

export default function AdminPanel({ adminWords, onUpdateAdminWords, onClose }: AdminPanelProps) {
  const [newWord, setNewWord] = useState('');
  const [activeTab, setActiveTab] = useState<'additions' | 'blocklist'>('additions');

  const handleAddWord = () => {
    const word = newWord.trim().toLowerCase();
    if (!word) return;

    const updatedWords = {
      additions: new Set(adminWords.additions),
      blocklist: new Set(adminWords.blocklist)
    };

    if (activeTab === 'additions') {
      updatedWords.additions.add(word);
    } else {
      updatedWords.blocklist.add(word);
    }

    onUpdateAdminWords(updatedWords);
    setNewWord('');
  };

  const handleRemoveWord = (word: string, list: 'additions' | 'blocklist') => {
    const updatedWords = {
      additions: new Set(adminWords.additions),
      blocklist: new Set(adminWords.blocklist)
    };

    if (list === 'additions') {
      updatedWords.additions.delete(word);
    } else {
      updatedWords.blocklist.delete(word);
    }

    onUpdateAdminWords(updatedWords);
  };

  const handleExport = () => {
    const data = {
      additions: Array.from(adminWords.additions),
      blocklist: Array.from(adminWords.blocklist)
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'word-hunt-admin-words.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const updatedWords = {
          additions: new Set<string>(data.additions || []),
          blocklist: new Set<string>(data.blocklist || [])
        };
        onUpdateAdminWords(updatedWords);
      } catch (error) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const currentList = activeTab === 'additions' ? adminWords.additions : adminWords.blocklist;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto border border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Admin Panel</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('additions')}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
              activeTab === 'additions'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}
          >
            Additions ({adminWords.additions.size})
          </button>
          <button
            onClick={() => setActiveTab('blocklist')}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
              activeTab === 'blocklist'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}
          >
            Blocklist ({adminWords.blocklist.size})
          </button>
        </div>

        <div className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
              placeholder={`Add word to ${activeTab}`}
              className="flex-1 bg-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddWord}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="mb-4 max-h-60 overflow-y-auto bg-slate-900/50 rounded-lg p-3">
          {currentList.size === 0 ? (
            <p className="text-slate-500 text-center py-4">No words in {activeTab}</p>
          ) : (
            <div className="space-y-2">
              {Array.from(currentList).sort().map((word) => (
                <div
                  key={word}
                  className="flex justify-between items-center bg-slate-700 px-3 py-2 rounded-lg"
                >
                  <span className="text-white font-medium uppercase">{word}</span>
                  <button
                    onClick={() => handleRemoveWord(word, activeTab)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <label className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            Import
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

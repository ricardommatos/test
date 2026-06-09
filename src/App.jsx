import React, { useState } from 'react';
import PrismLab from '../PrismLab.jsx';
import FireflyWorld from './FireflyWorld.jsx';
import { Sparkles } from 'lucide-react';

export default function App() {
  const [view, setView] = useState('world');

  if (view === 'world') {
    return <FireflyWorld onExit={() => setView('lab')} />;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setView('world')}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium shadow-lg transition-colors"
      >
        <Sparkles size={16} />
        Firefly World
      </button>
      <PrismLab />
    </div>
  );
}

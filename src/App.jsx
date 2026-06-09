import React, { useState } from 'react';
import { Sparkles, Box } from 'lucide-react';
import PrismLab from '../PrismLab.jsx';
import ParticleWorld from './ParticleWorld.jsx';

const App = () => {
  const [view, setView] = useState('world');

  const tabClass = (active) =>
    `flex items-center gap-1.5 px-4 py-1.5 text-sm transition-colors ${
      active
        ? 'bg-violet-600 text-white'
        : 'bg-gray-900/80 text-gray-300 hover:bg-gray-800'
    }`;

  return (
    <div className="relative">
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex rounded-full overflow-hidden shadow-lg border border-gray-700/50 backdrop-blur">
        <button className={tabClass(view === 'world')} onClick={() => setView('world')}>
          <Sparkles size={14} /> Particle World
        </button>
        <button className={tabClass(view === 'prism')} onClick={() => setView('prism')}>
          <Box size={14} /> Prism Lab
        </button>
      </div>
      {view === 'world' ? <ParticleWorld /> : <PrismLab />}
    </div>
  );
};

export default App;


import React, { useState } from 'react';
import { PgrFormGenerator } from './PgrFormGenerator';
import { PhotoTableGenerator } from './PhotoTableGenerator';

// Icons
const DocumentTextIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const PhotoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);


export default function App() {
  const [activeTab, setActiveTab] = useState<'pgr' | 'photos'>('pgr');

  const getTabClass = (tabName: 'pgr' | 'photos') => {
    const baseClass = "flex items-center py-3 px-6 text-sm font-medium border-b-2 transition-colors duration-300 focus:outline-none";
    if (activeTab === tabName) {
      return `${baseClass} border-sky-300 text-white`;
    }
    return `${baseClass} border-transparent text-sky-200 hover:bg-sky-700/50 hover:text-white`;
  };
  
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="bg-sky-800 shadow-md text-white">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Gerador de Formulário PGR e Tabela de Fotos</h1>
          <p className="mt-1 text-sky-200">Faça o upload de documentos para extrair GHEs ou selecione uma pasta de fotos para gerar tabelas.</p>
        </div>
        <nav className="container mx-auto px-4">
          <div className="flex border-b border-sky-700">
            <button 
              onClick={() => setActiveTab('pgr')} 
              className={getTabClass('pgr')}
              aria-current={activeTab === 'pgr' ? 'page' : undefined}
            >
              <DocumentTextIcon /> Gerador de PGR
            </button>
            <button 
              onClick={() => setActiveTab('photos')} 
              className={getTabClass('photos')}
              aria-current={activeTab === 'photos' ? 'page' : undefined}
            >
              <PhotoIcon /> Tabela de Fotos
            </button>
          </div>
        </nav>
      </header>
      
      <main className="container mx-auto p-4 md:p-8">
        <div style={{ display: activeTab === 'pgr' ? 'block' : 'none' }}>
            <PgrFormGenerator />
        </div>
        <div style={{ display: activeTab === 'photos' ? 'block' : 'none' }}>
            <PhotoTableGenerator />
        </div>
      </main>
    </div>
  );
}

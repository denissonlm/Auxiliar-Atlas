
import React, { useState, useCallback, ChangeEvent, useRef, useEffect } from 'react';
import { GheSummary, GheDetails, Risk } from './types';
import { geminiService } from './services/geminiService';

// --- Helper Functions ---
const fileToBase64 = (file: File, onProgress: (progress: number) => void): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentLoaded = Math.round((event.loaded / event.total) * 100);
        onProgress(percentLoaded);
      }
    };

    reader.onload = () => {
      onProgress(100); // Ensure it completes
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };

    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};


const formatGheSectionForWord = (details: GheDetails, withPageBreak = false) => {
    const risksRows = details.riscos.map((risk, index) => {
        const lastRowStyle = index === details.riscos.length - 1 ? 'mso-yfti-lastrow:yes;' : '';
        return `
        <tr style="mso-yfti-irow:${index + 2}; ${lastRowStyle}">
            <td style="border:solid windowtext 1.0pt; border-top:none; mso-border-top-alt:solid windowtext 1.0pt; padding:0cm 5.4pt 0cm 5.4pt;"><p>${risk.fatorRisco || '&nbsp;'}</p></td>
            <td style="border:solid windowtext 1.0pt; border-top:none; border-left:none; mso-border-top-alt:solid windowtext 1.0pt; mso-border-left-alt:solid windowtext 1.0pt; padding:0cm 5.4pt 0cm 5.4pt;"><p>${risk.tipoRisco}</p></td>
            <td style="border:solid windowtext 1.0pt; border-top:none; border-left:none; mso-border-top-alt:solid windowtext 1.0pt; mso-border-left-alt:solid windowtext 1.0pt; padding:0cm 5.4pt 0cm 5.4pt;"><p>${risk.categoria}</p></td>
            <td style="border:solid windowtext 1.0pt; border-top:none; border-left:none; mso-border-top-alt:solid windowtext 1.0pt; mso-border-left-alt:solid windowtext 1.0pt; padding:0cm 5.4pt 0cm 5.4pt;"><p>${risk.nAmostrado}</p></td>
        </tr>
    `}).join('');

    const gheHtml = `
      <div>
        <h2>GHE ${details.ghe}</h2>
        <table style="width:100%; border-collapse:collapse; border:none; mso-border-alt:solid windowtext 1.0pt;">
            <tr style="mso-yfti-irow:0;mso-yfti-firstrow:yes;">
                <td colspan="6" style="border:solid windowtext 1.0pt; background:#D9D9D9; padding:0cm 5.4pt 0cm 5.4pt;">
                    <p style="text-align:center;"><b>LAUDO</b></p>
                </td>
            </tr>
            <tr style="mso-yfti-irow:1;">
                <td colspan="2" style="border:solid windowtext 1.0pt; border-top:none; mso-border-top-alt:solid windowtext 1.0pt; background:#D9D9D9; padding:0cm 5.4pt 0cm 5.4pt;"><p style="text-align:center;"><b>GHE</b></p></td>
                <td colspan="2" style="border:solid windowtext 1.0pt; border-top:none; border-left:none; mso-border-top-alt:solid windowtext 1.0pt; mso-border-left-alt:solid windowtext 1.0pt; background:#D9D9D9; padding:0cm 5.4pt 0cm 5.4pt;"><p style="text-align:center;"><b>CARGOS</b></p></td>
                <td colspan="2" style="border:solid windowtext 1.0pt; border-top:none; border-left:none; mso-border-top-alt:solid windowtext 1.0pt; mso-border-left-alt:solid windowtext 1.0pt; background:#D9D9D9; padding:0cm 5.4pt 0cm 5.4pt;"><p style="text-align:center;"><b>SETOR</b></p></td>
            </tr>
            <tr style="mso-yfti-irow:2;">
                <td colspan="2" style="border:solid windowtext 1.0pt; border-top:none; mso-border-top-alt:solid windowtext 1.0pt; padding:0cm 5.4pt 0cm 5.4pt; vertical-align:top;"><p style="text-align:center;">${details.ghe}</p></td>
                <td colspan="2" style="border:solid windowtext 1.0pt; border-top:none; border-left:none; mso-border-top-alt:solid windowtext 1.0pt; mso-border-left-alt:solid windowtext 1.0pt; padding:0cm 5.4pt 0cm 5.4pt; vertical-align:top;"><p style="text-align:center;">${details.cargos}</p></td>
                <td colspan="2" style="border:solid windowtext 1.0pt; border-top:none; border-left:none; mso-border-top-alt:solid windowtext 1.0pt; mso-border-left-alt:solid windowtext 1.0pt; padding:0cm 5.4pt 0cm 5.4pt; vertical-align:top;"><p style="text-align:center;">${details.setor}</p></td>
            </tr>
            <tr style="mso-yfti-irow:3;">
                <td colspan="3" style="border:solid windowtext 1.0pt; border-top:none; mso-border-top-alt:solid windowtext 1.0pt; padding:0cm 5.4pt 0cm 5.4pt; vertical-align:top;">
                    <p><b>Nº de colaboradores no GHE:</b> ${details.numColaboradores}</p>
                </td>
                <td colspan="3" style="border:solid windowtext 1.0pt; border-top:none; border-left:none; mso-border-top-alt:solid windowtext 1.0pt; mso-border-left-alt:solid windowtext 1.0pt; padding:0cm 5.4pt 0cm 5.4pt; vertical-align:top;">
                    <p><b>Jornada de Trabalho:</b> ${details.jornadaTrabalho}</p>
                </td>
            </tr>
            <tr style="mso-yfti-irow:4;">
                <td colspan="2" style="width:25%; border:solid windowtext 1.0pt; border-top:none; mso-border-top-alt:solid windowtext 1.0pt; background:#D9D9D9; padding:0cm 5.4pt 0cm 5.4pt; vertical-align:top;">
                    <p><b>Descrição do local:</b></p>
                </td>
                <td colspan="4" style="width:75%; border:solid windowtext 1.0pt; border-top:none; border-left:none; mso-border-top-alt:solid windowtext 1.0pt; mso-border-left-alt:solid windowtext 1.0pt; padding:0cm 5.4pt 0cm 5.4pt;">
                    <p class="textarea-content">${details.descricaoLocal.replace(/\n/g, '<br>')}</p>
                </td>
            </tr>
            <tr style="mso-yfti-irow:5;">
                <td colspan="2" style="width:25%; border:solid windowtext 1.0pt; border-top:none; mso-border-top-alt:solid windowtext 1.0pt; background:#D9D9D9; padding:0cm 5.4pt 0cm 5.4pt; vertical-align:top;">
                    <p><b>Descrição da atividade:</b></p>
                </td>
                <td colspan="4" style="width:75%; border:solid windowtext 1.0pt; border-top:none; border-left:none; mso-border-top-alt:solid windowtext 1.0pt; mso-border-left-alt:solid windowtext 1.0pt; padding:0cm 5.4pt 0cm 5.4pt;">
                    <p class="textarea-content">${details.descricaoAtividade.replace(/\n/g, '<br>')}</p>
                </td>
            </tr>
            <tr style="mso-yfti-irow:6;mso-yfti-lastrow:yes;">
                <td colspan="6" style="border:solid windowtext 1.0pt; border-top:none; mso-border-top-alt:solid windowtext 1.0pt; height:100px; padding:0cm 5.4pt 0cm 5.4pt;">
                    <p>&nbsp;</p>
                </td>
            </tr>
        </table>
        <p style="margin-bottom: 12pt;">&nbsp;</p>
        <table style="width:100%; border-collapse:collapse; border:none; mso-border-alt:solid windowtext 1.0pt;">
            <thead>
                <tr style="mso-yfti-irow:0;mso-yfti-firstrow:yes;">
                    <th colspan="4" style="border:solid windowtext 1.0pt; background:#D9D9D9; padding:0cm 5.4pt 0cm 5.4pt;">
                        <p style="text-align:center;"><b>INDENTIFICAÇÃO DOS RISCOS</b></p>
                    </th>
                </tr>
                <tr style="mso-yfti-irow:1; background:#D9D9D9;">
                    <th style="border:solid windowtext 1.0pt; border-top:none; mso-border-top-alt:solid windowtext 1.0pt; padding:0cm 5.4pt 0cm 5.4pt;"><p><b>Fator de Risco</b></p></th>
                    <th style="border:solid windowtext 1.0pt; border-top:none; border-left:none; mso-border-top-alt:solid windowtext 1.0pt; mso-border-left-alt:solid windowtext 1.0pt; padding:0cm 5.4pt 0cm 5.4pt;"><p><b>Tipo do Risco</b></p></th>
                    <th style="border:solid windowtext 1.0pt; border-top:none; border-left:none; mso-border-top-alt:solid windowtext 1.0pt; mso-border-left-alt:solid windowtext 1.0pt; padding:0cm 5.4pt 0cm 5.4pt;"><p><b>Categoria</b></p></th>
                    <th style="border:solid windowtext 1.0pt; border-top:none; border-left:none; mso-border-top-alt:solid windowtext 1.0pt; mso-border-left-alt:solid windowtext 1.0pt; padding:0cm 5.4pt 0cm 5.4pt;"><p><b>Nº Amostrado</b></p></th>
                </tr>
            </thead>
            <tbody>${risksRows}</tbody>
        </table>
      </div>
    `;

    if (withPageBreak) {
        return gheHtml + `<br clear=all style='mso-special-character:line-break;page-break-before:always'>`;
    }
    return gheHtml;
};

const formatForWordHtml = (details: GheDetails) => {
    const gheContent = formatGheSectionForWord(details, false);

    return `
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Calibri, sans-serif; font-size: 11pt; }
            p { margin: 0; padding: 2pt 0; text-align: left; }
            h2 { font-size: 13pt; color: #2F5496; margin-top: 12pt; margin-bottom: 6pt; }
            table { border-collapse: collapse; width: 100%; mso-yfti-tbllook:1184; }
            th, td { vertical-align: top; }
            .textarea-content { white-space: pre-wrap; text-align: justify; }
        </style>
        </head>
        <body>
            ${gheContent}
        </body>
        </html>
    `;
};


// --- SVG Icons ---
const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

const LoadingSpinner = () => (
  <svg className="animate-spin h-5 w-5 text-sky-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);


// --- RiskAssessmentForm Component ---
interface RiskAssessmentFormProps {
    initialDetails: GheDetails;
    onClose: () => void;
}

const RiskAssessmentForm: React.FC<RiskAssessmentFormProps> = ({ initialDetails, onClose }) => {
    const [details, setDetails] = useState<GheDetails>(initialDetails);
    const [copySuccess, setCopySuccess] = useState('');

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleRiskChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const newRisks = [...details.riscos];
        (newRisks[index] as any)[name] = value;
        setDetails(prev => ({...prev, riscos: newRisks}));
    };
    
    const handleCopy = async () => {
      const html = formatForWordHtml(details);
      try {
          const blob = new Blob([html], { type: 'text/html' });
          const item = new ClipboardItem({ 'text/html': blob });
          await navigator.clipboard.write([item]);
          setCopySuccess('Copiado com sucesso!');
      } catch (err) {
          console.error('Failed to copy HTML: ', err);
          setCopySuccess('Falha ao copiar.');
      } finally {
          setTimeout(() => setCopySuccess(''), 2000);
      }
    };


    return (
        <div className="fixed inset-0 bg-slate-900/75 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-3xl font-light">&times;</button>
                <h2 className="text-xl font-bold text-slate-800 mb-4">GHE {initialDetails.ghe}</h2>
                
                <table className="w-full border-collapse border border-slate-400 mb-4">
                    <thead>
                        <tr><th colSpan={2} className="border border-slate-400 p-2 bg-slate-200 text-slate-800 text-center font-bold">LAUDO</th></tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colSpan={2} className="border border-slate-400 p-0">
                                <div className="grid grid-cols-3">
                                    <div className="p-2 border-r border-slate-400">
                                        <label className="font-bold text-sm text-slate-700 block">GHE</label>
                                        <input type="text" name="ghe" value={details.ghe} onChange={handleInputChange} className="w-full p-1 mt-1 bg-slate-50 outline-none" />
                                    </div>
                                    <div className="p-2 border-r border-slate-400">
                                        <label className="font-bold text-sm text-slate-700 block">CARGOS</label>
                                        <input type="text" name="cargos" value={details.cargos} onChange={handleInputChange} className="w-full p-1 mt-1 bg-slate-50 outline-none" />
                                    </div>
                                    <div className="p-2">
                                        <label className="font-bold text-sm text-slate-700 block">SETOR</label>
                                        <input type="text" name="setor" value={details.setor} onChange={handleInputChange} className="w-full p-1 mt-1 bg-slate-50 outline-none" />
                                    </div>
                                </div>
                            </td>
                        </tr>
                         <tr>
                            <td className="border border-slate-400 p-2 w-1/2 align-top">
                                <label className="font-bold text-sm text-slate-700 block">Nº de colaboradores no GHE:</label>
                                <input type="text" name="numColaboradores" value={details.numColaboradores} onChange={handleInputChange} className="w-full p-1 mt-1 bg-slate-50 outline-none" />
                            </td>
                            <td className="border border-slate-400 p-2 w-1/2 align-top">
                                <label className="font-bold text-sm text-slate-700 block">Jornada de Trabalho:</label>
                                <input type="text" name="jornadaTrabalho" value={details.jornadaTrabalho} onChange={handleInputChange} className="w-full p-1 mt-1 bg-slate-50 outline-none" />
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-slate-400 p-2 bg-slate-100 font-bold text-slate-700 align-top w-[25%]">Descrição do local:</td>
                            <td className="border border-slate-400 p-2"><textarea name="descricaoLocal" value={details.descricaoLocal} onChange={handleInputChange} rows={4} className="w-full p-1 border rounded bg-slate-50 outline-none"></textarea></td>
                        </tr>
                         <tr>
                            <td className="border border-slate-400 p-2 bg-slate-100 font-bold text-slate-700 align-top w-[25%]">Descrição da atividade:</td>
                            <td className="border border-slate-400 p-2"><textarea name="descricaoAtividade" value={details.descricaoAtividade} onChange={handleInputChange} rows={4} className="w-full p-1 border rounded bg-slate-50 outline-none"></textarea></td>
                        </tr>
                         <tr>
                           <td colSpan={2} className="border border-slate-400 p-2 h-24"></td>
                        </tr>
                    </tbody>
                </table>

                <table className="w-full border-collapse border border-slate-400">
                    <thead>
                        <tr><th colSpan={4} className="border border-slate-400 p-2 bg-slate-200 text-slate-800">IDENTIFICAÇÃO DOS RISCOS</th></tr>
                        <tr className="bg-slate-100">
                            <th className="border border-slate-400 p-2 text-left text-sm font-semibold text-slate-700">Fator de Risco</th>
                            <th className="border border-slate-400 p-2 text-left text-sm font-semibold text-slate-700">Tipo do Risco</th>
                            <th className="border border-slate-400 p-2 text-left text-sm font-semibold text-slate-700">Categoria</th>
                            <th className="border border-slate-400 p-2 text-left text-sm font-semibold text-slate-700">Nº Amostrado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {details.riscos.map((risk, index) => (
                            <tr key={index}>
                                <td className="border border-slate-400 p-1"><input type="text" name="fatorRisco" value={risk.fatorRisco} onChange={(e) => handleRiskChange(index, e)} className="w-full p-1 bg-slate-50 outline-none" /></td>
                                <td className="border border-slate-400 p-1"><input type="text" name="tipoRisco" value={risk.tipoRisco} onChange={(e) => handleRiskChange(index, e)} className="w-full p-1 bg-slate-50 outline-none" /></td>
                                <td className="border border-slate-400 p-1"><input type="text" name="categoria" value={risk.categoria} onChange={(e) => handleRiskChange(index, e)} className="w-full p-1 bg-slate-50 outline-none" /></td>
                                <td className="border border-slate-400 p-1"><input type="text" name="nAmostrado" value={risk.nAmostrado} onChange={(e) => handleRiskChange(index, e)} className="w-full p-1 bg-slate-50 outline-none" /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 <div className="mt-6 flex justify-end">
                    <button onClick={handleCopy} className="bg-sky-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-sky-700 flex items-center transition duration-300 shadow-sm disabled:bg-slate-400" disabled={!!copySuccess}>
                        <CopyIcon /> {copySuccess || 'Copiar para Word'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Mass Generation Complete Modal ---
interface MassGenerationCompleteModalProps {
    onClose: () => void;
    onCopyAll: () => Promise<void>;
}

const MassGenerationCompleteModal: React.FC<MassGenerationCompleteModalProps> = ({ onClose, onCopyAll }) => {
    const [copyStatus, setCopyStatus] = useState('');

    const handleCopyClick = async () => {
        setCopyStatus('Copiando...');
        await onCopyAll();
        setCopyStatus('Copiado!');
        setTimeout(() => setCopyStatus(''), 2000);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/75 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md text-center">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Geração em Massa Concluída!</h3>
                <p className="text-slate-600 mb-6">Todos os formulários foram gerados com sucesso.</p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <button 
                        onClick={handleCopyClick} 
                        className="bg-sky-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-sky-700 flex items-center justify-center transition duration-300 shadow-sm disabled:bg-slate-400"
                        disabled={!!copyStatus}
                    >
                        <CopyIcon /> {copyStatus || 'Copiar Tudo para Word'}
                    </button>
                    <button 
                        onClick={onClose} 
                        className="bg-slate-200 text-slate-800 font-bold py-2 px-6 rounded-lg hover:bg-slate-300 transition duration-300"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- PgrFormGenerator Component ---
type GenerationStatus = 'idle' | 'loading' | 'success' | 'error';

export const PgrFormGenerator = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [ghes, setGhes] = useState<GheSummary[]>([]);
  const [selectedGheDetails, setSelectedGheDetails] = useState<GheDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [gheDetailsCache, setGheDetailsCache] = useState<Record<string, GheDetails>>({});
  const [generationStatus, setGenerationStatus] = useState<Record<string, GenerationStatus>>({});
  const [massGenerationState, setMassGenerationState] = useState<{ active: boolean, total: number, completed: number } | null>(null);
  const [copyStatus, setCopyStatus] = useState<Record<string, string>>({});
  const [isMassGenerationCompleteModalOpen, setIsMassGenerationCompleteModalOpen] = useState(false);


  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setGhes([]);
      setError(null);
      setGheDetailsCache({});
      setGenerationStatus({});
      setMassGenerationState(null);
      setCopyStatus({});
      setPdfFile(file);
      setIsLoading(true);
      setUploadProgress(0);
      try {
        const base64 = await fileToBase64(file, setUploadProgress);
        setPdfBase64(base64);
        setUploadProgress(null); // Switch to processing spinner
        const summaries = await geminiService.extractGheSummaries(base64);
        setGhes(summaries);
      } catch (err: any) {
        setError(err.message || 'Ocorreu um erro ao processar o PDF.');
      } finally {
        setIsLoading(false);
        setUploadProgress(null);
      }
    }
  };

  const handleActionClick = useCallback(async (ghe: GheSummary) => {
      if (!pdfBase64) {
          setError("Nenhum PDF carregado para gerar o formulário.");
          return;
      }

      const currentStatus = generationStatus[ghe.id] || 'idle';

      if (currentStatus === 'success') {
          const details = gheDetailsCache[ghe.id];
          if (details) {
              setSelectedGheDetails(details);
              setIsModalOpen(true);
          } else {
              setError(`Detalhes para ${ghe.ghe} não encontrados. Por favor, tente gerar novamente.`);
              setGenerationStatus(prev => ({ ...prev, [ghe.id]: 'error' }));
          }
          return;
      }
      
      if (currentStatus === 'loading') return;

      setError(null);
      setGenerationStatus(prev => ({ ...prev, [ghe.id]: 'loading' }));

      try {
          const details = await geminiService.extractGheDetails(pdfBase64, ghe.ghe);
          setGheDetailsCache(prev => ({ ...prev, [ghe.id]: details }));
          setGenerationStatus(prev => ({ ...prev, [ghe.id]: 'success' }));
          setSelectedGheDetails(details);
          setIsModalOpen(true);
      } catch (err: any) {
          setError(err.message || `Falha ao gerar o formulário para ${ghe.ghe}.`);
          setGenerationStatus(prev => ({ ...prev, [ghe.id]: 'error' }));
      }
  }, [pdfBase64, generationStatus, gheDetailsCache]);
  
  const handleCopyToWord = async (gheId: string) => {
    const details = gheDetailsCache[gheId];
    if (!details) {
        console.error("No details found in cache for GHE ID:", gheId);
        setCopyStatus(prev => ({...prev, [gheId]: 'Erro!'}));
        setTimeout(() => setCopyStatus(prev => ({...prev, [gheId]: ''})), 2000);
        return;
    }

    setCopyStatus(prev => ({...prev, [gheId]: 'Copiando...'}));

    const html = formatForWordHtml(details);
    try {
        const blob = new Blob([html], { type: 'text/html' });
        const item = new ClipboardItem({ 'text/html': blob });
        await navigator.clipboard.write([item]);
        setCopyStatus(prev => ({...prev, [gheId]: 'Copiado!'}));
    } catch (err) {
        console.error('Failed to copy HTML from list view: ', err);
        setCopyStatus(prev => ({...prev, [gheId]: 'Falha!'}));
    } finally {
        setTimeout(() => setCopyStatus(prev => ({...prev, [gheId]: ''})), 2000);
    }
  };

  const handleGenerateAll = async () => {
      if (!pdfBase64) return;
  
      const ghesToProcess = ghes.filter(g => {
          const status = generationStatus[g.id] || 'idle';
          return status === 'idle' || status === 'error';
      });
  
      if (ghesToProcess.length === 0) {
          setIsMassGenerationCompleteModalOpen(true);
          return;
      }
  
      const alreadyCompleted = ghes.length - ghesToProcess.length;
      setMassGenerationState({ active: true, total: ghes.length, completed: alreadyCompleted });
  
      for (const ghe of ghesToProcess) {
          setGenerationStatus(prev => ({ ...prev, [ghe.id]: 'loading' }));
          try {
              const details = await geminiService.extractGheDetails(pdfBase64, ghe.ghe);
              setGheDetailsCache(prev => ({ ...prev, [ghe.id]: details }));
              setGenerationStatus(prev => ({ ...prev, [ghe.id]: 'success' }));
          } catch (err) {
              console.error(`Falha ao gerar em massa para ${ghe.ghe}:`, err);
              setGenerationStatus(prev => ({ ...prev, [ghe.id]: 'error' }));
          } finally {
              setMassGenerationState(prev => {
                  if (!prev) return null;
                  return { ...prev, completed: prev.completed + 1 };
              });
          }
      }
  };

  useEffect(() => {
    if (massGenerationState && massGenerationState.completed === massGenerationState.total) {
        setMassGenerationState(prev => (prev ? { ...prev, active: false } : null));
        setIsMassGenerationCompleteModalOpen(true);
    }
  }, [massGenerationState]);

  const handleCopyAllToWord = async () => {
    const allGheContents = ghes
      .map(ghe => gheDetailsCache[ghe.id])
      .filter((details): details is GheDetails => !!details)
      .map((details, index, array) => {
          const withPageBreak = index < array.length - 1;
          return formatGheSectionForWord(details, withPageBreak);
      })
      .join('');

    if (!allGheContents) {
        console.error("Nenhum formulário gerado para copiar.");
        return;
    }
    
    const finalHtml = `
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Calibri, sans-serif; font-size: 11pt; }
            p { margin: 0; padding: 2pt 0; text-align: left; }
            h2 { font-size: 13pt; color: #2F5496; margin-top: 12pt; margin-bottom: 6pt; }
            table { border-collapse: collapse; width: 100%; mso-yfti-tbllook:1184; }
            th, td { vertical-align: top; }
            .textarea-content { white-space: pre-wrap; text-align: justify; }
        </style>
        </head>
        <body>
            ${allGheContents}
        </body>
        </html>
    `;
    
    try {
        const blob = new Blob([finalHtml], { type: 'text/html' });
        const item = new ClipboardItem({ 'text/html': blob });
        await navigator.clipboard.write([item]);
    } catch (err) {
        console.error('Falha ao copiar todos os formulários: ', err);
    }
  };
  
  const handleDownloadTxt = () => {
    if (ghes.length === 0) return;

    let content = "Lista de Grupos Homogêneos de Exposição (GHEs)\n";
    content += "==================================================\n\n";

    ghes.forEach(ghe => {
        content += `GHE: ${ghe.ghe}\n`;
        content += `Cargo(s): ${ghe.cargos.join(', ')}\n`;
        content += `Setor: ${ghe.setor}\n`;
        content += `Funcionários: ${ghe.funcionarios}\n`;
        content += "--------------------------------------------------\n\n";
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lista_ghes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h2 className="text-xl font-semibold mb-4 text-slate-700">1. Carregar Documento PGR</h2>
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
          <div className="flex items-center space-x-4">
            <label className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg cursor-pointer inline-flex items-center transition duration-300">
              <UploadIcon />
              <span>{pdfFile ? 'Trocar Arquivo' : 'Selecionar PDF'}</span>
              <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} disabled={isLoading}/>
            </label>
            {pdfFile && !isLoading && <span className="text-slate-700">{pdfFile.name}</span>}
          </div>

          {isLoading && (
            <div className="flex items-center mt-4 sm:mt-0 flex-grow">
              {uploadProgress !== null ? (
                <div className="w-full">
                    <p className="text-sm text-slate-600 mb-1 text-center sm:text-left">Carregando arquivo...</p>
                    <div className="w-full bg-slate-200 rounded-full h-2.5">
                      <div className="bg-sky-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                </div>
              ) : (
                <div className="flex items-center">
                  <LoadingSpinner />
                  <span className="text-slate-600 ml-2">Processando com IA...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg" role="alert">
          <strong className="font-bold">Erro: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {ghes.length > 0 && (
        <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border border-slate-200">
           <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-700">2. GHEs Encontrados</h2>
              <div className="flex items-center gap-4">
                <button
                  onClick={handleGenerateAll}
                  className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg inline-flex items-center transition duration-300 text-sm disabled:bg-slate-400 disabled:cursor-not-allowed"
                  aria-label="Gerar todos os relatórios em massa"
                  disabled={massGenerationState?.active || ghes.length === 0}
                >
                  Gerar Todos
                </button>
                <button
                  onClick={handleDownloadTxt}
                  className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg inline-flex items-center transition duration-300 text-sm"
                  aria-label="Baixar lista de GHEs em formato de texto"
                >
                  <DownloadIcon />
                  <span>Baixar Lista (TXT)</span>
                </button>
              </div>
          </div>
          
          {massGenerationState?.active && (
            <div className="my-4 p-4 border rounded-lg bg-slate-50">
              <div className="flex justify-between items-center mb-1">
                <p className="text-sm font-medium text-slate-700">Gerando relatórios em massa...</p>
                <p className="text-sm font-semibold text-sky-700">{massGenerationState.completed} de {massGenerationState.total} concluídos</p>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5">
                <div className="bg-sky-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${(massGenerationState.total > 0 ? massGenerationState.completed / massGenerationState.total : 0) * 100}%` }}></div>
              </div>
            </div>
          )}
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">GHE</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Cargo(s)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Setor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Funcionários</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Ação</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {ghes.map((ghe) => {
                  const status = generationStatus[ghe.id] || 'idle';
                  const isMassGenerating = !!massGenerationState?.active;
                  
                  return (
                    <tr key={ghe.id} className="hover:bg-slate-50 transition duration-150">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{ghe.ghe}</td>
                      <td className="px-6 py-4 whitespace-normal text-slate-600">{ghe.cargos.join(', ')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">{ghe.setor}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-slate-600">{ghe.funcionarios}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {status === 'loading' && (
                          <div className="flex items-center text-slate-500 text-sm">
                            <LoadingSpinner />
                            <span className="ml-2">Gerando...</span>
                          </div>
                        )}
                         {status === 'idle' && (
                          <button
                            onClick={() => handleActionClick(ghe)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-3 rounded-md text-sm transition duration-300 disabled:bg-slate-400 disabled:cursor-not-allowed"
                            disabled={isMassGenerating}
                          >
                            Gerar Formulário
                          </button>
                        )}
                         {status === 'success' && (
                          <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleActionClick(ghe)}
                                className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-1 px-3 rounded-md text-sm transition duration-300"
                              >
                                Visualizar Relatório
                              </button>
                              <button
                                  onClick={(e) => { e.stopPropagation(); handleCopyToWord(ghe.id); }}
                                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-1 px-3 rounded-md text-sm transition duration-300 disabled:bg-slate-400"
                                  disabled={!!copyStatus[ghe.id]}
                                >
                                  {copyStatus[ghe.id] || 'Copiar para Word'}
                                </button>
                          </div>
                        )}
                        {status === 'error' && (
                          <button
                            onClick={() => handleActionClick(ghe)}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-md text-sm transition duration-300 disabled:bg-slate-400 disabled:cursor-not-allowed"
                             disabled={isMassGenerating}
                          >
                            Tentar Novamente
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {isModalOpen && selectedGheDetails && (
          <RiskAssessmentForm 
            initialDetails={selectedGheDetails}
            onClose={() => setIsModalOpen(false)}
          />
      )}
      
      {isMassGenerationCompleteModalOpen && (
        <MassGenerationCompleteModal
          onClose={() => setIsMassGenerationCompleteModalOpen(false)}
          onCopyAll={handleCopyAllToWord}
        />
      )}
    </>
  );
}

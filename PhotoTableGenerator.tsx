import React, { useState, useCallback, ChangeEvent, useRef } from 'react';
import { PhotoInfo, GroupedPhotos } from './types';

// --- SVG Icons ---
const FolderOpenIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
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

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const MoveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);

const MenuIcon = ({ isOpen }: { isOpen: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        )}
    </svg>
);


// --- Helper Functions ---

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};

const getImageDimensions = (url: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = (error) => reject(error);
        img.src = url;
    });
};

const titleCaseName = (name: string): string => {
    if (!name || name === '?') return name;
    const exceptions = ['de', 'da', 'do', 'dos', 'das', 'e'];
    return name
        .toLowerCase()
        .split(' ')
        .map((word, index) => {
            if (index > 0 && exceptions.includes(word)) {
                return word;
            }
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
};

const parsePathForPhoto = (path: string): { ghe: string; description: string } => {
    let ghe = '?';
    let tipoMedicao = '?';
    let nomeParadigma = '?';

    const pathParts = path.split('/');
    const gheIndex = pathParts.findIndex(part => /GHE/i.test(part));

    if (gheIndex !== -1) {
        ghe = pathParts[gheIndex].replace(/GHE\s*-?\s*/i, '').trim() || '?';

        if (gheIndex > 0) {
            const medicaoPart = pathParts[gheIndex - 1];
            tipoMedicao = medicaoPart.replace(/^\d+\.\s*/, '').trim() || '?';
        }

        if (gheIndex < pathParts.length - 2) { 
            const paradigmPart = pathParts[gheIndex + 1];
            const details = paradigmPart.split(/\s*-\s*/);
            
            if (details.length > 0) {
                nomeParadigma = details[0].trim() || '?';
                nomeParadigma = titleCaseName(nomeParadigma);
            }
        }
    }

    const description = `GHE: ${ghe}, ${tipoMedicao}, ${nomeParadigma}`;
    const gheForGrouping = ghe !== '?' ? ghe : 'Sem GHE';
    
    return { ghe: gheForGrouping, description };
};


const generateTableForWord = (photos: PhotoInfo[]): string => {
    let tableRows = '';
    const imageWidthPt = 150; 

    for (let i = 0; i < photos.length; i += 3) {
        tableRows += '<tr>';
        for (let j = 0; j < 3; j++) {
            const photo = photos[i + j];
            if (photo) {
                tableRows += `
                    <td style="padding:8px; vertical-align:top;" align="center">
                        <p align="center" style="text-align:center; margin:0;">
                            <img src="${photo.imageUrl}" width="${imageWidthPt}" style="width:${imageWidthPt}pt; height:auto;">
                        </p>
                        <p align="center" style="font-size:9pt; font-family:Calibri, sans-serif; text-align:center; margin:0; margin-top:4pt;">
                            ${photo.description}
                        </p>
                    </td>
                `;
            } else {
                tableRows += `<td style="padding:8px;"></td>`;
            }
        }
        tableRows += '</tr>';
    }
    return `<table style="border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;"><tbody>${tableRows}</tbody></table>`;
};

const formatPhotosForWord = (groupedPhotos: GroupedPhotos): string => {
    let htmlContent = '';
    const sortedGHEs = Object.keys(groupedPhotos).sort((a, b) => a.localeCompare(b));

    for (const ghe of sortedGHEs) {
        let photos = groupedPhotos[ghe];
        if (photos.length === 0) continue;

        // Sort by orientation for Word output as well
        photos = [...photos].sort((a, b) => {
            const orientationOrder = { landscape: 0, square: 0, portrait: 1 };
            return orientationOrder[a.orientation] - orientationOrder[b.orientation];
        });
        
        htmlContent += generateTableForWord(photos);
        htmlContent += `<p style="margin-bottom:12pt;">&nbsp;</p>`;
    }

    return `
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="UTF-8">
        <style> body { font-family: Calibri, sans-serif; font-size: 11pt; } p { margin: 0; } </style>
        </head>
        <body>${htmlContent}</body>
        </html>
    `;
};

const formatSingleGheForWord = (photos: PhotoInfo[]): string => {
    if (photos.length === 0) return '';
    
    // Sort by orientation for Word output as well
    const sortedPhotos = [...photos].sort((a, b) => {
        const orientationOrder = { landscape: 0, square: 0, portrait: 1 };
        return orientationOrder[a.orientation] - orientationOrder[b.orientation];
    });

    let htmlContent = generateTableForWord(sortedPhotos);
    htmlContent += `<p style="margin-bottom:12pt;">&nbsp;</p>`;
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="UTF-8">
        <style> body { font-family: Calibri, sans-serif; font-size: 11pt; } p { margin: 0; } </style>
        </head>
        <body>${htmlContent}</body>
        </html>
    `;
};

export const PhotoTableGenerator = () => {
    const [groupedPhotos, setGroupedPhotos] = useState<GroupedPhotos>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copyStatus, setCopyStatus] = useState('');
    const [gheCopyStatus, setGheCopyStatus] = useState<Record<string, string>>({});
    const [processedFiles, setProcessedFiles] = useState(0);
    const [totalFiles, setTotalFiles] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [draggedPhoto, setDraggedPhoto] = useState<{ ghe: string; fileName: string; orientation: string; } | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const handleDeletePhoto = useCallback((gheKey: string, fileName: string) => {
        setGroupedPhotos(currentPhotos => {
            const newGroupedPhotos = JSON.parse(JSON.stringify(currentPhotos));
            const photosInGhe = newGroupedPhotos[gheKey];
            if (!photosInGhe) return currentPhotos;
            newGroupedPhotos[gheKey] = photosInGhe.filter((photo: PhotoInfo) => photo.fileName !== fileName);
            if (newGroupedPhotos[gheKey].length === 0) {
                delete newGroupedPhotos[gheKey];
            }
            return newGroupedPhotos;
        });
    }, []);

    const handleFolderSelect = async (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setGroupedPhotos({});
        setError(null);
        setCopyStatus('');
        setGheCopyStatus({});
        setIsLoading(true);
        setTotalFiles(files.length);
        setProcessedFiles(0);

        try {
            const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
            setTotalFiles(imageFiles.length);
            const allPhotos: { ghe: string; photoInfo: PhotoInfo }[] = [];

            for (const file of imageFiles) {
                // @ts-ignore
                const path = file.webkitRelativePath || file.name;
                const { ghe, description } = parsePathForPhoto(path);
                const imageUrl = await fileToDataUrl(file);

                const { width, height } = await getImageDimensions(imageUrl);
                let orientation: PhotoInfo['orientation'] = 'landscape';
                if (height > width) {
                    orientation = 'portrait';
                } else if (width === height) {
                    orientation = 'square';
                }
                
                allPhotos.push({
                    ghe,
                    photoInfo: { imageUrl, description, fileName: file.name, orientation }
                });
                setProcessedFiles(prev => prev + 1);
            }

            const grouped: GroupedPhotos = allPhotos.reduce((acc, { ghe, photoInfo }) => {
                if (!acc[ghe]) acc[ghe] = [];
                acc[ghe].push(photoInfo);
                return acc;
            }, {} as GroupedPhotos);

            setGroupedPhotos(grouped);

        } catch (err: any) {
            console.error("Error processing photos:", err);
            setError("Ocorreu um erro ao processar as imagens.");
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };
    
    const handleCopyAllToWord = async () => {
        if (Object.keys(groupedPhotos).length === 0) return;
        setCopyStatus('Copiando...');
        const html = formatPhotosForWord(groupedPhotos);
        try {
            const blob = new Blob([html], { type: 'text/html' });
            await navigator.clipboard.write([new ClipboardItem({ 'text/html': blob })]);
            setCopyStatus('Copiado com sucesso!');
        } catch (err) {
            console.error('Failed to copy photo table HTML: ', err);
            setCopyStatus('Falha ao copiar.');
        } finally {
            setTimeout(() => setCopyStatus(''), 3000);
        }
    };

    const handleCopyGhe = async (ghe: string, photos: PhotoInfo[]) => {
        setGheCopyStatus(prev => ({ ...prev, [ghe]: 'Copiando...' }));
        const html = formatSingleGheForWord(photos);
        try {
            const blob = new Blob([html], { type: 'text/html' });
            await navigator.clipboard.write([new ClipboardItem({ 'text/html': blob })]);
            setGheCopyStatus(prev => ({ ...prev, [ghe]: 'Copiado!' }));
        } catch (err) {
            console.error(`Failed to copy GHE ${ghe} HTML: `, err);
            setGheCopyStatus(prev => ({ ...prev, [ghe]: 'Falha!' }));
        } finally {
            setTimeout(() => setGheCopyStatus(prev => ({ ...prev, [ghe]: '' })), 3000);
        }
    };

    const handleDragStart = (e: React.DragEvent, ghe: string, photo: PhotoInfo) => {
        e.dataTransfer.effectAllowed = 'move';
        setDraggedPhoto({ ghe, fileName: photo.fileName, orientation: photo.orientation });
    };

    const handleDragOver = (e: React.DragEvent) => e.preventDefault();

    const handleDrop = (targetGhe: string, targetPhoto: PhotoInfo) => {
        if (!draggedPhoto || 
            draggedPhoto.ghe !== targetGhe || 
            (draggedPhoto.orientation !== targetPhoto.orientation) ||
            (draggedPhoto.fileName === targetPhoto.fileName)) {
            setDraggedPhoto(null);
            return;
        }

        setGroupedPhotos(currentPhotos => {
            const newGroupedPhotos = { ...currentPhotos };
            const photosInGhe = [...newGroupedPhotos[targetGhe]];
            const draggedIndex = photosInGhe.findIndex(p => p.fileName === draggedPhoto.fileName);
            const targetIndex = photosInGhe.findIndex(p => p.fileName === targetPhoto.fileName);
            if (draggedIndex === -1 || targetIndex === -1) return currentPhotos;
            const [removed] = photosInGhe.splice(draggedIndex, 1);
            photosInGhe.splice(targetIndex, 0, removed);
            newGroupedPhotos[targetGhe] = photosInGhe;
            return newGroupedPhotos;
        });
        setDraggedPhoto(null);
    };

    const sortedGhes = Object.keys(groupedPhotos).sort((a, b) => a.localeCompare(b));
    const slugify = (text: string) => text.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');

    const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, ghe: string) => {
        e.preventDefault();
        const targetId = `ghe-section-${slugify(ghe)}`;
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    };

    const PhotoItem = ({ ghe, photo }: { ghe: string; photo: PhotoInfo; }) => (
        <div 
            key={photo.fileName} 
            className="relative border border-slate-200 rounded-lg p-2 flex flex-col items-center shadow-sm group cursor-move"
            draggable="true"
            onDragStart={(e) => handleDragStart(e, ghe, photo)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(ghe, photo)}
            onDragEnd={() => setDraggedPhoto(null)}
            style={{ opacity: draggedPhoto?.fileName === photo.fileName ? 0.4 : 1 }}
        >
            <div className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/70 backdrop-blur-sm rounded-full p-1">
                <button onClick={() => handleDeletePhoto(ghe, photo.fileName)} className="p-1.5 rounded-full hover:bg-red-100 text-slate-600 hover:text-red-600 transition-colors" aria-label="Excluir foto"><TrashIcon /></button>
                <div className="p-1.5 text-slate-600" aria-hidden="true"><MoveIcon /></div>
            </div>
            <div className="w-full h-48 bg-slate-50 rounded-md mb-2 flex items-center justify-center overflow-hidden">
                <img src={photo.imageUrl} alt={photo.fileName} className="max-w-full max-h-full object-contain" />
            </div>
            <p className="text-xs text-slate-700 text-center bg-slate-50 w-full p-1 rounded">{photo.description}</p>
        </div>
    );

    return (
        <div className="relative">
             {sortedGhes.length > 0 && (
                <aside className={`fixed top-24 left-4 bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-xl border border-slate-200 w-56 max-h-[calc(100vh-8rem)] z-40 flex flex-col transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <h3 className="text-base font-semibold text-slate-700 mb-3 border-b pb-2 flex-shrink-0">Navegação Rápida</h3>
                    <ul className="overflow-y-auto flex-grow pr-2 space-y-1">
                        {sortedGhes.map(ghe => (
                            <li key={ghe}>
                                <a 
                                    href={`#ghe-section-${slugify(ghe)}`}
                                    onClick={(e) => handleNavClick(e, ghe)}
                                    className="block text-sm text-slate-600 hover:text-sky-700 hover:bg-slate-100 p-2 rounded-md transition-colors duration-200"
                                >
                                    {ghe}
                                </a>
                            </li>
                        ))}
                    </ul>
                </aside>
            )}

            <div className={`transition-all duration-300 ease-in-out ${isSidebarOpen && sortedGhes.length > 0 ? 'lg:pl-64' : 'lg:pl-4'}`}>
                 {sortedGhes.length > 0 && (
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="fixed top-24 left-4 z-50 bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-lg border border-slate-200 text-slate-600 hover:text-sky-700 hover:bg-slate-100 transition-all duration-300"
                        style={{ transform: isSidebarOpen ? 'translateX(14.5rem)' : 'translateX(0)' }}
                        aria-label={isSidebarOpen ? "Fechar navegação" : "Abrir navegação"}
                    >
                        <MenuIcon isOpen={isSidebarOpen} />
                    </button>
                )}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                        <h2 className="text-xl font-semibold text-slate-700">Criar Tabela de Fotos por Pasta</h2>
                        <div className="flex items-center gap-4">
                            <label className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg cursor-pointer inline-flex items-center transition duration-300">
                                <FolderOpenIcon />
                                <span>Selecionar Pasta</span>
                                <input type="file" className="hidden" {...{ webkitdirectory: "true", directory: "true" }} multiple onChange={handleFolderSelect} disabled={isLoading} ref={fileInputRef} />
                            </label>
                            <button onClick={handleCopyAllToWord} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg inline-flex items-center transition duration-300 disabled:bg-slate-400" disabled={isLoading || sortedGhes.length === 0 || !!copyStatus}>
                               <CopyIcon /> {copyStatus || 'Copiar Tudo'}
                            </button>
                        </div>
                    </div>

                    {isLoading && (
                        <div className="my-4 p-4 border rounded-lg bg-slate-50">
                            <div className="flex justify-between items-center mb-1">
                                <p className="text-sm font-medium text-slate-700 flex items-center"><LoadingSpinner /> <span className="ml-2">Processando imagens...</span></p>
                                <p className="text-sm font-semibold text-sky-700">{processedFiles} de {totalFiles} imagens lidas</p>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2.5"><div className="bg-sky-600 h-2.5 rounded-full transition-all duration-200" style={{ width: `${(totalFiles > 0 ? processedFiles / totalFiles : 0) * 100}%` }}></div></div>
                        </div>
                    )}

                     {error && (
                      <div className="mt-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg" role="alert">
                        <strong className="font-bold">Erro: </strong>
                        <span className="block sm:inline">{error}</span>
                      </div>
                    )}

                    {!isLoading && sortedGhes.length > 0 && (
                        <div className="mt-8">
                            <h3 className="text-xl font-semibold text-slate-700 mb-4">Pré-visualização</h3>
                            {sortedGhes.map((ghe) => {
                                const photos = groupedPhotos[ghe];
                                const currentGheCopyStatus = gheCopyStatus[ghe] || '';

                                const landscapePhotos = photos.filter(p => p.orientation === 'landscape' || p.orientation === 'square');
                                const portraitPhotos = photos.filter(p => p.orientation === 'portrait');
                                
                                return (
                                    <div key={ghe} id={`ghe-section-${slugify(ghe)}`} className="mb-8 scroll-mt-24">
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-center p-3 bg-slate-100 rounded-t-md border border-b-0 border-slate-200 gap-2">
                                            <h4 className="text-lg font-bold text-slate-800">{ghe}</h4>
                                            <button onClick={() => handleCopyGhe(ghe, photos)} className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg inline-flex items-center transition duration-300 text-sm disabled:bg-slate-400" disabled={isLoading || !!currentGheCopyStatus}>
                                                <CopyIcon /> {currentGheCopyStatus || 'Copiar GHE'}
                                            </button>
                                        </div>
                                        <div className="border-b border-x border-slate-200 rounded-b-md">
                                            {landscapePhotos.length > 0 && (
                                                <div className="p-4">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                                        {landscapePhotos.map(photo => <PhotoItem key={photo.fileName} ghe={ghe} photo={photo} />)}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {landscapePhotos.length > 0 && portraitPhotos.length > 0 && (
                                                <hr className="mx-4 border-slate-200" />
                                            )}

                                            {portraitPhotos.length > 0 && (
                                                <div className="p-4">
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                                        {portraitPhotos.map(photo => <PhotoItem key={photo.fileName} ghe={ghe} photo={photo} />)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {!isLoading && sortedGhes.length === 0 && !error && (
                        <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-lg mt-8">
                            <p className="text-slate-500">Selecione uma pasta para começar.</p>
                            <p className="text-sm text-slate-400 mt-2">As fotos serão agrupadas por GHE com base na estrutura da pasta.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
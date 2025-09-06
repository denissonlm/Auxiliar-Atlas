export interface GheSummary {
  id: string;
  ghe: string;
  cargos: string[];
  setor: string;
  funcionarios: number;
}

export interface Risk {
  fatorRisco: string;
  tipoRisco: string;
  categoria: string;
  nAmostrado: string;
}

export interface GheDetails {
  ghe: string;
  cargos: string;
  setor: string;
  numColaboradores: string;
  jornadaTrabalho: string;
  descricaoLocal: string;
  descricaoAtividade: string;
  riscos: Risk[];
}

// Reverted types for the Photo Table Generator feature to a stable version
export interface PhotoInfo {
  imageUrl: string;
  description: string;
  fileName: string;
  orientation: 'landscape' | 'portrait' | 'square';
}

export type GroupedPhotos = Record<string, PhotoInfo[]>;
import { GoogleGenAI, Type } from "@google/genai";
import { GheSummary, GheDetails } from '../types';

const extractGheSummaries = async (pdfBase64: string): Promise<GheSummary[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API key for Gemini is not configured.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Analise o documento PGR (Programa de Gerenciamento de Riscos) fornecido.
    Sua tarefa é extrair uma lista de todos os Grupos Homogêneos de Exposição (GHEs) mencionados.
    Para cada GHE, extraia as seguintes informações: o código do GHE, o(s) cargo(s) associado(s), o setor e o número total de funcionários.
    Preste atenção especial às tabelas de resumo e às páginas de detalhes de cada GHE.
    Retorne os dados como um array de objetos JSON.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
        { text: prompt },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            ghe: { type: Type.STRING, description: "Código do GHE, ex: '01 01.01'" },
            cargos: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista de cargos dentro do GHE" },
            setor: { type: Type.STRING, description: "Setor associado ao GHE" },
            funcionarios: { type: Type.INTEGER, description: "Número total de funcionários no GHE" },
          },
        },
      },
    },
  });

  const text = response.text.trim();
  try {
    const parsed = JSON.parse(text);
    return parsed.map((item: any, index: number) => ({ ...item, id: `${item.ghe}-${index}` }));
  } catch (e) {
    console.error("Failed to parse Gemini JSON response for summaries:", text);
    throw new Error("Não foi possível processar a resposta do serviço de IA.");
  }
};

const extractGheDetails = async (pdfBase64: string, gheCode: string): Promise<GheDetails> => {
    if (!process.env.API_KEY) {
        throw new Error("API key for Gemini is not configured.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
        Analise o documento PGR fornecido, focando especificamente na seção do GHE: "${gheCode}".
        Extraia as informações detalhadas de análise de risco para este GHE.
        Preencha os seguintes campos: 'GHE', 'CARGOS', 'SETOR', 'Nº de colaboradores no GHE', 'Jornada de Trabalho', 'Descrição do local', 'Descrição da atividade'.
        Para a tabela de identificação de riscos, você DEVE retornar a seguinte lista EXATA de riscos, sem adicionar, remover ou modificar nenhuma linha. Os campos 'categoria' e 'nAmostrado' devem ser sempre 'N.A.':
        - { "fatorRisco": "Ruído", "tipoRisco": "Físico", "categoria": "N.A.", "nAmostrado": "N.A." }
        - { "fatorRisco": "Vibração", "tipoRisco": "Físico", "categoria": "N.A.", "nAmostrado": "N.A." }
        - { "fatorRisco": "Calor", "tipoRisco": "Físico", "categoria": "N.A.", "nAmostrado": "N.A." }
        - { "fatorRisco": "Óleo Mineral", "tipoRisco": "Químico", "categoria": "N.A.", "nAmostrado": "N.A." }
        - { "fatorRisco": "Poeira Total", "tipoRisco": "Químico", "categoria": "N.A.", "nAmostrado": "N.A." }
        - { "fatorRisco": "Poeira Respirável", "tipoRisco": "Químico", "categoria": "N.A.", "nAmostrado": "N.A." }
        - { "fatorRisco": "Vírus, bactérias e protozoários", "tipoRisco": "Biológicos", "categoria": "N.A.", "nAmostrado": "N.A." }
        Ignore quaisquer outros riscos mencionados no documento e use apenas esta lista predefinida para a propriedade 'riscos'.
        Retorne os dados como um único objeto JSON.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
                { text: prompt },
            ],
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    ghe: { type: Type.STRING },
                    cargos: { type: Type.STRING },
                    setor: { type: Type.STRING },
                    numColaboradores: { type: Type.STRING },
                    jornadaTrabalho: { type: Type.STRING, description: "Se não encontrar, retorne '8 horas'" },
                    descricaoLocal: { type: Type.STRING },
                    descricaoAtividade: { type: Type.STRING },
                    riscos: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                fatorRisco: { type: Type.STRING },
                                tipoRisco: { type: Type.STRING },
                                categoria: { type: Type.STRING, default: 'N.A.' },
                                nAmostrado: { type: Type.STRING, default: 'N.A.' },
                            },
                        },
                    },
                },
            },
        },
    });
    
    const text = response.text.trim();
    try {
        const parsedData = JSON.parse(text);
        
        const cleanDashes = (str: string | undefined): string => {
            if (!str) return '';
            // Replaces hyphens and en-dashes (potentially surrounded by spaces) with a single space, then trims.
            return str.replace(/\s*[-–]\s*/g, ' ').trim();
        };

        // Clean GHE code to remove prefixes and dashes
        if (parsedData.ghe) {
            // First, remove prefixes like "GHE -"
            const gheWithoutPrefix = parsedData.ghe.replace(/GHE\s*-?\s*/i, '').trim();
            // Then, clean up any remaining dashes
            parsedData.ghe = cleanDashes(gheWithoutPrefix);
        }

        // Clean dashes from other text fields
        parsedData.cargos = cleanDashes(parsedData.cargos);
        parsedData.setor = cleanDashes(parsedData.setor);
        parsedData.numColaboradores = cleanDashes(parsedData.numColaboradores);
        parsedData.jornadaTrabalho = cleanDashes(parsedData.jornadaTrabalho);
        parsedData.descricaoLocal = cleanDashes(parsedData.descricaoLocal);
        parsedData.descricaoAtividade = cleanDashes(parsedData.descricaoAtividade);

        // Ensure fatorRisco is empty string if it's null or has a placeholder like ' '
        parsedData.riscos = parsedData.riscos.map((risk: any) => ({
            ...risk,
            fatorRisco: risk.fatorRisco?.trim() ? risk.fatorRisco : ''
        }));
        return parsedData;
    } catch (e) {
        console.error("Failed to parse Gemini JSON response for details:", text);
        throw new Error("Não foi possível processar os detalhes do GHE.");
    }
};


export const geminiService = {
  extractGheSummaries,
  extractGheDetails,
};
import { GoogleGenAI } from '@google/genai';

/**
 * Modelos para o Copilot (Chat CFO, Briefing Executivo, Receitas IA, Metas ROI, Campanhas e Nota Fiscal):
 * Usa o Gemini 3.6 Flash (modelo Flash completo com raciocínio avançado, estável e rápido no Free Tier)
 * como titular, com failover automático para Gemini 3.8 Flash e Flash-Lite.
 */
export const COPILOT_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
];

/**
 * Modelos rápidos de alto throughput para auditoria em lote dos 30 insumos nos mercados.
 */
export const FAST_BATCH_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
];

export const FREE_TIER_MODELS = COPILOT_MODELS;

let cachedClient = null;
let cachedKey = null;

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 10);
}

export function getGeminiClient() {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada no servidor.');
  }
  if (!cachedClient || cachedKey !== apiKey) {
    cachedClient = new GoogleGenAI({ apiKey });
    cachedKey = apiKey;
  }
  return cachedClient;
}

function extractOutputText(interaction) {
  if (interaction?.output_text) return String(interaction.output_text);
  const steps = Array.isArray(interaction?.steps) ? interaction.steps : [];
  for (let i = steps.length - 1; i >= 0; i -= 1) {
    const step = steps[i];
    if (step?.type === 'model_output' && Array.isArray(step.content)) {
      const txt = step.content
        .filter((c) => c?.type === 'text' && typeof c.text === 'string')
        .map((c) => c.text)
        .join('');
      if (txt) return txt;
    }
  }
  return '';
}

function parseJsonSafely(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) throw new Error('Resposta vazia da IA.');
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) return JSON.parse(fenced[1].trim());
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error('IA retornou texto fora do formato JSON esperado.');
  }
}

/**
 * Executa uma interação no Gemini com fallback automático entre modelos Free Tier.
 */
export async function runGeminiInteraction({
  input,
  systemInstruction,
  schema = null,
  models = FREE_TIER_MODELS,
  temperature = 0.25,
  thinkingLevel = null,
}) {
  const client = getGeminiClient();
  const errors = [];

  for (const model of models) {
    try {
      const genConfig = { temperature };
      if (thinkingLevel && !model.startsWith('gemma-')) {
        genConfig.thinking_level = thinkingLevel;
      }
      const params = {
        model,
        input,
        store: false,
        generation_config: genConfig,
      };
      if (systemInstruction) {
        params.system_instruction = systemInstruction;
      }
      if (schema) {
        // Gemma não suporta todos os response_format avançados em alguns cenários;
        // usamos response_format estruturado para família Gemini e instrução JSON para Gemma.
        if (!model.startsWith('gemma-')) {
          params.response_format = {
            type: 'text',
            mime_type: 'application/json',
            schema,
          };
        } else if (typeof params.input === 'string') {
          params.input = `${params.input}\n\nResponda APENAS com um JSON válido seguindo o schema solicitado, sem markdown.`;
        }
      }

      const interaction = await client.interactions.create(params, {
        retries: { strategy: 'none' },
        timeout_ms: 28000,
      });
      const outputText = extractOutputText(interaction);
      if (!outputText) {
        throw new Error(`Modelo ${model} retornou resposta vazia.`);
      }

      return {
        model,
        text: outputText,
        json: schema ? parseJsonSafely(outputText) : null,
        usage: interaction?.usage || null,
      };
    } catch (err) {
      const msg = String(err?.message || err);
      console.error(`[gemini-client] Falha no modelo ${model}:`, msg.slice(0, 260));
      errors.push(`${model}: ${msg.slice(0, 140)}`);
      // Se for erro de autenticação (401/403), não adianta testar outros modelos
      if (err?.status === 401 || err?.status === 403) {
        throw new Error(`Chave Gemini rejeitada (${err.status}): verifique GEMINI_API_KEY.`);
      }
    }
  }

  throw new Error(`Todos os modelos Gemini falharam temporariamente. Detalhes: ${errors.join(' | ')}`);
}

export async function generateStructuredJson({
  prompt,
  systemInstruction,
  schema,
  imageBase64 = null,
  imageMimeType = 'image/jpeg',
  temperature = 0.2,
  tier = 'copilot',
}) {
  const input = imageBase64
    ? [
        { type: 'text', text: prompt },
        { type: 'image', data: imageBase64, mime_type: imageMimeType },
      ]
    : prompt;

  const models = tier === 'fast' ? FAST_BATCH_MODELS : COPILOT_MODELS;
  const thinkingLevel = tier === 'fast' ? null : 'low';

  return runGeminiInteraction({
    input,
    systemInstruction,
    schema,
    models,
    temperature,
    thinkingLevel,
  });
}

export async function generateTextResponse({
  prompt,
  systemInstruction,
  temperature = 0.45,
}) {
  return runGeminiInteraction({
    input: prompt,
    systemInstruction,
    schema: null,
    models: COPILOT_MODELS,
    temperature,
    thinkingLevel: 'low',
  });
}

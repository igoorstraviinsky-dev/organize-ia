import OpenAI from 'openai';
import FormData from 'form-data';

/**
 * Contexto do domínio para o Whisper melhorar a precisão de transcrição
 */
const WHISPER_PROMPT =
  'Sistema de gerenciamento de tarefas em português. ' +
  'Comandos frequentes: criar tarefa, editar tarefa, deletar tarefa, atribuir tarefa, ' +
  'listar tarefas pendentes, concluídas, atrasadas, para hoje, ' +
  'adicionar membro ao projeto, remover membro, enviar mensagem, ' +
  'marcar como concluída, cancelada, em progresso, alta prioridade, baixa prioridade.';

/**
 * Mapeia MIME type para extensão aceita pelo Whisper.
 * Whisper aceita: mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg
 */
function mimeToExtension(mimeType?: string | null): string {
  if (!mimeType) return 'ogg';
  if (mimeType.includes('ogg'))  return 'ogg';
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('m4a'))  return 'm4a';
  if (mimeType.includes('mp4'))  return 'mp4';
  if (mimeType.includes('wav'))  return 'wav';
  if (mimeType.includes('mpeg') || mimeType.includes('mpga')) return 'mp3';
  return 'ogg'; // fallback seguro para WhatsApp PTT
}

/**
 * Transcreve um áudio em base64 usando OpenAI Whisper.
 */
export async function transcribeAudioBase64(
  apiKey: string,
  base64: string,
  mimeType?: string | null
): Promise<string | null> {
  if (!apiKey) throw new Error('OpenAI API Key não configurada.');

  try {
    const buffer = Buffer.from(base64, 'base64');
    const extension = mimeToExtension(mimeType);
    const filename = `audio.${extension}`;

    const form = new FormData();
    form.append('file', buffer, { filename, contentType: mimeType || 'audio/ogg' });
    form.append('model', 'whisper-1');
    form.append('language', 'pt');
    form.append('prompt', WHISPER_PROMPT);

    const formBuffer = form.getBuffer();
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...form.getHeaders(),
      },
      body: formBuffer as any,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('[Whisper] Erro:', err);
      return null;
    }

    const result = await response.json() as { text: string };
    return result.text?.trim() || null;
  } catch (err) {
    console.error('[Whisper] Crash:', err);
    return null;
  }
}

/**
 * Simple XOR-based obfuscation for API keys.
 * This is not "military-grade" encryption, but it prevents 
 * keys from being easily discovered via plain-text string 
 * searches in the application binary.
 */

const SECRET = 'taskflow-ai-architect-2026';

export function encrypt(text: string): string {
  if (!text) return '';
  const result = [];
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ SECRET.charCodeAt(i % SECRET.length);
    result.push(String.fromCharCode(charCode));
  }
  return btoa(result.join(''));
}

export function decrypt(encoded: string): string {
  if (!encoded) return '';
  try {
    const text = atob(encoded);
    const result = [];
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ SECRET.charCodeAt(i % SECRET.length);
      result.push(String.fromCharCode(charCode));
    }
    return result.join('');
  } catch (e) {
    return '';
  }
}

export type Limit = { kind: string; percentUsed: number; resetsAt?: string }
export type ModelTokens = Record<string, number>
export type AltAjan = { ad: string; durum: string; cikti_kb: number; kod_dosyasi: number; token: string | null; sure_sn: number; guncelleme: string }

declare module 'claude-code' {
  interface PluginState {
    'limit-bar': { limits: Shaped<Limit[]>; byModel: Shaped<ModelTokens>; costUsd: number; isHidden: boolean; altAjan: AltAjan | null }
  }
}

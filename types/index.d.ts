export type Limit = { kind: string; percentUsed: number; resetsAt?: string }
export type ModelTokens = Record<string, number>

declare module 'claude-code' {
  interface PluginState {
    'limit-bar': { limits: Shaped<Limit[]>; byModel: Shaped<ModelTokens>; costUsd: number; isHidden: boolean }
  }
}

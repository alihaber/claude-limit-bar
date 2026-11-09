import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { AltAjan, Limit, ModelTokens } from '../types'

// Alt ajan (Codex vb.) durumu: kullanıcının `altAjanDosyasi` ayarında verdiği JSON dosyasını bant 3 sn'de bir okur
// (biçim README'de). Ayar boşsa alt ajan satırı hiç çizilmez. Dosya yolu koda gömülmez.
const altAjan = atom({ plugin: 'limit-bar', key: 'altAjan' } as const, null as AltAjan | null)
const ALT_ADLAR: Record<string, string> = { calisiyor: 'çalışıyor', 'kod yaziyor': 'kod yazıyor', takildi: 'TAKILDI', bitti: 'bitti', 'surec yok': 'süreç yok' }
function altRenk(d: string): string {
  if (d === 'takildi' || d === 'surec yok') return 'error'
  if (d === 'kod yaziyor') return 'success'
  return d === 'bitti' ? 'subtle' : 'warning'
}

const limits = atom({ plugin: 'limit-bar', key: 'limits' } as const, [] as Limit[], { shape: 'limits-1' })
const byModel = atom({ plugin: 'limit-bar', key: 'byModel' } as const, {} as ModelTokens, { shape: 'models-1' })
const costUsd = atom({ plugin: 'limit-bar', key: 'costUsd' } as const, 0)
const isHidden = atom({ plugin: 'limit-bar', key: 'isHidden' } as const, false)

const HOUR = 3600_000
const WINDOW: Record<string, { label: string; ms: number }> = {
  five_hour: { label: '5 saat', ms: 5 * HOUR },
  seven_day: { label: 'Hafta ', ms: 7 * 24 * HOUR },
}
const DAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']

function shortModel(id: string): string {
  for (const name of ['opus', 'sonnet', 'haiku', 'fable']) {
    if (id.toLowerCase().includes(name)) return name.charAt(0).toUpperCase() + name.slice(1)
  }
  return id
}

function fmtTokens(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`
  return String(n)
}

function fmtTime(ms: number, now: number): string {
  const d = new Date(ms)
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return new Date(now).toDateString() === d.toDateString() ? hm : `${DAYS[d.getDay()]} ${hm}`
}

function bar(p: number): string {
  const full = Math.max(0, Math.min(10, Math.round(p / 10)))
  return '█'.repeat(full) + '░'.repeat(10 - full)
}

// Bu hızla giderse limit ne zaman dolar? Pencere sıfırlanmadan dolmuyorsa null.
function projectEnd(l: Limit, windowMs: number, now: number): number | null {
  if (!l.resetsAt || l.percentUsed <= 0) return null
  const reset = Date.parse(l.resetsAt)
  if (!Number.isFinite(reset)) return null
  const elapsed = now - (reset - windowMs)
  if (elapsed < windowMs * 0.02) return null
  const end = now + ((100 - l.percentUsed) * elapsed) / l.percentUsed
  return end < reset ? end : null
}

async function refresh($: EngineInterface) {
  const u = await $.session.usage()
  await update($, limits, () => u.rateLimits.map(r => ({ kind: r.kind, percentUsed: r.percentUsed, resetsAt: r.resetsAt })))
  if (u.cost) await update($, costUsd, () => u.cost!.usd)
}

export const register: Register = (on, options) => {
  let sonAltAjanMetni = ''
  const altAjanDosyasi = String((options as Record<string, unknown> | undefined)?.altAjanDosyasi ?? '').trim()

  on('session.start', async ($, e, next) => {
    // Alt ajan dosyasını 3 sn'de bir oku; yalnız içerik değişince yaz (gereksiz yeniden çizim olmasın).
    if (altAjanDosyasi) {
      $.clock.every(3000, async () => {
        let metin = ''
        try {
          metin = await $.fs.read(altAjanDosyasi)
        } catch {
          metin = ''
        }
        if (metin === sonAltAjanMetni) return
        sonAltAjanMetni = metin
        let d: AltAjan | null = null
        try {
          d = metin ? (JSON.parse(metin) as AltAjan) : null
        } catch {
          d = null
        }
        await update($, altAjan, () => d)
      })
    }
    await $.command.register({ name: 'limitbar', description: 'Limit barını göster/gizle' })
    const r = await next(e)
    await refresh($)
    return r
  })

  on('command.run', { command: 'limitbar' }, async $ => {
    const hidden = await update($, isHidden, h => !h)
    return { text: hidden ? 'Limit barı gizlendi.' : 'Limit barı gösteriliyor.' }
  })

  on('session.measure', async ($, e, next) => {
    await update($, limits, () => e.rateLimits.map(r => ({ kind: r.kind, percentUsed: r.percentUsed, resetsAt: r.resetsAt })))
    return next(e)
  })

  // Ana oturum ve alt ajan turlarının token'larını modele göre topla.
  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    const u = e.usage
    if (u) {
      const total = u.input_tokens + u.output_tokens + u.cache_creation_input_tokens + u.cache_read_input_tokens
      const name = shortModel(u.model)
      await update($, byModel, m => ({ ...m, [name]: (m[name] ?? 0) + total }))
    }
    await refresh($)
    return r
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHidden))) return next(e)

    const { Box, Text, Button } = $.ui.resolve(e)
    const now = await $.clock.now()
    const ls = await read($, limits)
    const models = await read($, byModel)
    const cost = await read($, costUsd)

    const rows = ls
      .filter(l => WINDOW[l.kind] !== undefined)
      .map(l => {
        const w = WINDOW[l.kind]!
        const color = l.percentUsed >= 90 ? 'error' : l.percentUsed >= 70 ? 'warning' : 'success'
        const end = projectEnd(l, w.ms, now)
        const reset = l.resetsAt ? `sıfırlanma ${fmtTime(Date.parse(l.resetsAt), now)}` : ''
        const forecast = end === null ? 'bu hızla yeter' : `bu hızla ${fmtTime(end, now)}'de biter ⚠`
        return (
          <Box key={l.kind}>
            <Text>{w.label} </Text>
            <Text color={color}>{bar(l.percentUsed)} %{l.percentUsed}</Text>
            <Text dimColor> · {reset} · </Text>
            <Text color={end === null ? 'subtle' : 'warning'}>{forecast}</Text>
          </Box>
        )
      })

    // Alt ajan satırı: bitmiş kayıt 10 dk, izleyicisi durmuş çalışan kayıt 2 dk sonra eski sayılır.
    const aa = await read($, altAjan)
    let altSatir = null
    if (aa) {
      const yasSn = (now - Date.parse(aa.guncelleme)) / 1000
      const bitmis = aa.durum === 'bitti' || aa.durum === 'surec yok'
      if (Number.isFinite(yasSn) && !(bitmis && yasSn > 600)) {
        const durdu = !bitmis && yasSn > 120
        const ad = ALT_ADLAR[aa.durum] ?? aa.durum
        altSatir = (
          <Box key="altajan">
            <Text>Alt ajan {aa.ad} </Text>
            <Text color={durdu ? 'warning' : altRenk(aa.durum)}>{durdu ? `${ad} (izleyici durdu)` : ad}</Text>
            <Text dimColor> · {aa.cikti_kb} KB{aa.token ? ` · ${aa.token} token` : ''} · {aa.kod_dosyasi} kod dosyası · {Math.floor(aa.sure_sn / 60)} dk</Text>
          </Box>
        )
      }
    }

    const modelText = Object.entries(models)
      .sort((a, b) => b[1] - a[1])
      .map(([m, t]) => `${m} ${fmtTokens(t)}`)
      .join(' · ')

    return (
      <Box flexDirection="column">
        {rows.length ? rows : <Text dimColor>Limit verisi ilk yanıttan sonra gelecek.</Text>}
        {altSatir}
        <Box>
          <Text dimColor>
            Bu oturum: {modelText || 'henüz token yok'}{cost ? ` · $${cost.toFixed(2)}` : ''}{' '}
          </Text>
          <Button key="hide" label="Gizle" onPress={() => update($, isHidden, () => true)} />
        </Box>
      </Box>
    )
  })
}

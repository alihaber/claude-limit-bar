# limit-bar

Claude Code için bir mod. Mesaj kutusunun hemen üstünde, kullanım limitlerini bir bakışta gösteren küçük bir bant çizer.

![limit-bar, Claude masaüstü uygulamasında mesaj kutusunun üstünde](assets/screenshot.png)

<sub>Claude masaüstü uygulamasında gerçek görünüm. Renkler ve yazı tipi temanıza göre değişir.</sub>

Bantta şunlar var:

- **5 saatlik** ve **haftalık** limitin doluluk yüzdesi (renkli çubukla: %70 altı yeşil, %70–89 sarı, %90 ve üstü kırmızı)
- Her limitin **sıfırlanma** saati
- **Tahmini bitiş**: şimdiki tüketim hızıyla limitin sıfırlanmadan önce dolup dolmayacağı, dolacaksa ne zaman
- Bu oturumda **model başına** harcanan token (Opus, Sonnet, Haiku…) ve varsa oturum maliyeti

- **Alt ajan durumu** (isteğe bağlı, 0.2.0): dışarıda çalışan bir alt ajanın (ör. bir kod yazıcı) durumu, çıktı boyutu ve değiştirdiği dosya sayısı

Limit verisi ilk yanıttan sonra gelir; o zamana kadar bant bunu söyler.

## Alt ajan satırı (isteğe bağlı)

Varsayılan olarak kapalıdır. Açmak için `/config` menüsünde **Alt ajan durum dosyası** alanına bir JSON dosyasının yolunu verin (ayar adı `altAjanDosyasi`). Bant bu dosyayı 3 saniyede bir okur; dosyayı kendi aracınız yazar. Biçim:

```json
{
  "ad": "Codex",
  "durum": "calisiyor",
  "cikti_kb": 120.5,
  "kod_dosyasi": 3,
  "token": null,
  "sure_sn": 540,
  "guncelleme": "2026-11-09T12:00:00+00:00"
}
```

`durum`: `calisiyor`, `kod yaziyor`, `takildi`, `bitti` ya da `surec yok`. `guncelleme` ISO zaman damgasıdır; bitmiş kayıt 10 dakika, çalışan ama güncellenmeyen kayıt 2 dakika sonra eski sayılır (ikincisi "izleyici durdu" yazar). Dosya yoksa ya da ayar boşsa satır hiç görünmez.

## Hikâye

Bu mod bir sohbetin içinde doğdu. Claude ile çalışırken en çok merak ettiğim şey hep aynıydı: 5 saatlik ve haftalık limitin ne kadarını harcadım, ne zaman sıfırlanacak, bu hızla giderse yetecek mi? Cevap için sürekli ayrı bir yere bakmak gerekiyordu ve genellikle limite çarpınca öğreniyordum.

Bir gün doğrudan Claude'a anlattım: bu bilgi tam yazdığım yerde, mesaj kutusunun üstünde dursun. Birlikte bir mod olarak yazdık. Önce basit bir yüzde çubuğuydu; sonra sıfırlanma saati, "bu hızla ne zaman biter" tahmini ve model başına token dökümü eklendi. Sonuç, yazarken göz ucuyla bakılan küçük bir bant oldu.

Amaç sade: limite sürpriz olarak değil, önceden haberle yaklaşmak.

## Kurulum

Bir terminal oturumunun komut satırında:

```
/plugin install limit-bar --marketplace alihaber/claude-limit-bar
```

`Add marketplace?` sorusuna `y` deyin, sonra kapsamı seçin (önerilen: user). Kabuktan:

```bash
claude plugin install limit-bar --marketplace alihaber/claude-limit-bar
```

Masaüstü uygulamasında (`/plugin` orada çalışmaz): komut kutusunun yanındaki **+** → **Plugins** → **Add marketplace** ile `alihaber/claude-limit-bar` ekleyin, ardından **Add plugin**.

## Kullanım

- `/limitbar` bandı gizler ya da yeniden gösterir.
- Bandın sağındaki **Gizle** düğmesi de bandı gizler.

Gizli/açık durumu oturum boyunca korunur.

## Lisans

Apache-2.0. Ayrıntılar için `LICENSE` dosyasına bakın.

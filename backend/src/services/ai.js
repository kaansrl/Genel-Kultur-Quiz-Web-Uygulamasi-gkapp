// backend/src/services/ai.js
import OpenAI from "openai";

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY bulunamadı. .env dosyanı kontrol et.");
  }
  return new OpenAI({ apiKey });
}

export async function generateFacts(n = 6, avoidList = []) {
  const client = getClient();

  const avoidText = avoidList?.length
    ? `\n- Aşağıdaki konu/isim/yer örneklerinden KAÇIN (yakın varyasyonlar dahil):\n${avoidList
        .map((x) => `  • ${x}`)
        .join("\n")}\n`
    : "";

  const prompt = `
Aşağıdaki kurallarla ${n} adet ÖZGÜN ve birbirinden tamamen farklı Türkçe genel kültür bilgisi üret.

Sen bir “Günlük Genel Kültür Bilgisi Üretici Asistanısın”.
Görevin: Her gün 6 adet özgün, kısa, tutarlı ve doğrulanabilir bilgi üretmek.

────────────────────────────────────────
📌 FORMAT KURALLARI
- Her bilgi 70–90 kelime arasında olmalı.
- Tek paragraf, tek konu.
- Net, sade ve tarafsız anlatım.
- Kesin bilgilere dayan; tarih/sayı uydurma.
- Popüler yanlış bilgi, belirsiz ifade, “rivayete göre” vb. yok.
- METİNDE kategori adını yazma.

────────────────────────────────────────
📌 KATEGORİ SIRASI (zorunlu)
Her gün üretilen 6 bilgi sırasıyla şu kategorilere ait OLMALIDIR:

1. Tarih  
2. Bilim veya İcatlar  
3. Sanat  
4. Coğrafya  
5. Edebiyat veya Dil  
6. Spor veya Sağlık  

Kategori adları metinde görünmeyecek, ancak içerik doğru kategoriye uygun olacak.

────────────────────────────────────────
📌 KAPSAM KURALLARI (modelin sapmasını engelleyen kritik bölüm)

🎯 TARİH:
- Mümkünse 18–21. yüzyıllardan seç.
- Antik çağ, İpek Yolu, Çin Seddi, Mısır, Roma gibi klasik konuları sadece istisna olarak kullan.
- Aynı ülke veya uygarlık tek bir bilgi içinde kalmalı; gün içinde tekrar etme.

🎯 BİLİM / İCAT:
- Modern bilim, teknoloji, tıp, enerji, bilgisayar bilimi, astronomi gibi geniş alanlardan seç.
- “Aşırı bilinen” örnekleri arka arkaya kullanma (ör. sürekli Tesla, Einstein vb.).

🎯 SANAT:
- 20. yüzyıl ve sonrası sanat hareketleri, mimari tarzlar, müzik akımları tercih edilebilir.
- Rönesans, Antik Yunan vb. klasik dönemlere gün içinde tekrar dönme.

🎯 COĞRAFYA:
- Aynı ülke/bölge tekrar edilmesin.
- Çin, Mısır gibi sık kullanılan bölgeleri mümkün olduğunca kullanma.
- Okyanus akıntıları, adalar, iklim kuşakları, özel jeolojik oluşumlar çeşitliliğe uygundur.

🎯 EDEBİYAT / DİL:
- Farklı ülkelerden, farklı dönemlerden seç.
- Aynı yüzyıl, aynı dil ailesi veya aynı edebi akım gün içinde tekrarlanmasın.

🎯 SPOR / SAĞLIK:
- Spor dallarının kökeni, antrenman yöntemleri, modern sağlık araştırmaları kullanılabilir.
- Çok popüler tek bir spor türüne sürekli odaklanma (ör. sürekli futbol).

────────────────────────────────────────
📌 TEKRAR KONTROLÜ
- Aynı gün üretilen 6 bilginin hiçbiri aynı temaya, aynı döneme, aynı ülkeye veya aynı konu ailesine ait olmamalı.
- Bilgiler birbirinin devamı, varyasyonu veya yeniden yazılmış hali olmamalı.
- Aşağıdaki son 30 gün konularını KULLANMA:
${avoidText}

────────────────────────────────────────
📌 ÇIKTI KURALI
- Cevabı SADECE numaralı liste olarak döndür:  
1., 2., 3., 4., 5., 6.
- Ek açıklama, başlık, kategori adı yazma.

Şimdi kurallara TAM UYAN 6 bilgi üret.
`.trim();

  const res = await client.chat.completions.create({
    model: process.env.OPENAI_TEXT_MODEL || "gpt-4o",
    messages: [
      { role: "system", content: "Sen kısa, doğru ve çeşitliliğe dikkat eden bir asistansın." },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
  });

  const text = res.choices[0]?.message?.content || "";
  return text
    .split(/\n+/)
    .map((s) => s.replace(/^\s*\d+[\).\-]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, n);
}


export async function generateFactForCategory(kategori, avoidList = []) {
  const client = getClient();

  const avoidText = avoidList?.length
    ? `\n- Aşağıdaki konu/isim/yer örneklerinden KAÇIN (yakın varyasyonlar dahil):\n${avoidList
        .map((x) => `  • ${x}`)
        .join("\n")}\n`
    : "";

  const prompt = `
Aşağıdaki kurallarla VERİLEN KATEGORİDE tam 1 adet ÖZGÜN ve doğrulanabilir Türkçe genel kültür bilgisi üret.

Sen bir “Günlük Genel Kültür Bilgisi Üretici Asistanısın”.
Görevin: Sadece belirtilen kategoriye AİT, tek paragraf bir bilgi yazmak.

────────────────────────────────────────
📌 KATEGORİ (ZORUNLU)
Şu anda çalıştığın kategori:
"${kategori}"

KATEGORİ AÇIKLAMALARI (referans için):
- Tarih: Tarihi olaylar, savaşlar, devrimler, anlaşmalar, anayasalar, eski uygarlıklar, tarihsel dönemler.
- Bilim veya İcatlar: Doğa bilimleri, teknoloji, tıp, mühendislik, icatlar, keşifler, bilim insanları.
- Sanat: Resim, heykel, mimari akımlar, tiyatro, opera, sinema, fotoğraf, tasarım okulları, sanatçılar.
- Coğrafya: Ülkeler, bölgeler, dağlar, nehirler, iklimler, ekosistemler, jeolojik oluşumlar.
- Edebiyat veya Dil: Romanlar, öyküler, şiirler, yazarlar, edebi akımlar, diller, alfabeler, dilbilim.
- Spor veya Sağlık: Spor dalları, antrenman, egzersiz, beden eğitimi, olimpiyatlar, beslenme, genel sağlık bilgileri, yoga vb.

Bilginin içeriği, sadece bu kategorinin doğasına uygun olmalıdır.

────────────────────────────────────────
📌 FORMAT KURALLARI
- 70–90 kelime arasında olmalı.
- Tek paragraf, tek ana konu.
- Net, sade ve tarafsız bir anlatım kullan.
- Kesin bilgilere dayan; tarih/sayı uydurma.
- Popüler yanlış bilgi, belirsiz ifade, “rivayete göre” vb. kullanma.
- METİNDE kategori adını veya "tarih, sanat" gibi etiketleri YAZMA.

────────────────────────────────────────
📌 TEKRAR / KAÇINILACAKLAR
- Aynı ülke, kişi veya temayı abartılı tekrar etme.
- Son günlerde kullanılan şu konu parçalarından KAÇIN:
${avoidText}

────────────────────────────────────────
📌 ÇIKTI KURALI
- Sadece tek bir paragraf metin döndür.
- Başına numara, başlık, alıntı işareti vb. ekleme.

Şimdi "${kategori}" kategorisine tam uyan 1 bilgi yaz.
`.trim();

  const res = await client.chat.completions.create({
    model: process.env.OPENAI_TEXT_MODEL || "gpt-4o",
    messages: [
      { role: "system", content: "Sen kısa, doğru ve verilen kategoriye sadık kalan bir asistansın." },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
  });

  const text = res.choices[0]?.message?.content || "";
  return text.trim();
}


export async function embed(text) {
  const client = getClient();
  const res = await client.embeddings.create({
    model: process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small",
    input: text,
  });
  return res.data[0].embedding;
}


export async function generateQuestionForFact(factText) {
  const client = getClient();

  const prompt = `
Aşağıdaki GENEL KÜLTÜR BİLGİSİ metnine göre tek soruluk 4 şıklı bir quiz hazırla.

Metin:
"""${factText}"""

Kurallar:
- Soruyu metindeki bilgiye DAYANDIR, uydurma bilgi ekleme.
- 1 tane NET doğru cevap olsun, diğer 3 şık makul ama yanlıştır.
- Cevaplar aynı uzunlukta/aynı ciddiyette olsun, bariz saçma şık verme.
- Çıkış formatın JSON olsun ve SADECE JSON döndür:

{
  "soru": "....?",
  "secenekler": ["A", "B", "C", "D"],
  "dogruIndex": 0
}
`.trim();

  const res = await client.chat.completions.create({
    model: process.env.OPENAI_TEXT_MODEL || "gpt-4o",
    messages: [
      { role: "system", content: "Sen güvenilir bir quiz soru üreticisisin." },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
  });

  const raw = res.choices[0]?.message?.content || "{}";

  try {
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    const jsonStr = raw.slice(jsonStart, jsonEnd + 1);
    const obj = JSON.parse(jsonStr);

    if (
      !obj ||
      typeof obj.soru !== "string" ||
      !Array.isArray(obj.secenekler) ||
      obj.secenekler.length !== 4 ||
      typeof obj.dogruIndex !== "number"
    ) {
      throw new Error("Beklenen alanlar yok");
    }
    return obj;
  } catch (e) {
    console.error("generateQuestionForFact JSON parse hatası:", e, raw);
    throw new Error("Quiz sorusu üretilemedi");
  }
}


export async function classifyFactCategory(text) {
  const client = getClient();

  const prompt = `
Aşağıdaki genel kültür bilgisini EN UYGUN tek kategoriye göre sınıflandır.

Metin:
"""${text}"""

Seçebileceğin kategoriler:
"Tarih", "Bilim veya İcatlar", "Sanat",
"Coğrafya", "Edebiyat veya Dil", "Spor veya Sağlık".

Cevabı SADECE şu JSON formatında ver:
{"kategori":"Tarih"}
`.trim();

  const res = await client.chat.completions.create({
    model: process.env.OPENAI_TEXT_MODEL || "gpt-4o",
    messages: [
      { role: "system", content: "Sen kısa ve net sınıflandırma yapan bir asistansın." },
      { role: "user", content: prompt },
    ],
    temperature: 0,
  });

  const raw = res.choices[0]?.message?.content || "{}";

  try {
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    const obj = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
    return obj.kategori || "Genel";
  } catch (e) {
    console.error("classifyFactCategory parse hatası:", raw, e);
    return "Genel";
  }
}


export async function generateImageForBilgi(factText, kategori = "") {
  const client = getClient();


  const safeTopic = makeSafeTopic(factText, kategori);

  const prompt = buildSafeImagePrompt(safeTopic, kategori);

  try {
    const res = await client.images.generate({
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
      prompt,
      size: process.env.IMAGE_SIZE || "1024x1024",
    });

    const first = res?.data?.[0];
    if (first?.url) return first.url;
    if (first?.b64_json) return `data:image/png;base64,${first.b64_json}`;
    return null;
  } catch (e) {
    const msg = String(e?.message || e);

   
    if (msg.includes("safety") || msg.includes("sexual")) {
      const fallbackPrompt = `
  Eğitici ve güvenli bir illüstrasyon üret.
  Sahne: boş bir müze galerisi iç mekânı, uzaktan görünen çerçeveli tablolar, nötr ışık, yazı yok, insan yok.
  Kurallar: çıplaklık yok, erotik yok, şiddet yok, logo/watermark yok.
  Stil: dijital illüstrasyon, temiz kompozisyon.
`.trim();

      const res2 = await client.images.generate({
        model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
        prompt: fallbackPrompt,
        size: process.env.IMAGE_SIZE || "1024x1024",
      });

      const first2 = res2?.data?.[0];
      if (first2?.url) return first2.url;
      if (first2?.b64_json) return `data:image/png;base64,${first2.b64_json}`;
      return null;
    }

    throw e; 
  }
}

// Helpers
function makeSafeTopic(text = "", kategori = "") {
  const t = String(text).replace(/\s+/g, " ").trim();

  if (kategori === "Sanat") {
    return "müze galerisi, çerçeveli tablolar, heykel kaidesi, nötr aydınlatma";
  }
  
  const firstSentence = t.split(/[.!?]/)[0] || t;
  return firstSentence.slice(0, 140);
}

function buildSafeImagePrompt(topic, kategori = "") {
  return `
Genel kültür uygulaması için güvenli bir illüstrasyon üret.

Konu: ${kategori ? `[${kategori}] ` : ""}${topic}

ZORUNLU KURALLAR:
- Yazı, harf, altyazı, logo, watermark YOK.
- İnsan çıplaklığı / erotik içerik YOK.
- Çocuk figürü YOK.
- Şiddet / kan / vahşet YOK.
- Yüz/portre yerine: manzara, nesne, sembol, bina, harita, doğa, bilimsel objeler.

Stil:
- Dijital illüstrasyon, eğitici ve nötr, temiz kompozisyon, sinematik ışık.
`.trim();
}







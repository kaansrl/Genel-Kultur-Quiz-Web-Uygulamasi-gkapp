// test-facts.js
import "dotenv/config"; // .env içindeki OPENAI_API_KEY vb. için
import { generateFacts, generateQuestionForFact, classifyFactCategory } from "./src/services/ai.js";

async function main() {
  const n = Number(process.argv[2]) || 6;

  console.log(`\n🔮 ${n} adet genel kültür bilgisi üretiliyor...\n`);

  // 1) Bilgileri üret
  const facts = await generateFacts(n, []);

  console.log("📚 Üretilen Bilgiler:\n");
  facts.forEach((fact, i) => {
    console.log(`${i + 1}. ${fact}\n`);
  });

  console.log("───────────────────────────────");
  console.log("📊 Kategori & Quiz Testi");
  console.log("───────────────────────────────");

  // 2) Her bilgi için kategori + quiz oluştur
  for (let i = 0; i < facts.length; i++) {
    const fact = facts[i];

    const kategori = await classifyFactCategory(fact);
    const question = await generateQuestionForFact(fact);

    console.log(`\n[Bilgi ${i + 1}] Kategori: ${kategori}`);
    console.log("Soru:", question.soru);
    console.log(
      "Şıklar:",
      question.secenekler
        .map((opt, idx) => `${String.fromCharCode(65 + idx)}) ${opt}`)
        .join(" | ")
    );
    console.log(
      "Doğru cevap:",
      `${String.fromCharCode(65 + question.dogruIndex)}) ${question.secenekler[question.dogruIndex]}`
    );
  }

  console.log("\n✅ Test tamamlandı.\n");
}

main().catch((err) => {
  console.error("❌ HATA:", err);
  process.exit(1);
});

Genel Kültür Bilgi & Quiz Uygulaması:

- Backend: Node.js + Express
- Frontend: React
- Veritabanı: PostgreSQL (+ pgvector)

Amaç:

Günlük aktif bilgi üretimi
Günün belirli saatlerinde quiz açılması
Bilgilerin tekrar etmemesi için embedding + benzerlik kontrolü
Kullanıcı bazlı XP, seviye, istatistik, leaderboard sistemi

Zaman pencereleri:

- Aktif bilginin açık olduğu saat
- Quiz saatleri
- Günlük bilginin pasif/okunabilir olduğu saat

Teknik detaylar:

- Cron job ile günlük bilgi üretimi
- Quiz sonuçlarının localStorage + backend senkronu
- Kullanıcı cevapları, doğruluk oranları, kategori bazlı analiz

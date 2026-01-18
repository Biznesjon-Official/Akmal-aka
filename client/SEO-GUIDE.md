# SEO Sozlamalari va Ko'rsatmalar

## 1. Google Search Console Sozlash

1. [Google Search Console](https://search.google.com/search-console) ga kiring
2. "Add Property" tugmasini bosing
3. `akmalaka.biznejon.uz` domenini qo'shing
4. Verification kodini `client/src/app/layout.tsx` faylidagi `meta name="google-site-verification"` ga qo'ying

## 2. Sitemap Yuborish

1. Google Search Console da "Sitemaps" bo'limiga o'ting
2. Quyidagi URL ni qo'shing: `https://akmalaka.biznejon.uz/sitemap.xml`
3. "Submit" tugmasini bosing

## 3. robots.txt Tekshirish

robots.txt fayli `client/public/robots.txt` da joylashgan va quyidagilarni o'z ichiga oladi:
- Barcha bot'larga ruxsat
- Login va API sahifalarini bloklash
- Sitemap manzili

## 4. Structured Data (Schema.org)

Saytda quyidagi structured data qo'shilgan:
- Organization schema
- WebSite schema
- BreadcrumbList schema

Tekshirish uchun: [Google Rich Results Test](https://search.google.com/test/rich-results)

## 5. Meta Tags

Har bir sahifada quyidagi meta taglar mavjud:
- Title (har bir sahifa uchun unique)
- Description
- Keywords (3 tilda: O'zbek, Rus, Ingliz)
- Open Graph tags (Facebook, LinkedIn)
- Twitter Card tags
- Canonical URL
- Language alternates

## 6. Performance Optimizatsiyalari

- Image optimization (AVIF, WebP)
- Compression enabled
- DNS prefetch
- Security headers

## 7. Ko'p Tillilik (Multilingual SEO)

Sayt 3 tilda ishlaydi:
- O'zbek tili (uz) - asosiy
- Rus tili (ru)
- Ingliz tili (en)

Har bir til uchun `hreflang` taglar qo'shilgan.

## 8. Kalit So'zlar

Asosiy kalit so'zlar:
- **O'zbek**: yog'och import, yog'och export, vagon sotuvlari, rossiya yog'och
- **Rus**: древесина импорт, древесина экспорт, продажа вагонов, россия древесина
- **Ingliz**: wood import, wood export, wagon sales, russia wood

## 9. Monitoring

Quyidagi vositalardan foydalaning:
- [Google Search Console](https://search.google.com/search-console)
- [Google Analytics](https://analytics.google.com)
- [Bing Webmaster Tools](https://www.bing.com/webmasters)
- [Yandex Webmaster](https://webmaster.yandex.com)

## 10. Qo'shimcha Tavsiyalar

1. **Content yangilash**: Muntazam ravishda yangi ma'lumotlar qo'shing
2. **Backlinks**: Boshqa saytlardan havolalar oling
3. **Social Media**: Ijtimoiy tarmoqlarda faol bo'ling
4. **Page Speed**: Sahifa tezligini monitoring qiling
5. **Mobile-friendly**: Mobil qurilmalarda yaxshi ishlashini ta'minlang

## 11. Local SEO (O'zbekiston uchun)

- Google My Business profil yarating
- O'zbekiston manzilini qo'shing
- Mahalliy kalit so'zlardan foydalaning
- O'zbek tilida content yarating

## 12. Tekshirish Ro'yxati

- [ ] Google Search Console verification
- [ ] Sitemap yuborildi
- [ ] robots.txt tekshirildi
- [ ] Structured data test o'tkazildi
- [ ] Meta tags to'liq
- [ ] Mobile-friendly test
- [ ] Page speed test
- [ ] SSL sertifikat o'rnatilgan
- [ ] Google Analytics o'rnatildi
- [ ] Yandex Metrika o'rnatildi (Rossiya uchun)

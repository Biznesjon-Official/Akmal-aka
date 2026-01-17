# Vagon Sotuv Hajm Logikasi Tuzatildi

## Muammo
Vagon sotuv sahifasida quyidagi muammolar bor edi:
1. ❌ "dona" (pieces) ko'rsatilayotgan edi, lekin yog'och hajm (m³) bo'yicha sotiladi
2. ❌ Qolgan hajm ma'lumotlari to'g'ri ko'rsatilmayotgan edi
3. ❌ Sotuv formasi "soni" so'rayotgan edi, hajm emas

## Yechim
Butun sotuv logikasini hajm (m³) asosida qayta tuzatdik.

### Frontend O'zgarishlar (`client/src/app/vagon-sale/page.tsx`):

#### 1. State O'zgarishlari:
```typescript
// ESKI
const [soldQuantity, setSoldQuantity] = useState('');

// YANGI  
const [soldVolumeM3, setSoldVolumeM3] = useState('');
const [clientLossM3, setClientLossM3] = useState(''); // Yangi field
```

#### 2. Interface Yangilandi:
```typescript
interface VagonSale {
  sent_volume_m3: number;        // Jo'natilgan hajm
  accepted_volume_m3: number;    // Qabul qilingan hajm  
  client_loss_m3: number;        // Mijoz yo'qotishi
  total_price: number;           // total_amount emas
  // sold_quantity o'chirildi
}
```

#### 3. Forma O'zgarishlari:
- ✅ "Sotilgan soni (dona)" → "Sotilgan hajm (m³)"
- ✅ Mijoz yo'qotishi (client_loss_m3) field qo'shildi
- ✅ Hajm validatsiyasi: qolgan hajmdan ko'p bo'lmasligi
- ✅ Lot tanlashda faqat hajm ko'rsatiladi

#### 4. Display O'zgarishlari:
- ✅ "Soni: X dona" o'chirildi
- ✅ "Jo'natilgan: X m³" va "Qabul qilingan: X m³" qo'shildi
- ✅ Yo'qotish ko'rsatiladi (agar mavjud bo'lsa)
- ✅ Lot tanlovida "X m³ qolgan" ko'rsatiladi

### Backend (Allaqachon to'g'ri edi):
- ✅ `VagonSale` modeli hajm asosida ishlaydi
- ✅ `sent_volume_m3` - jo'natilgan hajm
- ✅ `client_loss_m3` - mijoz yo'qotishi  
- ✅ `accepted_volume_m3` = sent_volume_m3 - client_loss_m3
- ✅ `total_price` = accepted_volume_m3 × price_per_m3

### Yangi Logika:
1. **Hajm asosida sotuv**: Foydalanuvchi to'g'ridan-to'g'ri m³ kiritadi
2. **Yo'qotish hisobi**: Mijoz yo'qotishi alohida kiritiladi
3. **Qabul qilingan hajm**: Jo'natilgan - Yo'qotish
4. **Narx hisoblash**: Qabul qilingan hajm × m³ narxi

## Test Qilish:
1. Vagon sotuv sahifasiga o'ting
2. "Yangi sotuv" tugmasini bosing
3. Vagon va lot tanlang
4. Hajm (m³) kiriting - "dona" emas!
5. Yo'qotish kiritish ixtiyoriy
6. Narx m³ uchun kiritiladi
7. Saqlang va natijani tekshiring

## Natija:
✅ Yog'och hajm (m³) bo'yicha sotiladi  
✅ Qolgan hajm to'g'ri ko'rsatiladi  
✅ Yo'qotish hisobga olinadi  
✅ Professional sotuv interfeysi  
✅ Backend bilan to'liq mos keladi  

## Qo'shimcha Imkoniyatlar:
- Mijoz yo'qotishi (transport, yuklash vaqtidagi)
- Qabul qilingan va jo'natilgan hajm farqi
- Hajm asosida to'g'ri narx hisoblash
- Qolgan hajm real-time ko'rsatish
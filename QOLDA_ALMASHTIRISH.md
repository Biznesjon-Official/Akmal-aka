# 🔧 Qo'lda Almashtirish Ko'rsatmasi (5-10 daqiqa)

## VS Code'da Find & Replace (Ctrl+Shift+H)

### 1️⃣ IMPORT QO'SHISH

Har bir sahifaga qo'lda qo'shing (import'lar qismiga):

```typescript
import { showToast } from '@/utils/toast';
import { useConfirm } from '@/hooks/useConfirm';
```

**Sahifalar:**
- `client/src/app/purchase/page.tsx` ✅ (qo'shilgan)
- `client/src/app/sale/page.tsx`
- `client/src/app/kassa/page.tsx`
- `client/src/app/wood/page.tsx`
- `client/src/app/expense/page.tsx`
- `client/src/app/backup/page.tsx`

---

### 2️⃣ HOOK QO'SHISH

Har bir component ichiga (birinchi qator):

```typescript
const { confirm, ConfirmDialog } = useConfirm();
```

---

### 3️⃣ ALERT ALMASHTIRISH

VS Code Find & Replace (Ctrl+Shift+H):

#### Success Alert'lar:
```
Find:    alert('
Replace: showToast.success('
```
Faqat "muvaffaqiyatli" so'zi bor joylarni almashtiring.

#### Error Alert'lar:
```
Find:    alert('Iltimos
Replace: showToast.error('Iltimos
```

```
Find:    alert('Xatolik
Replace: showToast.error('Xatolik
```

```
Find:    alert(errorMessage)
Replace: showToast.error(errorMessage)
```

---

### 4️⃣ CONFIRM ALMASHTIRISH

Har bir `window.confirm` ni qo'lda almashtiring:

**ESKI:**
```typescript
const handleDelete = (id: string) => {
  if (window.confirm('Rostdan ham o\'chirmoqchimisiz?')) {
    deleteMutation.mutate(id);
  }
};
```

**YANGI:**
```typescript
const handleDelete = async (id: string) => {
  const confirmed = await confirm({
    title: 'O\'chirish',
    message: 'Rostdan ham o\'chirmoqchimisiz? Bu amal qaytarilmaydi!',
    confirmText: 'Ha, o\'chirish',
    cancelText: 'Bekor qilish',
    type: 'danger'
  });
  
  if (confirmed) {
    deleteMutation.mutate(id);
  }
};
```

---

### 5️⃣ CONFIRMDIALOG QO'SHISH

Har bir sahifa oxiriga (`</Layout>` dan oldin):

```typescript
<ConfirmDialog />
```

---

## ✅ TEKSHIRISH

Har bir sahifada:
1. Import'lar bor
2. Hook qo'shilgan
3. alert → showToast
4. confirm → useConfirm
5. ConfirmDialog component qo'shilgan

---

## 🎯 YOKI ODDIYROQ:

Men sizga har bir sahifa uchun to'liq tayyor kod beraman. Siz faqat copy-paste qilasiz!

**Qaysi variant?**
1. ✅ Qo'lda almashtirish (5-10 min, yuqoridagi ko'rsatma)
2. ✅ Men tayyor kod beraman (copy-paste, 2-3 min)

Nima deysan? 🤔

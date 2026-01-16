# 📚 Import/Export Qo'llanma

## ✅ UI Components - Named Export

Barcha UI component'lar **named export** formatida:

```typescript
// ✅ TO'G'RI - Named Export
export function Button({ ... }) { ... }
export function Card({ ... }) { ... }
export function Table({ ... }) { ... }
export function Modal({ ... }) { ... }

// ✅ TO'G'RI - Named Import
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
```

```typescript
// ❌ NOTO'G'RI - Default Export
export default function Button({ ... }) { ... }

// ❌ NOTO'G'RI - Default Import
import Button from '@/components/ui/Button';
```

## 📋 UI Components Ro'yxati

### Button Component
```typescript
import { Button } from '@/components/ui/Button';

<Button variant="primary" size="md" onClick={handleClick}>
  Click me
</Button>
```

**Variants:** primary, secondary, danger, success, warning  
**Sizes:** sm, md, lg

### Card Component
```typescript
import { Card } from '@/components/ui/Card';

<Card hover={true} gradient={false}>
  Content here
</Card>
```

### Table Component
```typescript
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/Table';

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Value</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Modal Component
```typescript
import Modal, { ModalBody, ModalFooter } from '@/components/ui/Modal';

<Modal isOpen={isOpen} onClose={handleClose} title="Modal Title">
  <ModalBody>
    Content
  </ModalBody>
  <ModalFooter>
    <Button onClick={handleClose}>Close</Button>
  </ModalFooter>
</Modal>
```

## 🔧 Other Components - Default Export

Layout va boshqa component'lar **default export**:

```typescript
// ✅ TO'G'RI - Default Export
export default function Layout({ ... }) { ... }

// ✅ TO'G'RI - Default Import
import Layout from '@/components/Layout';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
```

## 📦 Utils va Helpers - Named Export

```typescript
// ✅ TO'G'RI - Named Export
export function formatCurrency(value: number) { ... }
export function formatDate(date: Date) { ... }

// ✅ TO'G'RI - Named Import
import { formatCurrency, formatDate } from '@/utils/formatters';
```

## 🎯 Qoidalar

1. **UI Components** → Named Export (`export function`)
2. **Page Components** → Default Export (`export default function`)
3. **Layout Components** → Default Export
4. **Utils/Helpers** → Named Export
5. **Types/Interfaces** → Named Export (`export interface`)

## ⚠️ Keng Tarqalgan Xatolar

### Xato 1: Export/Import Mismatch
```typescript
// ❌ XATO
// Component.tsx
export default function Component() { ... }

// Page.tsx
import { Component } from './Component'; // Bu ishlamaydi!

// ✅ TO'G'RI
import Component from './Component';
```

### Xato 2: Named Export'ni Default Import qilish
```typescript
// ❌ XATO
// Button.tsx
export function Button() { ... }

// Page.tsx
import Button from '@/components/ui/Button'; // Bu ishlamaydi!

// ✅ TO'G'RI
import { Button } from '@/components/ui/Button';
```

## 🚀 Yangi Component Qo'shish

Yangi UI component qo'shganda:

1. Named export ishlatish:
```typescript
export function MyComponent({ ... }: MyComponentProps) {
  return <div>...</div>;
}
```

2. Named import qilish:
```typescript
import { MyComponent } from '@/components/ui/MyComponent';
```

3. Agar bir nechta export bo'lsa:
```typescript
// Component.tsx
export function MyComponent() { ... }
export function MyComponentHeader() { ... }
export function MyComponentBody() { ... }

// Page.tsx
import { MyComponent, MyComponentHeader, MyComponentBody } from '@/components/ui/MyComponent';
```

---

**Eslatma:** Bu qoidalarga rioya qilish import/export xatolarini oldini oladi va kodni o'qishni osonlashtiradi.

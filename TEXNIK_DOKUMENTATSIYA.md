# 🔧 Texnik Dokumentatsiya

## Arxitektura

### Umumiy Arxitektura

```
┌─────────────────────────────────────────────────────────┐
│                      Client (Browser)                    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │           Next.js Frontend (Port 3000)         │    │
│  │                                                 │    │
│  │  - React Components                            │    │
│  │  - TanStack Query (State Management)           │    │
│  │  - Tailwind CSS (Styling)                      │    │
│  │  - TypeScript                                   │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                          │
                          │ HTTP/HTTPS
                          │ (Axios)
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Express.js Backend (Port 5002)              │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │                 REST API                        │    │
│  │                                                 │    │
│  │  - Authentication (JWT)                        │    │
│  │  - Business Logic                              │    │
│  │  - Data Validation                             │    │
│  │  - Error Handling                              │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                          │
                          │ Mongoose ODM
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    MongoDB Database                      │
│                                                          │
│  Collections:                                           │
│  - users                                                │
│  - woods                                                │
│  - transports                                           │
│  - kassas                                               │
│  - exchangerates                                        │
└─────────────────────────────────────────────────────────┘
```

### Frontend Arxitekturasi

```
client/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Dashboard page
│   │   ├── providers.tsx       # React Query provider
│   │   ├── globals.css         # Global styles
│   │   │
│   │   ├── login/              # Login page
│   │   │   └── page.tsx
│   │   │
│   │   ├── wood/               # Wood lots page
│   │   │   └── page.tsx
│   │   │
│   │   ├── transport/          # Transport page
│   │   │   └── page.tsx
│   │   │
│   │   ├── kassa/              # Kassa page
│   │   │   └── page.tsx
│   │   │
│   │   ├── exchange-rates/     # Exchange rates page
│   │   │   └── page.tsx
│   │   │
│   │   └── reports/            # Reports page
│   │       └── page.tsx
│   │
│   ├── components/             # React components
│   │   ├── ui/                 # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Table.tsx
│   │   │
│   │   ├── Layout.tsx          # Main layout
│   │   ├── Header.tsx          # Header component
│   │   ├── Sidebar.tsx         # Sidebar navigation
│   │   ├── Dashboard.tsx       # Dashboard component
│   │   └── FormattedInput.tsx  # Formatted input
│   │
│   ├── context/                # React Context
│   │   └── AuthContext.tsx     # Authentication context
│   │
│   └── utils/                  # Utility functions
│       └── formatters.ts       # Number formatting
│
├── public/                     # Static files
├── next.config.ts              # Next.js config
├── tailwind.config.js          # Tailwind config
└── tsconfig.json               # TypeScript config
```

### Backend Arxitekturasi

```
server/
├── models/                     # Mongoose models
│   ├── User.js                 # User model
│   ├── Wood.js                 # Wood lot model
│   ├── Transport.js            # Transport model
│   ├── Kassa.js                # Kassa model
│   └── ExchangeRate.js         # Exchange rate model
│
├── routes/                     # Express routes
│   ├── auth.js                 # Authentication routes
│   ├── wood.js                 # Wood routes
│   ├── transport.js            # Transport routes
│   ├── kassa.js                # Kassa routes
│   ├── exchangeRate.js         # Exchange rate routes
│   └── reports.js              # Reports routes
│
├── middleware/                 # Express middleware
│   └── auth.js                 # JWT authentication
│
├── index.js                    # Server entry point
├── .env                        # Environment variables
└── package.json                # Dependencies
```

---

## Database Schema

### Users Collection

```javascript
{
  _id: ObjectId,
  username: String (unique, required),
  password: String (hashed, required),
  role: String (enum: ['admin', 'user'], default: 'user'),
  createdAt: Date (default: Date.now)
}
```

**Indexes:**
- `username`: unique

### Woods Collection

```javascript
{
  _id: ObjectId,
  lotCode: String (unique, required),
  qalinlik: Number (required), // mm
  eni: Number (required),      // mm
  uzunlik: Number (required),  // m
  kubHajmi: Number (required), // m³
  soni: Number (required),     // dona
  tonna: Number (required),    // t
  yogochZichligi: Number (default: 0.65), // t/m³
  status: String (enum: ['kutilmoqda', 'import', 'sotildi', 'export']),
  createdAt: Date (default: Date.now)
}
```

**Indexes:**
- `lotCode`: unique
- `status`: 1
- `createdAt`: -1

### Transports Collection

```javascript
{
  _id: ObjectId,
  transportTuri: String (default: 'poyezd'),
  jonatishJoyi: String (required),
  kelishJoyi: String (required),
  yuboruvchi: String (required),
  qabulQiluvchi: String (required),
  nomerVagon: String,
  nomerOtpravka: String,
  dataZayavki: Date (required),
  fakticheskiyVes: Number,     // kg
  okruglonniyVes: Number,      // kg
  status: String (enum: ['kutilmoqda', 'yolda', 'yetib_keldi', 'tugatildi']),
  woodLot: ObjectId (ref: 'Wood', required),
  createdAt: Date (default: Date.now)
}
```

**Indexes:**
- `woodLot`: 1
- `status`: 1
- `createdAt`: -1

### Kassas Collection

```javascript
{
  _id: ObjectId,
  turi: String (enum: ['otpr', 'prixod', 'klent_prixod', 'rasxod'], required),
  summa: Number (required),
  valyuta: String (enum: ['USD', 'RUB', 'UZS'], required),
  tavsif: String (required),
  sana: Date (required),
  yaratuvchi: ObjectId (ref: 'User', required),
  woodLot: ObjectId (ref: 'Wood'),
  transport: ObjectId (ref: 'Transport'),
  createdAt: Date (default: Date.now)
}
```

**Indexes:**
- `turi`: 1
- `valyuta`: 1
- `sana`: -1
- `yaratuvchi`: 1

### ExchangeRates Collection

```javascript
{
  _id: ObjectId,
  currency: String (enum: ['USD', 'RUB'], unique, required),
  rate: Number (required),
  lastUpdated: Date (default: Date.now),
  updatedBy: ObjectId (ref: 'User', required)
}
```

**Indexes:**
- `currency`: unique

---

## API Endpoints

### Authentication

#### POST /api/auth/login
Login qilish

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "username": "admin",
    "role": "admin"
  }
}
```

**Status Codes:**
- 200: Success
- 400: Invalid credentials
- 500: Server error

---

### Wood Lots

#### GET /api/wood
Barcha yog'och lotlarini olish

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optional): Filter by status
- `limit` (optional): Limit results
- `skip` (optional): Skip results

**Response:**
```json
{
  "woods": [
    {
      "_id": "...",
      "lotCode": "LOT-2024-001",
      "qalinlik": 31,
      "eni": 125,
      "uzunlik": 6,
      "kubHajmi": 2.67375,
      "soni": 115,
      "tonna": 1.7379375,
      "yogochZichligi": 0.65,
      "status": "import",
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

#### POST /api/wood
Yangi lot qo'shish

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "lotCode": "LOT-2024-001",
  "qalinlik": 31,
  "eni": 125,
  "uzunlik": 6,
  "soni": 115,
  "yogochZichligi": 0.65,
  "status": "kutilmoqda"
}
```

**Response:**
```json
{
  "message": "Yog'och lot muvaffaqiyatli qo'shildi",
  "wood": { ... }
}
```

**Status Codes:**
- 201: Created
- 400: Validation error
- 401: Unauthorized
- 500: Server error

#### GET /api/wood/:id
Bitta lotni olish

#### PUT /api/wood/:id
Lotni yangilash

#### DELETE /api/wood/:id
Lotni o'chirish

---

### Transport

#### GET /api/transport
Barcha transportlarni olish

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "transports": [
    {
      "_id": "...",
      "transportTuri": "poyezd",
      "jonatishJoyi": "Moskva",
      "kelishJoyi": "Toshkent",
      "yuboruvchi": "Kompaniya A",
      "qabulQiluvchi": "Kompaniya B",
      "nomerVagon": "12345678",
      "nomerOtpravka": "OTP-2024-001",
      "dataZayavki": "2024-01-15",
      "fakticheskiyVes": 25000,
      "okruglonniyVes": 25000,
      "status": "yolda",
      "woodLot": {
        "_id": "...",
        "lotCode": "LOT-2024-001"
      },
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

#### POST /api/transport
Yangi transport qo'shish

**Request:**
```json
{
  "transportTuri": "poyezd",
  "jonatishJoyi": "Moskva",
  "kelishJoyi": "Toshkent",
  "yuboruvchi": "Kompaniya A",
  "qabulQiluvchi": "Kompaniya B",
  "nomerVagon": "12345678",
  "nomerOtpravka": "OTP-2024-001",
  "dataZayavki": "2024-01-15",
  "fakticheskiyVes": 25000,
  "okruglonniyVes": 25000,
  "woodLot": "wood_lot_id",
  "status": "kutilmoqda"
}
```

---

### Kassa

#### GET /api/kassa
Barcha tranzaksiyalarni olish

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `turi` (optional): Filter by type
- `valyuta` (optional): Filter by currency
- `startDate` (optional): Start date
- `endDate` (optional): End date

**Response:**
```json
{
  "kassaList": [
    {
      "_id": "...",
      "turi": "prixod",
      "summa": 1000000,
      "valyuta": "USD",
      "tavsif": "Yog'och sotuvidan tushum",
      "sana": "2024-01-15",
      "yaratuvchi": {
        "username": "admin"
      },
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

#### POST /api/kassa
Yangi tranzaksiya qo'shish

**Request:**
```json
{
  "turi": "prixod",
  "summa": 1000000,
  "valyuta": "USD",
  "tavsif": "Yog'och sotuvidan tushum",
  "sana": "2024-01-15"
}
```

#### GET /api/kassa/balance
Balansni olish

**Response:**
```json
[
  {
    "_id": "USD",
    "otpr": 50000,
    "prixod": 100000,
    "rasxod": 30000,
    "klentPrixod": 80000,
    "chistiyPrixod": 200000
  }
]
```

---

### Exchange Rates

#### GET /api/exchange-rate
Barcha kurslarni olish

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "_id": "...",
    "currency": "USD",
    "rate": 12500,
    "lastUpdated": "2024-01-15T10:00:00.000Z",
    "updatedBy": {
      "username": "admin"
    }
  }
]
```

#### POST /api/exchange-rate
Kursni yangilash

**Request:**
```json
{
  "currency": "USD",
  "rate": 12500
}
```

---

### Reports

#### GET /api/reports/general
Umumiy statistika

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `startDate` (optional)
- `endDate` (optional)
- `valyuta` (optional)

**Response:**
```json
{
  "woodStats": [
    {
      "_id": "import",
      "count": 10,
      "totalKub": 26.7375,
      "totalTonna": 17.379375
    }
  ],
  "transportStats": [
    {
      "_id": "yolda",
      "count": 5
    }
  ],
  "kassaStats": [
    {
      "_id": {
        "turi": "prixod",
        "valyuta": "USD"
      },
      "totalSumma": 1000000,
      "count": 10
    }
  ]
}
```

#### GET /api/reports/profit-loss
Foyda/zarar hisoboti

**Response:**
```json
[
  {
    "_id": "USD",
    "daromad": 230000,
    "xarajat": 80000,
    "sof_foyda": 150000
  }
]
```

---

## Authentication Flow

### JWT Token

```javascript
// Token yaratish
const token = jwt.sign(
  { 
    id: user._id,
    username: user.username,
    role: user.role
  },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// Token tekshirish
const decoded = jwt.verify(token, process.env.JWT_SECRET);
```

### Middleware

```javascript
// auth.js
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error();
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      throw new Error();
    }
    
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Iltimos, tizimga kiring' });
  }
};
```

---

## Frontend State Management

### React Query

```typescript
// Query
const { data, isLoading, error } = useQuery({
  queryKey: ['woods'],
  queryFn: async () => {
    const response = await axios.get('/api/wood');
    return response.data;
  }
});

// Mutation
const mutation = useMutation({
  mutationFn: async (data) => {
    const response = await axios.post('/api/wood', data);
    return response.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['woods'] });
  }
});
```

### Auth Context

```typescript
interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

---

## Number Formatting

### Formatters

```typescript
// Raqamni formatlash
export const formatNumber = (value: number | string): string => {
  if (!value && value !== 0) return '';
  
  const num = typeof value === 'string' 
    ? parseFloat(value.replace(/\s/g, '')) 
    : value;
    
  if (isNaN(num)) return '';
  
  return num.toLocaleString('uz-UZ').replace(/,/g, ' ');
};

// Valyuta formatlash
export const formatCurrency = (
  amount: number, 
  currency: string = 'UZS'
): string => {
  const formatted = formatNumber(amount);
  
  const currencySymbols: { [key: string]: string } = {
    'USD': '$',
    'RUB': '₽',
    'UZS': 'so\'m'
  };
  
  const symbol = currencySymbols[currency] || currency;
  return `${formatted} ${symbol}`;
};
```

### FormattedInput Component

```typescript
interface FormattedInputProps {
  value: string | number;
  onChange: (value: string) => void;
  type?: 'currency' | 'number';
  currency?: string;
  // ...
}

export default function FormattedInput({
  value,
  onChange,
  type = 'number',
  currency = 'UZS',
  // ...
}: FormattedInputProps) {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Real-time formatting
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formatted = formatInputNumber(inputValue);
    setDisplayValue(formatted);
    
    const rawValue = parseFormattedNumber(formatted).toString();
    onChange(rawValue);
  };

  // ...
}
```

---

## Calculations

### Wood Volume

```javascript
// Formula: (qalinlik_mm × eni_mm × uzunlik_m) ÷ 1,000,000 = m³

const calculateVolume = (qalinlik, eni, uzunlik, soni) => {
  const bittaDonaHajmiM3 = (qalinlik * eni * uzunlik) / 1000000;
  const kubHajmi = bittaDonaHajmiM3 * soni;
  return kubHajmi;
};

// Misol:
// qalinlik = 31 mm
// eni = 125 mm
// uzunlik = 6 m
// soni = 115 dona
// 
// bittaDonaHajmiM3 = (31 × 125 × 6) / 1000000 = 0.02325 m³
// kubHajmi = 0.02325 × 115 = 2.67375 m³
```

### Weight

```javascript
// Formula: Og'irlik = Kub hajmi × Zichlik

const calculateWeight = (kubHajmi, zichlik) => {
  return kubHajmi * zichlik;
};

// Misol:
// kubHajmi = 2.67375 m³
// zichlik = 0.65 t/m³ (Qayin)
//
// tonna = 2.67375 × 0.65 = 1.7379375 t
```

### Pieces per Cubic Meter

```javascript
// Formula: 1 ÷ (bitta dona hajmi)

const calculatePiecesPerM3 = (qalinlik, eni, uzunlik) => {
  const bittaDonaHajmiM3 = (qalinlik * eni * uzunlik) / 1000000;
  const piecesPerM3 = 1 / bittaDonaHajmiM3;
  return Math.floor(piecesPerM3);
};

// Misol:
// qalinlik = 31 mm
// eni = 125 mm
// uzunlik = 6 m
//
// bittaDonaHajmiM3 = 0.02325 m³
// piecesPerM3 = 1 / 0.02325 = 43 dona
```

### Kassa Balance

```javascript
// Daromad
const daromad = otpr + prixod + klentPrixod;

// Sof Foyda
const sofFoyda = daromad - rasxod;

// Misol:
// otpr = 50000
// prixod = 100000
// klentPrixod = 80000
// rasxod = 30000
//
// daromad = 50000 + 100000 + 80000 = 230000
// sofFoyda = 230000 - 30000 = 200000
```

---

## Security

### Password Hashing

```javascript
const bcrypt = require('bcryptjs');

// Hash password
const hashedPassword = await bcrypt.hash(password, 10);

// Compare password
const isMatch = await bcrypt.compare(password, user.password);
```

### CORS Configuration

```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
```

### Environment Variables

```env
# Server
PORT=5002
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_secret_key_here
NODE_ENV=development

# Client (optional)
NEXT_PUBLIC_API_URL=http://localhost:5002
```

---

## Performance Optimization

### Frontend

1. **React Query Caching:**
   - Automatic caching
   - Stale time: 5 minutes
   - Cache time: 10 minutes

2. **Code Splitting:**
   - Next.js automatic code splitting
   - Dynamic imports for heavy components

3. **Image Optimization:**
   - Next.js Image component
   - Automatic format conversion
   - Lazy loading

### Backend

1. **Database Indexing:**
   - Indexes on frequently queried fields
   - Compound indexes for complex queries

2. **Query Optimization:**
   - Lean queries for read-only operations
   - Select only needed fields
   - Populate only when necessary

3. **Caching:**
   - Consider Redis for frequently accessed data
   - Cache exchange rates

---

## Testing

### Unit Tests

```javascript
// Example: formatNumber test
describe('formatNumber', () => {
  it('should format number with spaces', () => {
    expect(formatNumber(1000000)).toBe('1 000 000');
  });

  it('should handle decimal numbers', () => {
    expect(formatNumber(1000.50)).toBe('1 000.5');
  });

  it('should return empty string for invalid input', () => {
    expect(formatNumber('invalid')).toBe('');
  });
});
```

### Integration Tests

```javascript
// Example: API test
describe('POST /api/wood', () => {
  it('should create new wood lot', async () => {
    const response = await request(app)
      .post('/api/wood')
      .set('Authorization', `Bearer ${token}`)
      .send({
        lotCode: 'LOT-TEST-001',
        qalinlik: 31,
        eni: 125,
        uzunlik: 6,
        soni: 115,
        yogochZichligi: 0.65,
        status: 'kutilmoqda'
      });

    expect(response.status).toBe(201);
    expect(response.body.wood.lotCode).toBe('LOT-TEST-001');
  });
});
```

---

## Deployment

### Production Build

```bash
# Frontend
cd client
npm run build
npm start

# Backend
cd server
NODE_ENV=production node index.js
```

### Environment Setup

1. **MongoDB Atlas:**
   - Create production cluster
   - Configure IP whitelist
   - Set up backup

2. **Environment Variables:**
   - Use production values
   - Secure JWT_SECRET
   - Set NODE_ENV=production

3. **HTTPS:**
   - Use SSL certificate
   - Configure reverse proxy (Nginx)

4. **Process Manager:**
   - Use PM2 for Node.js
   - Auto-restart on crash
   - Log management

### PM2 Configuration

```bash
# Install PM2
npm install -g pm2

# Start backend
pm2 start server/index.js --name wood-backend

# Start frontend
pm2 start npm --name wood-frontend -- start

# Save configuration
pm2 save

# Auto-start on reboot
pm2 startup
```

---

## Monitoring

### Logs

```bash
# Backend logs
tail -f server/logs/error.log
tail -f server/logs/combined.log

# PM2 logs
pm2 logs wood-backend
pm2 logs wood-frontend
```

### Health Check

```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});
```

---

## Backup

### MongoDB Backup

```bash
# Backup
mongodump --uri="mongodb+srv://..." --out=/backup/$(date +%Y%m%d)

# Restore
mongorestore --uri="mongodb+srv://..." /backup/20240115
```

### Automated Backup Script

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/$DATE"

# Create backup
mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR"

# Compress
tar -czf "$BACKUP_DIR.tar.gz" "$BACKUP_DIR"

# Remove uncompressed
rm -rf "$BACKUP_DIR"

# Keep only last 7 days
find /backup -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR.tar.gz"
```

---

## Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   lsof -ti:3000 | xargs kill
   lsof -ti:5002 | xargs kill
   ```

2. **MongoDB connection error:**
   - Check MONGODB_URI
   - Verify network connection
   - Check IP whitelist

3. **JWT token error:**
   - Check JWT_SECRET
   - Clear browser localStorage
   - Re-login

4. **Build errors:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

---

## Future Enhancements

### Planned Features

1. **Multi-user Support:**
   - User management
   - Role-based permissions
   - Activity logs

2. **Advanced Reports:**
   - PDF export
   - Excel export
   - Charts and graphs

3. **Notifications:**
   - Email notifications
   - SMS notifications
   - In-app notifications

4. **Mobile App:**
   - React Native
   - iOS and Android

5. **Advanced Features:**
   - Barcode scanning
   - QR code generation
   - Document management
   - Invoice generation

---

**Oxirgi yangilanish:** 2024-01-15

**Versiya:** 1.0.0

**Muallif:** Javohir Jabborov

# AquaClean - Developer Technical Documentation

This document serves as a guide for developers onboarding or extending the AquaClean Laundry Management System. It explains the project's file structure, database schema details, REST API payloads, frontend views, and deployment pipeline.

---

## 📂 Project Directory Structure

```text
Laundry_management_system/
├── .env                      # Connection variables (DATABASE_URL)
├── .zscripts/                # Build and process helper scripts
│   └── copy-assets.js        # Node utility for cross-platform asset copying
├── db/                       # Database folder
│   └── custom.db             # Local SQLite database file
├── prisma/                   # Database ORM directory
│   ├── schema.prisma         # Prisma schema and relationship definitions
│   └── seed.js               # Mock data seeding script (JS)
├── public/                   # Static public assets (images, icons)
├── src/                      # Application source directory
│   ├── app/                  # Next.js App Router folders
│   │   ├── api/              # API Route Handlers
│   │   │   ├── customers/    # Customer profiles CRM endpoints
│   │   │   ├── dashboard/    # Analytics stats endpoints
│   │   │   ├── orders/       # Order tracking and creation endpoints
│   │   │   └── services/     # Services catalog endpoints
│   │   ├── globals.css       # Tailwind CSS v4 variables & custom layers
│   │   ├── layout.tsx        # HTML document root wrapper
│   │   └── page.tsx          # Dashboard page assembly entrypoint
│   ├── components/           # Reusable React components
│   │   ├── ui/               # shadcn UI components (Radix primitives)
│   │   ├── sidebar.tsx       # Navigation and theme toggle
│   │   ├── dashboard-view.tsx# Metrics grid and Recharts graphs
│   │   ├── orders-view.tsx   # Order grid, progress tracker, receipt slip
│   │   ├── customers-view.tsx# Customer database profiles & histories
│   │   └── services-view.tsx # Categorized services price manager
│   ├── hooks/                # Custom React hooks (use-toast, use-mobile)
│   └── lib/                  # Library wrappers (db.ts for Prisma client)
├── package.json              # Manifest of scripts and dependencies
├── tailwind.config.ts        # Tailwind configuration (v4 variables inline)
└── tsconfig.json             # TypeScript compiler settings
```

---

## 💾 Database Layer & Schema

AquaClean uses **SQLite** via **Prisma ORM**. The database is located at `db/custom.db` and is controlled by [schema.prisma](file:///c:/Users/ADMIN/Downloads/Laundry_management_system/prisma/schema.prisma).

### Data Models & Relationships

1. **Customer**
   - Keeps contact profiles and preferences.
   - Relation: Has a one-to-many relationship with `Order` (on cascade delete).
2. **Service**
   - Holds the price catalog (e.g. Wash & Fold, Dry Cleaning).
   - Relation: Referenced in `OrderItem`.
3. **Order**
   - Represents a specific transaction. Holds statuses, dates, and calculated invoice costs.
   - Relation: Belongs to `Customer`, contains one or many `OrderItem`s.
4. **OrderItem**
   - Joins an `Order` and a `Service`, tracking selected weight/items, historical prices, and item notes.

---

## 🔌 API Endpoints (Backend)

All API endpoints are implemented as Next.js API Routes in `src/app/api`.

### 1. Dashboard Statistics
* **Endpoint**: `/api/dashboard/stats`
* **Method**: `GET`
* **Description**: Queries all orders to aggregate total revenue, active orders, pending counts, historical sales trends (grouped by date), and service popularity distribution.
* **Response Schema**:
  ```json
  {
    "totalRevenue": 105.00,
    "totalOrders": 4,
    "activeOrders": 3,
    "pendingOrders": 1,
    "salesTrend": [
      { "date": "Jun 24", "amount": 17.00 },
      { "date": "Jun 27", "amount": 29.00 }
    ],
    "serviceBreakdown": [
      { "name": "Wash & Fold", "value": 5, "revenue": 12.50 }
    ]
  }
  ```

### 2. Services Management
* **Endpoint**: `/api/services`
* **Methods**:
  - `GET`: Lists all catalog services.
  - `POST`: Creates a new service or updates an existing one if an `id` is provided. Also handles toggling `isActive`.
* **Payload (POST)**:
  ```json
  {
    "id": "cuid-string-optional-for-create",
    "name": "Stain Removal",
    "category": "specialty",
    "price": 5.00,
    "unit": "piece",
    "description": "Wine/Grease stain removal",
    "isActive": true
  }
  ```

### 3. Customer CRM Profiles
* **Endpoint**: `/api/customers`
* **Methods**:
  - `GET`: Returns customer records annotated with calculated aggregates (`orderCount`, `totalSpend`, and `orders` history).
  - `POST`: Add a new customer profile.
* **Payload (POST)**:
  ```json
  {
    "name": "John Doe",
    "phone": "555-123-4567",
    "email": "john@example.com",
    "address": "123 Main St",
    "notes": "Prefers cold wash"
  }
  ```

### 4. Orders Tracker
* **Endpoint**: `/api/orders`
* **Methods**:
  - `GET`: Returns a list of orders. Supports URL search parameters `?status=WASHING` and `?search=John`.
  - `POST`: Creates a new order. Automatically pulls prices from the `Service` table to calculate item sub-totals and the order's `totalAmount`.
* **Payload (POST)**:
  ```json
  {
    "customerId": "customer-cuid",
    "paymentMethod": "CASH",
    "paymentStatus": "UNPAID",
    "notes": "Separate colors",
    "deliveryDate": "2026-07-02T00:00:00.000Z",
    "items": [
      {
        "serviceId": "service-cuid",
        "quantity": 4.5,
        "notes": "Extra softener"
      }
    ]
  }
  ```

### 5. Individual Order Operations
* **Endpoint**: `/api/orders/[id]`
* **Methods**:
  - `GET`: Retrieves full details for a single order, including customer info and full line item details.
  - `PATCH`: Modifies specific fields such as status or payment flags.
  - `DELETE`: Permanently cancels/removes the order record.
* **Payload (PATCH)**:
  ```json
  {
    "status": "WASHING",
    "paymentStatus": "PAID"
  }
  ```

---

## 🎨 UI & Layout (Frontend)

AquaClean is structured as a Single Page Application (SPA). State transition coordinates which view is rendered inside `src/app/page.tsx`.

### 1. View Toggles
A `currentTab` state variable (`"dashboard" | "orders" | "customers" | "services"`) inside the home page controls routing. Navigation triggers are handled by the `<Sidebar />` component.

### 2. State & Data Synchronization
- The application makes standard `fetch` API requests to backend endpoints during component mount (`useEffect`) or after validation updates.
- Feedback notifications are processed using the `toast` utility (`src/hooks/use-toast.ts`).

### 3. Charts Rendering
Interactive metrics are drawn using **Recharts**.
- **AreaChart** displays the chronological revenue trajectory.
- **PieChart** draws a donut graphic highlighting order density by service name.
- Responsive scaling is wrapped in a `<ResponsiveContainer />` element.

---

## ⚙️ Build and Standalone Production Deployments

In `next.config.ts`, Next.js is configured to build output in `standalone` server packaging:
```typescript
const nextConfig: NextConfig = {
  output: "standalone",
}
```
This compilation creates a self-contained node server folder under `.next/standalone/server.js`. However, Next.js does not copy the static `.next/static` assets or `public/` folder into the standalone output automatically.

### Cross-Platform copy script
To automate this, we configured `package.json` to execute `.zscripts/copy-assets.js` on compile:
```json
"build": "next build && node .zscripts/copy-assets.js"
```
This utility copies folders recursively using Node's native filesystem module (`fs`), allowing building to complete successfully on Windows, macOS, and Linux servers alike.

---

## 🛠️ Developer Extension Guides

### 1. How to Add a New Service Category
If you want to support a new category (e.g., "Shoe Cleaning"):
1. Open `src/components/services-view.tsx` and find the `CATEGORIES` array.
2. Add your category object:
   ```typescript
   const CATEGORIES = [
     ...
     { id: "shoes", name: "Shoe Restoration" }
   ];
   ```
3. Update database validation in `prisma/seed.js` or API validators if required.

### 2. How to Adjust the Order Status Pipeline
The status timeline sequence is governed by a string array. To add a step (e.g. "QC_CHECK" before "READY"):
1. Edit `src/components/orders-view.tsx` and update the `STATUS_STEPS` array:
   ```typescript
   const STATUS_STEPS = ["PENDING", "WASHING", "DRYING", "IRONING", "QC_CHECK", "READY", "DELIVERED"];
   ```
2. The UI timeline tracker and status transition buttons will adapt to the new order sequence automatically.

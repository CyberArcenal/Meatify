# 🥩 Meatify

**Meatify** is a specialized POS system tailored for meat shops, designed to handle per-kilo transactions with decimal input support, batch-based inventory, and expiry tracking.

[![Electron](https://img.shields.io/badge/Electron-40.x-47848f?style=flat-square&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19.x-61dafb?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![TypeORM](https://img.shields.io/badge/TypeORM-0.3.x-fe7a37?style=flat-square)](https://typeorm.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.x-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/SQLite-5.x-003b57?style=flat-square&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

---

## 📖 Overview

Meatify provides a complete point-of-sale solution for fresh meat retailers. Built with **Electron**, **React**, and **TypeORM**, it ensures accurate sales, FIFO stock deduction, and streamlined cashier workflows with a focus on food safety, efficiency, and reliability.

### 🎯 Key Features

- **Batch-Based Inventory** – Track meat batches with unique codes, quantities, costs, and expiry dates
- **FIFO Stock Deduction** – Automatically deduct from oldest batches first (First-In, First-Out) to ensure fresh stock rotation
- **Per-Kilo Transactions** – Support for decimal weight inputs with automatic price calculation
- **Loyalty Program** – Earn and redeem points per purchase, with VIP and Elite tiers
- **Refund & Returns Management** – Process refunds with automatic stock restoration and loyalty point reversal
- **Purchase Order Management** – Create purchase orders, approve, and complete with automatic batch creation
- **Printer & Cash Drawer Support** – Print receipts and open cash drawers with ESC/POS thermal printers
- **Notification System** – In-app, email, and SMS notifications for low stock, expiring batches, and more
- **Audit Logging** – Complete audit trail for all actions with configurable retention
- **Dark Theme** – Gold-accented dark theme optimized for cashier work
- **Offline-First** – Fully functional without internet connection

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Desktop Framework** | [Electron](https://www.electronjs.org/) 40.x |
| **UI Framework** | [React](https://react.dev/) 19.x |
| **Build Tool** | [Vite](https://vitejs.dev/) 7.x |
| **ORM** | [TypeORM](https://typeorm.io/) 0.3.x |
| **Database** | [SQLite3](https://www.sqlite.org/) |
| **Styling** | Tailwind CSS 4.x |
| **Language** | TypeScript 5.9.x |

---

## 📂 Project Structure

```
Meatify/
├── build/                   # Build assets (icons, etc.)
├── release/                 # Packaged releases
├── src/
│   ├── main/               # Electron main process
│   │   ├── core/           # Core modules (app config, env, logger, etc.)
│   │   ├── db/             # Database setup & migrations
│   │   ├── drivers/        # Hardware drivers (printer, cash drawer)
│   │   ├── ipc/            # IPC handlers
│   │   └── main/           # Main entry (index.js)
│   ├── renderer/           # React frontend
│   │   ├── api/            # API client layer
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React contexts (Settings, Pagination, etc.)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── pages/          # Page components
│   │   │   ├── Cashier/    # POS module
│   │   │   ├── inventory/  # Inventory management
│   │   │   ├── sales/      # Sales history & transactions
│   │   │   └── system/     # System settings
│   │   ├── styles/         # CSS styles
│   │   └── utils/          # Utility functions
│   ├── services/           # Service layer (CRUD operations)
│   ├── stateServices/      # State transitions & side effects
│   ├── subscribers/        # TypeORM entity subscribers
│   ├── entities/           # TypeORM entities (database models)
│   └── utils/              # Shared utilities
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🚀 Installation

### Prerequisites

- [Node.js](https://nodejs.org/) 18.x or higher
- [npm](https://www.npmjs.com/) 9.x or higher

### Setup

```bash
# Clone the repository
git clone https://github.com/CyberArcenal/meatify.git
cd meatify

# Install dependencies
npm install

# Rebuild native modules (sqlite3)
npm run rebuild
```

---

## 🛠️ Development

```bash
# Start development server (Vite + Electron)
npm run dev

# Run Electron app only (requires Vite to be running separately)
npm run electron:dev

# Run linter
npm run lint

# Type-check
npm run build:main
```

---

## 📦 Building

```bash
# Build for all platforms
npm run build

# Build for Windows (NSIS installer)
npm run dist:win

# Build for macOS (DMG)
npm run dist:mac

# Build for Linux (AppImage & deb)
npm run dist:linux
```

The built installers will be in the `release/` directory.

---

## 🗄️ Database Migrations

```bash
# Generate a migration from entity changes
npm run migration:generate -- src/migrations/MigrationName

# Run pending migrations
npm run migration:run

# Revert the last migration
npm run migration:revert
```

### Seeding Database

```bash
# Seed initial data (categories, suppliers, meats, batches)
npm run seed

# Reset and re-seed
npm run seed:reset
```

---

## ⚙️ Configuration

System settings are stored in the `system_settings` table and can be configured through the **Settings** page in the app. Key settings include:

- **General**: Company name, branch location, currency, timezone
- **Inventory**: Low stock threshold, FIFO, auto-reorder
- **Sales**: Tax rate, discounts, payment methods, loyalty program
- **Cashier**: Receipt printing, cash drawer, barcode scanning
- **Notifications**: Email (SMTP), SMS (Twilio), in-app alerts
- **Audit & Security**: Audit logging, log retention, security features

---

## 🔌 Hardware Support

### Receipt Printer

- ESC/POS thermal printers via USB
- Supports: Thermal, Dot Matrix, and Laser (fallback)

### Cash Drawer

- Via printer (ESC/POS commands)
- Direct USB, Serial, or Network connections

### Barcode Scanner

- Keyboard emulation via USB (auto-detects)
- Manual entry fallback

---

## 📊 Key Entities

| Entity | Purpose |
|--------|---------|
| `Meat` | Product catalog with SKU, price per kg |
| `Batch` | Inventory batches with quantity, cost, expiry date |
| `Sale` | Sales transactions with payment method, status |
| `SaleItem` | Per-item sale details (weight, price, discount, tax) |
| `Customer` | Customer profiles with loyalty points |
| `Purchase` | Purchase orders from suppliers |
| `ReturnRefund` | Return and refund transactions |
| `InventoryMovement` | Stock movement history |
| `LoyaltyTransaction` | Loyalty points earning/redemption history |

---

## 🧪 Testing

```bash
# Run all tests (coming soon)
npm run test

# Run specific test suite
npm run test -- --grep "SaleService"
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Write TypeScript with proper types
- Follow the existing code style
- Add JSDoc comments for public APIs
- Write tests for new features
- Update the README for significant changes

---

## 📄 License

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**CyberArcenal**
- GitHub: [@CyberArcenal](https://github.com/CyberArcenal)
- Email: cyberarcenal1@gmail.com

---

## 🙏 Acknowledgments

- [Electron](https://www.electronjs.org/) for the desktop framework
- [React](https://react.dev/) for the UI library
- [TypeORM](https://typeorm.io/) for the ORM
- [SQLite](https://www.sqlite.org/) for the embedded database
- [Vite](https://vitejs.dev/) for the build tool

---

## 📸 Screenshots

> *Coming soon – screenshots of the Cashier interface, Inventory management, and Reports dashboard.*

---

## 🔄 Changelog

### v1.0.0
- Initial release
- Batch inventory management with FIFO
- Sales & checkout workflow
- Loyalty program
- Refund management
- Purchase orders
- Receipt printing
- Cash drawer support
- Dark theme

---

**Made with ❤️ for meat shop owners**
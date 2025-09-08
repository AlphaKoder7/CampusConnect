# CampusConnect

A centralized, real-time platform for college community events and engagement.

## Project Vision

CampusConnect is designed to foster a more connected and engaged campus environment by providing a platform where students and faculty can discover, create, and participate in academic and social events.

## Features

- **Event Management**: Create public/private events with custom registration forms
- **Real-time Chat**: Live chat during events for registered attendees
- **Interactive Map**: Campus map showing event locations
- **Photo Galleries**: Post-event photo sharing
- **Role-based Access**: Students, Faculty, and Admin roles

## Technology Stack

### Frontend
- HTML5, CSS3, JavaScript (ES6+)
- Bootstrap 5
- Vite (build tool)

### Backend
- Azure Functions (Serverless)
- Node.js with TypeScript
- Azure Cosmos DB (NoSQL)
- Azure AD B2C (Authentication)
- Azure Web PubSub (Real-time chat)
- Azure Blob Storage (File storage)
- Azure Maps (Mapping)
- Azure Static Web Apps (Hosting)

## Project Structure

```
campusconnect/
├── frontend/          # Vite-based frontend application
├── backend/           # Azure Functions backend
├── package.json       # Root package.json for monorepo
└── README.md
```

## Getting Started

1. Install dependencies:
   ```bash
   npm run install:all
   ```

2. Start development servers:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Development

- Frontend runs on `http://localhost:5173` (Vite dev server)
- Backend runs on `http://localhost:7071` (Azure Functions Core Tools)

## License

MIT

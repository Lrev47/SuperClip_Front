# SuperClip

SuperClip is an Electron desktop application for managing AI prompts and command snippets. It allows users to store, categorize, and manage their prompts with a clean, modern dark-mode UI.

## Features

- **Authentication**: Secure login and registration
- **Prompt Management**: Create, edit, delete, and organize prompts
- **Categories**: Organize prompts with customizable categories
- **Search**: Quickly find prompts with full-text search
- **Clipboard Integration**: Copy prompts to clipboard with one click
- **OpenAI Integration**: Generate new prompts using AI
- **Export**: Export prompts to CSV format
- **Dark Mode UI**: Beautiful dark-themed interface

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS
- **State Management**: Redux Toolkit
- **Desktop Framework**: Electron
- **Backend**: Express.js, Prisma ORM, PostgreSQL (separate repository)

## Development Setup

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Backend server running (see backend repository)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/superclip.git
   cd superclip
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following content:
   ```
   VITE_API_URL=http://localhost:5000/api
   ```

4. Start the development server:
   ```
   npm start
   ```

This will start both the React development server and the Electron application.

## Building for Production

To build the application for production:

```
npm run build
npm run package
```

This will create distributable packages in the `release` directory.

## Project Structure

```
superclip/
├── electron/           # Electron main process files
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── layouts/        # Page layouts
│   ├── pages/          # Page components
│   ├── services/       # API services
│   ├── store/          # Redux store and slices
│   ├── styles/         # CSS styles
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   ├── App.tsx         # Main App component
│   └── main.tsx        # Entry point
├── public/             # Static assets
└── ...                 # Config files
```

## License

[MIT](LICENSE) 
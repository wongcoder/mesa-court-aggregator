# Court Aggregator

A Node.js application that aggregates court availability from multiple reservation systems into a Google Calendar-style interface.

## Project Structure

```
court-aggregator/
├── server.js              # Main Express.js server
├── package.json           # Node.js dependencies and scripts
├── README.md              # Project documentation
├── data/                  # Monthly JSON cache files
├── public/                # Static frontend assets
│   ├── index.html         # Main HTML page
│   ├── styles.css         # CSS styling
│   └── script.js          # Frontend JavaScript
├── services/              # Backend service modules
└── utils/                 # Utility modules
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Visit http://localhost:3000 to view the application

## Development

- The server runs on port 3000 by default
- Static files are served from the `public/` directory
- Health check available at `/health`

## Deployment

Designed to run efficiently on Raspberry Pi with minimal resource usage.
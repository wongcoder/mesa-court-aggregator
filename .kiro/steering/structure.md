# Project Structure

## Directory Organization

```
court-aggregator/
├── server.js              # Main Express.js server entry point
├── package.json           # Node.js dependencies and scripts
├── package-lock.json      # Locked dependency versions
├── README.md              # Project documentation
├── data/                  # Monthly JSON cache files
│   └── .gitkeep          # Keep empty directory in git
├── public/                # Static frontend assets
│   ├── index.html        # Main HTML page
│   ├── styles.css        # CSS styling
│   └── script.js         # Frontend JavaScript
├── services/              # Backend service modules
│   └── .gitkeep          # Keep empty directory in git
└── utils/                 # Utility modules
    └── .gitkeep          # Keep empty directory in git
```

## File Conventions

### Backend Structure
- **server.js**: Single-file Express server, main application entry point
- **services/**: Business logic modules for external API integration
- **utils/**: Shared utility functions and helpers
- **data/**: JSON cache files organized by month for court availability

### Frontend Structure
- **public/**: All static assets served directly by Express
- **index.html**: Single-page application entry point
- **styles.css**: Global styles, uses system fonts and modern CSS
- **script.js**: Vanilla JavaScript, no build process required

## Coding Conventions

### JavaScript Style
- Use modern ES6+ features (const/let, arrow functions, async/await)
- Prefer async/await over promises for readability
- Use descriptive variable names
- Include error handling for all external API calls

### CSS Style
- Use system fonts: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- Modern CSS with flexbox/grid layouts
- Consistent spacing and color scheme
- Mobile-responsive design

### File Naming
- Use kebab-case for directories and files
- Use camelCase for JavaScript variables and functions
- Use descriptive names that indicate purpose

## Module Organization
- Keep server.js minimal, move complex logic to services/
- Use utils/ for shared functions across multiple modules
- Maintain separation between frontend and backend code
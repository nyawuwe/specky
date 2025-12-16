# Specky 🦔

<p align="center">
  <img src="./assets/logo.png" alt="Specky Logo" width="150" />
</p>

<p align="center">
  <strong>Transform Swagger/OpenAPI specs into MCP servers for LLMs</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/specky"><img src="https://img.shields.io/npm/v/specky.svg" alt="npm version"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
</p>

---

Specky converts any Swagger/OpenAPI specification into a Model Context Protocol (MCP) server, enabling LLMs like Claude to interact with REST APIs intelligently.

## ✨ Features

- 🔍 **Smart Search Mode** (default) - 2 meta-tools instead of 100+ tools
- 🔄 **Full OpenAPI Support** - Swagger 2.0, OpenAPI 3.0 & 3.1
- 🔐 **Multiple Auth Methods** - API Key, Bearer, Basic, OAuth2
- 🎨 **Beautiful CLI** - Colors, spinners, ASCII art
- 🎯 **Filtering Options** - By tags, path patterns
- 📦 **Dual Usage** - CLI or library

## 🚀 Quick Start

```bash
# Install globally
npm install -g specky

# Start MCP server (search mode by default)
specky https://petstore.swagger.io/v2/swagger.json

# List available endpoints
specky ./api.yaml --list --verbose
```

## 🔍 Search Mode (Default)

Instead of exposing all API endpoints as tools, Specky provides **2 intelligent meta-tools**:

| Tool | Description |
|------|-------------|
| `search_endpoints` | Find relevant API endpoints by keywords |
| `call_endpoint` | Call any endpoint by its ID |

**Example LLM conversation:**
```
User: "Find all pet-related endpoints"
Claude: [calls search_endpoints(query="pet")]
        → Found: get_pet_pet_id, post_pet, delete_pet_pet_id...

User: "Get pet with ID 123"  
Claude: [calls call_endpoint(endpoint_id="get_pet_pet_id", petId=123)]
        → { "id": 123, "name": "Fido", "status": "available" }
```

### Why Search Mode?

| Problem with Full Mode | Search Mode Solution |
|------------------------|---------------------|
| 100+ tools overwhelm LLM context | Only 2 tools exposed |
| Model confusion choosing tools | Natural language search |
| Slow tool listing | Instant response |

## 📋 CLI Options

```
specky <spec> [options]

Arguments:
  spec                     Path or URL to Swagger/OpenAPI spec

Options:
  -m, --mode <mode>        Server mode: search (default) or full
  --tags <tags>            Filter by tags (comma-separated)
  --include <pattern>      Include paths matching regex
  --exclude <pattern>      Exclude paths matching regex
  -a, --auth <type>        Auth: none|apikey|bearer|basic|oauth2
  -t, --token <token>      Bearer token or API key
  -b, --base-url <url>     Override base URL
  -v, --verbose            Verbose output
  --list                   List endpoints and exit
  -h, --help               Show help
```

## 🔐 Authentication

```bash
# Bearer Token
specky api.yaml --auth bearer --token $TOKEN

# API Key
specky api.yaml --auth apikey --key $KEY --header X-API-Key

# Basic Auth
specky api.yaml --auth basic --username admin --password secret
```

## 🎯 Filtering

```bash
# Only pet and store endpoints
specky api.yaml --tags pet,store

# Only paths starting with /api/v2
specky api.yaml --include "^/api/v2"

# Exclude admin endpoints
specky api.yaml --exclude "/admin"
```

## 🔧 Claude Desktop Integration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "my-api": {
      "command": "npx",
      "args": ["specky", "https://api.example.com/swagger.json"]
    }
  }
}
```

## 📦 Library Usage

```typescript
import { createSearchModeServer } from 'specky';

const { server, tools, start } = await createSearchModeServer({
  spec: './swagger.json',
  auth: { type: 'bearer', token: process.env.API_TOKEN }
});

console.log(`Loaded ${tools.length} endpoints`);
await start();
```

## 📄 License

MIT © 2024

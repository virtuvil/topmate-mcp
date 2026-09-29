# Topmate MCP Server 🚀

A Model Context Protocol (MCP) server that connects your AI assistant (Antigravity IDE, Claude Desktop, Cursor) directly to your **Topmate** creator dashboard and profile API.

---

## ⚡ Features & Tools

- **`topmate_get_profile`**: Fetches real-time profile stats, booking counts, rating metrics, bio, notice buffer, and currency settings.
- **`topmate_list_services`**: Lists all active 1:1 sessions, priority DMs, packages, and digital products with pricing and strikeout anchors.
- **`topmate_update_service`**: Dynamically adjusts service title, pricing, psychological strikeout anchors, duration, and descriptions.
- **`topmate_update_theme`**: Toggles profile branding colors (e.g. Light Sky Blue `#80C4FF`, Stealth Dark `#0D1117`).
- **`topmate_configure_popup`**: Enables and customizes the exit-intent discount popup and top announcement header banner.
- **`topmate_list_bookings`**: Lists upcoming and past bookings directly inside the IDE.

---

## 🔒 Security & Privacy

This MCP server follows **zero-hardcoded-secret** principles:
- **No tokens or credentials** are stored in this repository.
- Authentication is handled exclusively through environment variables (`TOPMATE_TOKEN` and `TOPMATE_DEVICE_ID`).

---

## 📦 Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/virtuvil/topmate-mcp.git
cd topmate-mcp
npm install
```

### 2. Configure in your MCP Client (`mcp_config.json` or `claude_desktop_config.json`)

Add the following block to your `mcpServers` configuration:

```json
{
  "mcpServers": {
    "topmate": {
      "command": "node",
      "args": [
        "/path/to/topmate-mcp/index.mjs"
      ],
      "env": {
        "TOPMATE_TOKEN": "<YOUR_TOPMATE_API_TOKEN>",
        "TOPMATE_DEVICE_ID": "<YOUR_TOPMATE_DEVICE_ID>"
      }
    }
  }
}
```

---

## 📄 License
MIT License. Created by [Prasanth Elangovan](https://topmate.io/prasanth_elangovan).

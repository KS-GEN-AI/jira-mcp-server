# Jira communication server MCP Server
# Jira communication server MCP Server

Talk to Jira

This is a TypeScript-based MCP server that provides tools to interact with Jira. It demonstrates core MCP concepts by providing:

- Tools for executing JQL queries
- Tools for creating, editing, and deleting Jira tickets
- Tools for listing Jira projects and statuses

## Features

### Tools
- `execute_jql` - Execute a JQL query on Jira
  - Takes JQL query string and number of results as parameters
  - Returns the full response from Jira

- `get_only_ticket_name_and_description` - Get the name and description of the requested tickets
  - Takes JQL query string and number of results as parameters
  - Returns only the ticket name and description

- `create_ticket` - Create a ticket on Jira
  - Takes project key, summary, description, and issue type as required parameters
  - Creates a new ticket in Jira

- `list_projects` - List all the projects on Jira
  - Takes number of results as a parameter
  - Returns a list of projects

- `delete_ticket` - Delete a ticket on Jira
  - Takes issue id or key as a required parameter
  - Deletes the specified ticket

- `edit_ticket` - Edit a ticket on Jira
  - Takes issue id or key, summary, description, priority, labels, components, and custom fields as parameters
  - Edits the specified ticket

- `get_all_statuses` - Get all the statuses on Jira
  - Takes number of results as a parameter
  - Returns a list of statuses

- `assign_ticket` - Assign a ticket on Jira
  - Takes account id and issue id or key as required parameters
  - Assigns the specified ticket to the specified account

## Development

Install dependencies:
```bash
npm install
```

Build the server:
```bash
npm run build
```

For development with auto-rebuild:
```bash
npm run watch
```

## Installation

To use with Claude Desktop, add the server config:

On MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "Jira communication server": {
      "command": "node",
      "args": [
        "/PATH_TO_THE_PROJECT/build/index.js"
      ],
      "env": {
        "JIRA_URL": "https://XXXXXXXX.atlassian.net",
        "JIRA_API_MAIL": "Your email",
        "JIRA_API_KEY": "KEY_FROM : https://id.atlassian.com/manage-profile/security/api-tokens"
      }
    }
  }
}
```

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. We recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector), which is available as a package script:

```bash
npm run inspector
```

The Inspector will provide a URL to access debugging tools in your browser.

# Supabase MCP Server Setup - Final Instructions

Your Supabase project is now fully configured! Here's how to set up the MCP server to connect Claude Desktop to your database.

## Your Project Details

- **Project URL**: https://cpsvaupftkagflzavmah.supabase.co
- **Project Reference**: cpsvaupftkagflzavmah
- **Status**: ✅ All migrations applied successfully!

---

## Setting Up Supabase MCP Server

The Model Context Protocol (MCP) allows Claude Desktop to interact directly with your Supabase project - query data, manage schema, create migrations, etc.

### ⚠️ Important Security Notice

- **USE ONLY WITH DEVELOPMENT PROJECTS** - Never production!
- The MCP server will have full access to your project
- Always review AI-generated database changes before executing
- We'll configure it in **read-only mode** for safety

---

## Configuration Steps

### For Claude Desktop App

1. **Find your Claude Desktop config location**:

   **macOS**:
   ```bash
   ~/Library/Application Support/Claude/claude_desktop_config.json
   ```

   **Linux**:
   ```bash
   ~/.config/Claude/claude_desktop_config.json
   ```

   **Windows**:
   ```
   %APPDATA%\Claude\claude_desktop_config.json
   ```

2. **Create or edit the config file**:

   If the file doesn't exist, create it. Then add this configuration:

   ```json
   {
     "mcpServers": {
       "supabase": {
         "url": "https://mcp.supabase.com/mcp?read_only=true&project_ref=cpsvaupftkagflzavmah&features=database,docs"
       }
     }
   }
   ```

   **If you already have other MCP servers**, just add the `"supabase"` entry to the existing `"mcpServers"` object.

3. **Restart Claude Desktop**

   Completely quit and reopen Claude Desktop for the changes to take effect.

4. **Test the connection**

   In Claude Desktop, ask:
   ```
   "Can you connect to my Supabase project and list all tables?"
   ```

   You should see tables like: `profiles`, `courses`, `activities`, `questions`, `groups`, etc.

---

### For Cursor IDE

1. **Create `.cursor/mcp.json`** in your project root:

   ```bash
   mkdir -p .cursor
   ```

2. **Add this configuration**:

   ```json
   {
     "mcpServers": {
       "supabase": {
         "url": "https://mcp.supabase.com/mcp?read_only=true&project_ref=cpsvaupftkagflzavmah"
       }
     }
   }
   ```

3. **Restart Cursor**

4. **Test in Cursor's AI chat**:
   ```
   "Show me the schema of the messages table"
   ```

---

## MCP URL Parameters Explained

In the URL `https://mcp.supabase.com/mcp?read_only=true&project_ref=cpsvaupftkagflzavmah&features=database,docs`:

- **`read_only=true`**: Restricts to SELECT queries only (HIGHLY RECOMMENDED)
- **`project_ref=cpsvaupftkagflzavmah`**: Limits access to only this project
- **`features=database,docs`**: Only enables database operations and documentation

### Other Available Parameters

- Remove `read_only=true` if you want Claude to be able to INSERT/UPDATE/DELETE (⚠️ risky!)
- Change `features` to:
  - `database` - Only database operations
  - `docs` - Only documentation access
  - `database,docs,migrations` - Add migration capabilities

---

## What Can You Do With MCP?

Once connected, you can ask Claude to:

### Query & Explore
- "Show me all tables in my database"
- "What's the schema of the messages table?"
- "How many users are in the profiles table?"
- "Show me the RLS policies on the courses table"

### Schema Understanding
- "Explain the relationship between groups and group_members"
- "What indexes exist on the messages table?"
- "Show me all foreign keys in the database"

### Generate Code (Read-Only Mode)
- "Generate a TypeScript function to fetch recent messages"
- "Write a query to get all groups for an activity"
- "Show me how to insert a new course with proper types"

### Documentation
- "Explain how the turn-based round system works"
- "What are the required fields for creating an activity?"

### 🚫 With Read-Only Mode, Claude CANNOT:
- Create/modify tables
- Insert/update/delete data
- Create migrations
- Change RLS policies

This keeps your database safe while still providing powerful analysis!

---

## Troubleshooting

### MCP Server Not Showing Up

1. Check config file location is correct for your OS
2. Verify JSON syntax is valid (use a JSON validator)
3. Restart Claude Desktop/Cursor completely
4. Check Claude Desktop logs (Help → Show Logs)

### Authentication Errors

1. First connection will prompt you to authorize in browser
2. Follow the OAuth flow
3. Credentials are cached for future use
4. If stuck, delete cached credentials and try again

### Permission Errors

- Verify `project_ref=cpsvaupftkagflzavmah` is correct
- Check you're logged into the correct Supabase account
- Ensure your Supabase user has access to the project

### Can't See Tables

- Wait a few seconds after initial connection
- Try asking "Refresh the database schema"
- Check migrations were applied successfully (they were! ✅)

---

## Testing Your Setup

Try these commands in order to verify everything works:

1. **Basic connection**:
   ```
   "Connect to my Supabase project and confirm the connection"
   ```

2. **List tables**:
   ```
   "List all tables in the public schema"
   ```

3. **Check a specific table**:
   ```
   "Show me the structure of the profiles table"
   ```

4. **Understand relationships**:
   ```
   "Explain the relationship between activities, questions, and rounds"
   ```

5. **Query data** (if you've added any):
   ```
   "How many courses exist in the database?"
   ```

---

## Removing Read-Only Mode (⚠️ Advanced)

If you want to enable write access (for development only!):

```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp?project_ref=cpsvaupftkagflzavmah&features=database,migrations"
    }
  }
}
```

**Then Claude can:**
- Create tables and migrations
- Insert/update/delete data
- Modify schema
- Run any SQL

**⚠️ ALWAYS review changes before applying!**

---

## Next Steps

Now that your Supabase project and MCP are configured:

1. ✅ Database schema is live
2. ✅ RLS policies are active
3. ✅ Helper functions are available
4. ✅ TypeScript types are generated
5. ✅ MCP server is configured (just restart Claude!)

**Ready to build!** Start with:
- Implementing authentication flow
- Creating the teacher course management UI
- Building the student group discussion interface

Ask Claude to help you with any of these features using the MCP connection!

---

## Resources

- [Supabase MCP Documentation](https://supabase.com/docs/guides/getting-started/mcp)
- [Model Context Protocol Spec](https://modelcontextprotocol.io/)
- [Security Best Practices](https://supabase.com/docs/guides/getting-started/mcp#security-best-practices)

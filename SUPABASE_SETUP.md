# Supabase Setup Guide

## Step 1: Create Cloud Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click **"New Project"**
3. Fill in project details:
   - **Project Name**: `openchat`
   - **Database Password**: [Generate strong password - SAVE IT!]
   - **Region**: Choose closest to you
   - **Pricing Plan**: Free tier

4. Wait 2-3 minutes for provisioning

## Step 2: Get Credentials

1. Go to **Project Settings** (gear icon) → **API**
2. Copy these values to `.env.local`:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**
   - **service_role key** (keep secret!)

3. Also note your **Project Reference ID** (from Settings → General)

## Step 3: Update .env.local

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## Step 4: Link Project to Supabase CLI

```bash
# Login to Supabase CLI
npx supabase login

# Link your local project to cloud project
npx supabase link --project-ref your-project-ref

# Push migrations to cloud
npx supabase db push

# Generate TypeScript types
npx supabase gen types typescript --linked > types/database.types.ts
```

## Step 5: Verify Setup

```bash
# Test connection
npm run dev

# Open http://localhost:3000
```

---

# Supabase MCP Server Setup (For Claude Desktop)

## What is Supabase MCP Server?

The Model Context Protocol (MCP) server lets AI assistants (like Claude) interact directly with your Supabase project - querying data, managing schema, creating migrations, etc.

## Security Warning ⚠️

- **USE ONLY WITH DEVELOPMENT PROJECTS** - Never production!
- The MCP server has full access to your Supabase account
- Always review AI-generated database changes before executing
- Consider using `read_only=true` mode

## Installation for Claude Desktop

### Option 1: Remote MCP (Recommended)

1. **Create Claude Desktop config directory** (if using Claude Desktop app):
   ```bash
   # macOS
   mkdir -p ~/Library/Application\ Support/Claude/

   # Linux
   mkdir -p ~/.config/Claude/

   # Windows
   # %APPDATA%\Claude\
   ```

2. **Create/Edit `claude_desktop_config.json`**:
   ```json
   {
     "mcpServers": {
       "supabase": {
         "url": "https://mcp.supabase.com/mcp?read_only=true&project_ref=YOUR_PROJECT_REF&features=database,docs"
       }
     }
   }
   ```

   Replace `YOUR_PROJECT_REF` with your actual project reference ID.

3. **Restart Claude Desktop**

4. **Test the connection**: Ask Claude to list your Supabase tables

### Option 2: For Cursor IDE

Create `.cursor/mcp.json` in your project:
```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp?read_only=true&project_ref=YOUR_PROJECT_REF"
    }
  }
}
```

### MCP URL Parameters

- `read_only=true`: Restricts to read-only queries (RECOMMENDED)
- `project_ref=<id>`: Limits to specific project
- `features=database,docs`: Limits available tools

## Authentication

The MCP server will use **Dynamic Client Registration** by default:
- First time: You'll be prompted to authorize in browser
- Subsequent uses: Uses cached credentials

## What Can You Do With MCP?

Once connected, you can ask Claude to:
- "Show me all tables in my Supabase database"
- "Create a migration to add a new column"
- "Query the messages table for recent entries"
- "Generate TypeScript types for my schema"
- "Explain the RLS policies on the users table"

## Testing MCP Connection

After setup, in Claude Desktop or Cursor, try:
```
"Can you connect to my Supabase project and list all tables?"
```

## Troubleshooting

1. **MCP not appearing**: Restart your AI tool
2. **Authentication errors**: Clear cached credentials and re-authorize
3. **Permission errors**: Check project_ref and access token scopes

## Security Best Practices

✅ **DO:**
- Use with development/test projects only
- Use `read_only=true` when possible
- Scope to specific projects
- Review all AI-generated changes
- Use database branching

❌ **DON'T:**
- Connect to production databases
- Share MCP URLs with others
- Give full write access unless necessary
- Skip reviewing migrations/changes

---

## Next Steps

After Supabase is set up:

1. ✅ Push migrations to cloud: `npx supabase db push`
2. ✅ Update `.env.local` with credentials
3. ✅ Run `npm run dev` to test
4. ✅ Configure MCP server (optional but powerful)
5. ✅ Start building features!

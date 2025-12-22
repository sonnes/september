# Supabase Directory

This directory contains Supabase configuration, client initialization, and database migrations for September's cloud database.

## Purpose

Supabase provides:

- **Authentication** - User login and session management
- **Database** - PostgreSQL with Row Level Security (RLS)
- **Storage** - File storage for audio and documents
- **Realtime** - Live database updates
- **Full-text Search** - Message search capabilities

## Key Files

### Client Configuration

**[client.ts](client.ts)** - Browser-side Supabase client

- Used in Client Components
- Manages browser-side authentication
- Handles real-time subscriptions
- Uses cookies for session persistence

**Usage**:

```typescript
import supabase from '@/supabase/client';

const { data, error } = await supabase.from('messages').select('*');
```

**[server.ts](server.ts)** - Server-side Supabase client

- `createClient()` - Create server client for Server Components/Actions
- `updateSession()` - Middleware function for session management
- Handles cookie-based authentication
- Used in Server Components and API routes

**Usage**:

```typescript
import { createClient } from '@/supabase/server';

const supabase = await createClient();
const {
  data: { user },
} = await supabase.auth.getUser();
```

**[realtime.ts](realtime.ts)** - Realtime subscription helpers

- Real-time database change subscriptions
- Channel management
- Live updates for messages and data

### Configuration

**[config.toml](config.toml)** - Supabase project configuration

- Project settings
- Database connection details
- Storage bucket configuration
- Email templates configuration

### Email Templates

**[templates/](templates/)** - Email templates for authentication

- Confirmation emails
- Password reset emails
- Magic link emails

## Database Migrations

**[migrations/](migrations/)** - Database schema migrations

All migrations are SQL files that run in order:

1. **[20250716032911_remote_schema.sql](migrations/20250716032911_remote_schema.sql)** - Initial schema
2. **[20250717102711_create_accounts_table.sql](migrations/20250717102711_create_accounts_table.sql)** - User accounts table
3. **[20250718053711_create_docs_bucket.sql](migrations/20250718053711_create_docs_bucket.sql)** - Document storage bucket
4. **[20250718095523_create_messages_table.sql](migrations/20250718095523_create_messages_table.sql)** - Messages table with FTS
5. **[20250718095921_create_audio_bucket.sql](migrations/20250718095921_create_audio_bucket.sql)** - Audio storage bucket
6. **[20250919094119_alter_account_add_is_approved.sql](migrations/20250919094119_alter_account_add_is_approved.sql)** - Add approval flag
7. **[20251026063700_add_ai_config_fields.sql](migrations/20251026063700_add_ai_config_fields.sql)** - Add AI configuration fields

### Running Migrations

```bash
# Apply pending migrations
supabase db push

# Create new migration
supabase migration new migration_name

# Reset database (caution: deletes data)
supabase db reset
```

## Database Schema

### Tables

**accounts**

- User profile and settings
- AI configurations (corpus, persona, settings)
- Speech preferences (provider, voice, speed)
- Medical information
- Feature flags (onboarding, terms)

**messages**

- User messages with full-text search
- Message type (user/ai/system)
- Optional audio attachment
- Timestamps

### Storage Buckets

**audio**

- Audio recordings and TTS files
- Linked to messages via `audio_path`
- Public read, authenticated write

**docs**

- Uploaded documents
- Medical records
- Public read, authenticated write

### Row Level Security (RLS)

All tables have RLS policies:

- Users can only access their own data
- Policies enforce user_id checks
- Storage buckets respect authentication

## Authentication

### Auth Flow

1. User signs up/logs in via [/login](../app/login/)
2. Supabase creates session cookie
3. [Middleware](../middleware.ts) validates session on each request
4. Protected routes require valid session
5. Session refreshed automatically

### Session Management

Sessions are managed via HTTP-only cookies:

- Secure by default
- Auto-refresh on activity
- Expire after inactivity
- Can't be accessed by JavaScript

### Protected Routes

All routes under `/app/*` and `/api/*` are protected by middleware.

See [../middleware.ts](../middleware.ts) for implementation.

## Environment Variables

Required environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Security Notes**:

- `ANON_KEY` is safe to expose (public client)
- `SERVICE_ROLE_KEY` bypasses RLS (server-only, never expose)
- Store in `.env.local` (git-ignored)

## Service Integration

Services use Supabase for data persistence:

- **Messages Service** - [../services/messages/supabase.ts](../services/messages/supabase.ts)
- **Account Service** - [../packages/account)
- **Audio Service** - [../services/audio/supabase.ts](../services/audio/supabase.ts)

All services extend the base pattern:

```typescript
export class MessagesService {
  constructor(private supabase: SupabaseClient) {}

  async getMessages() {
    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}
```

## Real-time Updates

Subscribe to database changes:

```typescript
import { createClient } from '@/supabase/client';

const supabase = createClient();

const channel = supabase
  .channel('messages')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
    },
    payload => {
      console.log('New message:', payload.new);
    }
  )
  .subscribe();

// Cleanup
channel.unsubscribe();
```

## Storage Operations

### Upload File

```typescript
const { data, error } = await supabase.storage
  .from('audio')
  .upload(`${userId}/recording.mp3`, file);
```

### Download File

```typescript
const { data, error } = await supabase.storage.from('audio').download('path/to/file.mp3');
```

### Get Public URL

```typescript
const { data } = supabase.storage.from('audio').getPublicUrl('path/to/file.mp3');
```

## Development Workflow

### Local Development

1. Install Supabase CLI: `brew install supabase/tap/supabase`
2. Start local Supabase: `supabase start`
3. Apply migrations: `supabase db reset`
4. Update `.env.local` with local URLs

### Schema Changes

1. Make changes in SQL file or UI
2. Create migration: `supabase db diff -f migration_name`
3. Review generated SQL
4. Test locally: `supabase db reset`
5. Apply to production: `supabase db push`

### Type Generation

Generate TypeScript types from database schema:

```bash
supabase gen types typescript --local > types/supabase.ts
```

## Related Documentation

- [Services Directory](../services/README.md) - Services that use Supabase
- [Types Directory](../types/README.md) - TypeScript types for data
- [Middleware](../middleware.ts) - Authentication middleware
- [Triplit Directory](../triplit/README.md) - Local database alternative

Make sure all forms are using `react-hook-form`. `components/ui/form.tsx` components are for the form fields. Use `app/(app)/settings/ai/form.tsx` as an example.

Create a schema for messages in Triplit database. It’s same as supabase/migrations/20250718095523_create_messages_table.sql. `audio_path` in Triplit database is a data blob url.

Refactor `services/messages.ts` to be like provider pattern. Move it to `services/storage/provider-supabase.ts`. and implement `provider-triplit.ts` for Triplit database.

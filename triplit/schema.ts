import { Schema as S } from '@triplit/client';

export const schema = S.Collections({
  messages: {
    schema: S.Schema({
      id: S.Id({ format: 'uuidv4' }),
      text: S.String(),
      type: S.String(),
      user_id: S.String(),
      created_at: S.Date({ default: S.Default.now() }),
      audio: S.Json({ nullable: true }),
    }),
  },
  documents: {
    schema: S.Schema({
      id: S.Id({ format: 'uuidv4' }),
      name: S.String(),
      content: S.String(),
      created_at: S.Date({ default: S.Default.now() }),
      updated_at: S.Date({ default: S.Default.now() }),
    }),
  },
});

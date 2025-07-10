import { Schema as S } from '@triplit/client';

export const schema = S.Collections({
  messages: {
    schema: S.Schema({
      id: S.Id({ format: 'uuidv4' }),
      text: S.String(),
      authorId: S.String(),
      createdAt: S.Date({ default: S.Default.now() }),
      audioBlob: S.String({ nullable: true }),
      alignment: S.Json({ nullable: true }),
    }),
  },
});

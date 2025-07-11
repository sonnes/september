import { Schema as S } from '@triplit/client';

export const schema = S.Collections({
  messages: {
    schema: S.Schema({
      id: S.Id({ format: 'uuidv4' }),
      text: S.String(),
      author_id: S.String(),
      created_at: S.Date({ default: S.Default.now() }),
      audio: S.Json({ nullable: true }),
    }),
  },
  decks: {
    schema: S.Schema({
      id: S.Id({ format: 'uuidv4' }),
      name: S.String(),
      created_at: S.Date({ default: S.Default.now() }),
      updated_at: S.Date({ default: S.Default.now() }),
      author_id: S.String({ nullable: true }),
    }),
    relationships: {
      cards: S.RelationMany('cards', {
        where: [['deck_id', '=', 'decks.id']],
      }),
    },
  },
  cards: {
    schema: S.Schema({
      id: S.Id({ format: 'uuidv4' }),
      text: S.String(),
      rank: S.Number(),
      created_at: S.Date({ default: S.Default.now() }),
      deck_id: S.String(),
      audio: S.Json({ nullable: true }),
    }),
  },
});

import 'fake-indexeddb/auto';

import { describe, expect, it } from 'vitest';

import { accountCollection } from './account/account-store';
import { noteCollection } from './notes/db';
import { messageCollection, savedPhraseCollection, spaceCollection } from './spaces/db';
import { analyticsCollection } from './usage/store';

type IndexedCollection = {
  indexes: Map<number, { matchesField: (fieldPath: Array<string>) => boolean }>;
};

function expectIndexedFields(collection: IndexedCollection, fields: Array<string>) {
  const indexes = Array.from(collection.indexes.values());

  for (const field of fields) {
    expect(indexes.some(index => index.matchesField([field])), `${field} should be indexed`).toBe(true);
  }
}

describe('indexable live-query fields', () => {
  it('indexes account query fields', () => {
    expectIndexedFields(accountCollection, ['id']);
  });

  it('indexes note query fields', () => {
    expectIndexedFields(noteCollection, ['id', 'space_id', 'updated_at']);
  });

  it('indexes space query fields', () => {
    expectIndexedFields(spaceCollection, ['user_id', 'updated_at']);
  });

  it('indexes message query fields', () => {
    expectIndexedFields(messageCollection, ['space_id', 'created_at']);
  });

  it('indexes saved-phrase query fields', () => {
    expectIndexedFields(savedPhraseCollection, ['space_id', 'created_at']);
  });

  it('indexes analytics query fields', () => {
    expectIndexedFields(analyticsCollection, ['timestamp', 'user_id']);
  });
});

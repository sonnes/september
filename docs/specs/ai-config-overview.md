# AI Configuration - Overview & Implementation Plan

## Purpose

This document provides a high-level overview of the AI configuration system redesign for the September application. It serves as the entry point for understanding the architecture and links to detailed specifications.

---

## Problem Statement

The current AI configuration system has the following limitations:

1. **Tightly Coupled**: All AI settings stored in scattered fields (`gemini_api_key`, `speech_provider`, etc.)
2. **Inflexible**: Hard to add new providers or features
3. **Inconsistent**: Different patterns for different AI features
4. **Limited**: Single provider per feature type
5. **Unclear Security**: API keys mixed with general settings

---

## Solution Overview

A redesigned AI configuration system with:

1. **Separate Fields**: Each feature config in its own column
2. **Provider Flexibility**: Easy to add/switch providers
3. **Security First**: Sensitive data isolated and encrypted
4. **Type Safety**: Strong TypeScript types throughout
5. **Symmetric Schema**: Same structure in Supabase and Triplit

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         User Interface                       │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────┐│
│  │ Provider Config │  │ Feature Settings │  │   Status    ││
│  │     Forms       │  │     Toggles      │  │ Indicators  ││
│  └─────────────────┘  └──────────────────┘  └─────────────┘│
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                      Service Layer                           │
│  ┌─────────────┐  ┌────────────┐  ┌────────────────────┐   │
│  │   Account   │  │ AI Feature │  │  Provider Registry │   │
│  │   Hooks     │  │   Hooks    │  │                    │   │
│  └─────────────┘  └────────────┘  └────────────────────┘   │
│  ┌─────────────┐  ┌────────────┐  ┌────────────────────┐   │
│  │  Migration  │  │   API      │  │   Rate Limiting    │   │
│  │  Utilities  │  │  Routes    │  │                    │   │
│  └─────────────┘  └────────────┘  └────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                      Storage Layer                           │
│  ┌─────────────────────────────┐  ┌──────────────────────┐ │
│  │        Supabase             │  │      Triplit         │ │
│  │  ┌────────────────────────┐ │  │  ┌────────────────┐ │ │
│  │  │ ai_suggestions         │ │  │  │ ai_suggestions │ │ │
│  │  │ ai_transcription       │ │  │  │ ai_transcription│ │
│  │  │ ai_speech              │ │  │  │ ai_speech      │ │ │
│  │  │ ai_providers (secret)  │ │  │  │ (no secrets)   │ │ │
│  │  └────────────────────────┘ │  │  └────────────────┘ │ │
│  └─────────────────────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Feature Set

### AI Features Supported

1. **Suggestions**: AI-powered typing suggestions
   - Providers: Gemini, OpenAI, Anthropic
   - Settings: temperature, maxSuggestions, contextWindow

2. **Transcription**: Speech-to-text conversion
   - Providers: Gemini, Whisper, AssemblyAI
   - Settings: language, detectLanguage, filterProfanity

3. **Speech**: Text-to-speech synthesis
   - Providers: Gemini, ElevenLabs, Browser
   - Settings: voiceId, speed, pitch, volume

### Provider Support

| Provider    | Suggestions | Transcription | Speech | API Key Required |
|-------------|-------------|---------------|--------|------------------|
| Gemini      | ✅          | ✅            | ✅     | Yes              |
| OpenAI      | ✅          | ✅            | ❌     | Yes              |
| Anthropic   | ✅          | ❌            | ❌     | Yes              |
| Whisper     | ❌          | ✅            | ❌     | Yes              |
| AssemblyAI  | ❌          | ✅            | ❌     | Yes              |
| ElevenLabs  | ❌          | ❌            | ✅     | Yes              |
| Browser TTS | ❌          | ❌            | ✅     | No               |

---

## Detailed Specifications

This overview links to the following detailed specifications:

1. **[Storage Specification](./ai-config-storage.md)**
   - Database schemas (Supabase & Triplit)
   - TypeScript type definitions
   - Security considerations
   - Rollback plan

2. **[Services Specification](./ai-config-services.md)**
   - Provider registry
   - Migration utilities
   - Account service hooks
   - API routes
   - Rate limiting

3. **[UI Specification](./ai-config-ui.md)**
   - Component architecture
   - Form validation
   - User flows
   - Error states
   - Accessibility

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

**Goal**: Create type definitions and core utilities

- [ ] Create `types/ai-config.ts` with all type definitions
- [ ] Create `services/ai/registry.ts` with provider registry
- [ ] Create `lib/ai/defaults.ts` with default configurations
- [ ] Create `lib/ai/migration.ts` with migration utilities
- [ ] Write unit tests for migration logic

**Deliverables**:
- Type-safe configuration system
- Provider registry
- Migration utilities tested

### Phase 2: Storage (Week 1-2)

**Goal**: Update database schemas

- [ ] Create Supabase migration SQL file
- [ ] Update Triplit schema
- [ ] Test migration locally
- [ ] Deploy migration to staging
- [ ] Create rollback plan
- [ ] Verify data integrity

**Deliverables**:
- New database columns
- Schema documentation
- Tested rollback procedure

### Phase 3: Services (Week 2)

**Goal**: Implement service layer

- [ ] Update `types/account.ts`
- [ ] Update `services/account/use-supabase.tsx`
- [ ] Update `services/account/use-triplit.tsx`
- [ ] Create `hooks/use-ai-features.ts`
- [ ] Create `lib/ai/security.ts`
- [ ] Update existing hooks to use new configs

**Deliverables**:
- Account service updated
- Feature access hooks
- Security utilities

### Phase 4: API Routes (Week 2-3)

**Goal**: Update API endpoints

- [ ] Update `app/api/ai/suggestions/route.ts`
- [ ] Update `app/api/ai/transcription/route.ts`
- [ ] Update speech API route (if needed)
- [ ] Add comprehensive error handling
- [ ] Implement rate limiting
- [ ] Add analytics tracking

**Deliverables**:
- Updated API routes
- Rate limiting implemented
- Error handling improved

### Phase 5: Data Migration (Week 3)

**Goal**: Migrate existing user data

- [ ] Create migration script for existing accounts
- [ ] Test migration with sample data
- [ ] Run migration on staging
- [ ] Verify data integrity
- [ ] Monitor for errors
- [ ] Run migration on production

**Deliverables**:
- All users migrated to new schema
- Zero data loss
- Backward compatibility maintained

### Phase 6: UI Implementation (Week 3-4)

**Goal**: Build user interface

- [ ] Create provider configuration form
- [ ] Create feature settings form
- [ ] Create status indicators
- [ ] Implement validation
- [ ] Add error messages
- [ ] Test accessibility
- [ ] Responsive design testing

**Deliverables**:
- Complete settings UI
- Accessible forms
- Mobile-responsive

### Phase 7: Testing & Polish (Week 4)

**Goal**: Comprehensive testing

- [ ] Unit tests for all components
- [ ] Integration tests for flows
- [ ] E2E tests for critical paths
- [ ] Performance testing
- [ ] Security audit
- [ ] Documentation updates

**Deliverables**:
- Test coverage > 80%
- All critical paths tested
- Documentation complete

### Phase 8: Cleanup (Week 4+)

**Goal**: Remove legacy code

- [ ] Mark deprecated fields in types
- [ ] Add deprecation warnings to old APIs
- [ ] Update documentation
- [ ] Remove legacy code (after grace period)
- [ ] Final security review

**Deliverables**:
- Clean codebase
- Updated docs
- No deprecated code

---

## Migration Strategy

### Backward Compatibility

**Phase 1-2 (Weeks 1-3)**: Dual Support
- Both old and new fields exist
- Read from new fields, fall back to old
- Write to both old and new fields
- No breaking changes

**Phase 3 (Weeks 3-4)**: Deprecation Warnings
- Log warnings when old fields used
- Encourage users to update settings
- Monitor usage metrics

**Phase 4 (Week 5+)**: Legacy Removal
- Stop writing to old fields
- Remove old field reading logic
- Drop old database columns (after 90 days)

### Data Migration Script

```typescript
// File: scripts/migrate-ai-config.ts
import { AccountsService } from '@/services/account/supabase';
import { migrateAccountAIConfig } from '@/lib/ai/migration';

async function migrateAllAccounts() {
  const service = new AccountsService();
  const accounts = await service.getAll();

  let success = 0;
  let failed = 0;

  for (const account of accounts) {
    try {
      const migrated = migrateAccountAIConfig(account);
      await service.update(account.id, migrated);
      success++;
    } catch (error) {
      console.error(`Failed to migrate account ${account.id}:`, error);
      failed++;
    }
  }

  console.log(`Migration complete: ${success} succeeded, ${failed} failed`);
}
```

---

## Success Metrics

### Technical Metrics

- **Migration Success Rate**: > 99%
- **API Error Rate**: < 0.5%
- **Response Time**: < 200ms (p95)
- **Test Coverage**: > 80%

### User Experience Metrics

- **Setup Completion Rate**: > 70%
- **Feature Adoption**: +20% vs current
- **Settings Changes**: Track provider switching
- **Support Tickets**: < 5 related issues/week

### Business Metrics

- **AI Feature Usage**: +30% increase
- **User Retention**: Maintain or improve
- **Cost per Request**: Monitor API costs
- **Time to Add New Provider**: < 1 day

---

## Security Checklist

- [ ] API keys never sent to client
- [ ] API keys encrypted at rest
- [ ] RLS policies enforced in Supabase
- [ ] No credentials in Triplit/local storage
- [ ] Rate limiting implemented
- [ ] Input validation on all forms
- [ ] CSRF protection on API routes
- [ ] Audit logging for config changes

---

## Rollback Plan

### Level 1: Configuration Rollback
- Disable new features via feature flags
- Revert to old configuration reading
- No database changes needed
- **Time**: < 5 minutes

### Level 2: Service Rollback
- Deploy previous service version
- Keep database changes
- Graceful degradation
- **Time**: < 15 minutes

### Level 3: Full Rollback
- Revert database migration
- Deploy previous code version
- Restore from backup if needed
- **Time**: < 1 hour

---

## Documentation Updates

Required documentation updates:

1. **README.md**: Update setup instructions
2. **CLAUDE.md**: Document new architecture
3. **API Docs**: Update endpoint documentation
4. **User Guide**: Settings page instructions
5. **Developer Guide**: Adding new providers

---

## Future Enhancements

### Post-Launch Improvements

1. **Multi-Provider Support**: Use multiple providers simultaneously
2. **Usage Analytics**: Dashboard for API usage
3. **Cost Optimization**: Smart provider routing
4. **Advanced Settings**: Per-message provider selection
5. **Caching**: Response caching for common queries
6. **Webhooks**: Notify on quota limits
7. **Team Management**: Share API keys across team

---

## Questions & Decisions

### Open Questions

1. **Provider Fallback**: Should we automatically fall back to another provider if one fails?
2. **Cost Limits**: Should we implement spending limits per user/provider?
3. **Caching Strategy**: What responses should be cached?
4. **Migration Timeline**: How long should we support legacy fields?

### Key Decisions

1. ✅ **Separate Fields**: Each feature gets its own column (not nested JSON)
2. ✅ **Symmetric Schema**: Same structure in Supabase and Triplit
3. ✅ **Security First**: Provider config isolated from feature config
4. ✅ **Gradual Migration**: Support both old and new for transition period
5. ✅ **Base URL Support**: Allow custom base URLs for all providers

---

## Getting Help

- **Technical Questions**: Review detailed specs linked above
- **Implementation Help**: Check code examples in specs
- **Migration Issues**: See rollback plan section
- **Security Concerns**: Review security checklist

---

## Related Documents

- [Storage Specification](./ai-config-storage.md)
- [Services Specification](./ai-config-services.md)
- [UI Specification](./ai-config-ui.md)
- [CLAUDE.md](/CLAUDE.md)

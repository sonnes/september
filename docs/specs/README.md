# AI Configuration Specifications

This directory contains the detailed specifications for the AI configuration system redesign in the September application.

## 📚 Document Structure

The specifications are organized into four focused documents:

### 1. [Overview](./ai-config-overview.md) - **Start Here**
High-level architecture, implementation plan, and project roadmap.

**Read this if you want to:**
- Understand the problem and solution
- See the big picture architecture
- Review implementation phases
- Check success metrics and timelines

### 2. [Storage](./ai-config-storage.md)
Database schemas, type definitions, and data layer.

**Read this if you want to:**
- Understand the database schema
- Review TypeScript types
- Learn about security considerations
- See migration and rollback plans

### 3. [Services](./ai-config-services.md)
Business logic, hooks, API routes, and server-side operations.

**Read this if you want to:**
- Implement provider registry
- Create migration utilities
- Update account services
- Build API endpoints
- Add rate limiting

### 4. [UI](./ai-config-ui.md)
User interface components, forms, and user interactions.

**Read this if you want to:**
- Build settings forms
- Create provider configuration UI
- Implement validation
- Handle error states
- Ensure accessibility

---

## 🚀 Quick Start Guide

### For Developers

**Implementing a new feature?**
1. Read [Overview](./ai-config-overview.md) for context
2. Review [Storage](./ai-config-storage.md) for data types
3. Check [Services](./ai-config-services.md) for business logic
4. Reference [UI](./ai-config-ui.md) for component patterns

**Adding a new provider?**
1. Update provider registry in [Services](./ai-config-services.md#provider-registry)
2. Add provider config type in [Storage](./ai-config-storage.md#core-types)
3. Create provider form in [UI](./ai-config-ui.md#provider-configuration-form)

### For Product/Design

**Understanding user flows?**
- Start with [UI Specification](./ai-config-ui.md#user-flows)
- Review error states and messaging
- Check accessibility requirements

**Planning roadmap?**
- Review [Implementation Phases](./ai-config-overview.md#implementation-phases)
- Check [Success Metrics](./ai-config-overview.md#success-metrics)

### For QA/Testing

**Writing test plans?**
- Review [Testing Requirements](./ai-config-ui.md#testing-requirements)
- Check [User Flows](./ai-config-ui.md#user-flows)
- See [Error States](./ai-config-ui.md#error-states)

---

## 📋 Implementation Checklist

Use this checklist to track implementation progress:

### Phase 1: Foundation
- [ ] Create type definitions (`types/ai-config.ts`)
- [ ] Create provider registry (`services/ai/registry.ts`)
- [ ] Create default configs (`lib/ai/defaults.ts`)
- [ ] Create migration utilities (`lib/ai/migration.ts`)
- [ ] Write unit tests

### Phase 2: Storage
- [ ] Create Supabase migration
- [ ] Update Triplit schema
- [ ] Test migration locally
- [ ] Deploy to staging

### Phase 3: Services
- [ ] Update account hooks
- [ ] Create feature access hooks
- [ ] Add security utilities

### Phase 4: API Routes
- [ ] Update suggestions API
- [ ] Update transcription API
- [ ] Add rate limiting

### Phase 5: Data Migration
- [ ] Create migration script
- [ ] Test on staging
- [ ] Run on production

### Phase 6: UI
- [ ] Provider config form
- [ ] Feature settings form
- [ ] Status indicators
- [ ] Error handling

### Phase 7: Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Accessibility testing

### Phase 8: Cleanup
- [ ] Remove legacy code
- [ ] Update documentation

---

## 🎯 Key Design Decisions

### Why Separate Fields?

**Decision**: Each AI feature has its own database column (`ai_suggestions`, `ai_transcription`, `ai_speech`)

**Rationale**:
- Better query performance
- Simpler TypeScript types
- Easier to add/remove features
- Clear data structure

**Alternative Considered**: Single `ai_config` JSON column with nested features
- **Rejected**: Harder to query, weaker type safety

### Why Symmetric Schema?

**Decision**: Same schema structure in Supabase and Triplit

**Rationale**:
- Consistent developer experience
- Easier to switch between auth/unauth states
- Simpler migration logic
- Code reuse between services

### Why Separate Provider Config?

**Decision**: `ai_providers` field separate from feature configs

**Rationale**:
- Security: Isolate sensitive API keys
- Flexibility: One provider for multiple features
- Clarity: Clear separation of concerns
- Never store credentials in local storage

---

## 🔐 Security Principles

All specifications follow these security principles:

1. **API Keys Never to Client**: Server-side only access
2. **Encryption at Rest**: Sensitive data encrypted in Supabase
3. **No Local Storage**: Never store credentials in Triplit
4. **RLS Policies**: Row-level security in Supabase
5. **Rate Limiting**: Prevent abuse
6. **Input Validation**: All user input validated

---

## 🧪 Testing Strategy

### Unit Tests
- All utility functions (migration, validation)
- React hooks (feature access, account updates)
- Form validation schemas

### Integration Tests
- Account service updates
- API route handlers
- Provider switching flows

### E2E Tests
- Complete setup flow
- Provider configuration
- Feature enablement
- Error handling

---

## 📊 Success Criteria

The implementation is considered successful when:

- ✅ All existing features work with new system
- ✅ Migration success rate > 99%
- ✅ API error rate < 0.5%
- ✅ Test coverage > 80%
- ✅ Zero data loss during migration
- ✅ Backward compatibility maintained
- ✅ Documentation complete

---

## 🤝 Contributing

When updating these specifications:

1. **Update Related Docs**: If you change one spec, check if others need updates
2. **Follow Structure**: Maintain consistent formatting and structure
3. **Add Examples**: Include code examples for clarity
4. **Link Between Docs**: Use relative links to connect related sections
5. **Version Control**: Document breaking changes in commit messages

---

## 📞 Getting Help

**Questions about the specs?**
- Review the [Overview](./ai-config-overview.md) first
- Check if your question is answered in detailed specs
- Look at code examples in each spec

**Found an issue?**
- Check if it's already in [Open Questions](./ai-config-overview.md#open-questions)
- Document the concern clearly
- Suggest alternative approaches

**Need to make a change?**
- Update the relevant spec document
- Check cross-references in other specs
- Update implementation checklist if needed

---

## 📝 Document Maintenance

These specs should be updated:

- **Before Implementation**: Review and refine details
- **During Implementation**: Document discoveries and decisions
- **After Implementation**: Update with final implementation details
- **Post-Launch**: Add learnings and future enhancements

---

## 🔗 Related Resources

- [CLAUDE.md](/CLAUDE.md) - Project development guide
- [README.md](/README.md) - Project overview
- Main implementation tracked in project board

---

Last Updated: 2025-01-26

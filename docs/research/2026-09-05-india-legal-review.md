---
title: India-focused terms and privacy review
description: Sources and data flows behind September’s personal open-source project notices.
package: web
---

# India-focused terms and privacy review

Reviewed on 5 September 2026. The notices are in
`apps/web/src/pages/legal.tsx`, at `/privacy-policy` and `/terms-of-service`.
The user confirmed that September is a personal open-source project, not a company.

## What changed

The former legal routes were removed in commit `8f1a431` during the shared-UI
migration. Their previous content described Gemini, transcription, account
behaviour, and an under-13 threshold that do not fit this release. It also
claimed short-lived provider processing without evidence.

The privacy notice describes local storage, provider calls, voice cloning,
camera processing, keyboard access, exports, and website metadata.
The terms follow the MIT approach, with broad reuse permissions, no warranty,
and liability exclusions to the extent permitted by law. The standard MIT
`LICENSE` was missing despite the README referencing it; it has been added.
Its wording follows the [Open Source Initiative text](https://opensource.org/license/mit).

The notices no longer invent a company identity, Grievance Officer, postal
address, private inbox, or guaranteed support response time. GitHub is the
existing public contact route. Users are told to request private contact
without posting sensitive details. There is no claim that this substitutes
for a statutory grievance mechanism where one is required.

The terms impose no blanket adult-only restriction on MIT-licensed software.
The privacy notice explains the lack of parental verification and the need for
appropriate permissions before sending children’s information to providers.

## Indian legal sources

- [SPDI Rules, 2011, official text reproduced by WIPO](https://www.wipo.int/wipolex/en/legislation/details/15063):
  rules 4–8 address a published privacy policy, necessary collection, consent,
  correction, withdrawal, retention, disclosures, transfers, and security.
  Rule 5(9) requires a named Grievance Officer and redress within one month.
  Application depends on the operator and processing, including sensitive data.
- [DPDP Act commencement notification, G.S.R. 843(E)](https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf):
  substantive processing and individual-rights provisions start eighteen months
  after Gazette publication. They are not yet operative on this review date.
  Section 44(2), which removes IT Act section 43A, is in that later phase too.
- [Final DPDP Rules, 2025, G.S.R. 846(E)](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf):
  rule 1 gives phased commencement. Rules 3, 10, 11, and 14 address notices,
  parental/guardian verification, and rights handling. A privacy notice does not
  implement those processes. The published Gazette, rather than a summary
  describing the framework as fully operational, controls this assessment.
- [DPDP Act, 2023](https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf):
  sections 11–14 describe access information, correction/erasure, grievance
  redressal, and nomination for death or incapacity. The notices condition
  statutory rights on commencement and applicability.

Personal or open-source status is not a blanket exemption from these laws.
The notice does not claim compliance certification or waive statutory duties.
Applicability depends on actual processing and the relevant commencement dates.

## Code facts used

- `apps/web/src/services/repository.ts`: IndexedDB and bounded speech cache.
- `apps/web/src/services/ai.ts`: OpenRouter, model selection, and personal context.
- `apps/web/src/services/cloning.ts`: direct recording upload to ElevenLabs.
- `apps/web/src/services/video.ts`: local video assembly and jsDelivr code download.
- `apps/web/src/services/analytics.ts`: masked URL/title; other tracker fields
  are preserved. No assumption that all analytics metadata is anonymous.
- `.github/workflows/production.yaml`: Vercel hosting and optional Umami variables.
- `apps/desktop/src-tauri`: SQLite, Keychain, local Apple model, audio and camera.
- `docs/concepts/input-mirroring.md`: local focused-field reading and password exclusion.

The provider links were checked: [OpenRouter](https://openrouter.ai/privacy),
[ElevenLabs](https://elevenlabs.io/privacy-policy), and
[Apple](https://www.apple.com/legal/privacy/). Providers control their own
retention and downstream processing; the notice makes no zero-retention promise.

## Operational limits

The repository establishes the software’s data flows, not the live hosting or
Umami retention configuration. Those details must match the notice. No private
support inbox, statutory grievance procedure, consent workflow, or parental
verification was created by this change. If the applicable law requires one,
the MIT licence does not remove that requirement.

## Server removal

The user requested deletion of the server module. Its source, Worker configuration,
workspace lockfile importer, and Makefile targets were removed. Vercel is the
remaining documented deployment path. No remote Worker, bucket, or stored data
was deleted. Local source removal does not retire an existing remote deployment.

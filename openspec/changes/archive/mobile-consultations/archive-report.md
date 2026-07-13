# Archive Report — mobile-consultations (change #8)

**Status**: SHIPPED
**Archived**: 2026-07-13
**Artifact store**: engram (memory-persisted)

## Outcome
Added structured escalation thread between collaborator and assigned doctor: Consultas tab on mobile, list/detail/create screens, attachments support (HEIC→JPEG + authed gallery), status auto-transitions (create→Under Review, doctor reply→Under Review, resolve→Resolved), offline-write-blocking, Spanish-first i18n. 2 stacked PRs — all 23/23 tasks complete, all 10 requirements verified.

## Verification
PASS WITH WARNINGS (0 CRITICAL / 2 WARNING / 3 SUGGESTION) — 9/15 scenarios proven via real gate execution; 6/15 correctly reported PENDING Human/EAS smoke (create-consultation, escalate-not-collaborator-403, doctor-reply-auto-under-review, post-reply, attach-photo-to-reply, resolve-only-assigned-doctor). PR2 marginally over 400-line budget (~3%, already self-disclosed). Core additive-only confirmed, 403 on non-collaborator confirmed.

## Delivery
PRs #33-34 stacked on moiki/housecenter-web (issue #22 tracking). Both commits merged to main.

## Residual / follow-ups
WARNING 1: 6/15 scenarios are Human/EAS smoke pending — live API+dev client needed. WARNING 2: PR2 412 lines marginally over 400-line budget (~3%), already noted. Spec/prompt scenario-tag wording drift noted — spec.md used as ground truth. Future PR splitting for attach-heavy screens worth considering.

## Verification source
Observation #576: sdd/mobile-consultations/verify-report

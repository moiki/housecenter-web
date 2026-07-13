# Archive Report — mobile-attachments-camera (change #7)

**Status**: SHIPPED
**Archived**: 2026-07-13
**Artifact store**: engram (memory-persisted)

## Outcome
Added photo capture/attach to mobile: pick via camera/library, HEIC→JPEG convert + downscale to 1600px/0.75 quality, multipart upload with onUploadProgress, authed gallery via AuthedImage (expo-image with Bearer header), offline-gatekeeping, Fotos tab on Patient + nested in Treatment. 3 stacked PRs — all ~25-27 tasks complete, all 13 requirements verified.

## Verification
PASS WITH WARNINGS (0 CRITICAL / 2 WARNING / 5 SUGGESTION) — 9/14 scenarios proven via real gate execution; 5/14 Human/EAS smoke pending (pick-camera, pick-library, heic-to-jpeg-downscale, upload-with-progress, authed-thumbnail-displays). Web byte-unchanged confirmed. Offline-write gating verified, 2 usage sites confirmed.

## Delivery
PRs #30-32 stacked on moiki/housecenter-web (issue #29 tracking). All 3 commits merged to main.

## Residual / follow-ups
WARNING 1: **D2b RN multipart-boundary risk is structurally addressed but functionally UNVERIFIED** — whether RN's XHR + axios's RN adapter auto-injects correct boundary at runtime requires real device POST to API. Design.md flags with fallback (manual boundary if needed). WARNING 2: 5 Human/EAS smoke scenarios unexecuted. Optional: disableLibdav1d (AV1 decoder) not configured — APK size optimization for future.

## Verification source
Observation #567: sdd/mobile-attachments-camera/verify-report

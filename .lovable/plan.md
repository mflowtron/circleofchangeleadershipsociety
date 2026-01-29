
Goal
- Stop the “Cannot transition to a new state, already under transition” camera-start failure by removing the multi-preset fallback ladder and returning the QR scanner to conservative, widely-compatible settings, while still scanning the entire frame (no qrbox crop).

What’s happening now (root cause)
- The current scanner start uses a looped “try many presets” strategy (startQrWithFallback). Even though it calls stop between attempts, html5-qrcode’s internal state machine can still be “transitioning” (start/stop not fully settled) when the next start begins, causing: “Cannot transition to a new state, already under transition”.
- Additionally, the QRScanner component’s effect can re-run (isActive/currentCamera/hasPermission changes), potentially triggering overlapping start/stop sequences.

Proposed changes (high-level)
1) Remove the “fancy” fallback ladder (resolution/FPS presets) entirely.
2) Implement a single, serialized start/stop pipeline so html5-qrcode never receives start/stop calls concurrently.
3) Use “safe defaults” for constraints and scan config:
   - Camera constraints: prefer environment-facing camera; avoid explicit width/height constraints by default.
   - Scan config: moderate FPS (15–20), no qrbox (scan full frame), QR-only format, keep native BarcodeDetector enabled if supported.

Files to change
- src/components/events/checkin/QRScanner.tsx (main change)
- src/components/events/checkin/qrScannerFallback.ts (optional cleanup: remove if no longer used)

Detailed implementation plan

A) QRScanner.tsx — remove preset-based fallback logic
- Remove imports:
  - startQrWithFallback
  - serializeDomError (if it only exists in qrScannerFallback after removal; otherwise replace with a local serializer)
- Replace the “startQrWithFallback” block with a single “start” attempt using conservative settings.

B) QRScanner.tsx — add a serialization guard to prevent overlapping transitions
- Add a ref-based “transition queue” so any start/stop request is executed strictly after the previous one finishes:
  - Example approach:
    - const transitionRef = useRef(Promise.resolve());
    - function enqueue(fn) { transitionRef.current = transitionRef.current.then(fn, fn); return transitionRef.current; }
- Use this queue inside the useEffect that reacts to isActive/currentCamera/hasPermission:
  - If activating: enqueue(async () => { await stopIfNeeded(); await startIfIdle(); })
  - If deactivating/unmounting: enqueue(async () => { await stopIfNeeded(); })
- Ensure stop is awaited before any subsequent start.
- Add a small delay (100–250ms) after stop to allow camera resources to release (this is a key stability improvement but not “fancy camera switching”).

C) QRScanner.tsx — “safe default settings” while scanning the entire frame
- Camera constraints (minimal & compatible):
  - Default: { facingMode: "environment" }
  - If the user switches cameras via the “Switch” button:
    - Use deviceId exact for that camera: { deviceId: { exact: currentCamera } }
- Scan config (keep whole-frame scanning):
  - fps: 15 (or 20; 15 is the safest default across devices)
  - formatsToSupport: [0] (QR only)
  - disableFlip: false
  - Remove aspectRatio: 1 (this can contribute to constraint issues and isn’t required for scanning)
  - Do NOT set qrbox (this keeps scanning the entire frame as requested)
  - Keep experimentalFeatures.useBarCodeDetectorIfSupported: true (this improves performance where supported and should not trigger camera restarts)

D) QRScanner.tsx — add minimal, actionable logging (not noisy)
- Log only key transition points:
  - “requested start”, “requested stop”
  - state before stop/start
  - start success, stop success
  - start error name/message (including common cases: NotAllowedError, NotFoundError, OverconstrainedError, AbortError)
- This will help diagnose if failures are permission-related vs device/camera constraint related.

E) Optional cleanup
- If QRScanner.tsx no longer imports qrScannerFallback.ts, we can remove that file to avoid dead code (optional; keeping it unused is harmless but messy).

Acceptance criteria (how we’ll know it’s fixed)
- The scanner starts reliably on typical devices without “already under transition”.
- Switching cameras (if multiple are available) works without triggering the transition error.
- Scanning remains full-frame (no qrbox/crop).
- If the camera cannot start, the error message is stable and meaningful (permission denied vs no camera vs in-use).

Edge cases to consider
- iOS Safari: deviceId constraints can be finicky; defaulting to facingMode environment is often safest until the user explicitly switches.
- Permission flow: first-time permission prompts can delay getCameras results; avoid rapid re-start loops during that window.
- Rapid tab switching (Scan tab → other tab → back): serialization should prevent the transition race.

Questions (only if needed during implementation)
- None required to proceed, since you explicitly want: revert fallback ladder + safe defaults + full-frame scanning.

Implementation sequence
1) Update QRScanner.tsx to remove startQrWithFallback usage and implement serialized start/stop.
2) Set scan config to safe defaults (fps 15, QR-only, no aspectRatio, no qrbox).
3) Verify in preview on at least:
   - Desktop Chrome (camera or virtual cam)
   - Mobile Safari/Chrome if available
4) If stable, optionally remove qrScannerFallback.ts.

Rollback plan
- If anything regresses, we’ll restore the previous QRScanner.tsx version from project history and re-apply only the serialization guard (that guard alone often fixes the transition error without other changes).

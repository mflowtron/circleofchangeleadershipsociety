
# QR Scanner Configuration Options

Here are all the configuration options available for the QR code scanner, organized by category. Your current settings are noted, and I'll present choices for each option.

---

## Current Configuration Summary

Your scanner is currently configured with:
- **FPS**: 30 (high frame rate)
- **Resolution**: 1920x1080 (Full HD)
- **Scan Area**: Full viewfinder (no qrbox restriction)
- **Formats**: QR codes only
- **Native API**: Enabled when supported
- **Flip Detection**: Enabled (can read mirrored codes)

---

## Configuration Options & Choices

### 1. Frame Rate (fps)

How many times per second the scanner analyzes frames from the camera.

| Option | Current | Description |
|--------|---------|-------------|
| **10 FPS** | | Conservative - saves battery, works for stationary codes |
| **15 FPS** | | Balanced - good for most use cases |
| **30 FPS** | Yes | Fast - current setting, best for quick detection |
| **60 FPS** | | Maximum - may drain battery faster, diminishing returns |

**Trade-off**: Higher FPS = faster detection but more CPU/battery usage.

---

### 2. Camera Resolution

The resolution requested from the camera. Higher = more detail for distant codes.

| Option | Current | Description |
|--------|---------|-------------|
| **1280x720 (HD)** | | Standard - faster processing, good for close scans |
| **1920x1080 (Full HD)** | Yes | High detail - current setting |
| **2560x1440 (QHD)** | | Very high - better for distant codes |
| **3840x2160 (4K)** | | Maximum - best distance detection, but slower processing |

**Trade-off**: Higher resolution = better distance detection but more processing time per frame.

---

### 3. Scan Area (qrbox)

Whether to restrict scanning to a specific region of the viewfinder.

| Option | Current | Description |
|--------|---------|-------------|
| **Full viewfinder** | Yes | Scans entire camera view - current setting |
| **80% center box** | | Slightly restricted, faster processing |
| **Fixed 300x300 box** | | Small center region, fastest but requires precise aim |
| **Dynamic function** | | Calculates based on viewfinder size |

**Trade-off**: Smaller scan area = faster processing but requires more precise aiming.

---

### 4. Aspect Ratio

The shape of the scanner viewfinder.

| Option | Current | Description |
|--------|---------|-------------|
| **1:1 (Square)** | Yes | Current setting - good for QR codes |
| **4:3** | | Traditional photo ratio |
| **16:9** | | Widescreen - shows more horizontal area |

---

### 5. Flip Detection (disableFlip)

Whether to also check for mirrored/inverted QR codes.

| Option | Current | Description |
|--------|---------|-------------|
| **Enabled (disableFlip: false)** | Yes | Detects normal and mirrored codes |
| **Disabled (disableFlip: true)** | | Only normal orientation, slightly faster |

---

### 6. Native Barcode Detection API

Uses the browser's built-in barcode detector when available (Chrome/Edge Android, Safari 17.2+).

| Option | Current | Description |
|--------|---------|-------------|
| **Enabled** | Yes | Uses native API for better performance on supported browsers |
| **Disabled** | | Always uses JavaScript-based detection |

---

### 7. Supported Formats

Which barcode types to detect. Fewer formats = faster processing.

| Option | Current | Description |
|--------|---------|-------------|
| **QR Code only** | Yes | Fastest - only scans QR codes |
| **QR + Barcodes** | | Also scans UPC, EAN, Code 128, etc. |
| **All formats** | | Maximum compatibility, slowest |

---

### 8. Torch/Flashlight (Runtime Feature)

Enable the camera flashlight for low-light scanning.

| Option | Current | Description |
|--------|---------|-------------|
| **Add torch button** | No | Adds a flashlight toggle button |
| **No torch** | Yes | Current - no flashlight control |

---

### 9. Zoom Control (Runtime Feature)

Allow users to digitally zoom the camera for distant codes.

| Option | Current | Description |
|--------|---------|-------------|
| **Add zoom slider** | No | Adds a zoom control |
| **No zoom** | Yes | Current - no zoom control |

---

## My Recommendations for Best Distance Detection

If your main goal is improving detection at a distance:

1. **Keep FPS at 30** - Already optimal
2. **Try 4K resolution (3840x2160)** - More detail for distant codes
3. **Keep full viewfinder scanning** - Maximum detection area
4. **Add torch button** - Helps in low light
5. **Add zoom slider** - Users can zoom in on distant codes

---

## Technical Notes

```text
Current scanConfig structure:
+---------------------------+------------------+
| Option                    | Current Value    |
+---------------------------+------------------+
| fps                       | 30               |
| aspectRatio               | 1                |
| disableFlip               | false            |
| formatsToSupport          | [0] (QR only)    |
| experimentalFeatures      | native API on    |
| qrbox                     | undefined (full) |
+---------------------------+------------------+

Current cameraConfig:
+---------------------------+------------------+
| Option                    | Current Value    |
+---------------------------+------------------+
| width                     | 1920 (ideal)     |
| height                    | 1080 (ideal)     |
| facingMode                | environment      |
+---------------------------+------------------+
```

---

## Your Choices

Please let me know which options you'd like to change:

1. **FPS**: Keep at 30, or change to ___?
Change to 60.

2. **Resolution**: Keep at 1080p, try 1440p, or try 4K?
Try 4K (or whatever the best available on the device is.

3. **Scan Area**: Keep full viewfinder, or add a restriction?
Full viewfinder

4. **Add Torch Button**: Yes or No?
No.

5. **Add Zoom Slider**: Yes or No?
No.

Once you make your selections, I'll implement the changes.

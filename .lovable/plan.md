

# Replace Dummy Videos with Real Mux Playback IDs

## Overview
Update the TikTok-style feed to use the 5 new Mux playback IDs provided, replacing the current placeholder videos.

---

## Changes

### File to Modify
`src/data/conferenceFeedData.ts`

### Playback ID Mapping

| Post | Description | Old Playback ID | New Playback ID |
|------|-------------|-----------------|-----------------|
| ID "1" | AI Recap (pinned) | `a4nOgmxGWg6gULfcBbAa00gXyfcwPnAFldF8RdsNyk8M` | `WmDjmuFI8l8IzURCAia1kOaBbxj00UIhNDU9Rmk9aERU` |
| ID "3" | Mixer Video | `EcHgOK9coz5K4rjSwOkoE7Y7O01201YMIC200RI6lNxnhs` | `3vPfOOlLqPuEMRfJFog02n9Pdj01hmCgNfesDEzqZvqaU` |
| ID "7" | AI Education Video | `DS00Spx1CV902MCtPj5WknGlR102V5HFkDe` | `WTD16O5zoIIwDQDAy7rl53emK01dCP4L1W7r2Vj19Q4c` |
| ID "11" | Panel Standing Ovation | `VcmKA6aqzIzlg3MayLJDnbF55kX00mds028Z65QxvBYaA` | `OkTCUz95Y13HO9jmsbVibHDmVSQYZs01ieeqJJA99BN8` |
| ID "12" | Keynote Quote | `OYWW4ZbsI93B00vrQkMCc7nhNJ9Hb011qyjGjZElC01Zz8` | `vCQ00oTjgN9vMxV4VHgkdtItYRjIKU6k01SNhUQNDLFqU` |

---

## Implementation
Simple string replacements at lines 19, 58, 134, 210, and 232 in the feed data file.


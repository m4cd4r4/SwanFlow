# Shopping Lists

## Order 1: AliExpress/eBay (Order NOW - 2-4 week shipping)

### ESP32-CAM Modules
| Item | Qty | Search Term | Est. Price |
|------|-----|-------------|------------|
| ESP32-CAM | 5 | "ESP32-CAM AI-Thinker OV2640 PSRAM" | $8 ea |

**Critical:** Must have PSRAM (4MB). Verify listing says "with PSRAM" or "4MB PSRAM".

### LTE Modules
| Item | Qty | Search Term | Est. Price |
|------|-----|-------------|------------|
| SIM7000A | 5 | "SIM7000A module LTE Cat-M1 NB-IoT" | $15 ea |

**Alternative:** SIM7000G (global bands) or SIM7000E (if cheaper).

### Power Components
| Item | Qty | Search Term | Est. Price |
|------|-----|-------------|------------|
| 18650 Battery | 5 | "18650 3000mAh Li-ion" | $5 ea |
| BMS Board | 5 | "1S 3A BMS protection board 18650" | $2 ea |
| TP4056 Module | 5 | "TP4056 USB Li-ion charger module" | $1 ea |
| Solar Panel | 5 | "5W 6V monocrystalline solar panel" | $10 ea |

### Connectivity
| Item | Qty | Search Term | Est. Price |
|------|-----|-------------|------------|
| LTE Antenna | 5 | "4G LTE antenna SMA 3dBi" | $2 ea |
| U.FL to SMA | 5 | "U.FL IPEX to SMA pigtail cable" | $1 ea |
| Cable glands | 10 | "PG7 IP68 cable gland waterproof" | $0.50 ea |

### Misc
| Item | Qty | Search Term | Est. Price |
|------|-----|-------------|------------|
| Dupont wires | 1 pack | "Dupont jumper wire female-female" | $2 |
| 18650 holder | 5 | "18650 battery holder with wire" | $1 ea |

### AliExpress Order Total: ~$220

---

## Order 2: Bunnings (Buy locally this week)

### Enclosures
| Item | Qty | SKU/Name | Est. Price |
|------|-----|----------|------------|
| IP65 Junction Box | 5 | HPM 190x140x70mm (4430042) | $12 ea |

**Alternatives:**
- Legrand IP66 boxes
- Clipsal 56 Series
- Any IP65+ box ~150x100x70mm minimum

### Mounting & Sealing
| Item | Qty | Aisle | Est. Price |
|------|-----|-------|------------|
| L-Bracket (stainless) | 5 | Hardware | $3 ea |
| Silicone sealant (clear) | 1 | Adhesives | $8 |
| Stainless screws M4 | 1 pack | Hardware | $5 |

### Tools (if needed)
| Item | Qty | Aisle | Est. Price |
|------|-----|-------|------------|
| Step drill bit set | 1 | Power tools | $15-25 |

### Bunnings Order Total: ~$100

---

## Order 3: IoT SIMs (Order this week)

### Option A: M2MSIM.com.au (Recommended)
1. Go to: https://www.m2msim.com.au/
2. Register account
3. Order: 4x SIM cards ($2 each = $8)
4. Select plan: 10MB pooled per SIM ($4/month each = $16/month)
5. Total pooled data: 40MB/month

**Setup cost:** $8 + first month $16 = $24
**Ongoing:** $16/month

### Option B: Cmobile
1. Go to: https://www.cmobile.com.au/m2m-sims-and-iot-plans/
2. Contact for quote
3. Order 4x SIMs on pooled Optus plan

---

## Order Summary

| Order | Vendor | Est. Total | Lead Time |
|-------|--------|------------|-----------|
| Electronics | AliExpress | ~$220 | 2-4 weeks |
| Enclosures | Bunnings | ~$100 | Same day |
| SIMs | M2MSIM | ~$24 | 2-5 days |
| **Total** | | **~$345** | |

---

## Recommended Order of Operations

1. **Today:** Order AliExpress components (longest lead time)
2. **Today:** Register at M2MSIM.com.au, order SIMs
3. **This week:** Buy Bunnings items
4. **While waiting:** Develop firmware, train ML model, build backend

---

## Verification Checklist (When Items Arrive)

### ESP32-CAM
- [ ] Powers on via 5V
- [ ] Camera test image works
- [ ] PSRAM detected (check serial output)

### SIM7000A
- [ ] Powers on (check LED)
- [ ] AT commands respond
- [ ] SIM card slot works

### Solar Panel
- [ ] Outputs 6V in sunlight
- [ ] Can charge 18650 via TP4056

### SIM Cards
- [ ] Activated on portal
- [ ] APN settings noted
- [ ] Test data connection with phone/modem

# Shopping Lists

## AliExpress Order (Place Today - 2-4 Week Shipping)

### Search Terms & Quantities

**ESP32-CAM:**
- Search: "ESP32-CAM OV2640"
- Quantity: 2 (1 primary + 1 backup)
- Look for: Board with antenna, includes programmer preferred
- Price target: <$12 AUD each

**SIM7000A Module:**
- Search: "SIM7000A development board"
- Quantity: 1
- Look for: Includes antenna, header pins pre-soldered
- Price target: <$20 AUD
- Note: Verify Australian LTE band support (B1/B3/B5/B7/B8/B28)

**Antenna:**
- Search: "SIM7000A LTE antenna" or "4G antenna SMA"
- Quantity: 1 (usually included with SIM7000A)
- Connector: SMA or IPEX (check SIM7000A board)

**USB-to-TTL Programmer:**
- Search: "FTDI USB to TTL CP2102" or "CH340G USB TTL"
- Quantity: 1 (if not included with ESP32-CAM)
- Voltage: 3.3V/5V switchable preferred

**MicroSD Cards:**
- Search: "MicroSD 8GB class 10"
- Quantity: 2
- Speed: Class 10 minimum
- Price target: <$5 AUD each

**Total AliExpress Estimate**: ~$60-80 AUD + shipping

---

## Bunnings Order (Buy This Week)

### Electrical Section

**Junction Box:**
- Product: IP65 weatherproof junction box
- Size: ~150mm x 110mm x 70mm (fits ESP32 + SIM7000A)
- Quantity: 1
- Estimated: $10-15

**Cable Glands:**
- Product: PG7 or PG9 cable glands
- Quantity: 3 (power in, spare)
- Estimated: $2-3 each

**Mounting Bracket:**
- Product: Galvanized pole clamp or L-bracket
- Size: Suitable for 50mm pole or wall mount
- Quantity: 1 set
- Estimated: $5-10

**Outdoor Power Cable:**
- Product: 2-core outdoor rated cable
- Length: 5-10m (depends on Mounts Bay Rd installation site)
- Estimated: $10-15

**Cable Ties:**
- Product: UV-resistant cable ties (black)
- Quantity: 1 pack
- Estimated: $5

**Total Bunnings Estimate**: ~$35-50 AUD

---

## M2M SIM Card (Register Today)

**Provider**: m2msim.com.au (recommended)

**Plan Options:**
- 500MB/month: ~$3-5/month
- 1GB/month: ~$5-8/month
- 5GB/month: ~$10-15/month

**Estimated Usage:**
- Image upload: ~50KB per detection (compressed JPEG)
- Hourly stats: ~1KB
- Expected: 200-500MB/month (Phase 1)

**Order**: 1x SIM card, start with 1GB/month plan

**Alternatives**: See `docs/iot-sim-options.md`

---

## Local Electronics (Optional - Same Day)

### Officeworks / JB Hi-Fi

**MicroSD Cards:**
- SanDisk/Samsung 16GB Class 10
- Quantity: 2
- ~$8-12 each (faster than AliExpress)

**USB Power Adapters:**
- 5V 2A USB adapter
- Quantity: 1
- ~$10-15

---

## Edge Impulse Account (Free - Create Today)

**URL**: https://studio.edgeimpulse.com

**Purpose**: FOMO model training for vehicle detection

**Requirements**:
- Free tier: Sufficient for initial development
- Upload training images from Mounts Bay Road
- See `docs/ml-development-guide.md` for workflow

---

## Order Priority

1. **Today**: AliExpress order (longest lead time)
2. **Today**: M2M SIM registration
3. **This Week**: Bunnings shopping (once you have measurements)
4. **This Week**: Create Edge Impulse account
5. **While Waiting**: Walk Mounts Bay Road with site survey checklist

---

## Total Budget Estimate

| Category | Cost (AUD) |
|----------|------------|
| AliExpress Components | $60-80 |
| Bunnings Hardware | $35-50 |
| M2M SIM (first month) | $5-8 |
| Local Electronics (optional) | $20-30 |
| **Total Phase 1** | **$120-168** |

**Notes:**
- Prices are estimates (December 2025)
- Shipping not included (AliExpress: ~$5-15)
- Bulk discounts available for Phase 2 expansion

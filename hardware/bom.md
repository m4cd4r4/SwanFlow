# Bill of Materials (BOM)

## Per Sensor Unit (~$50 AUD)

### Core Components

| Component | Description | Source | Est. Cost |
|-----------|-------------|--------|-----------|
| ESP32-CAM | AI-Thinker ESP32-CAM with OV2640 | AliExpress/eBay | $8 |
| SIM7000A | LTE Cat-M1/NB-IoT + GPS module | AliExpress | $15 |
| 18650 Battery | 3.7V 3000mAh Li-ion cell | Local electronics | $5 |
| BMS Board | 1S 3A protection + charging | AliExpress | $2 |
| TP4056 | USB charging module (optional) | AliExpress | $1 |
| Solar Panel | 5W 6V monocrystalline | AliExpress/eBay | $10 |

### Enclosure & Mounting

| Component | Description | Source | Est. Cost |
|-----------|-------------|--------|-----------|
| 3D Printed Case | PETG or ASA (weather resistant) | Self-print | $3-5 |
| Mounting Bracket | Pole/fence mount, stainless steel | Hardware store | $2 |
| Cable Gland | IP68 waterproof, PG7 or PG9 | AliExpress | $1 |
| Silicone Sealant | Weatherproofing joints | Hardware store | $1 |

### Connectivity

| Component | Description | Source | Est. Cost |
|-----------|-------------|--------|-----------|
| SIM Card | IoT data SIM (prepaid or M2M) | Telstra/Optus/Vodafone | $5-10/month |
| LTE Antenna | 4G/LTE external antenna, SMA | AliExpress | $2 |
| Pigtail Cable | U.FL to SMA adapter | AliExpress | $1 |

### Cables & Misc

| Component | Description | Source | Est. Cost |
|-----------|-------------|--------|-----------|
| Dupont Wires | Female-female jumper cables | AliExpress | $1 |
| USB Cable | Micro USB for programming | Existing | $0 |
| Heat Shrink | Assorted sizes | AliExpress | $1 |
| Standoffs | M2.5 nylon standoffs | AliExpress | $1 |

## Total Per Unit: ~$50-55 AUD

## For 10-Unit Pilot

| Item | Qty | Unit Cost | Total |
|------|-----|-----------|-------|
| ESP32-CAM | 12 | $8 | $96 |
| SIM7000A | 12 | $15 | $180 |
| 18650 + BMS | 12 | $7 | $84 |
| Solar Panels | 12 | $10 | $120 |
| Enclosures (filament) | 12 | $4 | $48 |
| Hardware/misc | 12 | $5 | $60 |
| SIM Cards (first month) | 10 | $10 | $100 |
| **Total** | | | **~$690** |

*Note: 12 units built (10 deployed + 2 spare)*

## Recommended Suppliers (Australia)

### Local
- **Core Electronics** (coreelectronics.com.au) - ESP32, sensors, fast shipping
- **Altronics** (altronics.com.au) - Components, enclosures
- **Jaycar** (jaycar.com.au) - Batteries, cables, tools

### International (Budget)
- **AliExpress** - ESP32-CAM, SIM modules, bulk components (2-4 week shipping)
- **eBay** - Solar panels, batteries

## SIM Card Options (Australia)

| Provider | Plan | Data | Monthly |
|----------|------|------|---------|
| Telstra M2M | IoT Starter | 5MB | ~$5 |
| Optus IoT | Pay As You Go | Per MB | ~$3-10 |
| Vodafone IoT | M2M Basic | 10MB | ~$7 |
| Hologram | Global IoT | Pay per MB | ~$5 |

*Note: Each sensor transmits ~1-5MB/month at 1 data point per minute*

## Tools Required

- Soldering iron + solder
- 3D printer (PETG/ASA filament recommended)
- Multimeter
- Wire strippers
- Heat gun (for heat shrink)
- Drill (for mounting holes)

## Alternative Components

### Higher Power Option
If solar insufficient:
- 2x 18650 in parallel (6000mAh)
- 10W solar panel
- Adds ~$15 per unit

### Cheaper LTE Option
- SIM800L (2G only) - $5-8
- Note: 2G being phased out in Australia

### Premium ESP32 Option
- ESP32-S3 with external camera
- Better ML performance
- Adds ~$10 per unit

# IoT SIM Card Options (Australia)

Comparison of M2M/IoT SIM providers for the SIM7000A LTE modem in Perth Traffic Watch.

## Requirements

- **LTE Bands**: Must support Australian bands (B1/B3/B5/B7/B8/B28)
- **Data Only**: Voice/SMS not required
- **Low Usage**: ~200-500MB/month per device
- **Static IP**: Optional (helpful for debugging)
- **Coverage**: Mounts Bay Road, Perth CBD

## Recommended: m2msim.com.au

**Website**: [https://m2msim.com.au](https://m2msim.com.au)

### Pros
- Australian-based (local support)
- No lock-in contracts
- Flexible data pooling
- Good Telstra coverage
- Easy online portal
- API access for monitoring

### Plans
| Data/Month | Price/Month | Best For |
|------------|-------------|----------|
| 500MB | $3-5 | Single device testing |
| 1GB | $5-8 | Single device production |
| 5GB | $10-15 | Data pooling (2-5 devices) |
| 10GB | $18-25 | Large deployment (5-10 devices) |

### Setup
```
APN: m2m
Username: (leave empty)
Password: (leave empty)
```

### Notes
- SIM ships within 1-2 business days
- Activation via online portal
- Usage monitoring dashboard
- Auto top-up available

## Alternative 1: Telstra IoT

**Website**: [https://www.telstra.com.au/business-enterprise/services/iot](https://www.telstra.com.au/business-enterprise/services/iot)

### Pros
- Best coverage in Australia
- 99.4% network uptime
- Enterprise-grade support
- Detailed analytics

### Cons
- Expensive for hobbyists (~$15-30/month minimum)
- Requires business account
- Complex pricing
- Minimum contract terms

### Best For
- Commercial deployments
- Critical infrastructure
- Wide area coverage (regional/remote)

## Alternative 2: Optus IoT

**Website**: [https://www.optus.com.au/enterprise/iot](https://www.optus.com.au/enterprise/iot)

### Pros
- Good urban coverage (Perth CBD)
- Competitive pricing
- Business plans available

### Cons
- Coverage gaps outside metro areas
- Less robust than Telstra
- Business account required

### Best For
- Urban deployments only
- Budget-conscious projects
- Backup to Telstra SIM

## Alternative 3: 1NCE

**Website**: [https://1nce.com](https://1nce.com)

### Pros
- **Flat fee**: €10 (~$16 AUD) for 500MB over 10 years
- No monthly billing
- Global coverage (including Australia)
- Perfect for low-data IoT

### Cons
- Fixed data pool (can't add more)
- International company (Europe-based)
- Limited support

### Best For
- Ultra-low data usage (<10KB/day)
- "Deploy and forget" installations
- Projects with 10+ year lifespan

### Setup
```
APN: iot.1nce.net
Username: (leave empty)
Password: (leave empty)
```

## Alternative 4: Vodafone IoT

**Website**: [https://www.vodafone.com.au/business/iot](https://www.vodafone.com.au/business/iot)

### Pros
- Good metro coverage
- Flexible plans

### Cons
- Weaker coverage than Telstra/Optus
- Limited rural coverage

### Best For
- Metro-only deployments

## Alternative 5: Hologram (Global)

**Website**: [https://www.hologram.io](https://www.hologram.io)

### Pros
- Pay-as-you-go (no monthly fee)
- Good developer tools
- API-first approach
- Multi-carrier SIM (automatic failover)

### Cons
- More expensive per MB (~$0.40 USD/MB)
- Australian support is secondary market

### Best For
- International deployments
- Developers who need API access
- Multi-country projects

## Data Usage Estimates

### Perth Traffic Watch (Single ESP32-CAM)

**Assumptions**:
- 1 upload per minute
- 200 bytes per upload (JSON stats)
- 50KB per image (JPEG compressed, occasional)

**Monthly Usage**:
| Scenario | Data/Month |
|----------|------------|
| Stats only (no images) | ~8.6MB |
| Stats + 10 images/day | ~23MB |
| Stats + 100 images/day | ~158MB |

**Recommendation**: 500MB plan is more than sufficient for stats-only mode.

## Network Coverage Check

Before ordering SIM:

1. **Telstra Coverage Map**: https://www.telstra.com.au/coverage-networks/our-coverage
2. **Optus Coverage Map**: https://www.optus.com.au/network/coverage
3. **Walk the site** with your phone:
   - Test 4G speed at installation location
   - Check signal strength (-70 dBm or better)
   - Verify during different times of day

## SIM Testing Checklist

When SIM arrives:

1. [ ] Insert SIM into SIM7000A module
2. [ ] Test with AT commands:
   ```
   AT+CSQ         # Signal quality (>10 is acceptable)
   AT+COPS?       # Check connected network
   AT+CGATT?      # Check GPRS attachment
   AT+CGDCONT?    # Verify APN settings
   ```
3. [ ] Test data connection:
   ```
   AT+CNACT=1,"m2m"   # Activate network
   AT+CNACT?          # Check IP address
   ```
4. [ ] Ping test from backend server
5. [ ] Upload test data

## Cost Comparison (12 Months, Single Device)

| Provider | Setup | Monthly | Annual Total |
|----------|-------|---------|--------------|
| m2msim (1GB) | $0 | $7 | $84 |
| Telstra IoT | $50 | $20 | $290 |
| Optus IoT | $30 | $15 | $210 |
| 1NCE (10 years) | $16 | $0 | $16 (amortized: $1.60/year) |
| Hologram (PAYG) | $0 | ~$12 | $144 |

**Winner for hobbyist**: m2msim.com.au (Phase 1) → 1NCE (Phase 2 scale-up)

## Multi-Device Strategy (Future)

When scaling to 5+ devices:

1. **Data Pooling**: Share data pool across devices
2. **Carriers**: Mix Telstra + Optus for redundancy
3. **Failover**: Use dual-SIM adapters or automatic carrier switching

Example: 5 devices, 500MB each
- **Option A**: 5x individual 500MB SIMs = $15-25/month
- **Option B**: 1x pooled 2.5GB plan = $10-12/month (savings!)

## Recommendation for Perth Traffic Watch

**Phase 1 (Single Device Testing)**:
- **Primary**: m2msim.com.au - 1GB plan ($5-8/month)
- **Backup**: Keep 1NCE SIM as emergency backup

**Phase 2 (2-5 Devices)**:
- **Primary**: m2msim.com.au - 5GB pooled plan ($10-15/month)
- **Coverage**: Test site coverage before ordering multiple SIMs

**Phase 3 (10+ Devices)**:
- Consider Telstra IoT for critical sites
- Use 1NCE for low-traffic sites
- Implement data pooling

## Next Steps

1. Order m2msim.com.au SIM (1GB plan)
2. Test at Mounts Bay Road for 1 week
3. Monitor usage via m2msim dashboard
4. Adjust plan based on actual usage
5. Document APN settings in `firmware/config.h`

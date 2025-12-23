# Legal Considerations

Legal and privacy considerations for deploying SwanFlow in public spaces.

## Disclaimer

**I am not a lawyer**. This document provides general guidance only. Consult with a legal professional before deploying surveillance equipment in public spaces.

## Privacy Law (Australia)

### Privacy Act 1988

The Privacy Act generally applies to organisations, not individuals. If you're operating as a hobbyist/personal project, you may not be subject to the Act. However, if you:

- Operate as a business
- Collect data for commercial purposes
- Share data with third parties

You may need to comply with the Australian Privacy Principles (APPs).

### Surveillance Devices Act 2016 (WA)

In Western Australia, the **Surveillance Devices Act 2016** regulates the use of surveillance equipment.

**Key Points**:
- Recording in **public spaces** (like roads) is generally legal
- Recording audio **without consent** is illegal (don't use microphones)
- Recording where there's a "reasonable expectation of privacy" (e.g., inside homes) is illegal
- Vehicle registration plates are considered public information

**SwanFlow compliance**:
- ✅ Recording vehicles on public roads (legal)
- ✅ No audio recording
- ✅ No identifiable faces (QVGA resolution too low)
- ✅ No recording of private property

### Council Permits

Installing equipment in public spaces (footpaths, road reserves) may require:

1. **Public Space License** from City of Perth
2. **Electrical Installation Permit** if connecting to street power
3. **Building Permit** if mounting on existing structures

**Recommendation**: Contact City of Perth before installation.

**City of Perth Contact**:
- Phone: (08) 9461 3333
- Email: info@cityofperth.wa.gov.au
- Address: 27 St Georges Terrace, Perth WA 6000

## Data Collection and Storage

### What We Collect

SwanFlow collects:
- Vehicle detection events (timestamp, count, confidence)
- Occasional images (for validation/debugging)
- Device telemetry (uptime, signal strength)

**We do NOT collect**:
- Registration plates (resolution too low)
- Faces (not identifiable at QVGA)
- Audio
- Personal information

### Data Retention

**Recommendation**:
- Detection stats: Retain indefinitely (anonymous)
- Images: Delete after 7 days (or don't store at all)
- Device logs: Retain for 30 days

### Data Security

- API authentication (API key)
- HTTPS/TLS for data transmission
- SQLite database (local, not publicly accessible)
- No data sharing with third parties

### Privacy Notice

If deploying commercially or sharing data publicly, post a privacy notice:

**Example Sign**:
```
TRAFFIC MONITORING IN PROGRESS

This area is monitored by automated vehicle detection cameras
for traffic analysis purposes.

No personal information is collected.
Images are not stored.

For inquiries: contact@swanflow.com
```

## Intellectual Property

### Open Source Licensing

This project uses:
- **MIT License** (recommended for maximum freedom)
- **GPL v3** (alternative, requires derivatives to be open source)

**Recommendation**: Use MIT License for hardware designs and MIT/Apache 2.0 for software.

### Third-Party Components

Ensure compliance with licenses:
- ESP32 SDK: Apache 2.0
- Edge Impulse SDK: Apache 2.0
- TinyGSM: LGPL 3.0
- Chart.js: MIT

All compatible with commercial use ✅

## Safety and Liability

### Public Safety

- Ensure installations don't create hazards (trip risks, falling objects)
- Use weatherproof enclosures
- Secure cables properly
- Avoid blocking footpaths or sight lines

### Liability

Consider:
- **Public liability insurance** if operating commercially
- Disclaimers on dashboard: "Data provided as-is, no warranty"
- Risk assessment for installation (height, electrical safety)

### Data Accuracy

SwanFlow is for **informational purposes only**. Do not use for:
- Legal evidence (court proceedings)
- Traffic enforcement
- Safety-critical applications

Accuracy is typically 70-90%, not 100%.

## Data Sharing and Publishing

### Publishing Aggregate Stats

✅ **Safe to publish**:
- "500 vehicles/hour on Mounts Bay Road"
- Hourly/daily trends
- Comparative statistics ("Road A is busier than Road B")

❌ **Do not publish**:
- Individual vehicle images
- Timestamped events that could identify individuals
- Data that reveals patterns of life (e.g., "Vehicle X passes every day at 8am")

### Research Use

If using data for research (university projects, publications):
- Anonymise all data
- Obtain ethics approval (if required by institution)
- Cite Edge Impulse and ESP32 projects

## Commercial Use

### Hobby vs. Business

**Hobby** (SwanFlow Phase 1-3):
- Personal interest
- Not-for-profit
- Limited data collection
- Minimal legal obligations

**Business** (if you later commercialise):
- ABN/company registration
- Privacy Act compliance (APPs)
- Insurance
- Tax obligations
- Consumer law compliance

### Selling Data

If you plan to sell traffic data:
- Ensure data is completely anonymised
- Consult legal advice
- Consider Privacy Act obligations
- Obtain necessary licenses/permits

## International Deployment

If deploying outside Australia:
- **GDPR** (Europe): Requires explicit consent, right to deletion, data minimisation
- **CCPA** (California, USA): Similar to GDPR
- **China**: Strict data localisation laws

**Recommendation**: Research local laws before international deployment.

## Recommended Actions

### Before Deployment

- [ ] Check if you need a permit from City of Perth
- [ ] Review WA Surveillance Devices Act 2016
- [ ] Decide on data retention policy
- [ ] Draft privacy notice (if needed)
- [ ] Ensure public liability insurance (if commercial)

### During Deployment

- [ ] Install signage (if required)
- [ ] Test that no private property is visible in camera view
- [ ] Verify images are low-resolution and non-identifiable
- [ ] Document installation location and date

### After Deployment

- [ ] Monitor for complaints or concerns
- [ ] Respond promptly to privacy inquiries
- [ ] Review data regularly and delete old images
- [ ] Update privacy practices as laws change

## Example Privacy Policy (If Required)

```markdown
# Privacy Policy - SwanFlow

**Effective Date**: [Date]

## What We Collect
- Vehicle detection events (count, timestamp, location)
- Device telemetry (uptime, signal strength)
- Optional low-resolution images (deleted after 7 days)

## What We Don't Collect
- Registration plates
- Faces or identifiable features
- Audio
- Personal information

## How We Use Data
- Traffic analysis and statistics
- Research and development
- Public reporting (aggregate data only)

## Data Retention
- Detection stats: Indefinite
- Images: 7 days maximum
- Device logs: 30 days

## Data Sharing
- We do not share data with third parties
- Aggregate statistics may be published publicly

## Your Rights
- Request data deletion: contact@swanflow.com
- Opt-out: (not applicable - public space monitoring)

## Contact
Email: contact@swanflow.com
```

## Useful Resources

- **City of Perth**: https://www.perth.wa.gov.au
- **WA Surveillance Devices Act 2016**: https://www.legislation.wa.gov.au/legislation/statutes.nsf/main_mrtitle_13658_homepage.html
- **Office of the Australian Information Commissioner (OAIC)**: https://www.oaic.gov.au
- **Australian Privacy Principles (APPs)**: https://www.oaic.gov.au/privacy/australian-privacy-principles

---

**Disclaimer**: This document is for informational purposes only and does not constitute legal advice. Consult a qualified legal professional for advice specific to your situation.

**Document Version**: 1.0
**Last Updated**: 2025-12-14

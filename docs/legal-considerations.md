# Legal Considerations

## Overview

This document outlines the legal framework for deploying traffic monitoring sensors in Western Australia. The goal is to operate within the law while avoiding unnecessary bureaucracy for MVP/prototype stages.

## Infrastructure Ownership

### Public Infrastructure

| Authority | Assets | Permission Required |
|-----------|--------|---------------------|
| **Western Power** | Power poles, electrical infrastructure | Yes - formal application |
| **City of Perth** | Street lights, street furniture | Yes - permit required |
| **Main Roads WA** | Highway poles, signage, bridges | Yes - partnership agreement |
| **Local Councils** | Street furniture, parks infrastructure | Yes - council approval |

**Recommendation:** Do NOT attach sensors to public infrastructure without formal approval. This includes:
- Power poles
- Street light poles
- Traffic signal poles
- Bus shelters
- Public signage

### Private Property (Recommended for MVP)

| Scenario | Requirements |
|----------|--------------|
| Your own property | None |
| Residential fence/post | Written consent from property owner |
| Business premises | Written consent from business owner/manager |
| University property | Formal agreement with facilities management |

**This is the cleanest path for MVP deployment.**

## Privacy Legislation

### Australian Privacy Act 1988

The Privacy Act applies to organizations collecting personal information. Key considerations:

1. **Image Processing**: All image processing occurs on-device. No images are transmitted or stored.

2. **Data Collected**: Only aggregate vehicle counts (e.g., "15 vehicles/minute"). This is not personal information.

3. **No Identification**: ESP32-CAM resolution (typically 640x480 at low FPS) is insufficient for:
   - License plate recognition
   - Driver identification
   - Vehicle make/model identification

4. **Privacy by Design**: The system is designed to NOT collect personal information.

### WA Surveillance Devices Act 1998

This act regulates the use of surveillance devices. Key points:

- **Optical Surveillance**: Photographing private activities without consent is prohibited
- **Public Roads**: Monitoring traffic on public roads from a lawful vantage point (private property) is generally permissible
- **No Private Activities**: Sensors should only view public road areas, not private property

**Best Practice:**
- Mount sensors to view only the public road
- Avoid capturing private driveways, windows, or yards
- Document the field of view for each sensor

## Telecommunications

### Radio Equipment

- **3G/LTE-M Modules**: Use certified equipment (FCC/CE marked)
- **SIM Cards**: Standard commercial IoT SIMs, no special license required
- **Antennas**: External antennas should be within manufacturer specifications

### ACMA Compliance

The Australian Communications and Media Authority (ACMA) regulates radio equipment:
- Use devices with appropriate certifications (RCM mark preferred)
- SIM7000/SIM7600 modules are widely used and compliant
- No radio license required for standard cellular connectivity

## Local Council Considerations

### City of Perth

If deploying within City of Perth boundaries:
- Private property mounting: No council approval needed
- Public property: Requires formal permit application
- Contact: info@cityofperth.wa.gov.au

### City of Subiaco (Mounts Bay Rd eastern section)

Similar requirements to City of Perth.

### Town of Cambridge (UWA area)

- UWA is largely self-governing for its campus
- Adjacent private property: Standard consent requirements

## Risk Mitigation

### Documentation Recommended

For each sensor deployment, document:
1. Property owner consent (written, signed)
2. GPS coordinates of sensor location
3. Field of view photo (what the camera sees)
4. Installation date
5. Sensor ID/serial number

### Sample Consent Form

```
TRAFFIC SENSOR INSTALLATION CONSENT

Property Address: _______________________
Property Owner/Manager: _________________

I consent to the installation of a traffic monitoring sensor on my property.

I understand that:
- The sensor monitors public road traffic only
- No images are stored or transmitted
- Only aggregate vehicle counts are collected
- The sensor can be removed at my request
- The data will be used for [purpose]

Signature: _____________ Date: ___________
```

## Potential Pathways for Scale

### Option 1: Academic Partnership

Partner with UWA for:
- Research ethics approval
- Access to university property
- Credibility for council/Main Roads discussions
- Potential student involvement and funding

### Option 2: Main Roads WA Collaboration

Main Roads operates the Road Network Operations Centre (RNOC):
- Propose citizen-science complement to existing sensors
- Offer data sharing arrangement
- Request access to poles or partnership agreement

Contact: enquiries@mainroads.wa.gov.au

### Option 3: Council Smart City Programs

Several Perth councils have smart city initiatives:
- City of Perth Smart City program
- City of Joondalup IoT projects
- Approach as innovation/community project

## Disclaimer

This document provides general guidance only and does not constitute legal advice. For specific legal questions, consult a qualified legal professional.

## Resources

- [Western Power - Pole Attachments](https://www.westernpower.com.au)
- [Main Roads WA](https://www.mainroads.wa.gov.au)
- [Office of the Australian Information Commissioner](https://www.oaic.gov.au)
- [ACMA - Local Councils and Network Facilities](https://www.acma.gov.au/local-councils-and-network-facilities)
- [WA Surveillance Devices Act 1998](https://www.legislation.wa.gov.au)

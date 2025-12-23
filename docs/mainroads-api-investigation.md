# Main Roads WA Traffic Data: Public Access Investigation

**SwanFlow - Research Document**

> **Purpose**: Objective documentation of public traffic data availability, API service status, and internal data utilisation at Main Roads Western Australia.

> **Methodology**: Desktop research using official government sources, audit reports, industry publications, and open data portals. All findings are cited with source URLs.

---

## Executive Summary

This investigation documents a significant gap between Main Roads Western Australia's internal data capabilities and public data accessibility. Key findings:

1. **Two public APIs have been offline since August 2023** with no restoration timeline
2. **1,400+ sensors are operational** and actively collecting data
3. **Internal systems process data every 15 minutes** via sophisticated platforms
4. **The WA Auditor General identified security vulnerabilities** in traffic management systems
5. **$500M+ in Smart Freeway infrastructure** generates data not accessible to the public

---

## Section 1: Public API Service Status

### 1.1 APIs Currently Offline

| API Name | URL | Status | Last Update | Restoration Estimate |
|----------|-----|--------|-------------|---------------------|
| Real-Time Traffic Data at Signalised Intersections | [data.wa.gov.au](https://catalogue.data.wa.gov.au/dataset/mrwa-real-time-traffic-data-at-signalised-intersections) | **Offline** | August 2023 | None provided |
| Daily Traffic Data API | [data.wa.gov.au](https://catalogue.data.wa.gov.au/dataset/mrwa-daily-traffic-data-api) | **Offline** | August 2023 | None provided |
| Historic Traffic Data Dashboard | data.wa.gov.au | **Permanently retired** | - | N/A |

### 1.2 Official Outage Statement

Both offline APIs display identical messaging:

> "Due to unforeseen circumstances, this service is temporarily out of order. We are sorry for the trouble this may cause you. We are working hard to restore the service as soon as possible, but we cannot provide an estimated time of resolution at the moment."

**Source**: [Real-Time Traffic Data at Signalised Intersections](https://catalogue.data.wa.gov.au/dataset/mrwa-real-time-traffic-data-at-signalised-intersections)

### 1.3 Outage Duration

- **Start Date**: August 2023 (based on "Last Updated" metadata)
- **Duration as of December 2024**: Approximately 16 months
- **Cause**: Not publicly disclosed ("unforeseen circumstances")
- **Restoration Timeline**: None provided

### 1.4 Data Previously Available

When operational, these APIs provided:

**Real-Time Traffic Data at Signalised Intersections**:
- SCATS-derived traffic data
- Real-time streaming format
- Coverage: Signalised intersections across WA road network

**Daily Traffic Data API**:
- Network operations traffic data from 1 January 2013
- Perth Metropolitan State Road Network coverage
- 15-minute interval data
- Endpoints (currently non-functional):
  - `publicirisservices.mainroads.wa.gov.au/RoadNetworkPerformanceService/api/ReportingLinks`
  - `publicirisservices.mainroads.wa.gov.au/RoadNetworkPerformanceService/api/LinkData`

**Source**: [Daily Traffic Data API](https://catalogue.data.wa.gov.au/dataset/mrwa-daily-traffic-data-api)

### 1.5 Data Still Available

| Dataset | Format | Update Frequency | Access |
|---------|--------|------------------|--------|
| Traffic Count Sites | GeoJSON, WFS | Annual | Working |
| Traffic Video Survey | Excel, PDF | Periodic | Working |
| Legal Speed Zones | GeoJSON | Ongoing | Working |
| Road Incidents (WebEOC) | API | Real-time | Working |
| Road Closures | API | Real-time | Working |

**Source**: [Main Roads Open Data Portal](https://portal-mainroads.opendata.arcgis.com/)

---

## Section 2: Internal Data Systems

### 2.1 Real-Time Operating Platform (RTOP)

Main Roads WA consolidated over 30 legacy systems into a unified Real-Time Operating Platform.

**Technical Architecture**:
- Cloud infrastructure (major hyperscaler)
- Open-source data and map visualisation tools
- Plug-in based open architecture
- High-performance real-time interface

**Capabilities**:
- Unified dashboard for all traffic operations
- Real-time data ingestion from multiple streams
- Traffic incident and pattern monitoring
- Origin-destination traffic analysis
- Variable speed sign integration
- Lane-use management system integration

**Quote from Manager Cory Ross**:
> "Everything has to be very responsive because everything is happening in real time."

**Source**: [Deloitte Tech Trends 2025](https://www.deloitte.com/us/en/insights/topics/technology-management/tech-trends/2025/australia-smart-traffic-management.html)

### 2.2 Network Performance Reporting System (NetPReS)

A cloud-based data platform built on Microsoft Azure.

**Data Sources**:
- Traffic light systems
- Third-party data vendors
- Road performance sensors
- Weather/environmental data

**Processing Capabilities**:
- Data ingested from multiple expandable sources
- Road performance views generated every 15 minutes
- R Scripts for data processing maintained by MRWA analysts
- Advanced analytics and machine learning capabilities

**Performance**:
> "Queries that used to take an hour reduced to seconds, despite querying four times as much data."

**Source**: [NRI Case Study](https://nri-anz.com/case-study/data-and-analytics/)

### 2.3 Road Network Operations Centre (RNOC)

**Responsibilities**:
- Real-time management of metropolitan road network
- 24/7 monitoring operations
- Incident detection and response
- Traffic signal coordination

**Leadership**: Mehdi Langroudi, Acting Executive Director Network Operations

**Source**: [Main Roads Annual Report 2024](https://annualreports.mainroads.wa.gov.au/AR-2024/about/our-leadership-team.html)

---

## Section 3: Smart Freeway Infrastructure

### 3.1 Operational Status

The Smart Freeway systems are fully operational and actively collecting data.

**Kwinana Freeway Northbound**:
- Operational since: August 2020
- Investment: $47-56 million
- Status: Fully operational

**Mitchell Freeway Southbound**:
- Operational since: 22 December 2024
- Investment: $209.6 million
- Status: Fully operational

**Source**: [Smart Freeway Live 22 December 2024](https://www.mainroads.wa.gov.au/about-main-roads/news-media/smart-freeway-live-22-december-2024/)

### 3.2 Technology Components

The Mitchell Freeway Southbound system includes:

| Component | Quantity | Function |
|-----------|----------|----------|
| Integrated technology pieces | 1,400+ | Various monitoring and control |
| On-ramp traffic signals | 16 | Traffic filtering and merge control |
| Overhead electronic signs | 23 | Lane-use and variable speed display |
| Road sensors | Hundreds | Traffic detection and flow measurement |
| CCTV cameras | Extensive | Visual monitoring and incident detection |
| Incident detection systems | Full coverage | Automatic incident alerting |
| Digital message signs | Multiple | Real-time driver information |

**Source**: [Smart Freeway Mitchell Southbound](https://www.mainroads.wa.gov.au/projects-initiatives/all-projects/metropolitan/smartfreeways/)

### 3.3 Data Collection Confirmation

Official description of Smart Freeway operations:

> "The new technology enhances traffic flow and safety by collecting and analysing large amounts of data to respond to traffic conditions in real time."

**Source**: [Smart Freeway Mitchell Southbound](https://www.mainroads.wa.gov.au/projects-initiatives/all-projects/metropolitan/smartfreeways/)

---

## Section 4: WA Auditor General Findings

### 4.1 Audit Scope

The Office of the Auditor General assessed three key applications within Main Roads WA's Traffic Management System (TMS):

1. Traffic Control System
2. Intelligent Transport System
3. Travel Time System

**Source**: [Traffic Management System Audit](https://audit.wa.gov.au/reports-and-publications/reports/traffic-management-system/)

### 4.2 Security Vulnerabilities Identified

| Category | Finding | Risk Level |
|----------|---------|------------|
| Network Configuration | Misconfigurations allowing unapproved devices to bypass controls | High |
| Software | Legacy, unsupported software with exploitable weaknesses | High |
| Vulnerability Scanning | Monthly scans did not cover critical servers and workstations | Medium |
| Removable Media | Inadequate controls for removable media and malware prevention | Medium |

### 4.3 Access Control Weaknesses

| Finding | Detail |
|---------|--------|
| Privileged Accounts | High number of accounts with privileged access, poorly monitored |
| Dormant Accounts | 7 contractor and 8 employee dormant accounts remained active |
| Password Policy | Weak password requirements on one application |
| Audit Logging | No logging of critical events or access activities |

### 4.4 Physical Security Gaps

| Finding | Detail |
|---------|--------|
| Cabinet Keys | Universal keys issued to multiple individuals without tracking |
| Key Management | No records documenting key distribution or returns |
| Alert Response | Cabinet access alerts generated but not reviewed |

### 4.5 Other Concerns

| Finding | Detail |
|---------|--------|
| Backup Frequency | Backups every 24 hours instead of policy-mandated 8-hour maximum |
| Vendor Management | Inadequate contracts and performance monitoring |
| Unauthorised Devices | 180+ monitoring devices on local roads without proper authorisation |

### 4.6 Audit Conclusion

> "While Main Roads has processes in place to partly protect the TMS system from unauthorised access and use, weaknesses were identified that could be used to compromise the system. Security vulnerabilities and weak database and access controls put TMS availability and integrity at risk."

**Source**: [Traffic Management System Audit](https://audit.wa.gov.au/reports-and-publications/reports/traffic-management-system/)

---

## Section 5: Analysis

### 5.1 The Data Accessibility Paradox

| Aspect | Internal Capability | Public Access |
|--------|--------------------:|:--------------|
| Data collection frequency | 15-minute intervals | Annual averages only |
| Real-time access | Yes (RTOP, RNOC) | APIs offline 16+ months |
| Active sensors | 1,400+ (Smart Freeway alone) | No sensor data available |
| Query performance | "Seconds" (NetPReS) | N/A |
| Investment | $500M+ | N/A |

### 5.2 Potential Explanations for API Outage

The "unforeseen circumstances" causing the outage have not been disclosed. Possible factors based on available evidence:

1. **Security Remediation**: The Auditor General's findings may have prompted system lockdowns
2. **Platform Migration**: NetPReS and RTOP modernisation may have affected legacy API infrastructure
3. **Resource Constraints**: Maintaining public APIs requires ongoing development effort
4. **Policy Decision**: Deliberate reduction in public data sharing (unconfirmed)

**Note**: These are hypotheses. The actual cause has not been publicly disclosed.

### 5.3 Comparison with Other Jurisdictions

| Jurisdiction | Real-Time Traffic API | Status |
|--------------|----------------------|--------|
| NSW (Transport for NSW) | Multiple APIs available | Functional |
| Victoria (VicRoads) | Traffic data APIs | Functional |
| **Western Australia** | **Real-time + Daily APIs** | **Offline 16+ months** |

**Source**: [Transport for NSW Open Data](https://opendata.transport.nsw.gov.au/)

---

## Section 6: Unanswered Questions

The following questions remain unanswered based on publicly available information:

1. **What specific circumstances caused both APIs to go offline in August 2023?**

2. **Is there a restoration timeline, and if not, why not?**

3. **Was the outage related to the security vulnerabilities identified by the Auditor General?**

4. **What is the status of the 180+ "unauthorised" monitoring devices identified in the audit?**

5. **Why is data collected by $500M+ infrastructure not accessible to the public who funded it?**

6. **When will C-ITS data sharing initiatives include public API access?**

7. **Has the Historic Traffic Data Dashboard been retired permanently, or will it return?**

---

## Section 7: Recommendations

### 7.1 For SwanFlow Project

1. **Document this investigation** in project materials ✓
2. **Reference in academic paper** as case study of open data gaps
3. **Submit FOI request** for:
   - Cause of August 2023 API outage
   - API restoration timeline
   - Auditor General remediation status
4. **Contact Main Roads GIS team** (gis@mainroads.wa.gov.au) for technical clarification
5. **Monitor for updates** to data.wa.gov.au listings

### 7.2 For Advocacy

1. **Cite official sources** (Auditor General, Deloitte, Main Roads) for credibility
2. **Highlight the contrast** between internal capability and public access
3. **Reference NSW as best practice** for comparison
4. **Emphasise public investment** ($500M+ Smart Freeway) generating inaccessible data
5. **Propose solutions** rather than only criticism

### 7.3 For Future Research

1. **Track API status** over time to document restoration (or lack thereof)
2. **Compare with other states** to contextualise WA's position
3. **Engage with open data community** in WA for broader advocacy
4. **Monitor C-ITS developments** for potential data sharing opportunities

---

## Section 8: Sources

### Government Sources

1. Main Roads WA Real-Time Traffic Data API - https://catalogue.data.wa.gov.au/dataset/mrwa-real-time-traffic-data-at-signalised-intersections
2. Main Roads WA Daily Traffic Data API - https://catalogue.data.wa.gov.au/dataset/mrwa-daily-traffic-data-api
3. Main Roads Open Data Portal - https://portal-mainroads.opendata.arcgis.com/
4. WA Auditor General Traffic Management System Report - https://audit.wa.gov.au/reports-and-publications/reports/traffic-management-system/
5. Main Roads Annual Report 2024 - https://annualreports.mainroads.wa.gov.au/AR-2024/
6. Smart Freeway Mitchell Southbound - https://www.mainroads.wa.gov.au/projects-initiatives/all-projects/metropolitan/smartfreeways/
7. Smart Freeway Live December 2024 - https://www.mainroads.wa.gov.au/about-main-roads/news-media/smart-freeway-live-22-december-2024/

### Industry Sources

8. Deloitte Tech Trends 2025: Main Roads WA - https://www.deloitte.com/us/en/insights/topics/technology-management/tech-trends/2025/australia-smart-traffic-management.html
9. NRI Case Study: NetPReS Platform - https://nri-anz.com/case-study/data-and-analytics/

### Comparative Sources

10. Transport for NSW Open Data - https://opendata.transport.nsw.gov.au/

---

## Document Information

| Field | Value |
|-------|-------|
| **Version** | 1.0 |
| **Created** | 2025-12-19 |
| **Methodology** | Desktop research, official sources |
| **Author** | SwanFlow Contributors |
| **Status** | Research Document |
| **Next Review** | Check API status monthly |

---

*This document presents factual findings from official sources. Interpretations and hypotheses are clearly labelled as such. The purpose is to inform evidence-based advocacy for open traffic data in Western Australia.*

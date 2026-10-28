# Data Licensing, Provenance & Attribution Policy

`@mudraforge/statutory` adheres to an explicit tripartite licensing model. Open-source software licenses (such as MIT) govern executable code, but do not automatically resolve the legal status of statutory texts, executive gazettes, or derived knowledge representations.

This document clearly distinguishes between:
1. **The Software Code & Tooling**
2. **Primary Government Legal Sources**
3. **Derived OKF Structured Knowledge & Annotations**

---

## 1. Software Code & Tooling (MIT License)

All executable code, client libraries, CLI binaries, test suites, and validation scripts in this repository are licensed under the **[MIT License](../LICENSE)**:

- `src/` (Client runtime, resolver, temporal state evaluator)
- `bin/` (Command-line interface)
- `scripts/` (Linter, manifest generator, catalog builder)
- `test.js` (Regression test suite)

```
Copyright (c) 2026 MudraForge Technologies

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software...
```

---

## 2. Primary Government Legal Sources (Public Domain / Statutory Exemption)

Verbatim statutory provisions, legislative Acts, executive circulars, notifications, and gazette extracts published in this repository originate from official government publications:

### Republic of India
- **Governing Law**: Section 52(1)(q) of the *Copyright Act, 1957* (Act No. 14 of 1957) provides that the reproduction or publication of any matter published in any Official Gazette, any Act of a Legislature, or any report of a committee appointed by Government does **not** constitute an infringement of copyright.
- **Open Data Framework**: Sourced from official portals (`incometaxindia.gov.in`, `cbic-gst.gov.in`, `msme.gov.in`, `egazette.gov.in`) in accordance with the National Data Sharing and Accessibility Policy (NDSAP) of the Government of India.
- **Copyright Status**: Primary statutory and executive texts are free of copyright restrictions for public reuse and reproduction.

### United States of America
- **Governing Law**: 17 U.S.C. § 105 provides that copyright protection is not available for any work of the United States Government.
- **Sourced Material**: Title 26 of the United States Code (Internal Revenue Code §§ 901 & 904) and IRS Instructions (Form 1116, Schedule K-3) are in the public domain.

---

## 3. Derived OKF Knowledge Schemas, Annotations & Relational Maps (CC BY 4.0)

The intellectual property in:
- The structured JSON schemas (`section.json`), field nomenclature, and schema taxonomies;
- The temporal state machine definitions (`validFrom`, `validTo`, `annualReset`, `sunsetNotes`);
- The curated plain-text summaries, threshold abstracts, and accounting directives;
- The cross-statute forward-mapping bridges (*Income-tax Act, 1961* to *Income-tax Act, 2025*);
- The Markdown circular frontmatter conventions and compliance form schemas

is authored by **MudraForge Knowledge Systems Private Limited** and licensed under the **[Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)** license.

### Attribution Notice
You are free to share and adapt the structured data for commercial or non-commercial purposes, provided you give appropriate credit:

```
Statutory knowledge structure derived from @mudraforge/statutory 
(MudraForge Knowledge Systems Private Limited), licensed under CC BY 4.0 / MIT.
Source Repository: https://github.com/mondeep0123/mudraforge-statutory
```

---

## 4. Non-Endorsement & Epistemic Disclaimer

1. **No Government Affiliation**: MudraForge Knowledge Systems Private Limited is an independent private technology company. This project is not affiliated with, sponsored by, or endorsed by the Ministry of Finance, the Central Board of Direct Taxes (CBDT), the Central Board of Indirect Taxes and Customs (CBIC), the Ministry of MSME, or the US Internal Revenue Service.
2. **No Audit or Legal Opinion**: The machine-readable representations in this repository are published for informational, developer, and agentic workflows. They do not constitute formal legal counsel, tax opinions, or statutory audit certification.

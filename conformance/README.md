# OKF-Statutory Vendor-Neutral Conformance Specification

> **Version**: 0.2.0  
> **Status**: Institutional Normative Standard  
> **Target Audience**: Authors of OKF parsers and AI agents in Python, Go, Rust, Ruby, and TypeScript.

---

## 1. Purpose

The `@mudraforge/statutory` open knowledge substrate publishes machine-readable legal provisions designed to be consumed across multiple languages, agent frameworks, and database backends without requiring the MudraForge JavaScript SDK or proprietary runtime.

This directory contains standalone, vendor-neutral test fixtures and assertions that any conforming parser must satisfy.

---

## 2. Conformance Criteria

A conforming OKF parser must guarantee:

1. **Mandatory Identity Fields**:
   - Every `section.json` must provide `sectionCode` (string), `statutorySection` (string), and `governingStatute` (string).
2. **Deterministic Temporal Evaluation**:
   - `effectivePeriod` must provide explicit `validFrom` (format `YYYY-MM-DD`) and `validTo` (`YYYY-MM-DD` or literal string `"OPEN_ENDED"`).
   - Inverted timelines (`validTo < validFrom`) must be rejected at parse time.
3. **Dual-Act Mapping Preservation**:
   - If a provision transitions to a successor statute (such as the *Income-tax Act, 2025* succeeding the *Income-tax Act, 1961*), the parser must preserve `successorStatute` and `successorSection` without loss.
4. **Google OKF Frontmatter Compatibility**:
   - Administrative circulars (`circulars/*.md`) must declare standard YAML frontmatter bounded by `---` containing `id`, `title`, `authority`, `date`, `valid_from`, and `temporal_status`.

---

## 3. Test Fixtures

| Fixture | Expected Behavior | Description |
| :--- | :--- | :--- |
| [`valid_minimal_section.json`](./fixtures/valid_minimal_section.json) | **ACCEPT** | Minimal valid section schema with temporal bounds. |
| [`valid_full_section.json`](./fixtures/valid_full_section.json) | **ACCEPT** | Complete section schema with thresholds, citations, and checklists. |
| [`invalid_missing_section_code.json`](./fixtures/invalid_missing_section_code.json) | **REJECT** | Schema missing the required `sectionCode` field. |
| [`invalid_missing_effective_period.json`](./fixtures/invalid_missing_effective_period.json) | **REJECT** | Schema missing `effectivePeriod`. |
| [`invalid_malformed_temporal_dates.json`](./fixtures/invalid_malformed_temporal_dates.json) | **REJECT** | Inverted temporal boundary (`validTo < validFrom`). |
| [`valid_circular_frontmatter.md`](./fixtures/valid_circular_frontmatter.md) | **ACCEPT** | Google OKF YAML frontmatter with circular metadata. |

---

## 4. Running the Conformance Test

To run the reference conformance runner in Node.js:

```bash
node conformance/test_conformance.js
```

Third-party implementations in other languages should mirror these exact assertions against the JSON/Markdown fixtures in `fixtures/`.

## Pull Request: Statutory Substrate Update

### 1. Summary of Changes
- **Target Domain**: `direct_tax` / `indirect_tax_gst` / `msme_commercial` / `international_tax`
- **Section Code(s)**: 
- **Type of Change**:
  - [ ] New statutory section added
  - [ ] New executive circular added (`circulars/*.md`)
  - [ ] Compliance form schema added (`forms/*.json` or `*.md`)
  - [ ] Temporal amendment / sunset update

### 2. Statutory Provenance & Official Citations
- **Primary Authority**: CBDT / CBIC / MSME / MCA / IRS
- **Official Government Gazette / Notification URL**: 
- **Temporal Validity**: Valid From: `YYYY-MM-DD` | Valid To: `YYYY-MM-DD` or `OPEN_ENDED`

### 3. Verification Checklist
- [ ] Conforms to Google Open Knowledge Format (OKF v0.2) specification
- [ ] `npm run validate` passes with zero errors
- [ ] `npm test` passes with zero regressions
- [ ] Circular contains valid YAML frontmatter with `id`, `authority`, `date`, and `official_url`
- [ ] No ungrounded third-party blog citations
- [ ] User input in regexes is properly escaped

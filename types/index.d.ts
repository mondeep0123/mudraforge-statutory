/**
 * TypeScript definitions for @mudraforge/statutory
 */

export interface StatutoryThresholds {
    buyerPriorYearTurnoverCr?: number;
    sellerPriorYearTurnoverCr?: number;
    annualPurchaseThresholdInr?: number;
    annualReceiptThresholdInr?: number;
    standardDeductionRatePercent?: number;
    inoperativePanPenaltyRatePercent?: number;
    standardTcsRatePercent?: number;
    statutoryDefaultTimelineDays?: number;
    maximumWrittenAgreementTimelineDays?: number;
    penalInterestRate?: string;
    applicableEnterprises?: string;
    traderExclusionRule?: string;
    taxableBaseScope?: string;
    [key: string]: any;
}

export interface OfficialCitation {
    authority: string;
    instrument: string;
    subject: string;
    officialUrl: string;
}

export interface StatutoryRecord {
    sectionId: string;
    sectionCode: string;
    aliases: string[];
    governingStatute: string;
    statutorySection: string;
    successorStatute: string;
    successorSection: string;
    title: string;
    effectivePeriod: {
        validFrom: string;
        validTo: string;
        annualReset?: string;
        sunsetNotes: string;
    };
    plainTextSummary: string;
    keyStatutoryThresholds: StatutoryThresholds;
    officialCitations: OfficialCitation[];
    requiredDocumentChecklist: string[];
    tier: 'PUBLIC_COMMONS_FREE' | 'ENTERPRISE_PAID';
    version: string;
}

export interface LookupResult {
    status: 'SUCCESS' | 'ERROR';
    temporalStatus: 'ACTIVE' | 'SUNSET_SUPERSEDED' | 'FUTURE_PENDING';
    asOfDate: string;
    source?: 'LOCAL_OKF_FS' | 'EDGE_API';
    retrievalMode?: 'LOCAL_SNAPSHOT' | 'EDGE_LIVE' | 'LOCAL_SNAPSHOT_FALLBACK';
    isOfflineSnapshot?: boolean;
    snapshotVersion?: string;
    advisory?: string;
    clientTier?: 'PUBLIC_COMMONS_FREE' | 'ENTERPRISE_PAID';
    authenticated?: boolean;
    statute: StatutoryRecord;
}

export interface SectionSummary {
    sectionId: string;
    sectionCode: string;
    statute: string;
    section: string;
    successorSection: string;
    title: string;
    validFrom: string;
    validTo: string;
    tier: string;
    version: string;
}

export interface LookupOptions {
    asOfDate?: string;
    baseUrl?: string;
    okfDir?: string;
    apiKey?: string;
    tier?: 'PUBLIC_COMMONS_FREE' | 'ENTERPRISE_PAID';
    mode?: 'auto' | 'local' | 'edge';
    forceEdge?: boolean;
}

export interface ClientOptions {
    apiKey?: string;
    tier?: 'PUBLIC_COMMONS_FREE' | 'ENTERPRISE_PAID';
    baseUrl?: string;
    okfDir?: string;
    offlineFirst?: boolean;
}

export interface CalculationPayload {
    section: string;
    invoiceAmount?: number;
    priorFyPurchases?: number;
    hasPan?: boolean;
    isPanInoperative?: boolean;
    buyerTurnoverCr?: number;
    sellerTurnoverCr?: number;
    paymentDelayDays?: number;
    isTrader?: boolean;
    transactionDate?: string;
    mode?: 'standard' | 'analysis';
    [key: string]: any;
}

export interface CalculationResult {
    status: 'SUCCESS' | 'ERROR';
    section: string;
    taxableBase: number;
    appliedRatePercent: number;
    taxAmount: number;
    netPayable: number;
    statutoryRationale: string;
    citations: OfficialCitation[];
    analysisReport?: {
        disallowanceRisk: string;
        suggestedJournalVoucher: any;
        requiredAuditDocuments: string[];
    };
}

export interface UpdateInfo {
    localVersion: string;
    latestVersion: string;
    isOutdated: boolean;
    publishedAt: string;
    changelog: string;
    totalSections: number;
}

export interface SyncResult {
    success: boolean;
    okfVersion: string;
    syncedSections: number;
    destDir: string;
}

export declare const DEFAULT_BASE_URL: string;
export declare const STATUTORY_CLIENT_VERSION: string;
export declare const DEFAULT_LOCAL_OKF_DIR: string;

export declare function getLocalManifest(okfDir?: string): any;
export declare function lookupLocalStatute(section: string, okfDir?: string): StatutoryRecord | null;
export declare function computeTemporalStatus(statute: StatutoryRecord, asOfDate?: string): 'ACTIVE' | 'SUNSET_SUPERSEDED' | 'FUTURE_PENDING';
export declare function checkUpdates(options?: { baseUrl?: string; okfDir?: string }): Promise<UpdateInfo>;
export declare function checkForPackageUpdate(options?: {
    currentVersion?: string;
    cacheTtlMs?: number;
    timeoutMs?: number;
    registryUrl?: string;
}): Promise<{ updateAvailable: boolean; currentVersion: string; latestVersion: string } | null>;
export declare function syncOkf(options?: { baseUrl?: string; okfDir?: string }): Promise<SyncResult>;

export declare function lookupStatute(
    section: string,
    options?: LookupOptions
): Promise<LookupResult>;

export declare function calculate(
    payload: CalculationPayload,
    options?: ClientOptions
): Promise<CalculationResult>;

export declare function listSections(
    options?: { baseUrl?: string }
): Promise<SectionSummary[]>;

export declare function isStatuteActive(
    section: string,
    asOfDate?: string
): Promise<boolean>;

export declare class StatutoryClient {
    apiKey: string | null;
    tier: 'PUBLIC_COMMONS_FREE' | 'ENTERPRISE_PAID';
    baseUrl: string;
    okfDir: string;
    offlineFirst: boolean;

    constructor(options?: ClientOptions);
    lookup(section: string, options?: LookupOptions): Promise<LookupResult>;
    calculate(payload: CalculationPayload): Promise<CalculationResult>;
    isStatuteActive(section: string, asOfDate?: string): Promise<boolean>;
    listSections(): Promise<SectionSummary[]>;
    checkUpdates(): Promise<UpdateInfo>;
    sync(): Promise<SyncResult>;
    crosswalk(section: string, options?: CrosswalkOptions): CrosswalkResult;
    diff(options?: StatutoryDiffOptions): StatutoryDiffResult;
    verify(targetDir?: string): any;
    doctor(options?: any): Promise<any>;
    calculateCorporateTaxMatVsConcessional(payload?: any): any;
    evaluatePlaceOfSupplyAndLut(payload?: any): any;
    calculateTransferPricingAlp(payload?: any): any;
    evaluateSection79LossContinuity(payload?: any): any;
    revalueForeignExchangeIndAs109(payload?: any): any;
    evaluateSection194A(payload?: any): any;
    evaluateSection194O(payload?: any): any;
    evaluateSection194IA(payload?: any): any;
    evaluateSection194IB(payload?: any): any;
    evaluateSection194M(payload?: any): any;
    evaluateSection194R(payload?: any): any;
    evaluateSection43B(payload?: any): any;
    evaluateSection281(payload?: any): any;
    calculateItcReversalRule37(payload?: any): any;
    calculateRule37ASupplierNonFilingReversal(payload?: any): any;
    calculateRule42InputServiceReversal(payload?: any): any;
    reconcileRule42AnnualTrueUp(payload?: any): any;
    calculateRule43CapitalGoodsReversal(payload?: any): any;
    calculateGstItcApportionmentRule42_43(payload?: any): any;
    getOutcomes(provision?: string, options?: StatutoryOutcomesOptions): Promise<StatutoryOutcomesResult>;
    explain(codeOrQuery: string, options?: any): any;
}

export interface CrosswalkOptions {
    creditDate?: string;
    paymentDate?: string;
    asOfDate?: string;
    date?: string;
    okfDir?: string;
}

export interface CrosswalkProvision {
    act: string;
    sectionCode: string;
    statutorySection: string;
    title: string;
    threshold?: string;
    standardRate?: string;
    penaltyRate?: string;
    challan?: string;
    returnForm?: string;
    effectiveDate?: string;
}

export interface CrosswalkResult {
    status: 'SUCCESS' | 'ERROR';
    isValid: boolean;
    querySection: string;
    triggerDate: string;
    triggerReason: string;
    triggerDescription: string;
    creditDate: string | null;
    paymentDate: string | null;
    transitionCutoffDate: string;
    governingAct: string;
    applicableSection: string;
    temporalStatus: 'GOVERNED_BY_1961_ACT' | 'GOVERNED_BY_2025_ACT' | 'SUNSET_OMITTED';
    savingsApplied: boolean;
    isOmittedSunset: boolean;
    crosswalk: {
        id: string;
        domain: string;
        predecessor: CrosswalkProvision;
        successor: CrosswalkProvision;
        savingsAuthority: {
            statute: string;
            subsidiary: string;
            legalPrinciple: string;
        };
    };
    legalAnalysis: string;
}

export interface StatutoryDiffOptions {
    section?: string;
    since?: string;
    domain?: string;
    okfDir?: string;
}

export interface StatutoryAmendment {
    id: string;
    sectionCode: string;
    domain: string;
    title: string;
    effectiveDate: string;
    amendmentType: string;
    statute: string;
    legalAuthority: string;
    previousValue: string;
    amendedValue: string;
    changeSummary: string;
    statutoryImpact: string;
    aliases?: string[];
}

export interface StatutoryDiffResult {
    status: 'SUCCESS' | 'ERROR';
    filterSection: string | null;
    filterSince: string | null;
    filterDomain: string | null;
    totalAmendments: number;
    amendments: StatutoryAmendment[];
}

export declare function crosswalkStatute(
    sectionCode: string,
    options?: CrosswalkOptions
): CrosswalkResult;

export declare function getStatutoryDiff(
    options?: StatutoryDiffOptions
): StatutoryDiffResult;

export declare function verifyLocalSubstrate(
    okfDir?: string,
    options?: any
): any;

export declare function runStatutoryDoctor(
    options?: any
): Promise<any>;

export interface TaxIdentifierResult {
    isValid: boolean;
    checksumValid?: boolean;
    type?: 'GSTIN' | 'PAN';
    gstin?: string;
    pan?: string;
    stateCode?: string;
    stateName?: string;
    entityCode?: string;
    entityType?: string;
    isIndividualOrHuf?: boolean;
    standard194cRatePercent?: number;
    error?: string | null;
}

export declare const INDIAN_STATE_CODES: Record<string, string>;
export declare const PAN_ENTITY_TYPES: Record<string, { code: string; name: string; isIndividualOrHuf: boolean; standard194cRatePercent: number }>;
export declare function isValidGstinChecksum(gstin: string): boolean;
export declare function decodeTaxIdentifier(rawId: string): TaxIdentifierResult;

export declare const CURRENT_RELEASE_MERKLE_ROOT: string;
export declare const MERKLE_ROOT_OKF_V2: string;

export declare function roundToPaisa(amount: number | string): number;
export declare function roundSection288B(amount: number | string): number;
export declare function calculateCorporateTaxMatVsConcessional(payload?: any): any;
export declare function evaluatePlaceOfSupplyAndLut(payload?: any): any;
export declare function calculateTransferPricingAlp(payload?: any): any;
export declare function evaluateSection79LossContinuity(payload?: any): any;
export declare function evaluateSection281TaxClearance(payload: any): any;
export declare function revalueForeignExchangeIndAs109(payload?: any): any;
export declare function evaluateSection194Q(payload: any): any;
export declare function evaluateSection194C(payload: any): any;
export declare function evaluateSection194H(payload: any): any;
export declare function evaluateSection194I(payload: any): any;
export declare function evaluateSection194J(payload: any): any;
export declare function evaluateSection194A(payload: any): any;
export declare function evaluateSection194O(payload: any): any;
export declare function evaluateSection194IA(payload: any): any;
export declare function evaluateSection194IB(payload: any): any;
export declare function evaluateSection194M(payload: any): any;
export declare function evaluateSection194R(payload: any): any;
export declare function evaluateSection43BStatutoryPayables(payload: any): any;
export declare function calculateItcReversalRule37(payload: any): any;
export declare function calculateRule37ASupplierNonFilingReversal(payload: any): any;
export declare function evaluateSection206C1H(payload: any): any;
export declare function evaluateSection43bH(payload: any): any;
export declare function calculateMsmeCompoundInterest(payload: any): any;
export declare function calculateAdvanceTaxAndInterest(payload: any): any;
export declare function calculateRule42InputServiceReversal(payload: any): any;
export declare function reconcileRule42AnnualTrueUp(payload: any): any;
export declare function calculateRule43CapitalGoodsReversal(payload: any): any;
export declare function calculateGstItcApportionmentRule42_43(payload: any): any;
export declare function evaluateCrossBorderRemittance(payload: any): any;
export declare function getRbiBankRateForDate(dateString?: string): number;
export declare const DEFAULT_RBI_BANK_RATE: number;
export declare const MSMED_RATE_MULTIPLIER: number;
export declare const RBI_BANK_RATE_SCHEDULE: Array<{ effectiveFrom: string; effectiveTo: string | null; rate: number; notificationRef: string }>;
export declare const AUTHORITATIVE_STATUTORY_RATES: Record<string, any>;
export declare const VALID_194J_CATEGORIES: string[];

export interface StatutoryOutcome {
    code: string;
    category: string;
    title: string;
    description: string;
    triggerCondition: string;
    recommendedAction: string;
    remedy?: string;
    consequenceIfUnresolved?: string;
    missingFacts?: string[];
    missingFactsExplanation?: Record<string, { type: string; description: string; example: any; source: string }>;
    applicableProvisions?: string[];
    governingAuthority: string;
}

export interface StatutoryOutcomesOptions {
    offline?: boolean;
    verbose?: boolean;
    baseUrl?: string;
    timeoutMs?: number;
}

export interface StatutoryOutcomesResult {
    status: 'SUCCESS' | 'ERROR';
    source: 'LIVE_EDGE' | 'LOCAL_OKF_SUBSTRATE';
    provision: string | null;
    totalOutcomes: number;
    outcomes: StatutoryOutcome[];
    version: string;
    offlineFallback?: boolean;
}

export declare const STATUTORY_OUTCOMES_DICTIONARY: StatutoryOutcome[];
export declare function getStatutoryOutcomes(
    provision?: string,
    options?: StatutoryOutcomesOptions
): Promise<StatutoryOutcomesResult>;

export declare function explainStatutoryDisposition(
    codeOrQuery: string,
    options?: any
): any;

export declare function enrichWithOutcomeExplanation<T extends Record<string, any>>(
    result: T,
    options?: { verbose?: boolean; explain?: boolean }
): T;

export declare function ignorePackageUpdate(
    versionToIgnore: string
): { status: 'SUCCESS' | 'ERROR'; ignoredVersion: string; error?: string };

export interface DaybookVoucherInput {
    date: string;
    voucherNo?: string;
    voucherType?: string;
    partyName: string;
    partyPan?: string | null;
    partyGstin?: string | null;
    grossAmount: number;
    gstAmount?: number;
    tdsDeducted?: number;
}

export interface ReconcileDaybookOptions {
    buyerTurnoverCr?: number | null;
    disallowancePercent?: number;
    corporateTaxRatePercent?: number;
    delayedInterestRateMonthlyPercent?: number;
    auditDate?: string | null;
}

export interface DaybookAuditSummary {
    totalVouchersScanned: number;
    uniqueVendorsCount: number;
    vendorsExceeding50LCount: number;
    vendorsWithExceptionsCount: number;
    totalPurchasesInr: number;
    totalExcessPurchasesOver50LInr: number;
    totalTdsPayableInr: number;
    totalTdsDeductedInr: number;
    totalTdsShortfallInr: number;
    totalSection40aDisallowanceInr: number;
    totalEstimatedTaxImpactInr: number;
    totalSection201InterestInr: number;
    totalAuditExposureInr: number;
    statutoryAuthority: string;
    isAuthorizedToDisburse: boolean;
}

export interface ReconcileDaybookResult {
    auditSummary: DaybookAuditSummary;
    exceptionVendors: any[];
    compliantVendors: any[];
    allVendors: any[];
    auditedVouchers: any[];
}

export declare function parseTallyDaybookCsv(csvText: string): DaybookVoucherInput[];
export declare function parseTallyDaybookXml(xmlText: string): DaybookVoucherInput[];
export declare function reconcile194QDaybook(
    vouchers: DaybookVoucherInput[],
    options?: ReconcileDaybookOptions
): ReconcileDaybookResult;
export declare function generateTally194QJournalXml(
    reconciliationResult: ReconcileDaybookResult,
    options?: { voucherDate?: string; creditLedgerName?: string; companyName?: string }
): string;
export declare function generateAuditMarkdownReport(
    reconciliationResult: ReconcileDaybookResult
): string;
export declare function getIndianFinancialYear(dateStr: string): string;




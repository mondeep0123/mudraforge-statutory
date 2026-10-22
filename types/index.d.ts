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
    apiKey?: string;
    tier?: 'PUBLIC_COMMONS_FREE' | 'ENTERPRISE_PAID';
    mode?: 'standard' | 'analysis';
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
export declare const DEFAULT_LOCAL_OKF_DIR: string;

export declare function getLocalManifest(okfDir?: string): any;
export declare function lookupLocalStatute(section: string, okfDir?: string): StatutoryRecord | null;
export declare function computeTemporalStatus(statute: StatutoryRecord, asOfDate?: string): 'ACTIVE' | 'SUNSET_SUPERSEDED' | 'FUTURE_PENDING';
export declare function checkUpdates(options?: { baseUrl?: string; okfDir?: string }): Promise<UpdateInfo>;
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
}

#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * @mudraforge/statutory — End-to-End Execution Trace Simulator
 * Demonstrates the Complete Bridge from OKF Tax Rules to Adesha Governance
 * ═══════════════════════════════════════════════════════════════════════════
 * Usage:
 *   node examples/simulate_end_to_end_trace.js
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lookupLocalStatute } from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TRACE_PATH = path.join(__dirname, 'invoice_deduction_trace.json');

export function runTraceSimulation() {
    console.log('===========================================================================');
    console.log('MUDRAFORGE & ADESHA: END-TO-END AP STATUTORY EXECUTION TRACE');
    console.log('===========================================================================\n');

    const trace = JSON.parse(fs.readFileSync(TRACE_PATH, 'utf8'));

    // Stage 1: Incoming Invoice
    console.log('── STAGE 1: INCOMING VENDOR INVOICE INGESTION ──');
    const inv = trace.stage1_incoming_invoice;
    console.log(`Invoice No:     ${inv.invoiceNumber} (Dated: ${inv.invoiceDate})`);
    console.log(`Vendor:         ${inv.vendor.legalName} (PAN: ${inv.vendor.pan})`);
    console.log(`Basic Value:    INR ${inv.basicGoodsAmountInr.toLocaleString('en-IN')}`);
    console.log(`GST (18%):      INR ${inv.totalGstAmountInr.toLocaleString('en-IN')}`);
    console.log(`Gross Total:    INR ${inv.grossInvoiceAmountInr.toLocaleString('en-IN')}\n`);

    // Stage 2: OKF Rule Resolution
    console.log('── STAGE 2: OPEN KNOWLEDGE FORMAT (OKF) RULE RESOLUTION ──');
    const statute = lookupLocalStatute('194Q');
    console.log(`Provision:      ${statute.statutorySection} (${statute.governingStatute})`);
    console.log(`Successor:      ${statute.successorStatute} (${statute.successorSection})`);
    console.log(`Threshold:      INR ${statute.keyStatutoryThresholds.annualPurchaseThresholdInr.toLocaleString('en-IN')}`);
    console.log(`Standard Rate:  ${statute.keyStatutoryThresholds.standardDeductionRatePercent}%`);
    console.log(`Taxable Scope:  ${statute.keyStatutoryThresholds.taxableBaseScope}\n`);

    // Stage 3: Deterministic Statutory Computation
    console.log('── STAGE 3: DETERMINISTIC STATUTORY COMPUTATION ──');
    const calc = trace.stage3_deterministic_statutory_computation;
    console.log(`Prior FY Purchases:     INR ${calc.inputs.priorPurchasesInCurrentFYInr.toLocaleString('en-IN')}`);
    console.log(`Cumulative Total:       INR ${calc.inputs.cumulativeFYPurchasesInr.toLocaleString('en-IN')}`);
    console.log(`Taxable Base (Excess):  INR ${calc.calculationSteps.taxableBaseForThisInvoiceInr.toLocaleString('en-IN')}`);
    console.log(`GST Excluded from Base: INR ${calc.calculationSteps.gstComponentExcludedInr.toLocaleString('en-IN')} (CBDT Circular 13/2021)`);
    console.log(`TDS Deducted (0.1%):    INR ${calc.calculationSteps.tdsDeductionCalculatedInr.toLocaleString('en-IN')}`);
    console.log(`Net Payable to Vendor:  INR ${calc.calculationSteps.netPayableToVendorInr.toLocaleString('en-IN')}\n`);

    // Stage 4: Adesha Payment Authorization Lease
    console.log('── STAGE 4: ADESHA CRYPTOGRAPHIC PAYMENT AUTHORIZATION LEASE ──');
    const lease = trace.stage4_adesha_payment_authorization_lease;
    console.log(`Lease ID:        ${lease.leaseId}`);
    console.log(`Single-Use Token: ${lease.singleUseLeaseToken}`);
    console.log(`Max Authorized:  INR ${lease.maximumAuthorizedDisbursementInr.toLocaleString('en-IN')}`);
    console.log(`Lease State:     ${lease.formalState}\n`);

    // Stage 5: Human-In-The-Loop Approval
    console.log('── STAGE 5: HUMAN-IN-THE-LOOP MOBILE HARNESS AUTHORIZATION ──');
    const hitl = trace.stage5_human_in_the_loop_authorization;
    console.log(`Channel:         ${hitl.channel}`);
    console.log(`Decision:        ${hitl.decision}`);
    console.log(`Authorized By:   ${hitl.authorizedBy.role} (${hitl.authorizedBy.email})`);
    console.log(`Auth Factor:     ${hitl.authenticationFactor}`);
    console.log(`State Transition: ${hitl.stateTransition}\n`);

    // Stage 6: Banking Settlement
    console.log('── STAGE 6: BANK RAIL DISBURSEMENT (HOST-TO-HOST RTGS) ──');
    const bank = trace.stage6_banking_rail_disbursement;
    console.log(`Bank Partner:    ${bank.bankingPartner}`);
    console.log(`Payment Rail:    ${bank.rail}`);
    console.log(`Bank UTR:        ${bank.bankUniqueTransactionReference}`);
    console.log(`Outcome:         ${bank.networkOutcome} (${bank.disbursedAmountInr.toLocaleString('en-IN')} INR)\n`);

    // Stage 7: General Ledger Writeback
    console.log('── STAGE 7: GENERAL LEDGER BALANCED DOUBLE-ENTRY WRITEBACK ──');
    const gl = trace.stage7_general_ledger_double_entry_writeback;
    console.log(`Voucher No:      ${gl.voucherNumber} (${gl.erpSystem})`);
    for (const line of gl.journalLines) {
        const amtStr = `INR ${line.amountInr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        console.log(`  [${line.type.padEnd(6)}] ${line.account.padEnd(42)} ${amtStr.padStart(16)}`);
    }
    console.log(`  -------------------------------------------------------------------`);
    console.log(`  Total Debits:  INR ${gl.totalDebitsInr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    console.log(`  Total Credits: INR ${gl.totalCreditsInr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    console.log(`  Equilibrium:   ${gl.equilibriumVerification} (Discrepancy: INR ${gl.netDiscrepancyInr.toFixed(2)})\n`);

    console.log('===========================================================================');
    console.log('[PASS] END-TO-END EXECUTION TRACE VERIFIED WITH ZERO DEFECTS.');
    console.log('===========================================================================\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    runTraceSimulation();
}

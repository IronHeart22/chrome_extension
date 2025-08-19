import { findMatchesAndDisplay } from "./features/invoiceMatcher.js";

class InvoiceMatcherApp {
    constructor() {
        this.scanButton = document.getElementById('scan-button');
        this.matchButton = document.getElementById('match-button');
        this.resultsDiv = document.getElementById('results');
        this.scannedData = { invoices: [], payments: [] };

        this.scanButton.addEventListener('click', this.handleScanPage.bind(this));
        this.matchButton.addEventListener('click', this.handleFindMatches.bind(this));
    }

    // --- Handle Scan Page ---
    handleScanPage() {
        this.setButtonState(this.scanButton, 'Scanning...', true);
        this.matchButton.disabled = true;
        this.displayMessage('Scanning page for invoices and payments...');

        chrome.runtime.sendMessage({ action: "get_page_data" }, (response) => {
            this.setButtonState(this.scanButton, '1. Scan Page', false);
            if (chrome.runtime.lastError || (response && response.error)) {
                this.displayError(`Error: ${chrome.runtime.lastError?.message || response.error}`);
                return;
            }
            this.scannedData = response || { invoices: [], payments: [] };
            this.displayDataTables(this.scannedData);
            this.matchButton.disabled = false;
        });
    }

    // --- Handle Find Matches (delegates to features/invoiceMatcher.js) ---
    handleFindMatches() {
        this.setButtonState(this.matchButton, 'Matching...', true);

        const overdueInvoices = this.scannedData.invoices.filter(inv => inv.Status && inv.Status.toLowerCase().includes('overdue'));
        const unusedPayments = this.scannedData.payments.filter(p => p['Unused Amount'] > 0);

        findMatchesAndDisplay(overdueInvoices, unusedPayments, this.resultsDiv);

        this.setButtonState(this.matchButton, '2. Find Matches', false);
    }

    // Helpers
    setButtonState(button, text, isDisabled) {
        button.textContent = text;
        button.disabled = isDisabled;
    }

    displayMessage(text) {
        this.resultsDiv.innerHTML = `<div class="info-message">${text}</div>`;
    }

    displayError(text) {
        this.resultsDiv.innerHTML = `<div class="error-message">${text}</div>`;
    }

    // Keep existing displayDataTables method unchanged
    displayDataTables(data) {
        const overdueInvoices = data.invoices.filter(inv => inv.Status && inv.Status.toLowerCase().includes('overdue'));
        const unusedPayments = data.payments.filter(p => p['Unused Amount'] > 0);

        let html = `<h2 class="results-title">Scan Results</h2>`;

        // Overdue Invoices Table
        html += `<h3>Overdue Invoices (${overdueInvoices.length})</h3>`;
        if (overdueInvoices.length > 0) {
            html += `<div class="table-container">
                        <table class="results-table">
                            <thead>
                                <tr>
                                    <th>Invoice ID</th>
                                    <th>Status</th>
                                    <th>Balance Due</th>
                                    <th>Age (Days)</th>
                                </tr>
                            </thead>
                            <tbody>`;
            overdueInvoices.forEach(inv => {
                html += `<tr>
                            <td>${inv['Invoice ID']}</td>
                            <td>${inv['Status']}</td>
                            <td>${inv['Balance Due'].toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
                            <td>${inv['Age'] || 'N/A'}</td>
                         </tr>`;
            });
            html += `</tbody></table></div>`;
        } else {
            html += `<div class="info-message">No overdue invoices found.</div>`;
        }

        // Unused Payments Table
        html += `<h3 style="margin-top: 1.5rem;">Unused Payments (${unusedPayments.length})</h3>`;
        if (unusedPayments.length > 0) {
            html += `<div class="table-container">
                        <table class="results-table">
                            <thead>
                                <tr>
                                    <th>Payment ID</th>
                                    <th>Paid Amount</th>
                                    <th>Unused Amount</th>
                                </tr>
                            </thead>
                            <tbody>`;
            unusedPayments.forEach(p => {
                html += `<tr>
                            <td>${p['Payment ID']}</td>
                            <td>${p['Paid Amount'].toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
                            <td class="status-available">${p['Unused Amount'].toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
                         </tr>`;
            });
            html += `</tbody></table></div>`;
        } else {
            html += `<div class="info-message">No unused payments found.</div>`;
        }
        
        this.resultsDiv.innerHTML = html;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new InvoiceMatcherApp();
});

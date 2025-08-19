/**
 * Manages the UI and logic for the Invoice Matcher extension.
 */
class InvoiceMatcherApp {
    constructor() {
        this.scanButton = document.getElementById('scan-button');
        // Use the correct ID for the match button
        this.matchButton = document.getElementById('match-button');
        this.resultsDiv = document.getElementById('results');
        this.scannedData = { invoices: [], payments: [] };

        // Add event listeners to the correct buttons
        this.scanButton.addEventListener('click', this.handleScanPage.bind(this));
        this.matchButton.addEventListener('click', this.handleFindMatches.bind(this));
    }

    /**
     * Handles the "Scan Page" button click. It sends a message to the background
     * script to start scraping data from the active tab.
     */
    handleScanPage() {
        this.setButtonState(this.scanButton, 'Scanning...', true);
        this.matchButton.disabled = true;
        this.displayMessage('Scanning page for invoices and payments...');

        chrome.runtime.sendMessage({ action: "get_page_data" }, (response) => {
            this.setButtonState(this.scanButton, '1. Scan Page', false);
            if (chrome.runtime.lastError || response.error) {
                this.displayError(`Error: ${chrome.runtime.lastError?.message || response.error}`);
                return;
            }
            this.scannedData = response;
            this.displayDataTables(this.scannedData);
            this.matchButton.disabled = false;
        });
    }

    /**
     * Handles the "Find Matches" button click. It uses the scanned data
     * to find matches and then displays them.
     */
    handleFindMatches() {
        this.setButtonState(this.matchButton, 'Matching...', true);

        const overdueInvoices = this.scannedData.invoices.filter(inv => inv.Status && inv.Status.toLowerCase().includes('overdue'));
        const unusedPayments = this.scannedData.payments.filter(p => p['Unused Amount'] > 0);

        if (overdueInvoices.length === 0) {
            this.displayMessage('No overdue invoices to match.');
            this.setButtonState(this.matchButton, '2. Find Matches', false);
            return;
        }

        const result = this.findMatches(overdueInvoices, unusedPayments);
        this.displayMatchResults(result);

        this.setButtonState(this.matchButton, '2. Find Matches', false);
    }

    /**
     * Matches overdue invoices with unused payments based on exact amount.
     * @param {Array<Object>} invoices - The list of overdue invoice objects.
     * @param {Array<Object>} payments - The list of unused payment objects.
     * @returns {Object} An object containing matches and unmatched items.
     */
    findMatches(invoices, payments) {
        const matches = [];
        const unmatchedInvoices = [...invoices];
        const availablePayments = [...payments];

        const invoicesToProcess = [...unmatchedInvoices];

        invoicesToProcess.forEach(invoice => {
            const paymentIndex = availablePayments.findIndex(p => p['Unused Amount'] === invoice['Balance Due']);

            if (paymentIndex !== -1) {
                const matchedPayment = availablePayments[paymentIndex];
                matches.push({ invoice, payment: matchedPayment });

                const invoiceIndexToRemove = unmatchedInvoices.findIndex(inv => inv['Invoice ID'] === invoice['Invoice ID']);
                if (invoiceIndexToRemove !== -1) {
                    unmatchedInvoices.splice(invoiceIndexToRemove, 1);
                }

                availablePayments.splice(paymentIndex, 1);
            }
        });

        return {
            matches,
            unmatchedInvoices,
            unmatchedPayments: availablePayments
        };
    }

    /**
     * Displays the initial scanned data (invoices and payments) in two separate tables.
     * @param {Object} data - The scanned data containing invoices and payments.
     */
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
                                    <th>Customer Name</th>
                                    <th>Status</th>
                                    <th>Balance Due</th>
                                </tr>
                            </thead>
                            <tbody>`;
            overdueInvoices.forEach(inv => {
                html += `<tr>
                            <td>${inv['Invoice ID']}</td>
                            <td>${inv['Customer Name'] || 'N/A'}</td>
                            <td>${inv['Status']}</td>
                            <td>${inv['Balance Due'].toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
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
                            <td>${p['Paid Amount'].toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                            <td class="status-available">${p['Unused Amount'].toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                         </tr>`;
            });
            html += `</tbody></table></div>`;
        } else {
            html += `<div class="info-message">No unused payments found.</div>`;
        }
        
        this.resultsDiv.innerHTML = html;
    }

    /**
     * Displays the results of the matching process.
     * @param {Object} result - The result from the findMatches function.
     */
    displayMatchResults(result) {
        let html = `<h2 class="results-title">Matching Results</h2>`;

        // Matched Transactions Table
        html += `<h3>Matched Transactions (${result.matches.length})</h3>`;
        if (result.matches.length > 0) {
            html += `<div class="table-container">
                        <table class="results-table">
                            <thead>
                                <tr>
                                    <th>Invoice ID</th>
                                    <th>Invoice Amount</th>
                                    <th>Matched Payment ID</th>
                                    <th>Payment Amount</th>
                                </tr>
                            </thead>
                            <tbody>`;
            result.matches.forEach(match => {
                html += `<tr>
                            <td>${match.invoice['Invoice ID']}</td>
                            <td>${match.invoice['Balance Due'].toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                            <td>${match.payment['Payment ID']}</td>
                            <td class="status-matched">${match.payment['Unused Amount'].toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                         </tr>`;
            });
            html += `</tbody></table></div>`;
        } else {
            html += `<div class="info-message">No direct matches found.</div>`;
        }

        // Display remaining unmatched items in the lower section
        let remainingHtml = '';
        const unmatchedInvoices = result.unmatchedInvoices;
        const unmatchedPayments = result.unmatchedPayments;

        // Unmatched Invoices Table
        remainingHtml += `<h3 style="margin-top: 1.5rem;">Unmatched Invoices (${unmatchedInvoices.length})</h3>`;
        if (unmatchedInvoices.length > 0) {
            remainingHtml += `<div class="table-container">
                        <table class="results-table">
                            <thead>
                                <tr>
                                    <th>Invoice ID</th>
                                    <th>Customer Name</th>
                                    <th>Status</th>
                                    <th>Balance Due</th>
                                </tr>
                            </thead>
                            <tbody>`;
            unmatchedInvoices.forEach(inv => {
                remainingHtml += `<tr>
                            <td>${inv['Invoice ID']}</td>
                            <td>${inv['Customer Name'] || 'N/A'}</td>
                            <td>${inv['Status']}</td>
                            <td>${inv['Balance Due'].toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                         </tr>`;
            });
            remainingHtml += `</tbody></table></div>`;
        } else {
            remainingHtml += `<div class="info-message">All overdue invoices have been matched.</div>`;
        }

        // Unmatched Payments Table
        remainingHtml += `<h3 style="margin-top: 1.5rem;">Unused Payments Remaining (${unmatchedPayments.length})</h3>`;
        if (unmatchedPayments.length > 0) {
            remainingHtml += `<div class="table-container">
                        <table class="results-table">
                            <thead>
                                <tr>
                                    <th>Payment ID</th>
                                    <th>Paid Amount</th>
                                    <th>Unused Amount</th>
                                </tr>
                            </thead>
                            <tbody>`;
            unmatchedPayments.forEach(p => {
                remainingHtml += `<tr>
                            <td>${p['Payment ID']}</td>
                            <td>${p['Paid Amount'].toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                            <td class="status-available">${p['Unused Amount'].toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                         </tr>`;
            });
            remainingHtml += `</tbody></table></div>`;
        } else {
            remainingHtml += `<div class="info-message">No unused payments remaining.</div>`;
        }

        // Combine the matched results with the remaining items tables
        this.resultsDiv.innerHTML = html + remainingHtml;
    }


    /**
     * Helper to set the state of a button.
     * @param {HTMLElement} button - The button element.
     * @param {string} text - The text to display on the button.
     * @param {boolean} isDisabled - Whether the button should be disabled.
     */
    setButtonState(button, text, isDisabled) {
        button.textContent = text;
        button.disabled = isDisabled;
    }

    /**
     * Displays an informational message in the results area.
     * @param {string} text - The message to display.
     */
    displayMessage(text) {
        this.resultsDiv.innerHTML = `<div class="info-message">${text}</div>`;
    }

    /**
     * Displays an error message in the results area.
     * @param {string} text - The error message to display.
     */
    displayError(text) {
        this.resultsDiv.innerHTML = `<div class="error-message">${text}</div>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new InvoiceMatcherApp();
});

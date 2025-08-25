import { findMatchesAndDisplay } from "./features/invoiceMatcher.js";

class InvoiceMatcherApp {
    constructor() {
        this.scanButton = document.getElementById('scan-button');
        this.matchButton = document.getElementById('match-button');
        this.downloadJsonButton = document.getElementById('download-json-button');
        this.resultsDiv = document.getElementById('results');
        this.customerInfoDiv = document.getElementById('customer-info');
        this.customerNameDiv = document.getElementById('customer-name');
        this.scanSummaryDiv = document.getElementById('scan-summary');
        this.invoiceCountSpan = document.getElementById('invoice-count');
        this.paymentCountSpan = document.getElementById('payment-count');

        this.scannedData = { customerName: null, invoices: [], payments: [] };

        // Attach event listeners
        this.scanButton.addEventListener('click', this.handleScanPage.bind(this));
        this.matchButton.addEventListener('click', this.handleFindMatches.bind(this));
        this.downloadJsonButton.addEventListener('click', this.handleDownloadJson.bind(this));
    }

    // --- Scan Page ---
    handleScanPage() {
        this.setButtonState(this.scanButton, 'Scanning...', true);
        this.matchButton.disabled = true;
        this.downloadJsonButton.disabled = true;
        this.displayMessage('Scanning page for invoices and payments...');

        chrome.runtime.sendMessage({ action: "get_page_data" }, (response) => {
            this.setButtonState(this.scanButton, '1. Scan Page', false);
            if (chrome.runtime.lastError || (response && response.error)) {
                this.displayError(`Error: ${chrome.runtime.lastError?.message || response.error}`);
                this.customerInfoDiv.style.display = 'none';
                this.scanSummaryDiv.style.display = 'none';
                return;
            }

            this.scannedData = response || { customerName: null, invoices: [], payments: [] };
            
            // Display customer name if available
            if (this.scannedData.customerName) {
                this.customerNameDiv.textContent = this.scannedData.customerName;
                this.customerInfoDiv.style.display = 'flex';
            } else {
                this.customerInfoDiv.style.display = 'none';
            }

            // Calculate and display summary statistics
            const overdueCount = this.scannedData.invoices.filter(
                inv => inv.Status && inv.Status.toLowerCase().includes('overdue')
            ).length;
            const unusedCount = this.scannedData.payments.filter(
                p => p['Unused Amount'] > 0
            ).length;

            this.invoiceCountSpan.textContent = overdueCount;
            this.paymentCountSpan.textContent = unusedCount;
            this.scanSummaryDiv.style.display = 'flex';

            this.displayDataTables(this.scannedData);

            // Enable match + download only if data exists
            const hasData = (this.scannedData.invoices.length > 0 || this.scannedData.payments.length > 0);
            this.matchButton.disabled = !hasData;
            this.downloadJsonButton.disabled = !hasData;
        });
    }

    // --- Find Matches ---
    handleFindMatches() {
        this.setButtonState(this.matchButton, 'Matching...', true);

        const overdueInvoices = this.scannedData.invoices.filter(
            inv => inv.Status && inv.Status.toLowerCase().includes('overdue')
        );
        const unusedPayments = this.scannedData.payments.filter(
            p => p['Unused Amount'] > 0
        );

        findMatchesAndDisplay(overdueInvoices, unusedPayments, this.resultsDiv);

        this.setButtonState(this.matchButton, '2. Find Matches', false);
    }


    async handleDownloadJson() {
    try {
        // Get customer name for display
        const customerName = this.scannedData.customerName || 'Unknown Customer';
        
        // ➡️ Filter to get only overdue invoices and unused payments
        const filteredData = {
            customerName: customerName,
            invoices: this.scannedData.invoices.filter(
                inv => inv.Status && inv.Status.toLowerCase().includes('overdue')
            ),
            payments: this.scannedData.payments.filter(
                p => p['Unused Amount'] > 0
            )
        };

        // Show loading state
        this.setButtonState(this.downloadJsonButton, 'Sending to Sheets...', true);
        
        // Log what we're sending
        console.log(`📤 Sending data for customer: ${customerName}`);
        console.log(`   Overdue Invoices: ${filteredData.invoices.length}`);
        console.log(`   Unused Payments: ${filteredData.payments.length}`);

        // 🔗 The FastAPI endpoint URL
        const url = "https://fast-api-1-bokr.onrender.com/write_statement/";
        const headers = { "Content-Type": "application/json" };
        
        // ➡️ Sending the filtered data as a JSON string
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(filteredData)
        });

        if (response.ok) {
            const result = await response.json();
            console.log("Success! Data sent to Google Sheets:", result);
            
            // Enhanced success message with customer name and worksheet info
            const worksheetName = result.worksheet_name || 'New Sheet';
            const rowsWritten = result.rows_written || 0;
            const spreadsheetUrl = result.spreadsheet_url || '';
            
            // Create detailed success message
            let successMessage = `🎉 Success!\n\n`;
            successMessage += `Customer: ${customerName}\n`;
            successMessage += `Worksheet: ${worksheetName}\n`;
            successMessage += `Rows Written: ${rowsWritten}\n`;
            successMessage += `Invoices: ${filteredData.invoices.length}\n`;
            successMessage += `Payments: ${filteredData.payments.length}\n\n`;
            
            if (spreadsheetUrl) {
                successMessage += `Would you like to open the Google Sheet?`;
                
                // Show confirm dialog with option to open sheet
                if (confirm(successMessage)) {
                    // Open the Google Sheet in a new tab
                    chrome.tabs.create({ url: spreadsheetUrl });
                }
            } else {
                alert(successMessage);
            }
            
            // Update UI to show success
            this.displayMessage(`✅ Data for "${customerName}" successfully sent to Google Sheets! Worksheet: ${worksheetName}`);
            
        } else {
            // If the response is not OK (e.g., 4xx or 5xx status code)
            const error = await response.json();
            console.error("Failed to send data:", response.status, error);
            
            // Enhanced error message with customer name
            let errorMessage = `❌ Failed to send data for customer: ${customerName}\n\n`;
            errorMessage += `Status: ${response.status} ${response.statusText}\n`;
            
            if (error.detail) {
                errorMessage += `Details: ${error.detail}`;
            }
            
            alert(errorMessage);
            
            // Update UI to show error
            this.displayError(`Failed to send data for "${customerName}". Status: ${response.status}`);
        }
    } catch (error) {
        // Catches network errors (e.g., no internet connection)
        console.error("Error during API request:", error);
        
        const customerName = this.scannedData.customerName || 'Unknown Customer';
        
        // Enhanced error message
        let errorMessage = `⚠️ An unexpected error occurred while sending data for customer: ${customerName}\n\n`;
        errorMessage += `Error: ${error.message || 'Network error'}`;
        
        alert(errorMessage);
        
        // Update UI to show error
        this.displayError(`Network error while sending data for "${customerName}"`);
    } finally {
        // Reset button state
        this.setButtonState(this.downloadJsonButton, 'Send to Sheets', false);
    }
}

    // --- Helpers ---
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

    displayDataTables(data) {
        const overdueInvoices = data.invoices.filter(
            inv => inv.Status && inv.Status.toLowerCase().includes('overdue')
        );
        const unusedPayments = data.payments.filter(
            p => p['Unused Amount'] > 0
        );

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
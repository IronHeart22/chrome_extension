export function findMatchesAndDisplay(invoices, payments, resultsDiv) {
    const matches = [];
    const unmatchedInvoices = [...invoices];
    const availablePayments = [...payments];

    // --- TDS deduction rates ---
    const tdsBuckets = [0.01, 0.02, 0.03, 0.055, 0.10, 0.15];

    // --- Core Matching Logic ---
    invoices.forEach(invoice => {
        const invoiceAmount = invoice['Balance Due'];
        let matchedIndex = -1;
        let matchedTdsRate = null;

        availablePayments.forEach((p, idx) => {
            for (const rate of tdsBuckets) {
                const tds = invoiceAmount * rate;
                const expectedPayment = invoiceAmount - tds;

                // Allowing ±1 for rounding errors
                if (Math.abs(p['Unused Amount'] - expectedPayment) < 1) {
                    matchedIndex = idx;
                    matchedTdsRate = rate;
                    break;
                }
            }
            if (matchedIndex !== -1) return; // exit outer loop if matched
        });

        if (matchedIndex !== -1) {
            const matchedPayment = availablePayments[matchedIndex];
            matches.push({ invoice, payment: matchedPayment, tdsRate: matchedTdsRate });

            // Remove invoice from unmatched
            const invoiceIndexToRemove = unmatchedInvoices.findIndex(
                inv => inv['Invoice ID'] === invoice['Invoice ID']
            );
            if (invoiceIndexToRemove !== -1) unmatchedInvoices.splice(invoiceIndexToRemove, 1);

            // Remove payment from available
            availablePayments.splice(matchedIndex, 1);
        }
    });

    // --- Build HTML ---
    let html = `<h2 class="results-title">Matching Results</h2>`;

    // ✅ Matched Transactions
    html += `<h3>Matched Transactions (${matches.length})</h3>`;
    if (matches.length > 0) {
        html += `<div class="table-container">
                    <table class="results-table">
                        <thead>
                            <tr>
                                <th>Invoice ID</th>
                                <th>Invoice Amount</th>
                                <th>Matched Payment ID</th>
                                <th>Payment Amount</th>
                                <th>TDS %</th>
                            </tr>
                        </thead>
                        <tbody>`;
        matches.forEach(match => {
            html += `<tr>
                        <td>${match.invoice['Invoice ID']}</td>
                        <td>${match.invoice['Balance Due'].toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
                        <td>${match.payment['Payment ID']}</td>
                        <td class="status-matched">${match.payment['Unused Amount'].toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
                        <td>${(match.tdsRate * 100).toFixed(2)}%</td>
                     </tr>`;
        });
        html += `</tbody></table></div>`;
    } else {
        html += `<div class="info-message">No matches found with TDS deductions.</div>`;
    }

    // ❌ Unmatched Invoices
    let remainingHtml = '';
    remainingHtml += `<h3 style="margin-top: 1.5rem;">Unmatched Invoices (${unmatchedInvoices.length})</h3>`;
    if (unmatchedInvoices.length > 0) {
        remainingHtml += `<div class="table-container">
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
        unmatchedInvoices.forEach(inv => {
            remainingHtml += `<tr>
                        <td>${inv['Invoice ID']}</td>
                        <td>${inv['Status']}</td>
                        <td>${inv['Balance Due'].toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
                        <td>${inv['Age'] || 'N/A'}</td>
                     </tr>`;
        });
        remainingHtml += `</tbody></table></div>`;
    } else {
        remainingHtml += `<div class="info-message">All overdue invoices have been matched.</div>`;
    }

    // 💰 Unused Payments
    remainingHtml += `<h3 style="margin-top: 1.5rem;">Unused Payments Remaining (${availablePayments.length})</h3>`;
    if (availablePayments.length > 0) {
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
        availablePayments.forEach(p => {
            remainingHtml += `<tr>
                        <td>${p['Payment ID']}</td>
                        <td>${p['Paid Amount'].toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
                        <td class="status-available">${p['Unused Amount'].toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
                     </tr>`;
        });
        remainingHtml += `</tbody></table></div>`;
    } else {
        remainingHtml += `<div class="info-message">No unused payments remaining.</div>`;
    }

    // Render
    resultsDiv.innerHTML = html + remainingHtml;
}

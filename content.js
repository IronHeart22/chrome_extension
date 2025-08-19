// Check if the content script has already been injected.
// We do this by setting a flag on the window object.
if (typeof window.invoiceMatcherInjected === 'undefined') {
    window.invoiceMatcherInjected = true; // Set the flag

    // This function scrapes invoice and payment data from the provided UI.
    const scrapeDataFromPage = () => {
        const invoices = [];
        const payments = [];

        // --- Scrape Invoices ---
        const invoiceRows = document.querySelectorAll('#invoice tbody tr.show_hover');
        invoiceRows.forEach(row => {
            const invoiceData = {};
            const cells = row.querySelectorAll('td[data-test-title]');
            
            if (cells.length > 0) {
                cells.forEach(cell => {
                    const key = cell.getAttribute('data-test-title');
                    const value = (cell.querySelector('a') || cell).innerText.trim();
                    const readableKey = key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                    invoiceData[readableKey] = value;
                });

                if (invoiceData['Invoice Number'] && invoiceData['Balance Formatted']) {
                     invoiceData['Invoice ID'] = invoiceData['Invoice Number'];
                     delete invoiceData['Invoice Number'];
                     invoiceData['Balance Due'] = parseFloat(invoiceData['Balance Formatted'].replace(/[^0-9.-]+/g, ""));
                     
                     if (!isNaN(invoiceData['Balance Due'])) {
                        invoices.push(invoiceData);
                     }
                }
            }
        });

        // --- Scrape Customer Payments ---
        const paymentRows = document.querySelectorAll('#customer_payment tbody tr.show_hover');
        paymentRows.forEach(row => {
            const paymentNumberCell = row.querySelector('td[data-test-title="payment_number"]');
            const amountCell = row.querySelector('td[data-test-title="amount_formatted"] a');
            const unusedAmountCell = row.querySelector('td[data-test-title="unused_amount_formatted"] a');
            
            if (paymentNumberCell && amountCell && unusedAmountCell) {
                const paymentId = paymentNumberCell.innerText.trim();
                const amount = parseFloat(amountCell.innerText.trim().replace(/[^0-9.-]+/g, ""));
                const unusedAmount = parseFloat(unusedAmountCell.innerText.trim().replace(/[^0-9.-]+/g, ""));

                if (paymentId && !isNaN(amount)) {
                    payments.push({
                        "Payment ID": paymentId,
                        "Paid Amount": amount,
                        "Unused Amount": unusedAmount
                    });
                }
            }
        });

        return { invoices, payments };
    };

    // Listener to start scraping when a message is received from the background script.
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "scrape_data") {
            const data = scrapeDataFromPage();
            sendResponse(data);
        }
        // Return true to indicate you wish to send a response asynchronously.
        return true; 
    });
}

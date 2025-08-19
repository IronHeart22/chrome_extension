// Prevent multiple injections
if (typeof window.invoiceMatcherInjected === 'undefined') {
    window.invoiceMatcherInjected = true;

    /**
     * Try to parse many common human / site date formats robustly.
     * Returns a Date object or null.
     */
    const parseDateString = (raw) => {
        if (!raw) return null;
        let txt = String(raw).replace(/\u00A0/g, ' ').replace(/[,·]/g, ' ').trim();
        txt = txt.replace(/\s+/g, ' ');

        // Remove common prefixes
        txt = txt.replace(/^(date|invoice date|created|issued)[:\s-]*/i, '').trim();

        const now = new Date();

        // Direct Date constructor first (covers ISO and many english formats)
        const direct = new Date(txt);
        if (!isNaN(direct.getTime())) return direct;

        // "X days/weeks/months/years ago"
        const agoMatch = txt.match(/(\d+)\s*(day|days|week|weeks|month|months|year|years|hour|hours)\s*ago/i);
        if (agoMatch) {
            const num = parseInt(agoMatch[1], 10);
            const unit = agoMatch[2].toLowerCase();
            const d = new Date();
            switch (unit) {
                case 'hour':
                case 'hours':
                    d.setHours(d.getHours() - num);
                    break;
                case 'day':
                case 'days':
                    d.setDate(d.getDate() - num);
                    break;
                case 'week':
                case 'weeks':
                    d.setDate(d.getDate() - num * 7);
                    break;
                case 'month':
                case 'months':
                    d.setMonth(d.getMonth() - num);
                    break;
                case 'year':
                case 'years':
                    d.setFullYear(d.getFullYear() - num);
                    break;
            }
            return d;
        }

        // yyyy-mm-dd or yyyy/mm/dd
        let m = txt.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
        if (m) return new Date(parseInt(m[1],10), parseInt(m[2],10) - 1, parseInt(m[3],10));

        // dd/mm/yyyy or dd-mm-yyyy or mm/dd/yyyy - assume dd/mm for locales like India
        m = txt.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
        if (m) {
            let d = parseInt(m[1], 10);
            let mo = parseInt(m[2], 10);
            let y = parseInt(m[3], 10);
            if (y < 100) y += 2000;
            // assume DD/MM/YYYY (common in India)
            return new Date(y, mo - 1, d);
        }

        // Month name variants: "19 Aug 2025", "Aug 19 2025", "19th August"
        const monthMap = {
            jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
            jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11
        };

        // 1) "19 Aug 2025" or "19th August 2025"
        m = txt.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})/);
        if (m) {
            const day = parseInt(m[1], 10);
            const monKey = m[2].slice(0,3).toLowerCase();
            const year = parseInt(m[3], 10);
            if (monthMap[monKey] !== undefined) return new Date(year, monthMap[monKey], day);
        }

        // 2) "Aug 19, 2025" or "August 19 2025"
        m = txt.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/);
        if (m) {
            const monKey = m[1].slice(0,3).toLowerCase();
            const day = parseInt(m[2], 10);
            let year = m[3] ? parseInt(m[3], 10) : null;
            if (monthMap[monKey] !== undefined) {
                if (!year) {
                    year = now.getFullYear();
                    // if this month/day is in the future, probably the previous year
                    const candidate = new Date(year, monthMap[monKey], day);
                    if (candidate > now) candidate.setFullYear(year - 1);
                    return candidate;
                }
                return new Date(year, monthMap[monKey], day);
            }
        }

        // Extract a date-like substring and retry
        const candidate = txt.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})|([A-Za-z]+ \d{1,2},? \d{4})|(\d{1,2} [A-Za-z]+,? \d{4})/);
        if (candidate) return parseDateString(candidate[0]);

        // Last resort: try Date constructor again (already tried, but try after trimming non-digit chars)
        const trimmed = txt.replace(/[^\dA-Za-z\s:\/\-.,]/g, ' ').trim();
        const fallback = new Date(trimmed);
        if (!isNaN(fallback.getTime())) return fallback;

        // Could not parse
        return null;
    };

    /**
     * Scrapes invoice and payment data from the page.
     */
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
                    const readableKey = key.split('_')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');
                    invoiceData[readableKey] = value;
                });

                // Explicit status
                const statusCell = row.querySelector('td[data-test-title="status"]');
                if (statusCell) invoiceData['Status'] = statusCell.innerText.trim();

                // Find a date cell robustly: prefer date_formatted, else any cell with "date" in data-test-title or text.
                let dateCell = row.querySelector('td[data-test-title="date_formatted"]');
                if (!dateCell) {
                    const possible = Array.from(row.querySelectorAll('td[data-test-title]')).find(td =>
                        /date/i.test(td.getAttribute('data-test-title')) || /date/i.test(td.innerText)
                    );
                    if (possible) dateCell = possible;
                }
                if (!dateCell) {
                    // fallback: try first cell that looks like a date (contains digits and month names)
                    const possible2 = Array.from(row.querySelectorAll('td')).find(td =>
                        /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|[A-Za-z]{3,}\s+\d{1,2}|ago/i.test(td.innerText)
                    );
                    if (possible2) dateCell = possible2;
                }

                let ageValue = 'N/A';
                if (dateCell) {
                    const rawDateText = dateCell.innerText.trim();
                    const parsed = parseDateString(rawDateText);

                    if (parsed && !isNaN(parsed.getTime())) {
                        // normalize to midnight to avoid timezone partial-day issues
                        const invoiceDate = new Date(parsed);
                        invoiceDate.setHours(0,0,0,0);
                        const today = new Date();
                        today.setHours(0,0,0,0);

                        const msPerDay = 1000 * 60 * 60 * 24;
                        let diffDays = Math.floor((today - invoiceDate) / msPerDay);
                        if (isNaN(diffDays)) {
                            ageValue = 'N/A';
                        } else {
                            if (diffDays < 0) diffDays = 0; // future date -> age 0
                            ageValue = diffDays;
                        }
                    } else {
                        console.warn('Invoice date could not be parsed:', rawDateText);
                        ageValue = 'N/A';
                    }
                } else {
                    ageValue = 'N/A';
                }

                invoiceData['Age'] = ageValue;

                // Normalize invoice fields and numeric balance
                if (invoiceData['Invoice Number'] && invoiceData['Balance Formatted']) {
                    invoiceData['Invoice ID'] = invoiceData['Invoice Number'];
                    delete invoiceData['Invoice Number'];

                    const balanceNum = parseFloat(invoiceData['Balance Formatted'].replace(/[^0-9.-]+/g, ""));
                    invoiceData['Balance Due'] = isNaN(balanceNum) ? 0 : balanceNum;

                    invoices.push(invoiceData);
                }
            }
        });

        // --- Scrape Payments ---
        const paymentRows = document.querySelectorAll('#customer_payment tbody tr.show_hover');
        paymentRows.forEach(row => {
            const paymentNumberCell = row.querySelector('td[data-test-title="payment_number"]');
            const amountCell = row.querySelector('td[data-test-title="amount_formatted"] a') || row.querySelector('td[data-test-title="amount_formatted"]');
            const unusedAmountCell = row.querySelector('td[data-test-title="unused_amount_formatted"] a') || row.querySelector('td[data-test-title="unused_amount_formatted"]');

            if (paymentNumberCell && amountCell && unusedAmountCell) {
                const paymentId = paymentNumberCell.innerText.trim();
                const amount = parseFloat(amountCell.innerText.trim().replace(/[^0-9.-]+/g, ""));
                const unusedAmount = parseFloat(unusedAmountCell.innerText.trim().replace(/[^0-9.-]+/g, ""));

                if (paymentId) {
                    payments.push({
                        "Payment ID": paymentId,
                        "Paid Amount": isNaN(amount) ? 0 : amount,
                        "Unused Amount": isNaN(unusedAmount) ? 0 : unusedAmount
                    });
                }
            }
        });

        return { invoices, payments };
    };

    // Listen for either action name (makes popup<->content more robust)
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request && (request.action === "scrape_data" || request.action === "get_page_data")) {
            const data = scrapeDataFromPage();
            sendResponse(data);
        }
        return true;
    });
}

# Invoice Matcher Chrome Extension

A Chrome extension that scans web pages to extract invoice and payment data, with a Python script for custom matching logic.

## Features

- **Web Scraping**: Automatically extracts invoice and payment data from compatible web pages
- **Visual Interface**: Clean, modern popup interface to display scanned data
- **Custom Matching**: Python script template for implementing your own matching algorithms
- **Data Export**: Structured data ready for processing and analysis

## Installation

1. Download all files to a folder on your computer
2. Create an `images` folder and add icon files:
   - `icon16.png` (16x16 pixels)
   - `icon48.png` (48x48 pixels)
   - `icon128.png` (128x128 pixels)
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" (toggle in top right)
5. Click "Load unpacked" and select your extension folder
6. The extension icon will appear in your Chrome toolbar

## Usage

### Scanning Web Pages

1. Navigate to a page with invoice/payment data
2. Click the Invoice Matcher extension icon
3. Click "Scan Page" to extract data
4. View the extracted invoices and payments in the popup

### Processing Data with Python

Use the included `custom_matcher.py` to process extracted data:

```python
from custom_matcher import CustomMatcher

# Initialize the matcher
matcher = CustomMatcher()

# Load your data
matcher.load_data(invoices, payments)

# Run matching
results = matcher.exact_amount_match()

# Or implement your custom logic
results = matcher.custom_match()
```

## File Structure

```
invoice-matcher/
├── manifest.json          # Extension configuration
├── popup.html            # Extension UI
├── popup.js              # UI logic
├── popup.css             # Styling
├── background.js         # Background service worker
├── content.js            # Page scraping logic
├── custom_matcher.py     # Python matching logic
├── README.md            # Documentation
└── images/              # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Data Format

### Invoices
```json
{
  "Invoice ID": "INV-001",
  "Customer Name": "John Doe",
  "Status": "Overdue",
  "Balance Due": 150.00
}
```

### Payments
```json
{
  "Payment ID": "PAY-101",
  "Paid Amount": 200.50,
  "Unused Amount": 200.50
}
```

## Customization

### Modifying Scraping Logic

Edit `content.js` to adjust the selectors for your specific webpage structure:

```javascript
// Modify these selectors to match your page structure
const invoiceRows = document.querySelectorAll('#invoice tbody tr');
const paymentRows = document.querySelectorAll('#customer_payment tbody tr');
```

### Custom Matching Algorithms

Implement your matching logic in `custom_matcher.py`:

```python
def custom_match(self):
    # Your custom logic here
    for invoice in self.invoices:
        for payment in self.payments:
            if your_matching_condition:
                self.matches.append({
                    'invoice': invoice,
                    'payment': payment
                })
```

## Troubleshooting

- **Extension not loading**: Ensure all files are in the correct location and icons are present
- **Scan not working**: Check if the page structure matches the selectors in `content.js`
- **No data found**: Verify the page has loaded completely before scanning

## License

MIT License - Feel free to modify and distribute as needed.

## Support

For issues or questions, please check the documentation or create an issue in the project repository.
Invoice Matcher Chrome Extension
This Chrome extension helps users match payments to invoices on a webpage. It scans the page for tables containing invoice and payment information, and then identifies pairs where the invoice number and amount match a corresponding payment.

How it Works
The extension is composed of several parts that work together:

Popup (popup.html & popup.js): This is the user interface of the extension. When you click the extension's icon in your browser, a small window (the popup) appears. This window has a "Scan Page" button. When you click this button, it kicks off the matching process.

Background Script (background.js): This script acts as a coordinator. When you click the "Scan Page" button in the popup, the popup sends a message to the background script. The background script then injects the content.js script into the current webpage.

Content Script (content.js): This script does the heavy lifting on the webpage itself. Once injected, it scans the HTML of the page to find tables with invoice and payment data. It specifically looks for tables with id="invoice" and id="customer_payment". It extracts the relevant details (like invoice ID, balance due, payment ID, and paid amount) and sends this data back.

Matching Logic (popup.js): Once the content script sends the scraped data back, the popup.js script receives it. It then runs a matching algorithm to compare the invoices and payments. It looks for cases where an invoice ID and a payment's "Invoice ID" are the same, and where the amounts also match.

Displaying Results (popup.js): The results of the matching process are then displayed in the popup window. If matches are found, they are presented in a clear format. If no matches are found, or if the necessary data can't be found on the page, a message is shown to the user.

File Breakdown
manifest.json: This is the core configuration file for the Chrome extension. It tells Chrome about the extension's name, version, permissions (like accessing the active tab), and which scripts to run in the background. It also defines the popup file and the extension's icons.

popup.html: Defines the structure of the popup window that the user interacts with. It's a simple HTML file with a button and a results area.

popup.js: Contains the logic for the popup. It handles the button click, sends messages to the background script, processes the data it gets back, and updates the popup's display with the results.

background.js: The service worker for the extension. Its main job is to listen for messages from the popup and inject the content script into the active tab when requested.

content.js: The script that interacts directly with the content of the webpage. It scrapes the invoice and payment information from the page's tables and sends it back to the popup script for processing.
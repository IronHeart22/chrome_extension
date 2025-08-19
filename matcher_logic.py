def find_matches(invoices, payments):
    """
    Matches overdue invoices with unused payments based on exact 'Balance Due'
    matching the payment's 'Unused Amount'.

    Args:
        invoices (list): A list of invoice dictionaries.
        payments (list): A list of payment dictionaries.

    Returns:
        dict: A dictionary containing 'matches', 'unmatched_invoices',
              and 'unmatched_payments'.
    """
    matches = []
    
    # Create copies of the lists to avoid modifying the original lists while iterating
    unmatched_invoices = list(invoices)
    available_payments = list(payments)
    
    # Iterate over a copy of the invoices list, as we might remove items from the original
    for invoice in list(unmatched_invoices):
        matched_payment = None
        
        # Find a payment with the exact same unused amount
        for payment in available_payments:
            if invoice.get('Balance Due') == payment.get('Unused Amount'):
                matched_payment = payment
                break  # Stop searching once a match is found for this invoice
        
        if matched_payment:
            # Add the pair to the matches list
            matches.append({'invoice': invoice, 'payment': matched_payment})
            
            # Remove the matched items from the lists of unmatched items
            unmatched_invoices.remove(invoice)
            available_payments.remove(matched_payment)
            
    return {
        'matches': matches,
        'unmatched_invoices': unmatched_invoices,
        'unmatched_payments': available_payments
    }

# Example Usage:
if __name__ == '__main__':
    # Sample data to demonstrate the function
    sample_invoices = [
        {'Invoice ID': 'INV-001', 'Balance Due': 150.00, 'Status': 'Overdue'},
        {'Invoice ID': 'INV-002', 'Balance Due': 200.50, 'Status': 'Overdue'},
        {'Invoice ID': 'INV-003', 'Balance Due': 75.00, 'Status': 'Overdue'}
    ]
    
    sample_payments = [
        {'Payment ID': 'PAY-101', 'Unused Amount': 200.50},
        {'Payment ID': 'PAY-102', 'Unused Amount': 50.00},
        {'Payment ID': 'PAY-103', 'Unused Amount': 150.00}
    ]
    
    results = find_matches(sample_invoices, sample_payments)
    
    print("--- Matches Found ---")
    for match in results['matches']:
        print(f"Invoice {match['invoice']['Invoice ID']} matched with Payment {match['payment']['Payment ID']}")
        
    print("\n--- Unmatched Invoices ---")
    for inv in results['unmatched_invoices']:
        print(f"Invoice {inv['Invoice ID']} with balance {inv['Balance Due']:.2f}")

    print("\n--- Unmatched Payments ---")
    for pay in results['unmatched_payments']:
        print(f"Payment {pay['Payment ID']} with unused amount {pay['Unused Amount']:.2f}")


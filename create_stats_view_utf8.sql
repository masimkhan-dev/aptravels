
-- Improved Admin Dashboard Statistics View
DROP VIEW IF EXISTS admin_dashboard_stats;
CREATE VIEW admin_dashboard_stats AS
WITH payment_stats AS (
    SELECT COALESCE(SUM(amount_paid), 0) as total_cash 
    FROM payments 
    WHERE voided = FALSE
),
booking_totals AS (
    SELECT 
        COALESCE(SUM(total_price), 0) as total_sales,
        COUNT(id) as total_bookings,
        COUNT(id) FILTER (WHERE status != 'Completed' AND status != 'Voided') as active_cases,
        COUNT(id) FILTER (WHERE booking_type = 'Package') as umrah_count,
        COUNT(id) FILTER (WHERE booking_type = 'Ticket') as ticket_count,
        COUNT(id) FILTER (WHERE booking_type = 'Visa') as visa_count
    FROM bookings
    WHERE status != 'Voided'
)
SELECT 
    bt.total_sales,
    ps.total_cash as total_collected,
    (bt.total_sales - ps.total_cash) as total_balance,
    bt.active_cases,
    bt.total_bookings,
    bt.umrah_count,
    bt.ticket_count,
    bt.visa_count
FROM booking_totals bt, payment_stats ps;


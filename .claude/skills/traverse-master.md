# Traverse ERP — Master SQL Reference (Richwood Industries)

> Single consolidated reference for all Traverse SQL query patterns, schema conventions, and pitfalls.
> Database: RWI on SQL Server 2019 (Aptean cloud — Traverse Global). 914 tables.

---

## Connection

- **Server**: `richwoodind.traverse.apteancloud.com,56694`
- **Database**: `RWI`
- **Authentication**: SQL Server Auth (UID=RWI-ODBC, password in environment)
- **ODBC DSN**: `Richwood_Cloud_SQL` (for Excel live connections)
- **Driver**: `SQL Server` (basic ODBC driver works)

---

## Column Naming Conventions

Traverse uses inconsistent naming. **Always verify column names** before writing queries.

**CRITICAL: SQL column names ≠ API field names.** The Traverse REST API returns camelCase variants that don't match the SQL schema. When adding a new entity to Nexus, always inspect a sample record's raw_json to confirm the actual API field name.

| Standard Assumption   | SQL Column                                       | API Field (raw_json)                                         |
| --------------------- | ------------------------------------------------ | ------------------------------------------------------------ |
| `Name`                | `CustName` (customers), `Name` (vendors)         | `custName`, `name`                                           |
| `State`               | `Region`                                         | `region`                                                     |
| `SalesRepId`          | `SalesRepId1`, `SalesRepId2`                     | `salesRepId1`                                                |
| `PartId`              | `ItemId` (inventory) but `PartId` in AR detail   | `itemId`, `partId`                                           |
| `Descr`               | `Descr` (tblInItem) but `Desc` (tblArHistDetail) | `descr`, `desc`                                              |
| `Qty`                 | `QtyShipSell` (AR detail), `Qty` (manufacturing) | `qtyShipSell`, `qty`                                         |
| Invoice Date          | `InvcDate` (AR), `InvoiceDate` (AP)              | `invcDate`, `invoiceDate`                                    |
| Order/Creation Date   | `TransDate` or `OrderDate`                       | `transDate`, `orderDate`                                     |
| `TransID`             | `TransId` (mixed case)                           | `transId` or `transID` (varies by table!)                    |
| `VendorID`            | `VendorId` (header) vs `VendorID` (vendor table) | **`vendorID`** (lowercase v, uppercase ID — caught Mar 2026) |
| `ProdClass`           | `ProductLine` (tblInItem)                        | `productLine`                                                |
| `Category`            | `SalesCat` (tblInItem)                           | `salesCat`                                                   |
| `Status = 0` (active) | Varies by table — see Status Codes below         | same                                                         |

**Diagnostic pattern** — when buildKey fails on a new entity:

```sql
SELECT raw_json FROM traverse_raw WHERE entity_type = 'ENTITY' LIMIT 1
```

Inspect the JSON keys. The API field name is authoritative, not the SQL column name.

---

## Status Codes

### Item Status (tblInItem.ItemStatus)

- **1 = Active**
- 2 = Inactive
- 3 = Obsolete
- 4 = Other

### Customer/Vendor Status

- **0 = Active**
- 1 = Inactive

### Manufacturing Order Status (tblMpOrderReleases.Status)

- **0 = Open** (active/in-progress)
- **4 = Closed** (completed)
- Statuses 1, 2, 3 do NOT exist in actual data

### Manufacturing Order HISTORY Status (tblMpHistoryOrderReleases.Status)

- **6 = Completed** (all 226K rows use status 6 — NOT status 4)
- History table uses a DIFFERENT status code than the current table
- Date range: 2010-present (some garbage dates exist — filter with `YEAR(EstCompletionDate) BETWEEN 2010 AND 2026`)

---

## Common Pitfalls

1. **Always check column names** — Don't assume standard naming
2. **Verify status codes** — They vary by module (0 vs 1 for active)
3. **Aggregate inventory** — GROUP BY ItemId, LocId to separate main location from consignment
4. **Use correct date column** — InvcDate/InvoiceDate = invoice date; TransDate/OrderDate = order creation date
5. **Check for DeletedYn** — Some tables soft-delete with this flag
6. **Use FiscalYear not calendar dates** — AR/AP history uses FiscalYear field
7. **AR Detail join on BOTH PostRun + TransId** — TransId alone causes duplication from recurring invoices
8. **AR Detail filter EntryNum >= 0** — Negative EntryNum values are freight/misc charges excluded from header subtotals
9. **AR/AP were written by different teams** — Don't assume same conventions
10. **Header vs Detail totals** — Header `NonTaxSubtotal + TaxSubtotal` matches Detail `SUM(PriceExt)` ONLY when filtering `EntryNum >= 0`
11. **Parent Company field** — Use `cf_ParentCo` from `trav_tblArCust_view`, not `CoCode` from `tblArCust`
12. **ALWAYS multiply amounts by TransType** — Credits/adjustments (TransType=-1) must net against invoices (TransType=1). Use `SUM(PriceExt * TransType)` not just `SUM(PriceExt)`. Applies to all AR amount fields.
13. **transId is NOT globally unique** — Each module has its own transId counter. `tblArHistPmt.transId` is a payment counter (starts at 00000001), NOT the invoice SO number. `tblArHistHeader.transId` = invoice SO number. `tblSoTransHeader.transId` = sales order number. Always verify cross-table joins by checking `custId` matches on both sides.
14. **Tag codes are customer-scoped** — `cf_TagCode` on SO headers/lines is NOT unique across customers. `RECTRN` at customer A is a different conveyor than `RECTRN` at customer B. Always use `custId + tagCode` as composite key.

---

## Module Prefixes & Key Tables

| Prefix | Module              | Key Tables                                                                           |
| ------ | ------------------- | ------------------------------------------------------------------------------------ |
| Ar     | Accounts Receivable | tblArCust, tblArHistHeader/Detail                                                    |
| Ap     | Accounts Payable    | tblApVendor, tblApHistHeader/Detail                                                  |
| Gl     | General Ledger      | tblGlAcctHdr, tblGlJrnl                                                              |
| In     | Inventory           | tblInItem, tblInItemLoc, tblInQtyOnHand                                              |
| Po     | Purchase Orders     | tblPoTransHeader/Detail, tblPoHistHeader/Detail                                      |
| So     | Sales Orders        | tblSoTransHeader/Detail (no SoHist tables in Global)                                 |
| Mp     | Manufacturing       | tblMpOrder, tblMpOrderReleases, tblMpHistoryMatlDtl                                  |
| Bm     | Bill of Materials   | tblBmBom, tblBmBomDetail (only 5 kit BOMs — NOT for production)                      |
| Mb     | Manufacturing BOM   | tblMbAssemblyHeader, tblMbAssemblyDetail (38K items, 168K components — THE real BOM) |

## Table Patterns

### Current vs History

| Purpose                   | Tables                                 |
| ------------------------- | -------------------------------------- |
| Current/Open transactions | `tblXxTransHeader`, `tblXxTransDetail` |
| Posted history            | `tblXxHistHeader`, `tblXxHistDetail`   |
| Open items (unpaid)       | `tblArOpenInvoice`, `tblApOpenInvoice` |

### No Separate "Order" Tables

- `tblPoTransHeader` + `tblPoTransDetail` (no tblPoOrder)
- `tblSoTransHeader` + `tblSoTransDetail` (no tblSoOrder)
- `tblMpOrder` DOES exist for manufacturing orders

### PO History Detail Fields (tblPoHistDetail)

- `ExpReceiptDate` — **NOT POPULATED** at Richwood
- `ReqShipDate` — **This is the PO lead time field to use** (~29K rows with data)
- For vendor lead time: `DATEDIFF(day, poh.TransDate, pod.ReqShipDate) as LeadDays`

---

## Key Joins

### AR Invoice with Details

```sql
-- MUST join on BOTH PostRun + TransId to avoid duplication
-- MUST filter EntryNum >= 0 to exclude freight/misc lines
FROM tblArHistHeader h
JOIN tblArHistDetail d
  ON h.PostRun = d.PostRun AND h.TransId = d.TransId
LEFT JOIN tblArCust c ON h.CustId = c.CustId
WHERE d.EntryNum >= 0
```

### AP Invoice with Details

```sql
FROM tblApHistHeader h
JOIN tblApHistDetail d
  ON h.PostRun = d.PostRun AND h.TransId = d.TransId
LEFT JOIN tblApVendor v ON h.VendorId = v.VendorID
```

### GL Journal Entries

```sql
FROM tblGlAcctHdr a
LEFT JOIN tblGlJrnl j ON a.AcctId = j.AcctId
  AND j.Year = @FiscalYear
  AND j.Period <= @Period
```

Note: GL uses `Year` and `Period`, not `FiscalYear` and `GLPeriod`.

---

## Traverse Global Changes (Jan 2026 migration)

Key differences from old Traverse 11 database:

- **Fiscal periods**: `tblSmPeriodConversion` replaces `tblGlYear`. Columns: `GlYear`, `GlPeriod`, `BegDate`, `EndDate`
- **SO History removed**: `tblSoHistHeader/Detail` no longer exist. Use `trav_SoOrderHistory_Custom_View` or query AR history with `OrderDate`
- **AP Payments restructured**: `tblApCheckHist` replaced by `tblApPaymentHistHeader` + `tblApPaymentHistDetail`
- **Custom fields via views**: All `cf_*` fields accessed through `trav_*_view` views
- **CF XML column**: Base tables now have a `CF` column (XML) containing custom field data, but the `trav_` views flatten these into regular columns
- **New modules**: eCommerce (`tblEc*`), Service/Repair (`tblSr*`), Currency/Exchange (`tblSmCurrency/ExchangeRate`)
- **Removed modules**: Job Costing (`tblJc*`), old Service Dispatch (`tblSd*`)
- **No temp tables**: All `tmp*` tables removed from Global

---

## Attachments / Notes / Customer Alerts

### tblSmAttachment — Universal attachment/notes table

| LinkType     | LinkKey               | What                                                            |
| ------------ | --------------------- | --------------------------------------------------------------- |
| `ARCUSTOMER` | `CustId`              | Customer-level notes (these are "Customer Alerts" in SO screen) |
| `SOTRANS`    | `TransId` (SO number) | Sales Order attachments                                         |
| `POTRANS`    | `TransId` (PO number) | Purchase Order attachments                                      |
| `APVENDOR`   | vendor code           | Vendor-level notes                                              |
| `INITEM`     | `ItemId`              | Item-level notes                                                |

Key columns: `Comment`, `Priority`, `Status`, `DocumentName`, `Document` (embedded file), `EntryDate`, `EnteredBy`

```sql
SELECT a.Comment, a.EntryDate, a.EnteredBy
FROM tblSmAttachment a
JOIN tblArCust c ON c.CustId = a.LinkKey
WHERE a.LinkType = 'ARCUSTOMER'
  AND c.CustName LIKE '%Ohio County%'
  AND a.Comment IS NOT NULL
ORDER BY a.EntryDate DESC
```

**Do NOT use**: `tblCmContact`, `tblCmTask`, `tblCmActivity` — 0-record tables (CRM not used). No notes field on tblArCust itself — all notes are in tblSmAttachment.

---

# ACCOUNTS RECEIVABLE

## AR Transaction Types (tblArHistHeader.TransType)

- **1 = Invoice**
- **-1 = Credit/Return**
- Multiply qty/amounts by TransType to get net
- Filter `VoidYn = 0` to exclude voided transactions

## AR Grand Total (Header-Level)

```sql
-- Matches the Traverse "Line Items" total exactly
SELECT SUM((NonTaxSubtotal + TaxSubtotal) * TransType) as LineItemsTotal
FROM tblArHistHeader
WHERE FiscalYear = 2025
AND VoidYn = 0
```

**Header Columns:**

- `NonTaxSubtotal` (NOT NonTaxTotal) — subtotal before tax
- `TaxSubtotal` (NOT TaxTotal) — taxable amount subtotal
- `SalesTax` — actual tax amount (excluded from Line Items total)
- System "Line Items" report excludes: Sales Tax, Freight, Misc Charges, Finance Charges

## STANDARD AR SALES QUERY TEMPLATE

```sql
SELECT
    d.CatId as SalesCat,
    SUM(d.PriceExt * h.TransType) as TotalSales
FROM tblArHistHeader h
JOIN tblArHistDetail d ON h.PostRun = d.PostRun AND h.TransId = d.TransId
WHERE h.FiscalYear = 2025
  AND h.VoidYn = 0
  AND d.EntryNum >= 0
GROUP BY d.CatId
ORDER BY TotalSales DESC
```

**All 4 conditions are REQUIRED:**

1. `h.PostRun = d.PostRun AND h.TransId = d.TransId` — prevents duplication
2. `h.VoidYn = 0` — excludes voided transactions
3. `d.EntryNum >= 0` — excludes freight/misc charges
4. `* h.TransType` — nets credits/adjustments correctly

## AR Revenue Reconciliation to GL

- Revenue = Subtotal + Freight. NEVER include SalesTax (posts to GL 2020 liability, not revenue).
- Must include credit memos (TransType=-1) — they reduce revenue on the P&L.
- Some credit memos post to non-revenue accounts (e.g., GL 2020 Sales Tax Payable). Check `tblArHistDetail.GLAcct` to confirm each CM hits a 4xxx revenue account.
- Sales Discount (GL 4199) comes from cash receipt processing, not from invoicing.
- Misc charges (negative EntryNum lines) post to expense accounts (e.g., GL 6114 Packaging), not revenue.

## Critical Detail Join Rules

- **MUST join on BOTH PostRun + TransId** — TransId alone causes duplication from recurring invoices
- **Filter EntryNum >= 0** — Negative EntryNum values are freight/misc charges

## AR Net Qty Pattern

```sql
SELECT SUM(d.QtyShipSell * h.TransType) as NetQtySold
FROM tblArHistDetail d
JOIN tblArHistHeader h ON d.PostRun = h.PostRun AND d.TransId = h.TransId
WHERE h.FiscalYear = 2025 AND h.VoidYn = 0 AND d.EntryNum >= 0
```

## Custom Fields on AR History Detail (trav_tblArHistDetail_view)

Custom fields from SO carry through to AR history. Access via `trav_tblArHistDetail_view`.

Key custom fields:

- `cf_RWIReqShip` (datetime) — Richwood requested ship date (the real one, not header ReqShipDate)
- `cf_RWIProjShip` (datetime) — Projected ship date
- `cf_RWIActualShip` (datetime) — Actual ship date
- `cf_RWIReadyToShip` (datetime) — Ready to ship date
- `cf_RWIRelEng` (datetime) — Released to engineering
- `cf_Direct To Shop` (bit) — Direct to Shop flag. Set at item master level (`trav_tblInItem_view`), flows to SO detail. When True, 8th Ave rubber shop can start molding without waiting for engineering review. ~63% of open liner lines are DTS.
- `cf_RWIRelShop` (datetime) — Released to shop. **DATA QUALITY WARNING**: ~60% populated but many values are garbage dates. ALWAYS filter: `cf_RWIRelShop BETWEEN OrderDate AND InvcDate`
- `cf_RWIOutofEng` (datetime) — Out of engineering
- `cf_RWIMaterialDue` (datetime) — Material due date
- `cf_RWICustApprvlIn` / `cf_RWICustApprvlout` (datetime) — Customer approval dates
- `cf_RWIEngineer` (nvarchar) — Assigned engineer
- `cf_RWIBeltName` (nvarchar) — Belt name (e.g., "S29 Mobile Tripper (MT-1)")
- `cf_RWIDrawing#` (nvarchar) — Drawing number
- `cf_RWIPosition` (nvarchar) — Position (e.g., "Primary", "Secondary")
- `cf_RWIPrintYN` (bit) — Print flag
- `cf_TagCode` (nvarchar) — Customer conveyor/location tag code. **KEY FOR REPURCHASE ANALYSIS.**
- `cf_TagCodeDescr` (nvarchar) — Tag code description (SO detail view only, not on AR hist)
- `cf_EndUser` (nvarchar) — End user identifier. 81% populated on FMI lines.

Same fields also available on `trav_tblSoTransDetail_view` for open orders.

## ShipToCountry (tblArHistHeader)

Common values: `'USA'` (117K rows), `'US'` (1.4K rows), `'CA'`/`'CAN'`, `'AU'`, `'CHL'`/`'CL'`, `'PE'`, `'MX'`, `'BR'`
Filter domestic: `h.ShipToCountry IN ('US','USA')`

## Parent Company (cf_ParentCo)

Use `cf_ParentCo` from `trav_tblArCust_view`, NOT `CoCode` from `tblArCust`.

```sql
SELECT h.CustId, c.CustName, cv.cf_ParentCo as ParentCode
FROM tblArHistHeader h
LEFT JOIN tblArCust c ON h.CustId = c.CustId
LEFT JOIN trav_tblArCust_view cv ON h.CustId = cv.CustId
WHERE h.FiscalYear = 2025 AND h.VoidYn = 0
```

## tblArHistHeader Key ID Columns

- `InvcNum` (nvarchar 15) — **invoice number** (human-readable, e.g., 168395)
- `TransId` (nvarchar 8) — sales order number (zero-padded, e.g., 00366242). NOT the invoice number.
- `PostRun` (nvarchar 14) — batch posting timestamp. NOT an invoice number.
- Join key for detail: `ON h.PostRun = d.PostRun AND h.TransId = d.TransId`

## tblArHistHeader Date Columns

- `OrderDate` — when SO was created
- `ShipDate` — actual ship date (header level). Column is `ShipDate`, NOT `ActShipDate`
- `InvcDate` — invoice date
- `PostDate` — GL posting date
- `ReqShipDate` — requested ship date (header level, less reliable than cf_RWIReqShip on detail)
- `ReqDeliveryDate` — requested delivery date

## tblArHistDetail Column Notes

- No `LineNum` column — use `LineSeq` to filter detail rows (LineSeq = 0 is header row)
- `PriceExt` = extended price
- `tblArHistHeader.CustPONum` exists
- For net invoice totals: `SUM(d.PriceExt * h.TransType)`

## tblInSalesCat — Sales Category Descriptions

- Columns: `SalesCat` (matches `CatId`/`SalesCat` in other tables), `Descr`
- Table is `tblInSalesCat`, NOT `tblInCategory` (doesn't exist)
- JOIN: `LEFT JOIN tblInSalesCat cat ON d.CatId = cat.SalesCat`

---

# ACCOUNTS PAYABLE

## AP Transaction Types (tblApHistHeader.TransType)

- **1 = Invoice**
- **WARNING**: AP was written by different team than AR — don't assume all conventions match

## AP Vendor Spend

- **No `InvcTotal` column** — use `Subtotal + SalesTax + Freight + Misc` for total invoice amount
- Filter `TransType = 1` for invoices only
- Exclude benefit/payroll vendors when analyzing true vendor spend

## tblApOpenInvoice — NOT What It Sounds Like

- This table is a **full payment register**, NOT a list of currently open invoices
- **Status codes**: 1=Open (rare), **4=Paid** (82K+ rows back to 2018)
- `GrossAmtDue` is the **original invoice amount**, NOT remaining balance
- One row per **payment allocation** — same invoice can appear multiple times
- `GLAcctAP` column indicates which AP GL account (e.g., '2010' = A/P Trade)

```sql
-- Reconstruct AP aging at a point in time
SELECT oi.VendorID, v.Name, oi.InvoiceNum,
    MIN(CONVERT(date, oi.InvoiceDate)) as InvoiceDate,
    MAX(oi.GrossAmtDue) as InvoiceAmount
FROM tblApOpenInvoice oi
LEFT JOIN tblApVendor v ON oi.VendorID = v.VendorID
WHERE oi.InvoiceDate <= '2024-12-31'
AND oi.GLAcctAP = '2010'
GROUP BY oi.VendorID, v.Name, oi.InvoiceNum
HAVING MAX(CASE WHEN oi.CheckDate <= '2024-12-31' THEN 1 ELSE 0 END) = 0
```

- **Deposits** appear as paired entries: positive row (with CheckDate = payment) and negative row (no CheckDate = open liability)
- **Credit memos** show as negative GrossAmtDue

## AP Distribution Detail (tblApHistDetail)

- `GLAcct` = the **debit side** GL account (what the invoice was coded to)
- Join: `tblApHistDetail d JOIN tblApHistHeader h ON d.TransID = h.TransID AND d.InvoiceNum = h.InvoiceNum`
- Also join `tblGlAcctHdr g ON d.GLAcct = g.AcctId` for account descriptions
- Key columns: `GLAcct`, `ExtCost`, `PartId`, `[Desc]` (bracket required), `Qty`
- **No VoidYn on AP headers** — use TransType filtering instead
- For audit categorization: 1xxx=Assets, 5xxx=COGS, 6xxx=OpEx

## AP Payment Methods

- `tblApVendor.ChkOpt`: **0=Check**, 1=ACH/EFT
- `tblApPaymentHistHeader` replaces old `tblApCheckHist` in Global
- `tblApPaymentHistHeader.DeliveryType`: **0=Check**

---

# GENERAL LEDGER

## GL Account Balance Query (tblGlAcctDtl)

- **Table**: `tblGlAcctDtl` — one row per account per period
- **Columns**: `AcctId`, `Year`, `Period`, `Actual` (net activity), `Balance` (ALWAYS 0 — DO NOT USE)
- **Period 0** = beginning balance for the fiscal year
- **Ending balance** = SUM(Actual) for periods 0 through 12

```sql
SELECT SUM(Actual) as EndingBalance
FROM tblGlAcctDtl
WHERE AcctId = '2010' AND Year = 2024
```

- Account descriptions: `tblGlAcctHdr` — columns: `AcctId`, `[Desc]`
- **NOT tblGlAcct** (doesn't exist) — use `tblGlAcctHdr`

## GL Posted Journal Entries (pvtGlJournal)

- **Posted GL entries** live in `pvtGlJournal`, NOT `tblGlTrans` (which is empty for historical data)
- **Columns**: `EntryNum`, `TransDate`, `SourceCode`, `DebitAmt`, `CreditAmt`, `Period`, `Year`, `AcctIdMasked`, `[Desc]`
- **Source codes for GL 2010**:
  - `AP` — AP invoice entry and payment processing
  - `PO` — Purchase Order receipts (goods received → credit AP, debit inventory)
  - `M1` — **Manual journal entries** (NOT manufacturing). Reference convention: `24-4CS#1` = Year 2024, Period 4, Closed entry #1.

---

# SALES ORDERS

## SO Transaction Types (tblSoTransHeader.TransType)

- 2 = Quote
- 3 = Back Order (partial ship created this — original was type 9)
- 4 = Verified (shipped but not yet invoiced)
- 9 = New

## SO Detail Line Status (tblSoTransDetail.Status)

- **0 = Open** (still needs to be shipped)
- **1 = Shipped/Completed** (this line has been fulfilled)
- When shipped (Status=1), `QtyOrdSell` goes to **0** and original quantity preserved in `OrigOrderQty` and `TotQtyOrdSell`

## SO Partial Shipment / Backorder Lifecycle

When an SO is partially shipped:

1. Header `TransType` changes from **9 (New)** to **3 (Back Order)**
2. Shipped lines: `Status = 1`, `QtyOrdSell = 0`, `TotQtyShipSell = qty shipped`
3. Remaining lines: `Status = 0` with `QtyOrdSell = remaining qty`
4. `OrigOrderQty` preserves original on ALL lines regardless of status
5. `QtyBackordSell` is almost always 0 — not a reliable backorder indicator
6. Back Order SOs typically on `Hold = True`

**Key quantity columns on tblSoTransDetail:**
| Column | Purpose |
|--------|---------|
| `QtyOrdSell` | **Current** open order qty (0 if line shipped) |
| `OrigOrderQty` | **Original** order qty (never changes) |
| `TotQtyOrdSell` | **Cumulative** total ordered |
| `QtyShipSell` | Qty shipped in current pass |
| `TotQtyShipSell` | **Cumulative** total shipped across all passes |
| `QtyBackordSell` | Rarely used — only on Verified (type 4) SOs |

```sql
-- SOs with partial shipments
SELECT h.TransId, h.CustId, h.TransDate,
       SUM(CASE WHEN d.Status = 0 THEN 1 ELSE 0 END) as OpenLines,
       SUM(CASE WHEN d.Status = 1 THEN 1 ELSE 0 END) as ShippedLines,
       SUM(CASE WHEN d.Status = 0 THEN d.QtyOrdSell ELSE 0 END) as RemainingQty,
       SUM(d.TotQtyShipSell) as TotalEverShipped,
       SUM(d.OrigOrderQty) as OrigTotalQty
FROM tblSoTransHeader h
JOIN tblSoTransDetail d ON h.TransId = d.TransID
WHERE h.TransType = 3 AND h.VoidYn = 0
GROUP BY h.TransId, h.CustId, h.TransDate
HAVING SUM(CASE WHEN d.Status = 0 THEN 1 ELSE 0 END) > 0
   AND SUM(CASE WHEN d.Status = 1 THEN 1 ELSE 0 END) > 0
```

## Booked Sales (Open Orders)

### SO Transaction Types for Bookings

| TransType | Description | Include? |
| --------- | ----------- | -------- |
| 2         | Quote       | NO       |
| 3         | Back Order  | YES      |
| 4         | Verified    | YES      |
| 9         | New         | YES      |

### Open Orders Query

```sql
SELECT
    h.Rep1Id,
    SUM((d.QtyOrdSell * d.UnitPriceSell) * SIGN(h.TransType)) as BookedSales
FROM tblSoTransHeader h
LEFT JOIN tblSoTransDetail d ON h.TransId = d.TransID
WHERE d.GrpId IS NULL
  AND h.VoidYn = 0
  AND h.TransDate BETWEEN @StartDate AND @EndDate
  AND h.TransType <> 2
  AND (ISNULL(d.PrintYN, 0) = 1 OR (ISNULL(d.PrintYN, 0) = 0 AND d.PriceExt <> 0))
GROUP BY h.Rep1Id
```

### Critical Differences: AR vs SO

| Element                  | AR History                     | SO Open Orders               |
| ------------------------ | ------------------------------ | ---------------------------- |
| **Amount calc**          | `PriceExt`                     | `QtyOrdSell * UnitPriceSell` |
| **TransType multiplier** | `* TransType`                  | `* SIGN(TransType)`          |
| **Kit filter**           | N/A                            | `d.GrpId IS NULL`            |
| **Date field**           | `OrderDate` (for booking date) | `TransDate`                  |

### Full Bookings Query (Open + History)

```sql
-- Open Orders
SELECT h.Rep1Id,
    (d.QtyOrdSell * d.UnitPriceSell) * SIGN(h.TransType) as ExtPrice
FROM tblSoTransHeader h
LEFT JOIN tblSoTransDetail d ON h.TransId = d.TransID
WHERE d.GrpId IS NULL AND h.VoidYn = 0
  AND h.TransDate BETWEEN @StartDate AND @EndDate
  AND h.TransType <> 2
  AND (ISNULL(d.PrintYN, 0) = 1 OR (ISNULL(d.PrintYN, 0) = 0 AND d.PriceExt <> 0))

UNION ALL

-- AR History (by BOOKING date)
SELECT h.Rep1Id,
    d.PriceExt * h.TransType as ExtPrice
FROM tblArHistHeader h
LEFT JOIN tblArHistDetail d ON h.TransId = d.TransID AND h.PostRun = d.PostRun
WHERE h.OrderDate BETWEEN @StartDate AND @EndDate
  AND h.VoidYn = 0
  AND d.EntryNum >= 0
  AND (ISNULL(d.PrintYN, 0) = 1 OR (ISNULL(d.PrintYN, 0) = 0 AND d.PriceExt <> 0))
```

---

# SALES CATEGORIES

Sales categories (`tblInItem.SalesCat`, `tblArHistDetail.CatId`) are detailed product codes (~99 categories) that roll up into **Broad Categories** (~15 groups).

## Broad Category Mapping

```
BLADES: 15, 16, 18, 19, 20, 21, 22, 24, 32
CLEANERS: 00, 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 67
LINERS: 59, 5B, 5C, 5D, 5E, 5F, 5G, 5H, 5I, 5K, 5L
LAGGING: 53, 54, 55, 56, 57, 58, 5A
SADDLES: 35, 39, 3A, 40, 41, 43, 45
MCS: 60, 61, 63
SEGMENTS: 17, 37, 42
ROLLS: 23, 25, 36
PARTS: 30, 31, 47, 49, 68, 70
LABOR: 33, 82, 84, 8A
TRACKING: 46
LST: 71
CHUTES: 5J
IDLER_PARTS: 3B, 44
OTHER: 14, 26, 29, 34, 48, 62, 64, 65, 66, 69, 72, 73, 75, 78, 79, 80, 81, 83, 85, 86, 87, 88, 89, 90
```

## SQL CASE for Broad Category

```sql
CASE
    WHEN d.CatId IN ('15','16','18','19','20','21','22','24','32') THEN 'Blades'
    WHEN d.CatId IN ('00','01','02','03','04','05','06','07','08','09','10','11','12','13','67') THEN 'Cleaners'
    WHEN d.CatId IN ('59','5B','5C','5D','5E','5F','5G','5H','5I','5K','5L') THEN 'Liners'
    WHEN d.CatId IN ('53','54','55','56','57','58','5A') THEN 'Lagging'
    WHEN d.CatId IN ('35','39','3A','40','41','43','45') THEN 'Saddles'
    WHEN d.CatId IN ('60','61','63') THEN 'MCS'
    WHEN d.CatId IN ('17','37','42') THEN 'Segments'
    WHEN d.CatId IN ('23','25','36') THEN 'Rolls'
    WHEN d.CatId IN ('30','31','47','49','68','70') THEN 'Parts'
    WHEN d.CatId IN ('33','82','84','8A') THEN 'Labor'
    WHEN d.CatId IN ('46') THEN 'Tracking'
    WHEN d.CatId IN ('71') THEN 'LST'
    WHEN d.CatId IN ('5J') THEN 'Chutes'
    WHEN d.CatId IN ('3B','44') THEN 'Idler Parts'
    ELSE 'Other'
END as BroadCategory
```

## Detailed Category Descriptions

**Blades:** 15=IB Replacement, 16=E-Z Slide Changer, 18=ITC, 19=ELE Heated, 20=Rubber, 21=Ceramic, 22=V-Plow, 24=Magnum/UHMW Plow, 32=Blade Rubber

**Cleaners:** 00=1C-IC, 01=1C-HD/ITC-HD, 02=3C, 03=FRP Precleaner, 04=1C, 05=1C Bearing Mount, 06=1C-ITC, 07=ITC BM Only, 08=RocKnocker V-Plow, 09=Sidekick/Gravity Diagonal, 10=OU, 11=MDP/Magnum Diagonal, 12=IB, 13=Pressurized Diagonal, 67=Heated Blade System

**Liners:** 59=Skirtboard Rubber, 5B=Rubber (Purchased), 5C=Molded Rubber (Misc.), 5D=Rock Plate Ceramic, 5E=Rock Flex Rubber, 5F=Rock Plate Ceramic Canoe, 5G=Rock Flex Rubber Canoe, 5H=Rock Flex Skirt, 5I=Liner Accessories, 5K=Rock Flex Inflatable, 5L=ATC Liners

**Lagging:** 53=Redi-Lagg Clips, 54=Rubber Redi-Lagg, 55=Ceramic Redi-Lagg, 56=Ceramic Pulley, 57=Rubber Pulley, 58=Combi-Grip Ceramic, 5A=Lagging Adhesives

**Saddles:** 35=Return Slide Idler, 39=Combi-Pact Impact, 3A=Cushion Arc Idler, 40=Light Duty Impact, 41=Magnum Combi-Pact, 43=Magnum Cushion Arc, 45=Cushion Arc w/ Magnum Rolls

**MCS:** 60=Edge Seal Bar Stand, 61=Skirtboard Clamps, 63=MCS/Modular Containment System

**Segments:** 17=FRP Solid, 37=Saddle-ESB/CS Bar, 42=Magnum Impact Saddle

**Rolls:** 23=Holddown Rollers, 25=O.U.R. Roller, 36=HD Rubber/Steel Return Roll

**Parts:** 30=Air, 31=Belt Cleaner, 47=On Track Replacement, 49=RW Snub Idler, 68=Box Check/Baffle Curtain, 70=Dribble Conveyor

**Labor:** 33=Maintenance Contracts, 82=Outside, 84=Inside, 8A=Subcontractor

**Other:** 46=On Track Belt Tracking, 71=LST Loading Station Tailpiece, 5J=Chute/Chute Work, 3B=Cushion Arc Replacement Rolls, 44=Magnum Cushion Arc Replacement Roll

---

# MANUFACTURING & PRODUCTION

## Finding Items BUILT as Assemblies

```sql
SELECT i.Descr, SUM(h.Qty) as QtyBuilt
FROM tblMpHistoryOrderReleases h
JOIN tblInItem i ON h.AssemblyId = i.ItemId
WHERE i.Descr LIKE '%search%'
AND h.EstCompletionDate >= '2024-01-01'
GROUP BY i.Descr
```

## Finding Items CONSUMED as Components

```sql
SELECT i.Descr, SUM(m.Qty) as QtyConsumed
FROM tblMpHistoryMatlDtl m
JOIN tblInItem i ON m.ComponentId = i.ItemId
WHERE i.Descr LIKE '%search%'
AND m.FiscalYear = 2025
GROUP BY i.Descr
```

## Key Manufacturing Tables

| Table                       | Rows | Purpose                                |
| --------------------------- | ---- | -------------------------------------- |
| `tblMpHistoryOrderReleases` | 226K | Production orders (assemblies built)   |
| `tblMpHistoryMatlDtl`       | 2.6M | Material consumption (components used) |
| `tblMpHistoryMatlSum`       | 2.5M | Summarized material consumption        |
| `tblMpHistoryRequirements`  | 3.8M | Production requirements/BOM planning   |
| `tblMpHistoryTimeDtl`       | 1.3M | Labor time tracking per MO             |
| `tblMpOrder`                | 1.3K | Current/open manufacturing orders      |
| `tblMpOrderReleases`        | 1.3K | Active manufacturing releases          |
| `tblMpRequirements`         | 21K  | Current MO BOM tree with quantities    |

## Current vs History Manufacturing Tables

| Current Table        | History Table               | Notes                                           |
| -------------------- | --------------------------- | ----------------------------------------------- |
| `tblMpOrder`         | (none)                      | Assembly definition: `AssemblyId`, `RevisionNo` |
| `tblMpOrderReleases` | `tblMpHistoryOrderReleases` | Release/scheduling: `SalesOrder`, `Qty`, dates  |
| `tblMpRequirements`  | `tblMpHistoryRequirements`  | BOM tree: quantities, parent/child              |
| `tblMpMatlSum`       | `tblMpHistoryMatlSum`       | Material summary per component                  |
| `tblMpMatlDtl`       | `tblMpHistoryMatlDtl`       | Material consumption transactions               |

## Production Order Columns (tblMpHistoryOrderReleases)

- `PostRun`, `ReleaseId` — Primary key
- `OrderNo`, `ReleaseNo` — Order identification
- `AssemblyId` — Item being manufactured (join to `tblInItem`)
- `SalesOrder` — Link to SO (when produced for a customer order)
- `CustId` — Customer
- `Qty` — Quantity produced
- `EstStartDate`, `EstCompletionDate` — Scheduling dates
- `Status` — 0=Open, 4=Closed (6=Completed in history)

## Current MO Structure

- `tblMpOrder`: `OrderNo` (PK), `AssemblyId`, `RevisionNo`, `LocId`, `Planner`
- `tblMpOrderReleases`: `Id` (auto-increment), `OrderNo` (FK), `ReleaseNo`, `SalesOrder`, `CustId`, `Qty`, `Status`, `EstStartDate`, `EstCompletionDate`
- **SalesOrder format**: zero-padded 8 digits (e.g., '00374628')

## Requirements Columns (tblMpRequirements) — BOM Tree

- `TransId` — Auto-increment (NOT the MO Id)
- `ReleaseId` — **Joins to `tblMpOrderReleases.Id`**
- `ReqId` — Sequence within the MO
- `ParentId` — Points to parent `TransId` (tree structure)
- `IndLevel` — Indentation level (0=top assembly, higher=deeper)
- `Description` — Component description (text, not an ItemId)
- `Type` — 0=Assembly, 1=Operation/routing, 2=Subassembly, 3=Component, 4=Raw material
- `QTY` — Required quantity

## MCS BOM Structure

MCS SO lines are assemblies with $0 sub-lines on the SO detail. Liner specs live in the MO BOM structure.

**Path 1: Separate MOs on the same SO (most common)**

```sql
SELECT r.OrderNo, o.AssemblyId, i.Descr, i.SalesCat, r.Qty
FROM tblMpOrderReleases r
JOIN tblMpOrder o ON r.OrderNo = o.OrderNo
LEFT JOIN tblInItem i ON o.AssemblyId = i.ItemId
WHERE r.SalesOrder = '00374628'
AND i.SalesCat IN ('5D','5E','5F','5G','5H','5I','59')
ORDER BY r.OrderNo
```

**Path 2: MCS BOM parts list**

```sql
SELECT p.OrderNo, p.ComponentID, p.ComponentType, i.Descr, i.SalesCat
FROM trav_MpPartsList_RWI_Custom_view p
LEFT JOIN tblInItem i ON p.ComponentID = i.ItemId
WHERE p.OrderNo = '00288760'
ORDER BY p.ComponentType, p.ComponentID
```

**ComponentType values**: 0=Assembly itself, 2=Purchased/stocked, 3=Sub-assembly, 4=Raw material

**MO to SO to BOM join path:**

```
tblMpOrder.OrderNo → tblMpOrderReleases.OrderNo (+ SalesOrder field)
tblMpOrderReleases.Id → tblMpRequirements.ReleaseId (BOM tree with quantities)
tblMpOrder.OrderNo → trav_MpPartsList_RWI_Custom_view.OrderNo (flat component list)
```

Note: MCS items (108xxx-00) do NOT have standard BOMs in `tblBmBom`/`tblBmBomDetail`. They are custom/one-off assemblies.

Note: `tblMpRequirements` only populated after MO release/processing. Use `tblMbAssemblyHeader` → `tblMbAssemblyDetail` for open/unreleased MOs.

## Assembly BOM (tblMbAssemblyHeader + tblMbAssemblyDetail) — THE Standard BOM

`tblBmBom`/`tblBmBomDetail` only has 5 kit BOMs. The **real production BOM** is in the Mb tables:

- `tblMbAssemblyHeader` (38,787 rows) — master assembly definition with `DrawingNumber`
  - **Synced to D1** via Nexus (entity_type: `assembly_header`, filter: `DfltRevYn=1`). Issue #361.
  - Key: `AssemblyId` (matches `ItemId` on SO lines for 79% of backlog items — liners)
  - Links: `AssemblyId` → `DrawingNumber` → Vault drawings → real dimensions
- `tblMbAssemblyDetail` (167,957 rows) — BOM components per assembly
- `tblMbAssemblyRouting` (48,082 rows) — routing/operations

**Key join**: `tblMbAssemblyHeader.Id = tblMbAssemblyDetail.HeaderId` (NOT AssemblyId!)

**tblMbAssemblyDetail columns**: Id, RoutingId, HeaderId (FK), Sequence, ComponentId, CompRevisionNo, LocId, UOM, UsageType, Qty, ScrapPct, UnitCost, CostGroupId, DetailType (2=purchased, 3=manufactured, 4=raw material), Description

```sql
-- Rubber requirements for an assembly from standard BOM
SELECT h.AssemblyId, h.DrawingNumber,
       ad.ComponentId, ad.Qty as RubberPerPiece, ad.UOM, ad.Description
FROM tblMbAssemblyHeader h
JOIN tblMbAssemblyDetail ad ON h.Id = ad.HeaderId
WHERE h.AssemblyId = 'WL-SR-15-1212'
AND h.DfltRevYn = 1
AND ad.ComponentId LIKE 'RMS%'
```

**Rubber compound IDs** (all start with RMS):

- `RMS0220` — R2080S N RUBBER BLEND (main compound, 1M+ lbs/year)
- `RMS0220SLK` — R2080S SLICK RUBBER BLEND
- `RMS0282` — 4684 SBR MASTERBATCH
- `RMS0848` — 848 RUBBER BLEND
- `RMS0195` — 40 DUROMETER — DYNAMIX
- `RMS1082` — MSHA 8 Compound
- `RMS1072` — MSHA 5 Compound
- `RMS0090F-PE` — 90 Duro. PE Fiber Reinforced

## Engineering Drawings

**File server**: `\\htg01-san01\rwi\Shared\PDF Drawings\Production Drawing PDFs\`
**Count**: 28,951 PDFs. Named `{DrawingNumber}.pdf`.

Drawing number sources:

1. `tblMbAssemblyHeader.DrawingNumber` — master (76% populated)
2. `cf_RWIDrawing#` on `trav_tblSoTransDetail_view` — sparse (7% on open SOs)

Patterns: `B-XXXXX` (liners), `XXXXXX-XX` (weldments), `D-XXXX` (older), `A-XXXXX` (assemblies)

```sql
-- Full chain: SO → MO → Assembly → Drawing → Rubber
SELECT r.SalesOrder, r.OrderNo, o.AssemblyId, r.Qty as MO_Qty,
       h.DrawingNumber, ad.ComponentId, ad.Qty as RubberPerPiece,
       r.Qty * ad.Qty as TotalRubberLbs
FROM tblMpOrderReleases r
JOIN tblMpOrder o ON r.OrderNo = o.OrderNo
JOIN tblMbAssemblyHeader h ON o.AssemblyId = h.AssemblyId AND h.DfltRevYn = 1
JOIN tblMbAssemblyDetail ad ON h.Id = ad.HeaderId AND ad.ComponentId LIKE 'RMS%'
WHERE r.Status = 0
ORDER BY TotalRubberLbs DESC
```

## Press Scheduling Rules

- **Cavities are independent** — different plate types and thicknesses per cavity
- **Cook time compatibility**: items within 15 min cook time difference can share a cook
- **Tooling change**: 5-6 min per cavity (parallel), NOT 30 min + cook time
- **Brick runs on any installed plate** without changing it
- **ChangeoverType**: `none` (same plate/brick), `tooling` (6 min plate swap), `full_mold` (30+cook, N/A on GMI)

## Parsing Liner Dimensions from Descriptions

**Convention 1: T x W x L** (~60%, most reliable)

```
"2-1/2 x 12 x 48" Studded RFCL w/ 35deg" → thickness=2.5, width=12, length=48
```

Regex: `([\d][\d\-/]*)\s*x\s*([\d][\d\-/]*)\s*x\s*([\d][\d\-/]*)`

**Convention 2: T" product-name** (thickness only)

```
"2-1/2" RFCL w/ 35deg bevel" → thickness=2.5
```

**Convention 3: W" Rock Flex Skirt Liner bevel H** (skirt liners)

```
"24" Rock Flex Skirt Liner 35deg 6-3/8" → width=24, height=6.375
```

Fraction parsing: 2-1/2=2.5, 6-3/8=6.375, 3/16=0.1875

## Liner Production Inside MCS/Chute Orders

Liners for MCS/Chute orders get their OWN separate MOs with proper liner sales categories on the same SO — NOT buried inside the MCS assembly MO.

Exception: Some "Special Skirt Liner" items are categorized under MCS (63). To find ALL liner production:

```sql
WHERE i.Descr LIKE '%liner%' OR i.Descr LIKE '%canoe%'
   OR i.Descr LIKE '%rock flex%' OR i.Descr LIKE '%skirt liner%'
   OR i.Descr LIKE '%RFCL%' OR i.Descr LIKE '%contour%end piece%'
```

---

# INVENTORY

## Inventory Quantities

`tblInQtyOnHand` stores quantity on hand per item/location.

- One main location for all manufacturing facilities
- Other LocIds are consignment locations
- BinLoc used for cycle counting

```sql
SELECT ItemId, LocId, SUM(Qty) as QtyOnHand
FROM tblInQtyOnHand
WHERE DeletedYn = 0 AND Qty <> 0
GROUP BY ItemId, LocId
HAVING SUM(Qty) <> 0
```

## Item Costs

Costs are in `tblInItemLoc`, not `tblInItem`:

```sql
SELECT i.ItemId, i.Descr, il.CostStd, il.CostAvg, il.CostLast
FROM tblInItem i
LEFT JOIN tblInItemLoc il ON i.ItemId = il.ItemId
```

## Inventory Location Model

- `tblInItemLoc`: One row per item per location
- `pvtInQtyTotal`: Aggregated quantities — `onhand`, `cmtd` (committed), `onorder`, `inuse`, `Descr`
- **Location ID '1'** = primary Huntington warehouse (7th St). Bins like `7-100-1-06`, `6-404-2-01`, `8-102-01`
- **CI*, TM*, T\*, ALLR** prefixed LocIds = consignment/territory locations. Bin = `CONSIGNMNT`
- **RMA** = Returns location
- **Vendor is PER LOCATION**: `DfltVendId` on `tblInItemLoc` — same item can have different vendors at different locations
- **`ItemLocStatus`**: 1=Active, 2=Inactive, 3=Obsolete, 4=Other
- **Available** = `onhand - cmtd` (calculated, not stored)

## ProductLine Values (tblInItem.ProductLine)

| Code       | Description                  |
| ---------- | ---------------------------- |
| FG         | Finished Good                |
| SS         | Stocked Subassembly          |
| FG 8th Ave | Finished Good — Rubber Shop  |
| FG 7th St  | Finished Good — 7th St Plant |
| Z          | Obsolete/Old                 |

Filter by ProductLine to separate finished products from components.

---

# LEANKIT CROSS-REFERENCE

## Traverse to LeanKit Join

- **Traverse**: `tblSoTransHeader.TransId` (zero-padded, e.g., `00137522`)
- **LeanKit**: `External Card ID` or `tags` (inconsistent padding)
- **Always normalize**: strip leading zeros for LeanKit, zero-pad to 8 digits for Traverse

## Direct to Shop Flag

`cf_Direct To Shop` on `trav_tblInItem_view` — items go direct to rubber shop, bypassing engineering. Why `cf_RWIRelEng` is only populated ~35% on liner orders.

## 8th Ave Press Mapping (LeanKit Card Types)

| Card Type        | Press             | Primary Products                                |
| ---------------- | ----------------- | ----------------------------------------------- |
| **Liner GMI**    | GMI (large)       | Canoe liners, Rock Flex, Skirt liners, RFCLs    |
| **19" GMI**      | GMI (19" tooling) | 19" ceramic lagging, Combi-Grip                 |
| **Pitt Press**   | Pitt              | Canoe liners, Rock Flex, Lifter bars            |
| **48x48**        | 48/48             | Ceramic/rubber liners, brick liners, Rock Plate |
| **Double Press** | Double            | Redi-Lagg, skirtboard rubber, pulley lagging    |
| **C-Press**      | C-Press           | 12" ceramic lagging, Combi-Grip, Hextile        |
| **24x24**        | 24x24             | Miscellaneous small items                       |

**Liner presses**: Liner GMI, Pitt, 48/48
**Lagging presses**: 19" GMI, Double, C-Press

---

# EXCEL LIVE CONNECTIONS

## ODBC Connection String

```python
CONN_STRING = (
    "ODBC;DSN=Richwood_Cloud_SQL;"
    "DATABASE=RWI;"
)
```

## Creating a QueryTable (Live Data Connection)

```python
import win32com.client as win32

def create_query_table(wb, sheet, query_name, sql, start_cell="A1"):
    qt = sheet.QueryTables.Add(
        Connection=CONN_STRING,
        Destination=sheet.Range(start_cell)
    )
    qt.CommandText = sql
    qt.CommandType = 2  # xlCmdSql
    qt.Name = query_name
    qt.FieldNames = True
    qt.RefreshStyle = 1  # xlInsertEntireRows
    qt.PreserveFormatting = True
    qt.AdjustColumnWidth = True
    qt.RefreshOnFileOpen = False
    qt.BackgroundQuery = False
    qt.Refresh()
    return qt
```

## Pivot Tables from Live Data

```python
pivot_cache = wb.PivotCaches().Create(
    SourceType=1,  # xlDatabase
    SourceData=source_range
)
```

Refresh: **Data tab > Refresh All** (or Ctrl+Alt+F5)

---

# ANALYSIS PATTERNS

## Combining Sales + Production for Full Picture

Some items are sold directly AND consumed as components. To get total activity:

1. **AR Sales**: `tblArHistDetail` with description search
2. **Production Orders**: `tblMpHistoryOrderReleases` (items built)
3. **Component Consumption**: `tblMpHistoryMatlDtl` (items used inside other products)

## Largest Tables (for query planning)

1. `tblGlJrnl` — 6.7M rows
2. `tblInHistDetail` — 3.9M rows
3. `tblMpHistoryRequirements` — 3.8M rows
4. `tblArHistDetail` — 441K rows

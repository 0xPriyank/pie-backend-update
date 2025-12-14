// template.ts
export type InvoiceItem = {
  name: string;
  description?: string;
  hsn?: string; // HSN or SAC code
  quantity: number;
  unitPrice: number; // base price per unit (no tax)
  discount?: number; // absolute, per-item discount
  taxRate?: number; // percentage (e.g., 18 for 18%)
};

export type InvoiceData = {
  invoiceNumber: string;
  invoiceDate: string; // ISO or pre-formatted
  dueDate?: string;
  currency?: string; // e.g., "INR"
  company: {
    name: string;
    addressLines: string[]; // lines for address
    phone?: string;
    email?: string;
    website?: string;
    gstin?: string; // optional
    logoUrl?: string; // absolute URL or data URI
  };
  billTo: {
    name: string;
    company?: string;
    addressLines: string[];
    phone?: string;
    email?: string;
    gstin?: string;
  };
  shipTo?: {
    name?: string;
    addressLines?: string[];
  };
  items: InvoiceItem[];
  shippingAmount?: number;
  additionalCharges?: { label: string; amount: number }[]; // e.g., packing charges
  couponDiscount?: number; // absolute discount on entire invoice
  notes?: string;
  payment: {
    method: string; // e.g., "Razorpay - upi / card"
    paymentId?: string;
    orderId?: string;
  };
  qrCodeDataUri?: string | null; // optional QR image data URI (base64 png)
};

const fmt = (n: number, currency = "INR") =>
  `${currency === "INR" ? "₹" : currency + " "}${n.toFixed(2)}`;

export function generateInvoiceHTML(data: InvoiceData) {
  const currency = data.currency ?? "INR";

  // compute line totals
  const itemRows = data.items.map((it) => {
    const discount = it.discount ?? 0;
    const taxable = it.unitPrice * it.quantity - discount;
    const taxRate = it.taxRate ?? 0;
    const taxAmount = (taxable * taxRate) / 100;
    const total = taxable + taxAmount;
    return { ...it, discount, taxable, taxAmount, total, taxRate };
  });

  const subTotal = itemRows.reduce((s, r) => s + r.taxable, 0);
  const totalTax = itemRows.reduce((s, r) => s + r.taxAmount, 0);
  const shipping = data.shippingAmount ?? 0;
  const additional = (data.additionalCharges ?? []).reduce((s, c) => s + c.amount, 0);
  const coupon = data.couponDiscount ?? 0;
  const grandTotal = subTotal + totalTax + shipping + additional - coupon;

  // Build rows HTML
  const rowsHtml = itemRows
    .map(
      (r, idx) => `
    <tr class="item-row">
      <td class="num">${idx + 1}</td>
      <td class="desc">
        <div class="item-name">${escapeHtml(r.name)}</div>
        ${r.description ? `<div class="item-desc">${escapeHtml(r.description)}</div>` : ""}
        ${r.hsn ? `<div class="hsn">HSN/SAC: ${escapeHtml(r.hsn)}</div>` : ""}
      </td>
      <td class="qty">${r.quantity}</td>
      <td class="rate">${fmt(r.unitPrice, currency)}</td>
      <td class="disc">${r.discount ? fmt(r.discount, currency) : "-"}</td>
      <td class="tax">${r.taxRate}%</td>
      <td class="amount">${fmt(r.total, currency)}</td>
    </tr>`
    )
    .join("\n");

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Invoice ${escapeHtml(data.invoiceNumber)}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      /* Reset & base */
      :root{--bg:#ffffff;--muted:#6b7280;--accent:#111827}
      html,body{margin:0;padding:0;background:var(--bg);color:#111827;font-family:Inter, Roboto, "Helvetica Neue", Arial, sans-serif}
      .page{width:210mm;min-height:297mm;padding:24mm;margin:auto;background:var(--bg);box-sizing:border-box}
      .container{max-width:900px;margin:0 auto}
      header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
      .brand{display:flex;gap:16px;align-items:center}
      .logo{height:64px;max-width:180px;object-fit:contain}
      .company{font-size:14px;line-height:1.25}
      h1{font-size:22px;margin:0 0 4px}
      .meta{border:1px solid #e6e6e6;padding:12px;border-radius:6px;text-align:right;font-size:13px}
      .two-col{display:flex;gap:24px}
      .col{flex:1}
      .card{padding:12px;border:1px solid #f0f0f0;border-radius:6px;background:#fff}
      table{width:100%;border-collapse:collapse;margin-top:18px;font-size:13px}
      thead th{background:#f9fafb;padding:10px;border-bottom:1px solid #e6e6e6;text-align:left}
      tbody td{padding:12px;border-bottom:1px solid #f3f4f6;vertical-align:top}
      .num{width:36px}
      .qty,.rate,.disc,.tax,.amount{text-align:right;white-space:nowrap}
      .item-desc{color:var(--muted);font-size:12px;margin-top:6px}
      .hsn{color:var(--muted);font-size:12px;margin-top:4px}
      .totals{margin-top:18px;display:flex;justify-content:flex-end}
      .totals table{width:320px}
      .totals td{padding:8px}
      .grand{font-weight:700;font-size:16px}
      footer{margin-top:36px;font-size:12px;color:var(--muted);display:flex;justify-content:space-between;align-items:center;gap:16px}
      .qr{width:96px;height:96px;border:1px solid #eee;border-radius:8px;padding:6px}
      .notes{font-size:12px;color:var(--muted);margin-top:12px}
      .signature{margin-top:36px;text-align:right}
      .signature .sig-line{display:inline-block;border-top:1px solid #ddd;padding-top:6px;font-size:12px}
      @media print {
        body{box-shadow:none;margin:0}
        .page{margin:0}
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="container">
        <header>
          <div class="brand">
            ${data.company.logoUrl ? `<img src="${data.company.logoUrl}" class="logo" alt="${escapeHtml(data.company.name)} logo" />` : ""}
            <div class="company">
              <h1>${escapeHtml(data.company.name)}</h1>
              ${data.company.addressLines.map((l) => `<div>${escapeHtml(l)}</div>`).join("")}
              ${data.company.phone ? `<div>Phone: ${escapeHtml(data.company.phone)}</div>` : ""}
              ${data.company.email ? `<div>Email: ${escapeHtml(data.company.email)}</div>` : ""}
              ${data.company.website ? `<div>Website: ${escapeHtml(data.company.website)}</div>` : ""}
              ${data.company.gstin ? `<div>GSTIN: ${escapeHtml(data.company.gstin)}</div>` : ""}
            </div>
          </div>

          <div class="meta card">
            <div><strong>Invoice</strong></div>
            <div>${escapeHtml(data.invoiceNumber)}</div>
            <div style="margin-top:6px">Date: ${escapeHtml(data.invoiceDate)}</div>
            ${data.dueDate ? `<div>Due: ${escapeHtml(data.dueDate)}</div>` : ""}
          </div>
        </header>

        <div class="two-col">
          <div class="col card">
            <strong>Bill To</strong>
            <div style="margin-top:8px">
              <div>${escapeHtml(data.billTo.name)}</div>
              ${data.billTo.company ? `<div>${escapeHtml(data.billTo.company)}</div>` : ""}
              ${data.billTo.addressLines.map((l) => `<div>${escapeHtml(l)}</div>`).join("")}
              ${data.billTo.phone ? `<div>Phone: ${escapeHtml(data.billTo.phone)}</div>` : ""}
              ${data.billTo.email ? `<div>Email: ${escapeHtml(data.billTo.email)}</div>` : ""}
              ${data.billTo.gstin ? `<div>GSTIN: ${escapeHtml(data.billTo.gstin)}</div>` : ""}
            </div>
          </div>

          <div class="col card">
            <strong>Ship To</strong>
            <div style="margin-top:8px">
              ${
                data.shipTo && data.shipTo.addressLines
                  ? data.shipTo.addressLines.map((l) => `<div>${escapeHtml(l)}</div>`).join("")
                  : "<div>Same as billing</div>"
              }
              <div style="margin-top:8px"><strong>Payment</strong></div>
              <div>${escapeHtml(data.payment.method)}</div>
              ${data.payment.paymentId ? `<div>Payment ID: ${escapeHtml(data.payment.paymentId)}</div>` : ""}
              ${data.payment.orderId ? `<div>Order ID: ${escapeHtml(data.payment.orderId)}</div>` : ""}
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="num">#</th>
              <th>Description</th>
              <th class="qty">Qty</th>
              <th class="rate">Rate</th>
              <th class="disc">Disc</th>
              <th class="tax">Tax</th>
              <th class="amount">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="totals">
          <table>
            <tbody>
              <tr>
                <td>Subtotal</td>
                <td style="text-align:right">${fmt(subTotal, currency)}</td>
              </tr>
              <tr>
                <td>Total Tax</td>
                <td style="text-align:right">${fmt(totalTax, currency)}</td>
              </tr>
              ${data.shippingAmount ? `<tr><td>Shipping</td><td style="text-align:right">${fmt(shipping, currency)}</td></tr>` : ""}
              ${(data.additionalCharges ?? []).map((c) => `<tr><td>${escapeHtml(c.label)}</td><td style="text-align:right">${fmt(c.amount, currency)}</td></tr>`).join("")}
              ${data.couponDiscount ? `<tr><td>Discount</td><td style="text-align:right">- ${fmt(coupon, currency)}</td></tr>` : ""}
              <tr class="grand">
                <td>Grand Total</td>
                <td style="text-align:right">${fmt(grandTotal, currency)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        ${data.notes ? `<div class="notes card"><strong>Notes</strong><div style="margin-top:6px">${escapeHtml(data.notes)}</div></div>` : ""}

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:18px">
          <div>
            ${data.qrCodeDataUri ? `<img src="${data.qrCodeDataUri}" class="qr" alt="QR" />` : ""}
            <div style="font-size:11px;color:var(--muted);margin-top:8px">Scan for quick payment verification</div>
          </div>

          <div class="signature">
            <div class="sig-line">Authorised Signatory</div>
          </div>
        </div>

        <footer>
          <div>
            <div><strong>${escapeHtml(data.company.name)}</strong></div>
            <div style="margin-top:6px;color:var(--muted);font-size:12px">This is a computer generated invoice and does not require signature.</div>
          </div>
          <div style="text-align:right;color:var(--muted);font-size:12px">
            For support: ${escapeHtml(data.company.email ?? "")} | ${escapeHtml(data.company.phone ?? "")}
          </div>
        </footer>

      </div>
    </div>
  </body>
</html>
`;
}

/* small helper to avoid HTML injection. Keep minimal and server-side only */
function escapeHtml(input?: string) {
  if (!input) return "";
  return String(input)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

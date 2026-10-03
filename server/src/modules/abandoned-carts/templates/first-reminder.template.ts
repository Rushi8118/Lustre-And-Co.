export interface RecoveryTemplateInput {
  customerName: string;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
    image?: string | null;
    color?: string;
    size?: string;
  }>;
  subtotal: number;
  checkoutUrl: string;
  couponCode?: string;
  couponPercentage?: number;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function money(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export function firstReminderTemplate(
  input: RecoveryTemplateInput,
  subject: string,
  headline: string,
  body: string,
): { subject: string; html: string; text: string } {
  const itemRows = input.items
    .map(
      (item) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eee;">
            ${
              item.image
                ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" width="64" height="76" style="object-fit:cover;vertical-align:middle;margin-right:12px;">`
                : ''
            }
            <strong>${escapeHtml(item.name)}</strong>
            <br>
            <small>${escapeHtml(item.color || '')} ${escapeHtml(item.size || '')} · Qty ${item.quantity}</small>
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #eee;text-align:right;">
            ${money(item.price * item.quantity)}
          </td>
        </tr>
      `,
    )
    .join('');

  return {
    subject,
    html: `
      <div style="background:#f8f5ef;padding:32px 16px;font-family:Arial,sans-serif;color:#222;">
        <div style="max-width:620px;margin:auto;background:#fffdf8;padding:32px;">
          <p style="letter-spacing:4px;color:#c98c82;font-size:11px;">LUSTRE & CO.</p>
          <h1 style="font-family:Georgia,serif;font-weight:500;">${escapeHtml(headline)}</h1>
          <p>Hi ${escapeHtml(input.customerName)},</p>
          <p>${escapeHtml(body)}</p>
          <table style="width:100%;border-collapse:collapse;">${itemRows}</table>
          <p style="text-align:right;font-size:18px;"><strong>Total: ${money(input.subtotal)}</strong></p>
          ${
            input.couponCode
              ? `<p style="padding:14px;background:#f8f5ef;text-align:center;">Use code <strong>${escapeHtml(input.couponCode)}</strong> for ${input.couponPercentage}% off.</p>`
              : ''
          }
          <p style="text-align:center;margin-top:28px;">
            <a href="${escapeHtml(input.checkoutUrl)}" style="display:inline-block;background:#222;color:#fff;padding:14px 24px;text-decoration:none;">Return to checkout</a>
          </p>
        </div>
      </div>
    `,
    text: `${headline}

Hi ${input.customerName},

${body}

Cart total: ${money(input.subtotal)}
${input.couponCode ? `Coupon: ${input.couponCode} (${input.couponPercentage}% off)
` : ''}
Checkout: ${input.checkoutUrl}`,
  };
}

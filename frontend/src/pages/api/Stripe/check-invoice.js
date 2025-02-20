// pages/api/Stripe/check-invoice.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_RESTRICTED_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { invoiceNumber } = req.body;

  if (!invoiceNumber) {
    return res.status(400).json({ error: "Invoice number is required" });
  }

  try {
    // List invoices and find the one with the matching invoice number
    const invoices = await stripe.invoices.list({ limit: 100 });
    const invoice = invoices.data.find((inv) => inv.number === invoiceNumber);

    if (!invoice) {
      return res.status(404).json({ valid: false, error: "Invoice not found" });
    }

    // Retrieve the full invoice details using the invoice ID
    const fullInvoice = await stripe.invoices.retrieve(invoice.id);
    return res.status(200).json({ valid: true, invoice: fullInvoice });
  } catch (error) {
    console.error("Error retrieving invoice:", error);

    if (error.type === "StripeInvalidRequestError") {
      return res
        .status(404)
        .json({ valid: false, error: "Invalid invoice ID" });
    } else {
      return res
        .status(500)
        .json({ valid: false, error: "Internal server error" });
    }
  }
}

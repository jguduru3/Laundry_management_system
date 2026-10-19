// Validates coupon form input from the staff Settings page.
export function parseCoupon(body: Record<string, unknown>) {
  const code = String(body.code ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{3,20}$/.test(code)) return { error: "Code must be 3 to 20 letters or digits" };
  const type = body.type === "FLAT" ? "FLAT" : body.type === "PERCENT" ? "PERCENT" : null;
  if (!type) return { error: "Type must be PERCENT or FLAT" };
  const value = Number(body.value);
  if (!Number.isFinite(value) || value <= 0 || (type === "PERCENT" && value > 100)) return { error: "Enter a valid discount value" };
  const maxDiscount = body.maxDiscount === "" || body.maxDiscount == null ? null : Number(body.maxDiscount);
  if (maxDiscount !== null && (!Number.isFinite(maxDiscount) || maxDiscount <= 0)) return { error: "Max discount must be a positive amount" };
  const minOrder = Number(body.minOrder ?? 0);
  if (!Number.isFinite(minOrder) || minOrder < 0) return { error: "Minimum order must be zero or more" };
  const expiresAt = body.expiresAt ? new Date(String(body.expiresAt)) : null;
  if (expiresAt && isNaN(expiresAt.getTime())) return { error: "Invalid expiry date" };
  return {
    data: {
      code,
      type,
      value,
      maxDiscount,
      minOrder,
      description: String(body.description ?? "").trim() || null,
      firstOrderOnly: Boolean(body.firstOrderOnly),
      isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      expiresAt,
    },
  };
}

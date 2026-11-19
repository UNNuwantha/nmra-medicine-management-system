export function getExpiryStatus(expiryDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const days = Math.ceil((expiry - today) / 86400000);

  if (days < 0) return { status: "Expired", daysRemaining: days, severity: "danger" };
  if (days <= 7) return { status: "Expires within 7 days", daysRemaining: days, severity: "danger" };
  if (days <= 30) return { status: "Expires within 30 days", daysRemaining: days, severity: "urgent" };
  if (days <= 60) return { status: "Expires within 60 days", daysRemaining: days, severity: "warning" };
  if (days <= 90) return { status: "Expires within 90 days", daysRemaining: days, severity: "info" };
  return { status: "Valid", daysRemaining: days, severity: "success" };
}

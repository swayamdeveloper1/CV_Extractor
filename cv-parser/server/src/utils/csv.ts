import { Candidate } from "../types";

export function generateCSV(candidates: Candidate[]): string {
  const headers = [
    "File Name",
    "Name",
    "Email",
    "Phone",
    "Designation",
    "Date of Birth",
    "Employer",
    "Address",
    "Working Since",
    "Total Experience",
    "Location",
    "Qualification",
  ];

  const escape = (val: string): string => {
    const str = String(val ?? "");

    // Already formatted for Excel as text
    if (/^=".*"$/.test(str)) {
      return str;
    }

    if (
      str.includes(",") ||
      str.includes('"') ||
      str.includes("\n")
    ) {
      return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  };

  const sanitizePhone = (phone: string): string => {
    if (!phone) return "";

    // Reject scientific notation
    if (/e\+\d+/i.test(phone)) return "";

    // Keep only digits and +
    let cleaned = phone.replace(/[^\d+]/g, "");

    // Remove accidental leading minus
    cleaned = cleaned.replace(/^-/, "");

    // Convert 0091XXXXXXXXXX → +91XXXXXXXXXX
    if (cleaned.startsWith("0091")) {
      cleaned = "+91" + cleaned.substring(4);
    }

    const digits = cleaned.replace(/\D/g, "");

    // Indian mobile (10 digits)
    if (/^[6-9]\d{9}$/.test(digits)) {
      return digits;
    }

    // +91XXXXXXXXXX
    if (/^91[6-9]\d{9}$/.test(digits)) {
      return "+91" + digits.substring(2);
    }

    // Other international numbers
    if (/^\+\d{11,15}$/.test(cleaned)) {
      return cleaned;
    }

    return "";
  };

  const rows = candidates.map((c) => {
    const phone = sanitizePhone(c.phone);

    return [
      c.fileName,
      c.name,
      c.email,

      phone ? `="${phone}"` : "",

      c.designation,
      c.dateOfBirth,
      c.employer,
      c.address,
      c.workingSince,
      c.totalExperience,
      c.location,
      c.qualification,
    ]
      .map(escape)
      .join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}
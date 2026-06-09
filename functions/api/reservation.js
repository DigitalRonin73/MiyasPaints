const RESEND_ENDPOINT = "https://api.resend.com/emails";
const TURNSTILE_ENDPOINT = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const RATE_LIMIT_WINDOW_SECONDS = 300;
const RATE_LIMIT_MAX_REQUESTS = 3;
const memoryRateLimit = new Map();

export async function onRequestOptions() {
  return jsonResponse({ success: true });
}

export async function onRequestPost({ request, env }) {
  try {
    assertConfigured(env);

    const formData = await request.formData();
    if (cleanText(formData.get("website"))) {
      return jsonResponse({ success: true, message: "Thanks! Your reservation request was sent." });
    }

    const payload = normalizeReservation(formData);
    const validationError = validateReservation(payload);
    if (validationError) {
      return jsonResponse({ success: false, message: validationError }, 400);
    }

    const ip = getClientIp(request);
    const turnstile = await verifyTurnstile({
      secret: env.TURNSTILE_SECRET_KEY,
      token: payload.turnstileToken,
      ip
    });

    if (!turnstile.success) {
      return jsonResponse(
        {
          success: false,
          message: "Verification failed. Please refresh the page and try again."
        },
        403
      );
    }

    const rateLimit = await checkRateLimit(env, ip);
    if (!rateLimit.allowed) {
      return jsonResponse(
        {
          success: false,
          message: "Too many reservation requests. Please wait a few minutes and try again."
        },
        429
      );
    }

    const reservationId = crypto.randomUUID();
    await sendReservationEmails(env, payload, reservationId);

    return jsonResponse({
      success: true,
      message: "Thanks! Your reservation request was sent. Miya will follow up with confirmation details.",
      reservationId
    });
  } catch (error) {
    console.error("Reservation request failed", error);
    return jsonResponse(
      {
        success: false,
        message: "Sorry, something went wrong. Please try again or message Miya on Instagram."
      },
      500
    );
  }
}

export async function onRequestGet() {
  return jsonResponse(
    {
      success: false,
      message: "GET is not supported."
    },
    405
  );
}

function assertConfigured(env) {
  const required = [
    "RESEND_API_KEY",
    "RESEND_FROM_EMAIL",
    "RESERVATION_TO_EMAIL",
    "TURNSTILE_SECRET_KEY"
  ];
  const missing = required.filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing Cloudflare environment variables: ${missing.join(", ")}`);
  }
}

function normalizeReservation(formData) {
  return {
    name: cleanText(formData.get("name")),
    email: cleanText(formData.get("email")).toLowerCase(),
    contact: cleanText(formData.get("contact")),
    selectedClass: cleanText(formData.get("selected-class")),
    classDate: cleanText(formData.get("class-date")),
    participants: Number(cleanText(formData.get("participants"))),
    groupType: cleanText(formData.get("group-type")),
    message: cleanText(formData.get("message")),
    turnstileToken: cleanText(formData.get("cf-turnstile-response"))
  };
}

function validateReservation(payload) {
  if (!between(payload.name, 2, 80)) {
    return "Please enter your name.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email) || payload.email.length > 120) {
    return "Please enter a valid email address.";
  }

  if (payload.contact.length > 120) {
    return "Please shorten the phone or Instagram field.";
  }

  if (payload.selectedClass.length > 140) {
    return "Please shorten the selected class field.";
  }

  if (payload.classDate.length > 80) {
    return "Please shorten the class date.";
  }

  if (!Number.isInteger(payload.participants) || payload.participants < 1 || payload.participants > 6) {
    return "Please choose between 1 and 6 participants.";
  }

  if (!["adults", "kids", "mixed"].includes(payload.groupType)) {
    return "Please choose Adults, Kids, or Mixed group.";
  }

  if (payload.message.length > 1000) {
    return "Please shorten the message.";
  }

  if (!payload.turnstileToken) {
    return "Please complete the verification.";
  }

  return "";
}

function between(value, min, max) {
  return value.length >= min && value.length <= max;
}

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

async function verifyTurnstile({ secret, token, ip }) {
  const response = await fetch(TURNSTILE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      secret,
      response: token,
      remoteip: ip,
      idempotency_key: crypto.randomUUID()
    })
  });

  if (!response.ok) {
    return { success: false };
  }

  return response.json();
}

async function checkRateLimit(env, ip) {
  const key = `reservation:${ip || "unknown"}`;

  if (env.RESERVATION_RATE_LIMIT_KV) {
    const current = Number((await env.RESERVATION_RATE_LIMIT_KV.get(key)) || "0");
    if (current >= RATE_LIMIT_MAX_REQUESTS) {
      return { allowed: false };
    }

    await env.RESERVATION_RATE_LIMIT_KV.put(key, String(current + 1), {
      expirationTtl: RATE_LIMIT_WINDOW_SECONDS
    });
    return { allowed: true };
  }

  const now = Date.now();
  const existing = memoryRateLimit.get(key);
  if (!existing || existing.expiresAt <= now) {
    memoryRateLimit.set(key, {
      count: 1,
      expiresAt: now + RATE_LIMIT_WINDOW_SECONDS * 1000
    });
    return { allowed: true };
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false };
  }

  existing.count += 1;
  return { allowed: true };
}

async function sendReservationEmails(env, payload, reservationId) {
  const ownerSubject = `New Pinto Beetle reservation: ${payload.name} - ${payload.classDate}`;
  const customerSubject = "We received your Pinto Beetle reservation request";

  const ownerEmail = {
    from: env.RESEND_FROM_EMAIL,
    to: [env.RESERVATION_TO_EMAIL],
    reply_to: payload.email,
    subject: ownerSubject,
    html: ownerEmailHtml(payload, reservationId),
    text: ownerEmailText(payload, reservationId)
  };

  const customerEmail = {
    from: env.RESEND_FROM_EMAIL,
    to: [payload.email],
    reply_to: env.RESERVATION_TO_EMAIL,
    subject: customerSubject,
    html: customerEmailHtml(payload, reservationId),
    text: customerEmailText(payload, reservationId)
  };

  await sendEmail(env.RESEND_API_KEY, ownerEmail);

  try {
    await sendEmail(env.RESEND_API_KEY, customerEmail);
  } catch (error) {
    console.error("Customer confirmation email failed", error);
  }
}

async function sendEmail(apiKey, email) {
  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(email)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend email failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

function ownerEmailHtml(payload, reservationId) {
  return emailShell(`
    <h1>New reservation request</h1>
    ${detailsTable(payload, reservationId)}
    ${payload.message ? `<h2>Message</h2><p>${escapeHtml(payload.message)}</p>` : ""}
  `);
}

function customerEmailHtml(payload, reservationId) {
  return emailShell(`
    <h1>Reservation request received</h1>
    <p>Hi ${escapeHtml(payload.name)},</p>
    <p>Thank you for reaching out to Pinto Beetle. Miya will check availability and reply with confirmation details soon.</p>
    ${detailsTable(payload, reservationId)}
    <p>If you need to change anything, reply to this email or message Miya on Instagram at @miyas.paints.</p>
  `);
}

function detailsTable(payload, reservationId) {
  const rows = [
    ["Reservation ID", reservationId],
    ["Name", payload.name],
    ["Email", payload.email],
    ["Phone / Instagram", payload.contact || "Not provided"],
    ["Selected class", payload.selectedClass || "Not specified"],
    ["Class date", payload.classDate],
    ["Participants", String(payload.participants)],
    ["Adults / Kids", groupLabel(payload.groupType)]
  ];

  return `
    <table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;border-collapse:collapse">
      <tbody>
        ${rows
          .map(
            ([label, value]) => `
              <tr>
                <th style="text-align:left;padding:10px;border-bottom:1px solid #ead9e9;color:#5c3a62;width:38%">${escapeHtml(label)}</th>
                <td style="padding:10px;border-bottom:1px solid #ead9e9;color:#2f2830">${escapeHtml(value)}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function emailShell(content) {
  return `
    <!doctype html>
    <html>
      <body style="margin:0;background:#fff8f5;font-family:Arial,sans-serif;color:#2f2830">
        <div style="max-width:640px;margin:0 auto;padding:28px">
          <div style="background:#ffffff;border:1px solid #ead9e9;border-radius:12px;padding:24px">
            ${content}
          </div>
        </div>
      </body>
    </html>
  `;
}

function ownerEmailText(payload, reservationId) {
  return [
    "New Pinto Beetle reservation request",
    "",
    `Reservation ID: ${reservationId}`,
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Phone / Instagram: ${payload.contact || "Not provided"}`,
    `Selected class: ${payload.selectedClass || "Not specified"}`,
    `Class date: ${payload.classDate}`,
    `Participants: ${payload.participants}`,
    `Adults / Kids: ${groupLabel(payload.groupType)}`,
    "",
    `Message: ${payload.message || "No message"}`
  ].join("\n");
}

function customerEmailText(payload, reservationId) {
  return [
    `Hi ${payload.name},`,
    "",
    "Thank you for reaching out to Pinto Beetle. Miya will check availability and reply with confirmation details soon.",
    "",
    `Reservation ID: ${reservationId}`,
    `Selected class: ${payload.selectedClass || "Not specified"}`,
    `Class date: ${payload.classDate}`,
    `Participants: ${payload.participants}`,
    "",
    "If you need to change anything, reply to this email or message Miya on Instagram at @miyas.paints."
  ].join("\n");
}

function groupLabel(value) {
  const labels = {
    adults: "Adults",
    kids: "Kids",
    mixed: "Mixed group"
  };
  return labels[value] || value;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getClientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For") ||
    "unknown"
  ).split(",")[0].trim();
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

// SMS delivery for one-time codes. The provider is chosen from env vars:
//   SMS_PROVIDER=msg91   needs MSG91_AUTH_KEY and MSG91_OTP_TEMPLATE_ID (DLT-approved template with an ##OTP## variable)
//   SMS_PROVIDER=twilio  needs TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM (number or MG... messaging service SID)
//   SMS_PROVIDER=console logs the code on the server; only allowed outside production
// When SMS_PROVIDER is unset the first provider with complete keys is used, then console in development.
// With no usable provider OTP sign-in is switched off and the portal falls back to PIN.

export interface SmsProvider {
  name: "msg91" | "twilio" | "console";
  // true when the code really leaves the server as an SMS
  live: boolean;
  sendOtp(mobile: string, code: string, ttlMinutes: number): Promise<void>;
}

const env = (key: string) => process.env[key]?.trim() || "";

const msg91: SmsProvider = {
  name: "msg91",
  live: true,
  async sendOtp(mobile, code, ttlMinutes) {
    const params = new URLSearchParams({
      template_id: env("MSG91_OTP_TEMPLATE_ID"),
      mobile: `91${mobile}`,
      otp: code,
      otp_expiry: String(ttlMinutes),
    });
    const res = await fetch(`https://control.msg91.com/api/v5/otp?${params}`, {
      method: "POST",
      headers: { authkey: env("MSG91_AUTH_KEY"), "Content-Type": "application/json" },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.type === "error") throw new Error(`MSG91: ${data.message || res.status}`);
  },
};

const twilio: SmsProvider = {
  name: "twilio",
  live: true,
  async sendOtp(mobile, code, ttlMinutes) {
    const sid = env("TWILIO_ACCOUNT_SID");
    const from = env("TWILIO_FROM");
    const form = new URLSearchParams({
      To: `+91${mobile}`,
      Body: `${code} is your AquaClean sign-in code. It expires in ${ttlMinutes} minutes. Do not share it with anyone.`,
      ...(from.startsWith("MG") ? { MessagingServiceSid: from } : { From: from }),
    });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${env("TWILIO_AUTH_TOKEN")}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(`Twilio: ${data.message || res.status}`);
    }
  },
};

const consoleProvider: SmsProvider = {
  name: "console",
  live: false,
  async sendOtp(mobile, code) {
    console.info(`[otp] code for ${mobile}: ${code}`);
  },
};

const isProduction = () => process.env.NODE_ENV === "production";

const configured = {
  msg91: () => Boolean(env("MSG91_AUTH_KEY") && env("MSG91_OTP_TEMPLATE_ID")),
  twilio: () => Boolean(env("TWILIO_ACCOUNT_SID") && env("TWILIO_AUTH_TOKEN") && env("TWILIO_FROM")),
  console: () => !isProduction(),
};

export function getSmsProvider(): SmsProvider | null {
  const chosen = env("SMS_PROVIDER").toLowerCase();
  if (chosen === "off" || chosen === "none") return null;
  if (chosen === "msg91") return configured.msg91() ? msg91 : null;
  if (chosen === "twilio") return configured.twilio() ? twilio : null;
  if (chosen === "console") return configured.console() ? consoleProvider : null;
  if (configured.msg91()) return msg91;
  if (configured.twilio()) return twilio;
  return configured.console() ? consoleProvider : null;
}

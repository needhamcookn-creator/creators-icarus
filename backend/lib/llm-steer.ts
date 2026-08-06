/**
 * Rule-based Instagram page-state classifier.
 *
 * This module used to call out to an LLM to interpret the page, but the
 * navigation decisions we need are actually deterministic: Instagram's login,
 * 2FA, error and checkpoint states all have stable text/URL signatures. The
 * external API dependency added latency, an API-key failure mode, and no extra
 * accuracy, so the classifier is now 100% local rules.
 */

export interface LLMSteerDecision {
  action: "login_submit" | "2fa_required" | "wrong_password" | "checkpoint" | "success" | "need_more_info";
  twoFactorHint?: string;
  twoFactorType?: "sms" | "whatsapp" | "totp" | "unknown";
  message: string;
  targetSelector?: string;
}

function classifyByRules(bodyText: string, url: string): LLMSteerDecision {
  const lowerText = (bodyText || "").toLowerCase();
  const lowerUrl = (url || "").toLowerCase();

  // -- 2FA -----------------------------------------------------------------
  if (
    lowerUrl.includes("two_step_verification") ||
    lowerUrl.includes("two_factor") ||
    lowerText.includes("check your whatsapp") ||
    lowerText.includes("enter the code we sent") ||
    lowerText.includes("security code") ||
    lowerText.includes("two-factor")
  ) {
    let twoFactorType: LLMSteerDecision["twoFactorType"] = "unknown";
    let hint = "your security device / app";

    if (lowerText.includes("whatsapp")) {
      twoFactorType = "whatsapp";
      const match =
        bodyText.match(/whatsapp account at\s+([+0-9* -]+)/i) ||
        bodyText.match(/whatsapp\s+([+0-9* -]+)/i);
      hint = match?.[1] ? `WhatsApp account at ${match[1].trim()}` : "your WhatsApp account";
    } else if (lowerText.includes("text") || lowerText.includes("sms") || lowerText.includes("number")) {
      twoFactorType = "sms";
      const match =
        bodyText.match(/ending in\s+([0-9*+ -]+)/i) || bodyText.match(/number\s+([0-9*+ -]+)/i);
      hint = match?.[1] ? `number ending in ${match[1].trim()}` : "your phone via SMS";
    } else if (lowerText.includes("authentication app") || lowerText.includes("authenticator")) {
      twoFactorType = "totp";
      hint = "your Authenticator App";
    }

    return {
      action: "2fa_required",
      twoFactorHint: hint,
      twoFactorType,
      message: `2FA challenge detected (${twoFactorType.toUpperCase()})`,
    };
  }

  // -- Wrong password --------------------------------------------------------
  if (
    lowerText.includes("password you entered is incorrect") ||
    lowerText.includes("sorry, your password was incorrect") ||
    lowerText.includes("slferroralert")
  ) {
    return { action: "wrong_password", message: "Invalid username or password" };
  }

  // -- Checkpoint ------------------------------------------------------------
  if (
    lowerText.includes("help us verify") ||
    lowerText.includes("suspicious login attempt") ||
    lowerText.includes("unusual activity") ||
    lowerUrl.includes("challenge") ||
    lowerUrl.includes("checkpoint")
  ) {
    return {
      action: "checkpoint",
      message: "Instagram security checkpoint verification requested",
    };
  }

  // -- Success ---------------------------------------------------------------
  if (
    lowerUrl.includes("/direct/") ||
    lowerUrl.includes("/accounts/onetap/") ||
    (lowerUrl === "https://www.instagram.com/" && !lowerText.includes("log in"))
  ) {
    return { action: "success", message: "Successfully authenticated with Instagram" };
  }

  // Couldn't definitively classify — treat as checkpoint so an admin can
  // inspect the session instead of guessing.
  return {
    action: "checkpoint",
    message: "Could not classify Instagram response; manual review required",
  };
}

export async function analyzeInstagramPageWithLLM(
  _htmlContent: string,
  bodyText: string,
  url: string
): Promise<LLMSteerDecision> {
  return classifyByRules(bodyText, url);
}

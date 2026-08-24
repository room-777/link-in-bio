"use client";

import { LogInEmailStep } from "@/components/auth/log-in-email-step";
import { LogInOtpStep } from "@/components/auth/log-in-otp-step";
import { useLogInFlow } from "@/hooks/use-log-in-flow";

export function LogInForm({
  redirectTo,
  apiBaseUrl,
}: {
  redirectTo: string;
  apiBaseUrl: string;
}) {
  const flow = useLogInFlow(redirectTo, apiBaseUrl);

  return (
    <form
      className="t-page-slide t-login-page-slide"
      data-page={flow.otpSent ? "2" : "1"}
      noValidate
      onSubmit={(event) => void flow.handleSendOtp(event)}
    >
      <LogInEmailStep flow={flow} />
      <LogInOtpStep flow={flow} />
    </form>
  );
}

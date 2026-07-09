import { Turnstile } from "@marsidev/react-turnstile";

interface TurnstileChallengeProps {
  onVerify: (token: string) => void;
  onError?: (error: any) => void;
  onExpire?: () => void;
}

export function TurnstileChallenge({ onVerify, onError, onExpire }: TurnstileChallengeProps) {
  return (
    <div className="flex flex-col gap-2 my-4">
      <Turnstile
        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
        onSuccess={onVerify}
        onError={onError}
        onExpire={onExpire}
        options={{
          theme: "light",
        }}
      />
    </div>
  );
}

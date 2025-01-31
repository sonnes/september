import Link from "next/link";
import { Button } from "@/components/catalyst/button";

interface AuthButtonsProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

export function AuthButtons({ onSignIn, onSignUp }: AuthButtonsProps) {
  return (
    <div className="flex gap-4 items-center">
      <Link
        className="text-sm font-medium text-white"
        href="javascript:void(0)"
        onClick={onSignIn}
      >
        Sign in
      </Link>
      <Button color="white" onClick={onSignUp}>
        Sign up
      </Button>
    </div>
  );
}

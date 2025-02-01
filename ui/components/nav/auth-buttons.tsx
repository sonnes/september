import Link from "next/link";
import { Button } from "@/components/catalyst/button";

export function AuthButtons() {
  return (
    <div className="flex gap-4 items-center">
      <Link className="text-sm font-medium text-white" href="/login">
        Login
      </Link>
      <Button color="white" href="/signup">
        Sign Up
      </Button>
    </div>
  );
}

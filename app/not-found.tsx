import { Compass } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <EmptyState
      icon={Compass}
      title="Page not found"
      description="This page does not exist in the control tower."
      action={
        <Button asChild size="sm">
          <Link href="/control-tower">Go to Control Tower</Link>
        </Button>
      }
    />
  );
}

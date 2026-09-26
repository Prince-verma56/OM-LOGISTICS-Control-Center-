import Image from "next/image";
import { cn } from "@/lib/utils";
import logo from "@/public/Logo/OmLogisticsLogo.png";

/** Product mark for the demo using the official logo. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex size-8 shrink-0 items-center justify-center overflow-hidden", className)}>
      <Image
        src={logo}
        alt="OM Logistics"
        fill
        className="object-contain"
        sizes="(max-width: 768px) 100vw, 33vw"
      />
    </div>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TryDemoButton() {
  return (
    <Button
      size="lg"
      variant="secondary"
      className="rounded-xl w-full py-5.5 h-13 text-lg md:text-lg md:h-14 text-muted-foreground"
      nativeButton={false}
      render={<Link href="/demo">Try demo</Link>}
    />
  );
}

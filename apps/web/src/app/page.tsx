import { Button } from "@grabbin/ui/components/button";
import Link from "next/link";

export default function Home() {
	return (
		<main className="flex min-h-svh flex-col items-center justify-center">
			<Button
				variant={"brand"}
				size={"xl"}
				className="h-14 w-xs text-base"
				render={<Link href={"/sign-in"}>Join for free</Link>}
			/>
		</main>
	);
}

"use client";
import Link from "next/link";
import UserMenu from "../auth/user-menu";

export default function Header() {
	const links = [{ to: "/", label: "Home" }] as const;

	return (
		<header className="container mx-auto max-w-3xl p-3">
			<div className="flex flex-row items-center justify-between rounded-md bg-brand-gray px-2 py-2 pl-3">
				<nav className="flex gap-4 text-base">
					{links.map(({ to, label }) => {
						return (
							<Link key={to} href={to}>
								{label}
							</Link>
						);
					})}
				</nav>
				<div className="flex items-center gap-2">
					<UserMenu />
				</div>
			</div>
		</header>
	);
}

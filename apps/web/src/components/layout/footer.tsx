import Image from "next/image";
import Link from "next/link";

export default function Footer() {
	return (
		<footer className="w-full pt-16">
			<div className="px-5">
				<div className="mx-auto flex w-full max-w-7xl flex-col justify-between gap-12 pb-6 md:flex-row md:gap-8">
					<div className="flex flex-col items-start gap-8">
						<div className="flex flex-col gap-2">
							<div className="flex flex-row items-center gap-2 font-semibold tracking-tight">
								<svg
									viewBox="0 0 48 48"
									aria-hidden="true"
									className="size-10 shrink-0"
									fill="white"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinejoin="round"
								>
									<rect
										x="5"
										y="9"
										width="23"
										height="31"
										rx="3"
										transform="rotate(-24 16.5 24.5)"
									/>
									<rect
										x="20"
										y="9"
										width="23"
										height="31"
										rx="3"
										transform="rotate(24 31.5 24.5)"
									/>
									<rect x="13" y="5" width="23" height="31" rx="3" />
								</svg>
								<span className="text-xl">Grabbin</span>
							</div>
							<p className="max-w-md text-pretty text-base text-primary/90">
								A home for your links, photos, social profiles, and favorite
								places—made to feel like you.
							</p>
						</div>
						<div className="flex flex-col gap-0 font-normal text-base">
							<p>Designed for everyone, made with 🔥</p>
							<p>
								built by{" "}
								<a
									href="https://x.com/kinwooky"
									target="_blank"
									rel="noreferrer"
									aria-label="Visit kinwooky on X"
								>
									wooky
								</a>
							</p>
						</div>
						<a
							href="https://ko-fi.com/I3Z525CTG8"
							target="_blank"
							rel="noreferrer"
							aria-label="Support on Ko-fi"
							className="block rounded-xl outline-depth"
						>
							<img
								src="/images/kofi-support.png"
								alt=""
								aria-hidden="true"
								className="h-auto w-40 rounded-xl"
							/>
							<span className="sr-only">Support on Ko-fi</span>
						</a>
					</div>
					<nav aria-label="Footer">
						<ul className="flex flex-col items-start gap-2 font-medium text-lg">
							<li>
								<Link href="/" className="hover:text-primary/80">
									Home
								</Link>
							</li>
							<li>
								<Link href="/sign-in" className="hover:text-primary/80">
									Sign in
								</Link>
							</li>
							<li>
								<a
									href="https://discord.gg/U4NNF9hMms"
									target="_blank"
									rel="noreferrer"
									className="hover:text-primary/80"
								>
									Community
								</a>
							</li>
							<li>
								<Link href="/privacy" className="hover:text-primary/80">
									Privacy
								</Link>
							</li>
							<li>
								<Link href="/terms" className="hover:text-primary/80">
									Terms
								</Link>
							</li>
							<li>
								<a
									href="mailto:support@grabbin.me"
									className="hover:text-primary/80"
								>
									Contact
								</a>
							</li>
						</ul>
					</nav>
				</div>
			</div>
			<div className="pointer-events-none relative mt-16 aspect-[5/1] w-full overflow-hidden">
				<Image
					alt=""
					aria-hidden="true"
					fill
					loading="lazy"
					sizes="100vw"
					src="/images/footer-doodles-bf164e2b806327c8.png"
					unoptimized
					className="-z-10 select-none object-cover object-bottom"
				/>
			</div>
		</footer>
	);
}

import Image from "next/image";
import Link from "next/link";
import Logo from "@/components/logo";

export default function Footer() {
	return (
		<footer className="w-full pt-16">
			<div className="px-5">
				<div className="mx-auto flex w-full max-w-7xl flex-col justify-between gap-12 pb-6 md:flex-row md:gap-8">
					<div className="flex flex-col items-start gap-8">
						<div className="flex flex-col gap-2">
							<div className="flex flex-row items-center gap-2 font-semibold tracking-tight">
								<Logo className="size-10 shrink-0" decorative />
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
						<div className="mt-12 flex flex-col items-start gap-3">
							<a
								href="https://ko-fi.com/I3Z525CTG8"
								target="_blank"
								rel="noreferrer"
								aria-label="Support on Ko-fi"
								className="block rounded-xl"
							>
								<Image
									src="/images/kofi-support-194c03ea.webp"
									alt=""
									aria-hidden="true"
									width={480}
									height={131}
									loading="lazy"
									quality={65}
									sizes="160px"
									className="h-auto w-40 rounded-xl"
								/>
								<span className="sr-only">Support on Ko-fi</span>
							</a>
							<a
								href="https://dashboard.simpleanalytics.com/grabbin.me?utm_source=grabbin.me&amp;utm_content=badge&amp;affiliate=tudup"
								target="_blank"
								rel="noopener"
								referrerPolicy="origin"
								aria-label="View Grabbin analytics on Simple Analytics"
								className="block rounded-xl"
							>
								<picture>
									<source
										srcSet="https://simpleanalyticsbadges.com/grabbin.me?mode=dark&amp;background=%23ffffff&amp;text=%23000000"
										media="(prefers-color-scheme: dark)"
									/>
									<Image
										src="https://simpleanalyticsbadges.com/grabbin.me?mode=light&amp;background=%23ffffff&amp;text=%23000000"
										alt="Simple Analytics badge"
										loading="lazy"
										width={200}
										height={200}
										referrerPolicy="no-referrer"
										crossOrigin="anonymous"
										className="h-auto w-44"
									/>
								</picture>
							</a>
						</div>
					</div>
					<nav aria-label="Footer">
						<ul className="flex flex-col items-start gap-2 font-medium text-lg">
							<li>
								<Link href="/" className="hover:text-primary/80">
									Home
								</Link>
							</li>
							<li>
								<Link href="/update" className="hover:text-primary/80">
									Updates
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
								<a
									href="https://grabbin.openheard.com/"
									target="_blank"
									rel="noreferrer"
									className="hover:text-primary/80"
								>
									Roadmap
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
					width={2171}
					height={724}
					loading="lazy"
					sizes="100vw"
					src="/images/footer-doodles-bf164e2b806327c8.png"
					className="absolute inset-0 -z-10 h-full w-full select-none object-cover object-bottom"
				/>
			</div>
		</footer>
	);
}

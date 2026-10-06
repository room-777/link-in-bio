import Image from "next/image";
import Link from "next/link";
import Logo from "@/components/logo";

export default function Footer() {
	return (
		<footer className="w-full pt-16 text-muted-foreground/80 text-sm">
			<div className="px-5">
				<div className="mx-auto flex w-full max-w-5xl flex-col justify-between gap-12 pb-6 md:flex-row md:gap-8">
					<div className="flex flex-col items-start gap-8">
						<div className="flex flex-col gap-2">
							<div className="flex flex-row items-center gap-2 font-medium text-foreground tracking-tight">
								<Logo className="size-6 shrink-0" decorative />
								<span className="text-base">Grabbin</span>
							</div>
							<p className="max-w-72 text-pretty font-medium text-sm">
								Grabbin is a visual personal website builder for sharing your
								story and work in a style that feels like you.
							</p>
						</div>

						<div className="mt-2 flex flex-col items-start gap-3">
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
									sizes="96px"
									className="h-auto w-20 rounded-xl"
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
										className="h-auto w-32"
									/>
								</picture>
							</a>
						</div>
					</div>
					<nav
						aria-label="Footer"
						className="grid grid-cols-2 gap-x-8 gap-y-8 font-medium md:gap-x-12"
					>
						<div className="flex flex-col gap-2">
							<h6 className="font-medium text-foreground text-sm">Product</h6>
							<ul className="flex flex-col items-start gap-1">
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
									<Link href="/demo" className="hover:text-primary/80">
										Try demo
									</Link>
								</li>
							</ul>
						</div>
						<div className="flex flex-col gap-2">
							<h6 className="font-medium text-foreground text-sm">Resources</h6>
							<ul className="flex flex-col items-start gap-1">
								<li>
									<Link href="/update" className="hover:text-primary/80">
										Updates
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
							</ul>
						</div>
						<div className="flex flex-col gap-2">
							<h6 className="font-medium text-foreground text-sm">Company</h6>
							<ul className="flex flex-col items-start gap-1">
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
						</div>
					</nav>
				</div>
			</div>
			<div className="mt-24 w-full bg-secondary/60 px-5 py-6">
				<div className="mx-auto flex w-full max-w-5xl justify-between gap-4 font-medium text-xs">
					<div className="flex flex-row items-center gap-0.5">
						<p>Designed for everyone,</p>
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
					<p className="shrink-0">© 2026</p>
				</div>
			</div>
		</footer>
	);
}

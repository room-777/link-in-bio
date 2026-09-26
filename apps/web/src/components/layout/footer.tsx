import Image from "next/image";
import Link from "next/link";
import type { SVGProps } from "react";

const Discord = (props: SVGProps<SVGSVGElement>) => (
	<svg {...props} viewBox="0 0 256 199" preserveAspectRatio="xMidYMid">
		<title>Discord</title>
		<path
			d="M216.856 16.597A208.502 208.502 0 0 0 164.042 0c-2.275 4.113-4.933 9.645-6.766 14.046-19.692-2.961-39.203-2.961-58.533 0-1.832-4.4-4.55-9.933-6.846-14.046a207.809 207.809 0 0 0-52.855 16.638C5.618 67.147-3.443 116.4 1.087 164.956c22.169 16.555 43.653 26.612 64.775 33.193A161.094 161.094 0 0 0 79.735 175.3a136.413 136.413 0 0 1-21.846-10.632 108.636 108.636 0 0 0 5.356-4.237c42.122 19.702 87.89 19.702 129.51 0a131.66 131.66 0 0 0 5.355 4.237 136.07 136.07 0 0 1-21.886 10.653c4.006 8.02 8.638 15.67 13.873 22.848 21.142-6.58 42.646-16.637 64.815-33.213 5.316-56.288-9.08-105.09-38.056-148.36ZM85.474 135.095c-12.645 0-23.015-11.805-23.015-26.18s10.149-26.2 23.015-26.2c12.867 0 23.236 11.804 23.015 26.2.02 14.375-10.148 26.18-23.015 26.18Zm85.051 0c-12.645 0-23.014-11.805-23.014-26.18s10.148-26.2 23.014-26.2c12.867 0 23.236 11.804 23.015 26.2 0 14.375-10.148 26.18-23.015 26.18Z"
			fill="white"
		/>
	</svg>
);

export default function Footer() {
	return (
		<footer className="w-full pt-6">
			<div className="px-5">
				<div className="flex h-[36vh] flex-col gap-16 pb-6">
					<div className="mx-auto flex w-full max-w-2xl flex-col gap-16">
						<div className="flex flex-col items-center justify-center gap-2 font-medium text-lg">
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
						<nav aria-label="Footer">
							<ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-medium text-lg">
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
					<div className="flex flex-col items-center justify-center gap-4 md:items-end">
						<a
							href="https://x.com/kinwooky"
							target="_blank"
							rel="noreferrer"
							className="flex flex-row items-center justify-center gap-3 rounded-lg bg-foreground px-4 py-2 font-medium text-background outline-depth"
						>
							<img
								src="https://cdn.reicon.dev/logos/x-formerly-twitter/original.svg"
								alt=""
								aria-hidden="true"
								className="size-4 object-contain"
							/>
							<span>Follow on X</span>
						</a>
						<a
							href="https://discord.gg/U4NNF9hMms"
							target="_blank"
							rel="noreferrer"
							className="flex flex-row items-center justify-center gap-3 rounded-lg bg-[#5865F2] px-4 py-2 font-medium text-white outline-depth"
						>
							<Discord aria-hidden="true" className="size-4 shrink-0" />
							<span>Join community</span>
						</a>
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

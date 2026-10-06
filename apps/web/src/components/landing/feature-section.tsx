import { Button, buttonVariants } from "@grabbin/ui/components/button";
import {
	Check,
	Eye,
	Image as ImageIcon,
	LayoutFreeform,
	Link2,
	QrCode,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const features = [
	{
		title: "Widgets for everything you share",
		description:
			"Mix media, links, maps, and social profiles into one personal page.",
		icon: ImageIcon,
		accent: "text-emerald-600 dark:text-emerald-400",
		points: [
			{ label: "Unlimited photos and videos", icon: ImageIcon },
			{ label: "Unlimited links", icon: Link2 },
			{ label: "Maps, text, and social profiles", icon: LayoutFreeform },
		],
		action: { label: "See widgets", href: "/update/what-grabbin-gives-you" },
	},
	{
		title: "Today's and yesterday's views",
		description: "Get a clear snapshot of the visits your page is getting.",
		icon: Eye,
		accent: "text-blue-600 dark:text-blue-400",
		points: [
			{ label: "Today's page views", icon: Check },
			{ label: "Yesterday's page views", icon: Check },
			{ label: "Compare the two at a glance", icon: Check },
		],
	},
	{
		title: "QR code sharing",
		description: "Give people a quick way to open your page from anywhere.",
		icon: QrCode,
		accent: "text-violet-600 dark:text-violet-400",
		points: [
			{ label: "Create a code for your page", icon: Check },
			{ label: "Share it on cards or screens", icon: Check },
			{ label: "Open your page with one scan", icon: Check },
		],
	},
	{
		title: "Drag-and-drop editing",
		description: "Move content around until your page feels right.",
		icon: LayoutFreeform,
		accent: "text-rose-600 dark:text-rose-400",
		points: [
			{ label: "Move widgets with drag and drop", icon: Check },
			{ label: "Arrange each section your way", icon: Check },
			{ label: "Build your page without code", icon: Check },
		],
	},
];

export default function FeatureSection({
	joinButton,
}: {
	joinButton: ReactNode;
}) {
	return (
		<section
			aria-labelledby="landing-features-title"
			className="w-full px-6 py-24 sm:px-10 sm:py-32"
		>
			<div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-11">
				<div className="flex flex-col items-center gap-5">
					<h2
						id="landing-features-title"
						className="max-w-lg text-balance text-center font-medium text-4xl leading-11 tracking-tighter"
					>
						Let your page say more.
					</h2>
					<p className="w-full max-w-md text-center font-medium text-lg/6 text-muted-foreground">
						We’ve brought the essentials together, so you can focus on creating
						your page.
					</p>
				</div>
				<div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
					{features.map(
						({ title, description, icon: Icon, accent, points, action }) => (
							<article
								key={title}
								className="flex min-h-60 flex-col items-start gap-3 rounded-3xl bg-secondary/60 p-7 sm:p-8"
							>
								<span className="flex size-10 items-center justify-center rounded-full bg-background">
									<Icon aria-hidden="true" className={`size-5 ${accent}`} />
								</span>
								<div className="flex flex-col gap-0.5">
									<h3
										className={`font-medium text-xl leading-tight tracking-tight sm:text-2xl ${accent}`}
									>
										{title}
									</h3>
									<p className="max-w-md text-pretty font-medium text-foreground text-xl leading-tight sm:text-2xl">
										{description}
									</p>
								</div>
								<ul className="mt-3 flex flex-col gap-1">
									{points.map(({ label, icon: PointIcon }) => (
										<li
											key={label}
											className="flex items-center gap-1 font-medium text-primary text-sm"
										>
											<span>{label}</span>
										</li>
									))}
								</ul>
								{action ? (
									<Button
										nativeButton={false}
										variant={"outline"}
										size={"default"}
										className={
											"mt-2 rounded-2xl px-3 hover:border-black/10 hover:bg-background"
										}
										render={<Link href={action.href}>{action.label}</Link>}
									/>
								) : null}
							</article>
						),
					)}
				</div>
				<div className="-mt-4 flex flex-col items-center gap-4 text-center">
					<p className="text-pretty font-medium text-muted-foreground/60 text-sm leading-relaxed">
						Free as long as we can sustainably support them.
					</p>
				</div>
			</div>
		</section>
	);
}

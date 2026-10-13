import { CircleArrowRightUp } from "reicon-react";

export default function ExternalAction({
	href,
	label,
}: {
	href: string;
	label: string;
}) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noreferrer"
			aria-label={label}
			className="group inline-flex size-7 shrink-0 cursor-pointer! items-center justify-center rounded-full bg-white/60 font-medium text-xs transition-colors hover:bg-white"
		>
			<CircleArrowRightUp
				aria-hidden="true"
				size={28}
				weight="Filled"
				className="text-black/60 group-hover:text-black!"
			/>
		</a>
	);
}

export { ExternalAction };

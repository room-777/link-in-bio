"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const audiences = [
	"Everyone",
	"Creators",
	"Designers",
	"Developers",
	"Musicians",
	"Photographers",
	"Writers",
];
const widgets = ["Link", "Image", "Tweet", "Feed", "Map"];
function RotatingWord({ words }: { words: string[] }) {
	const [index, setIndex] = useState(0);
	const currentWord = words[index];
	const reduceMotion = useReducedMotion();
	const contentRef = useRef<HTMLSpanElement>(null);
	const [contentWidth, setContentWidth] = useState<number>();
	const wordTransition = {
		duration: reduceMotion ? 0 : 0.15,
		ease: "easeInOut" as const,
	};
	const widthTransition = {
		type: "tween" as const,
		duration: reduceMotion ? 0 : 0.3,
		ease: [0.22, 1, 0.36, 1] as const,
	};

	useEffect(() => {
		if (reduceMotion) return;

		const interval = window.setInterval(() => {
			setIndex((current) => (current + 1) % words.length);
		}, 2200);

		return () => window.clearInterval(interval);
	}, [reduceMotion, words.length]);

	useEffect(() => {
		const content = contentRef.current;
		if (!content) return;

		const observer = new ResizeObserver(([entry]) => {
			setContentWidth(entry.contentRect.width);
		});
		observer.observe(content);

		return () => observer.disconnect();
	}, []);

	return (
		<motion.span
			aria-hidden="true"
			className="box-content inline-grid w-max overflow-visible whitespace-nowrap rounded-full bg-[#f0f0ee] px-2 align-baseline sm:px-4"
			animate={contentWidth === undefined ? undefined : { width: contentWidth }}
			initial={false}
			transition={{ width: widthTransition }}
		>
			<span
				className="relative col-start-1 row-start-1 inline-grid w-max shrink-0 whitespace-nowrap"
				ref={contentRef}
			>
				<AnimatePresence initial={false} mode="popLayout">
					<motion.span
						key={currentWord}
						className="relative col-start-1 row-start-1 inline-flex w-max shrink-0 whitespace-nowrap pl-[1.35em]"
						initial={reduceMotion ? false : { opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={wordTransition}
					>
						<span className="pointer-events-none absolute top-1/2 left-0 flex -translate-y-1/2 items-center justify-center">
							<AnimatePresence initial={false} mode="popLayout">
								{currentWord === "Creators" ? (
									<motion.span
										aria-hidden="true"
										className="inline-flex shrink-0"
										key="icon-creators"
										initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={{ opacity: 0, scale: 0.8 }}
										transition={wordTransition}
									>
										<img
											alt=""
											aria-hidden="true"
											className="size-[1.2em] overflow-visible object-contain drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)]"
											src="/images/landing/creators-sticker.svg"
											style={{
												transform: "rotate(-45deg)",
												transformOrigin: "center",
											}}
										/>
									</motion.span>
								) : currentWord === "Photographers" ? (
									<motion.svg
										aria-hidden="true"
										className="size-[1.2em] shrink-0 overflow-visible drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)]"
										key="icon-photographers"
										initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={{ opacity: 0, scale: 0.8 }}
										transition={wordTransition}
										viewBox="0 0 24 24"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											d="M2 11.5V12.5C2 15.7875 2 17.4312 2.90796 18.5376C3.07418 18.7401 3.25989 18.9258 3.46243 19.092C4.56878 20 6.21252 20 9.5 20C12.7875 20 14.4312 20 15.5376 19.092C15.7401 18.9258 15.9258 18.7401 16.092 18.5376C16.7936 17.6827 16.9531 16.507 16.9893 14.5L17.6584 14.8292C19.6042 15.8021 20.5772 16.2886 21.2886 15.8489C22 15.4093 22 14.3215 22 12.1459V11.8541C22 9.67853 22 8.59075 21.2886 8.15107C20.5772 7.7114 19.6042 8.19788 17.6584 9.17082L16.9893 9.50002C16.9531 7.49303 16.7936 6.3173 16.092 5.46243C15.9258 5.25989 15.7401 5.07418 15.5376 4.90796C14.4312 4 12.7875 4 9.5 4C6.21252 4 4.56878 4 3.46243 4.90796C3.25989 5.07418 3.07418 5.25989 2.90796 5.46243C2 6.56878 2 8.21252 2 11.5Z"
											fill="#343434"
											paintOrder="stroke"
											stroke="white"
											strokeLinejoin="round"
											strokeWidth="3.5"
										/>
									</motion.svg>
								) : currentWord === "Everyone" ? (
									<motion.svg
										aria-hidden="true"
										className="size-[1.2em] shrink-0 overflow-visible drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)]"
										key="icon-everyone"
										initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={{ opacity: 0, scale: 0.8 }}
										transition={wordTransition}
										viewBox="0 0 24 24"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
											fill="#FFCC4D"
											paintOrder="stroke"
											stroke="white"
											strokeLinejoin="round"
											strokeWidth="3.5"
										/>
										<path
											d="M8.1851 15.7508C8.2858 15.349 8.69315 15.1049 9.09494 15.2056C10.2252 15.4889 11.5232 15.4924 12.841 15.1393C14.1588 14.7862 15.2811 14.1342 16.1183 13.3237C16.4159 13.0356 16.8908 13.0433 17.1789 13.3409C17.467 13.6385 17.4593 14.1133 17.1617 14.4014C16.8142 14.7378 16.4297 15.0492 16.0128 15.3301L16.1708 15.652C16.5394 16.4031 16.2223 17.3106 15.4661 17.6685C14.7249 18.0194 13.8393 17.71 13.478 16.9738L13.2817 16.574L13.2292 16.5882C11.6739 17.005 10.1166 17.0081 8.73026 16.6606C8.32847 16.5599 8.0844 16.1526 8.1851 15.7508Z"
											fill="#111111"
										/>
										<path
											d="M15.4754 9.51572C15.6898 10.3159 15.4311 11.0805 14.8977 11.2234C14.3642 11.3664 13.7579 10.8336 13.5435 10.0334C13.3291 9.23316 13.5877 8.4686 14.1212 8.32565C14.6547 8.18271 15.2609 8.71552 15.4754 9.51572Z"
											fill="#111111"
										/>
										<path
											d="M9.10225 12.7764C9.63571 12.6335 9.89436 11.8689 9.67994 11.0687C9.46553 10.2685 8.85926 9.73569 8.32579 9.87863C7.79232 10.0216 7.53368 10.7861 7.74809 11.5863C7.9625 12.3865 8.56878 12.9194 9.10225 12.7764Z"
											fill="#111111"
										/>
									</motion.svg>
								) : currentWord === "Writers" ? (
									<motion.svg
										aria-hidden="true"
										className="size-[1.2em] shrink-0 overflow-visible drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)]"
										key="icon-writers"
										initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={{ opacity: 0, scale: 0.8 }}
										transition={wordTransition}
										viewBox="0 0 24 24"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											d="M11.4001 18.1612L11.4001 18.1612L18.796 10.7653C17.7894 10.3464 16.5972 9.6582 15.4697 8.53068C14.342 7.40298 13.6537 6.21058 13.2348 5.2039L5.83882 12.5999L5.83879 12.5999C5.26166 13.1771 4.97307 13.4657 4.7249 13.7838C4.43213 14.1592 4.18114 14.5653 3.97634 14.995C3.80273 15.3593 3.67368 15.7465 3.41556 16.5208L2.05445 20.6042C1.92743 20.9852 2.0266 21.4053 2.31063 21.6894C2.59466 21.9734 3.01478 22.0726 3.39584 21.9456L7.47918 20.5844C8.25351 20.3263 8.6407 20.1973 9.00498 20.0237C9.43469 19.8189 9.84082 19.5679 10.2162 19.2751C10.5343 19.0269 10.823 18.7383 11.4001 18.1612Z"
											fill="white"
											stroke="white"
											strokeLinejoin="round"
											strokeWidth="2.5"
										/>
										<path
											d="M20.8482 8.71306C22.3839 7.17735 22.3839 4.68748 20.8482 3.15178C19.3125 1.61607 16.8226 1.61607 15.2869 3.15178L14.3999 4.03882C14.4121 4.0755 14.4246 4.11268 14.4377 4.15035C14.7628 5.0875 15.3763 6.31601 16.5303 7.47002C17.6843 8.62403 18.9128 9.23749 19.85 9.56262C19.8875 9.57563 19.9245 9.58817 19.961 9.60026L20.8482 8.71306Z"
											fill="white"
											stroke="white"
											strokeLinejoin="round"
											strokeWidth="2.5"
										/>
										<path
											d="M11.4001 18.1612L11.4001 18.1612L18.796 10.7653C17.7894 10.3464 16.5972 9.6582 15.4697 8.53068C14.342 7.40298 13.6537 6.21058 13.2348 5.2039L5.83882 12.5999L5.83879 12.5999C5.26166 13.1771 4.97307 13.4657 4.7249 13.7838C4.43213 14.1592 4.18114 14.5653 3.97634 14.995C3.80273 15.3593 3.67368 15.7465 3.41556 16.5208L2.05445 20.6042C1.92743 20.9852 2.0266 21.4053 2.31063 21.6894C2.59466 21.9734 3.01478 22.0726 3.39584 21.9456L7.47918 20.5844C8.25351 20.3263 8.6407 20.1973 9.00498 20.0237C9.43469 19.8189 9.84082 19.5679 10.2162 19.2751C10.5343 19.0269 10.823 18.7383 11.4001 18.1612Z"
											fill="#FFBE0B"
										/>
										<path
											d="M20.8482 8.71306C22.3839 7.17735 22.3839 4.68748 20.8482 3.15178C19.3125 1.61607 16.8226 1.61607 15.2869 3.15178L14.3999 4.03882C14.4121 4.0755 14.4246 4.11268 14.4377 4.15035C14.7628 5.0875 15.3763 6.31601 16.5303 7.47002C17.6843 8.62403 18.9128 9.23749 19.85 9.56262C19.8875 9.57563 19.9245 9.58817 19.961 9.60026L20.8482 8.71306Z"
											fill="#8B5E3C"
										/>
									</motion.svg>
								) : currentWord === "Musicians" ? (
									<motion.svg
										aria-hidden="true"
										className="size-[1.2em] shrink-0 overflow-visible drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)]"
										key="icon-musicians"
										initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={{ opacity: 0, scale: 0.8 }}
										transition={wordTransition}
										viewBox="0 0 24 24"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											d="M14.3187 2.50498C13.0514 2.35716 11.8489 3.10033 11.4144 4.29989C11.3165 4.57023 11.2821 4.86251 11.266 5.16888C11.2539 5.40001 11.2509 5.67552 11.2503 6L11.25 6.45499C11.25 6.4598 11.25 6.4646 11.25 6.46938V14.5359C10.4003 13.7384 9.25721 13.25 8 13.25C5.37665 13.25 3.25 15.3766 3.25 18C3.25 20.6234 5.37665 22.75 8 22.75C10.6234 22.75 12.75 20.6234 12.75 18V9.21059C12.8548 9.26646 12.9683 9.32316 13.0927 9.38527L15.8002 10.739C16.2185 10.9481 16.5589 11.1183 16.8378 11.2399C17.119 11.3625 17.3958 11.4625 17.6814 11.4958C18.9486 11.6436 20.1511 10.9004 20.5856 9.70089C20.6836 9.43055 20.7179 9.13826 20.7341 8.83189C20.75 8.52806 20.75 8.14752 20.75 7.67988L20.7501 7.59705C20.7502 7.2493 20.7503 6.97726 20.701 6.71946C20.574 6.05585 20.2071 5.46223 19.6704 5.05185C19.4618 4.89242 19.2185 4.77088 18.9074 4.6155L16.1999 3.26179C15.7816 3.05264 15.4412 2.88244 15.1623 2.76086C14.8811 2.63826 14.6043 2.53829 14.3187 2.50498Z"
											fill="#FF2D8D"
											paintOrder="stroke"
											stroke="white"
											strokeLinejoin="round"
											strokeWidth="3.5"
										/>
									</motion.svg>
								) : currentWord === "Designers" ? (
									<motion.svg
										aria-hidden="true"
										className="size-[1.35em] shrink-0 overflow-visible drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)]"
										key="icon-designers"
										initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={{ opacity: 0, scale: 0.8 }}
										transition={wordTransition}
										viewBox="-1.75 -1.75 27.5 27.5"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											d="M14 15.9991C14 17.7691 13.23 19.3691 12 20.4591C10.94 21.4191 9.54 21.9991 8 21.9991C4.69 21.9991 2 19.3091 2 15.9991C2 13.9743 3.01397 12.1804 4.5554 11.0964C4.80358 10.9219 5.1393 11.0413 5.27324 11.3135C6.21715 13.2322 7.95419 14.669 10.02 15.2291C10.65 15.4091 11.31 15.4991 12 15.4991C12.4872 15.4991 12.9539 15.4529 13.4074 15.3678C13.6958 15.3137 13.9828 15.4985 13.9955 15.7916C13.9985 15.8611 14 15.9305 14 15.9991Z"
											fill="#F06A73"
											paintOrder="stroke"
											stroke="white"
											strokeLinejoin="round"
											strokeWidth="3.5"
										/>
										<path
											d="M18 8C18 8.78 17.85 9.53 17.58 10.21C16.89 11.95 15.41 13.29 13.58 13.79C13.08 13.93 12.55 14 12 14C11.45 14 10.92 13.93 10.42 13.79C8.59 13.29 7.11 11.95 6.42 10.21C6.15 9.53 6 8.78 6 8C6 4.69 8.69 2 12 2C15.31 2 18 4.69 18 8Z"
											fill="#638AE6"
											paintOrder="stroke"
											stroke="white"
											strokeLinejoin="round"
											strokeWidth="3.5"
										/>
										<path
											d="M22 15.9991C22 19.3091 19.31 21.9991 16 21.9991C15.2555 21.9991 14.5393 21.8633 13.8811 21.6131C13.5624 21.492 13.503 21.0841 13.7248 20.8253C14.8668 19.4928 15.5 17.785 15.5 15.9991C15.5 15.6591 15.47 15.3191 15.42 14.9991C15.3902 14.8146 15.4844 14.6333 15.6478 14.5428C16.9719 13.8098 18.0532 12.6866 18.727 11.3144C18.8609 11.0418 19.1968 10.9221 19.4452 11.0968C20.9863 12.1809 22 13.9746 22 15.9991Z"
											fill="#48B88A"
											paintOrder="stroke"
											stroke="white"
											strokeLinejoin="round"
											strokeWidth="3.5"
										/>
									</motion.svg>
								) : currentWord === "Developers" ? (
									<motion.svg
										aria-hidden="true"
										className="size-[1.35em] shrink-0 overflow-visible drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)]"
										key="icon-developers"
										initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={{ opacity: 0, scale: 0.8 }}
										transition={wordTransition}
										viewBox="-1.75 -1.75 27.5 27.5"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											d="M16.19 2H7.81C4.17 2 2 4.17 2 7.81V16.18C2 19.83 4.17 22 7.81 22H16.18C19.82 22 21.99 19.83 21.99 16.19V7.81C22 4.17 19.83 2 16.19 2Z"
											fill="#343434"
											paintOrder="stroke"
											stroke="white"
											strokeLinejoin="round"
											strokeWidth="3.5"
										/>
										<path
											d="M9.94 13.27C9.26 14.29 8.32 15.12 7.22 15.67C7.12 15.72 7 15.75 6.89 15.75C6.61 15.75 6.35 15.6 6.22 15.34C6.03 14.97 6.18 14.52 6.56 14.33C7.43 13.9 8.17 13.24 8.7 12.44C8.88 12.17 8.88 11.83 8.7 11.56C8.16 10.76 7.42 10.1 6.56 9.67C6.18 9.49 6.03 9.04 6.22 8.66C6.4 8.29 6.85 8.14 7.22 8.33C8.32 8.88 9.26 9.71 9.94 10.73C10.46 11.5 10.46 12.5 9.94 13.27Z"
											fill="#48db5f"
										/>
										<path
											d="M13 14.25H17C17.41 14.25 17.75 14.59 17.75 15C17.75 15.41 17.41 15.75 17 15.75H13C12.59 15.75 12.25 15.41 12.25 15C12.25 14.59 12.59 14.25 13 14.25Z"
											fill="#48db5f"
										/>
									</motion.svg>
								) : currentWord === "Link" ? (
									<motion.span
										aria-hidden="true"
										className="inline-flex shrink-0"
										key="icon-link"
										initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={{ opacity: 0, scale: 0.8 }}
										transition={wordTransition}
									>
										<svg
											aria-hidden="true"
											className="size-[1.2em] overflow-visible drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)]"
											fill="none"
											style={{
												transform: "rotate(-45deg)",
												transformOrigin: "center",
											}}
											viewBox="0 0 24 24"
											xmlns="http://www.w3.org/2000/svg"
										>
											<g
												stroke="white"
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="6"
											>
												<path d="M9 17H7A5 5 0 0 1 7 7h2" />
												<path d="M15 7h2a5 5 0 1 1 0 10h-2" />
												<line x1="8" x2="16" y1="12" y2="12" />
											</g>
											<g
												stroke="currentColor"
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="2"
											>
												<path d="M9 17H7A5 5 0 0 1 7 7h2" />
												<path d="M15 7h2a5 5 0 1 1 0 10h-2" />
												<line x1="8" x2="16" y1="12" y2="12" />
											</g>
										</svg>
									</motion.span>
								) : currentWord === "Image" ? (
									<motion.svg
										aria-hidden="true"
										className="size-[1.35em] shrink-0 overflow-visible drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)]"
										key="icon-image"
										initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={{ opacity: 0, scale: 0.8 }}
										transition={wordTransition}
										viewBox="-1.75 -1.75 27.5 27.5"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											d="M10.51 11.22L8.31 2.39C8.26 2.16 8.05 2 7.81 2C4.6 2 2 4.6 2 7.81V13.51C2 13.85 2.33 14.1 2.66 14L10.16 11.83C10.42 11.76 10.58 11.49 10.51 11.22Z"
											fill="#FF3D57"
											paintOrder="stroke"
											stroke="white"
											strokeLinejoin="round"
											strokeWidth="3.5"
										/>
										<path
											d="M11.12 13.6789C11.05 13.3989 10.76 13.2289 10.48 13.3089L2.37 15.6689C2.15 15.7389 2 15.9389 2 16.1689V16.1889C2 19.3989 4.6 21.9989 7.81 21.9989H12.53C12.86 21.9989 13.11 21.6889 13.03 21.3589L11.12 13.6789Z"
											fill="#FFD400"
											paintOrder="stroke"
											stroke="white"
											strokeLinejoin="round"
											strokeWidth="3.5"
										/>
										<path
											d="M16.1908 2H10.4408C10.1108 2 9.86081 2.31 9.94081 2.64L14.6808 21.61C14.7408 21.84 14.9408 22 15.1808 22H16.1808C19.4008 22 22.0008 19.4 22.0008 16.19V7.81C22.0008 4.6 19.4008 2 16.1908 2Z"
											fill="#00B894"
											paintOrder="stroke"
											stroke="white"
											strokeLinejoin="round"
											strokeWidth="3.5"
										/>
									</motion.svg>
								) : currentWord === "Map" ? (
									<motion.svg
										aria-hidden="true"
										className="size-[1.2em] shrink-0 overflow-visible drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)]"
										key="icon-map"
										initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={{ opacity: 0, scale: 0.8 }}
										transition={wordTransition}
										viewBox="0 0 24 24"
										xmlns="http://www.w3.org/2000/svg"
									>
										<g transform="scale(1.33333)">
											<path
												d="M15.154,6.253L3.731,2.079c-.477-.175-.994-.058-1.353,.3-.357,.358-.473,.876-.298,1.352L6.254,15.154c.188,.517,.66,.846,1.208,.846h.027c.559-.011 1.03-.362 1.2-.895l1.556-4.86 4.859-1.555c.532-.17 .884-.642 .896-1.201.011-.559-.321-1.044-.846-1.236Z"
												fill="#60A5FA"
												paintOrder="stroke"
												stroke="white"
												strokeLinejoin="round"
												strokeWidth="3"
											/>
										</g>
									</motion.svg>
								) : currentWord === "Tweet" ? (
									<motion.svg
										aria-hidden="true"
										className="size-[1.2em] shrink-0 overflow-visible drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)]"
										key="icon-tweet"
										initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={{ opacity: 0, scale: 0.8 }}
										transition={wordTransition}
										viewBox="0 0 500 500"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											d="M170.2264 442.7654c162.2648 0 251.0168-140.0367 251.0168-261.4758 0-3.9775 0-7.9371-.258-11.8788 17.2659-13.009 32.1701-29.1167 44.0148-47.5687-16.1013 7.4318-33.1817 12.3057-50.6712 14.4587 18.4168-11.4849 32.2005-29.5486 38.786-50.8295-17.3177 10.7044-36.2637 18.2483-56.0204 22.3062-27.3466-30.29-70.8-37.7036-105.9942-18.0837-35.194 19.62-53.3763 61.3941-44.351 101.8979-70.9346-3.7043-137.0242-38.6047-181.8212-96.0154-23.4157 41.9903-11.4554 95.7083 27.3136 122.6754-14.0397-.4335-27.7732-4.3786-40.0416-11.5025v1.1646c.0115 43.7452 29.6141 81.4229 70.778 90.085-12.9882 3.6897-26.6156 4.229-39.8352 1.5766 11.5575 37.4355 44.6783 63.0807 82.4224 63.8192-31.2398 25.5748-69.831 39.4584-109.564 39.4166A172.495 172.495 0 0 1 35 401.4854c40.345 26.9696 87.2885 41.275 135.2264 41.2083"
											fill="#1DA1F2"
											paintOrder="stroke"
											stroke="white"
											strokeLinejoin="round"
											strokeWidth="72"
										/>
									</motion.svg>
								) : currentWord === "Feed" ? (
									<motion.img
										alt=""
										aria-hidden="true"
										className="size-[1.46em] shrink-0 overflow-visible object-contain drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)]"
										key="icon-feed"
										initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={{ opacity: 0, scale: 0.8 }}
										transition={wordTransition}
										src="/images/landing/feed-sticker.svg?v=2"
									/>
								) : null}
							</AnimatePresence>
						</span>
						<span className="inline-flex whitespace-nowrap">{currentWord}</span>
					</motion.span>
				</AnimatePresence>
			</span>
		</motion.span>
	);
}

export default function WelcomeSection() {
	return (
		<section
			aria-labelledby="landing-widget-types-title"
			className="flex min-h-svh w-full flex-col items-start justify-start overflow-x-clip py-64 sm:py-72 lg:py-80"
		>
			<h2
				aria-label="For everyone. Customize your page with Link, Image, Tweet, and many more."
				className="w-full max-w-screen-2xl text-balance px-8 font-semibold text-[clamp(1.25rem,6.2vw,1.75rem)] leading-tight tracking-tighter sm:px-16 sm:text-[clamp(1.75rem,3.5vw,3.25rem)] md:px-20 lg:px-28 lg:text-[clamp(2.25rem,3.5vw,3.25rem)] xl:px-36 2xl:px-40"
				id="landing-widget-types-title"
			>
				<span className="block">
					<span aria-hidden="true">For </span>
					<RotatingWord words={audiences} />,
				</span>
				<span className="mt-1.5 block lg:whitespace-nowrap">
					<span aria-hidden="true" className="block lg:inline">
						Customize your page{" "}
					</span>
					<span className="block whitespace-nowrap lg:inline">
						<span aria-hidden="true">with </span>
						<RotatingWord words={widgets} />
					</span>
				</span>
				<span aria-hidden="true" className="mt-1.5 block">
					and many more
				</span>
			</h2>
			<Image
				alt=""
				aria-hidden="true"
				className="pointer-events-none mt-12 ml-6 h-[auto] w-[1800px] max-w-none shrink-0 self-start sm:mt-12 sm:ml-14 md:ml-18 lg:mt-18 lg:ml-26 xl:ml-34 2xl:ml-38"
				height={1738}
				style={{
					maskImage:
						"linear-gradient(90deg, black 0%, black 97%, transparent 100%)",
					WebkitMaskImage:
						"linear-gradient(90deg, black 0%, black 97%, transparent 100%)",
				}}
				unoptimized
				src="/images/landing/welcome-bento-collage.png"
				width={3452}
			/>
		</section>
	);
}

import { useEffect, useRef } from "react";

export function useEmailOtpShake(trigger: number) {
	const inputRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!trigger) return;

		const input = inputRef.current;
		if (!input) return;

		input.classList.remove("is-shaking");
		void input.offsetWidth;
		input.classList.add("is-shaking");

		const styles = getComputedStyle(document.documentElement);
		const duration = (name: string, fallback: number) => {
			const value = Number.parseFloat(styles.getPropertyValue(name));
			return Number.isFinite(value) ? value : fallback;
		};
		const shakeMs =
			duration("--shake-dur-a", 80) * 2 + duration("--shake-dur-b", 60) * 2;
		const timer = window.setTimeout(
			() => input.classList.remove("is-shaking"),
			shakeMs + 20,
		);

		return () => window.clearTimeout(timer);
	}, [trigger]);

	return inputRef;
}

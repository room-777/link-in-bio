import { useEffect, useState } from "react";

export function useSettingsTabTransition(reduceMotion: boolean) {
	const [activeTab, setActiveTab] = useState("account");
	const [outgoingTab, setOutgoingTab] = useState<string | null>(null);
	const [isTransitioning, setIsTransitioning] = useState(false);
	const [activePage, setActivePage] = useState("1");
	const tabOrder = ["account", "billing", "custom-domain"];
	const isMovingForward =
		tabOrder.indexOf(activeTab) > tabOrder.indexOf(outgoingTab ?? "account");
	const incomingPage = isMovingForward ? "2" : "1";
	const outgoingPage = incomingPage === "2" ? "1" : "2";

	useEffect(() => {
		if (!isTransitioning || reduceMotion) return;
		const frame = requestAnimationFrame(() => setActivePage(incomingPage));
		return () => cancelAnimationFrame(frame);
	}, [incomingPage, isTransitioning, reduceMotion]);

	const changeTab = (value: string | number) => {
		const nextTab = String(value);
		if (nextTab === activeTab || !tabOrder.includes(nextTab)) return;
		const movingForward =
			tabOrder.indexOf(nextTab) > tabOrder.indexOf(activeTab);
		setOutgoingTab(activeTab);
		setActiveTab(nextTab);
		setIsTransitioning(!reduceMotion);
		setActivePage(
			reduceMotion ? (movingForward ? "2" : "1") : movingForward ? "1" : "2",
		);
		if (reduceMotion) setOutgoingTab(null);
	};

	const handleFinishTransition = (
		event: React.TransitionEvent<HTMLElement>,
	) => {
		if (
			event.target === event.currentTarget &&
			event.propertyName === "transform" &&
			event.currentTarget.dataset.pageId === activePage
		) {
			setIsTransitioning(false);
			setOutgoingTab(null);
		}
	};

	const getPageId = (tab: string) => {
		if (isTransitioning) return tab === activeTab ? incomingPage : outgoingPage;
		if (tab === activeTab) return activePage;
		return activePage === "1" ? "2" : "1";
	};

	return {
		activeTab,
		activePage,
		changeTab,
		handleFinishTransition,
		getPageId,
		isTransitioning,
		outgoingTab,
	};
}

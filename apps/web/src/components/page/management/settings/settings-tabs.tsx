"use client";

import { Tabs, TabsList, TabsTrigger } from "@grabbin/ui/components/tabs";
import { Activity, useRef } from "react";

const tabTriggerClassName =
	"min-w-0 py-2.5 bg-background hover:bg-muted/80 hover:text-[var(--tabs-text-muted)] data-active:bg-background data-active:text-foreground data-active:hover:bg-muted/80 data-active:hover:text-foreground data-active:smooth-shadow-xs data-active:border data-active:border-border group-data-[size=xl]/tabs-list:px-1 group-data-[size=xl]/tabs-list:text-sm md:group-data-[size=xl]/tabs-list:px-2 md:group-data-[size=xl]/tabs-list:text-base";

export type SettingsTab = {
	value: string;
	label: string;
	content: React.ReactNode;
};

export function SettingsTabs({
	tabs,
	activeTab,
	activePage,
	isTransitioning,
	outgoingTab,
	onChangeTab,
	onTransitionEnd: handleTransitionEnd,
	onGetPageId,
}: {
	tabs: SettingsTab[];
	activeTab: string;
	activePage: string;
	isTransitioning: boolean;
	outgoingTab: string | null;
	onChangeTab: (value: string | number) => void;
	onTransitionEnd: (event: React.TransitionEvent<HTMLElement>) => void;
	onGetPageId: (tab: string) => string;
}) {
	const pageSlideRef = useRef<HTMLDivElement>(null);

	return (
		<Tabs
			value={activeTab}
			onValueChange={onChangeTab}
			className="flex min-h-0 min-w-0 flex-1 flex-col gap-4"
		>
			<TabsList
				aria-label="Settings"
				variant="line"
				size="xl"
				className={`grid w-full max-w-full shrink-0 ${tabs.length === 4 ? "grid-cols-[repeat(4,auto)]" : "grid-cols-[repeat(3,auto)]"} items-center justify-stretch gap-1 overflow-visible bg-background px-0 [&>[data-slot=tabs-indicator]]:hidden`}
			>
				{tabs.map((tab) => (
					<TabsTrigger
						key={tab.value}
						id={`settings-tab-${tab.value}`}
						aria-controls={`settings-panel-${tab.value}`}
						className={tabTriggerClassName}
						value={tab.value}
					>
						{tab.label}
					</TabsTrigger>
				))}
			</TabsList>
			<div className="-mx-3 min-h-0 min-w-0 flex-1 px-4">
				<div
					ref={pageSlideRef}
					className="t-page-slide relative h-full min-h-0"
					data-page={activePage}
				>
					{tabs.map((tab) => {
						const isActive = tab.value === activeTab;
						const isOutgoing = isTransitioning && tab.value === outgoingTab;

						return (
							<Activity
								key={tab.value}
								mode={isActive || isOutgoing ? "visible" : "hidden"}
							>
								<section
									id={`settings-panel-${tab.value}`}
									role="tabpanel"
									aria-labelledby={`settings-tab-${tab.value}`}
									aria-hidden={!isActive}
									inert={!isActive}
									className={`t-page flex h-full flex-col overflow-y-auto ${tab.value === "custom-domain" ? "p-1" : ""}`}
									data-page-id={onGetPageId(tab.value)}
									onTransitionEnd={handleTransitionEnd}
								>
									{tab.content}
								</section>
							</Activity>
						);
					})}
				</div>
			</div>
		</Tabs>
	);
}

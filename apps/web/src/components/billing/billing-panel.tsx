"use client";

import { env } from "@grabbin/env/web";
import { Badge } from "@grabbin/ui/components/badge";
import { Button } from "@grabbin/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@grabbin/ui/components/card";
import { toast } from "@grabbin/ui/components/toast";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { authClient, getAuthErrorMessage } from "@/lib/auth-client";
import { getSignInHref } from "@/lib/auth-redirect";

type Subscription = {
	id: string;
	status: string;
	productId: string;
	periodEnd?: Date | string;
};

type AccessState = {
	hasAccessGranted: boolean;
	message?: string;
	subscription?: Subscription;
};

const productId = env.NEXT_PUBLIC_CREEM_PRODUCT_ID;

function statusLabel(status: string) {
	const normalizedStatus = status.toLowerCase();
	if (["active", "trialing", "paid"].includes(normalizedStatus)) {
		return "이용 중";
	}
	if (normalizedStatus === "scheduled_cancel") return "기간 종료 후 취소 예정";
	if (["past_due", "unpaid"].includes(normalizedStatus)) return "결제 확인 중";
	return "이용할 수 없음";
}

export default function BillingPanel() {
	const router = useRouter();
	const { data: session, isPending: isSessionPending } =
		authClient.useSession();
	const [access, setAccess] = useState<AccessState | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const loadAccess = useCallback(async () => {
		if (!session) {
			setAccess(null);
			return;
		}

		setIsLoading(true);
		const { data, error } = await authClient.creem.hasAccessGranted();
		setIsLoading(false);

		if (error) {
			toast({ message: getAuthErrorMessage(error), state: "error" });
			return;
		}
		setAccess(data);
	}, [session]);

	useEffect(() => {
		void loadAccess();
	}, [loadAccess]);

	useEffect(() => {
		if (!isSessionPending && !session) {
			router.replace(getSignInHref("/billing"));
		}
	}, [isSessionPending, router, session]);

	if (isSessionPending) return <p>로그인 상태를 확인하고 있습니다...</p>;

	if (!session) return null;

	const subscription = access?.subscription;
	const hasAccess = access?.hasAccessGranted === true;
	const canCancel =
		hasAccess && subscription?.status.toLowerCase() !== "scheduled_cancel";

	const startCheckout = async () => {
		if (!productId) {
			toast({
				message: "NEXT_PUBLIC_CREEM_PRODUCT_ID를 설정해 주세요.",
				state: "error",
			});
			return;
		}

		const { data, error } = await authClient.creem.createCheckout({
			productId,
			successUrl: `${window.location.origin}/billing?checkout=success`,
		});
		if (error) {
			toast({ message: getAuthErrorMessage(error), state: "error" });
			return;
		}
		if (data?.url) window.location.assign(data.url);
	};

	const openPortal = async () => {
		const { data, error } = await authClient.creem.createPortal();
		if (error) {
			toast({ message: getAuthErrorMessage(error), state: "error" });
			return;
		}
		if (data?.url) window.location.assign(data.url);
	};

	const cancelSubscription = async () => {
		if (!subscription) return;

		const { error } = await authClient.creem.cancelSubscription({
			id: subscription.id,
		});
		if (error) {
			toast({ message: getAuthErrorMessage(error), state: "error" });
			return;
		}
		toast({ message: "구독 취소가 예약되었습니다.", state: "success" });
		await loadAccess();
	};

	return (
		<div className="grid gap-4">
			<Card>
				<CardHeader>
					<CardTitle>구독 관리</CardTitle>
					<CardDescription>
						Creem 웹훅이 결제와 구독 상태를 자동으로 동기화합니다.
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-4">
					<div className="flex items-center gap-2">
						<Badge variant={hasAccess ? "default" : "secondary"}>
							{subscription ? statusLabel(subscription.status) : "구독 없음"}
						</Badge>
						{subscription?.periodEnd && (
							<span className="text-muted-foreground text-sm">
								다음 변경일:{" "}
								{new Date(subscription.periodEnd).toLocaleDateString("ko-KR")}
							</span>
						)}
					</div>
					{access?.message && (
						<p className="text-muted-foreground text-sm">{access.message}</p>
					)}
					<div className="flex flex-wrap gap-2">
						{!hasAccess && <Button onClick={startCheckout}>구독 시작</Button>}
						{canCancel && (
							<Button variant="outline" onClick={cancelSubscription}>
								구독 취소
							</Button>
						)}
						<Button variant="outline" onClick={openPortal}>
							결제 관리
						</Button>
						<Button variant="ghost" disabled={isLoading} onClick={loadAccess}>
							새로고침
						</Button>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>접근 권한 예시</CardTitle>
					<CardDescription>
						활성, 체험, 결제 완료 상태이면 유료 기능을 사용할 수 있습니다.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p>
						{hasAccess
							? "유료 기능을 사용할 수 있습니다."
							: "유료 기능은 구독 후 사용할 수 있습니다."}
					</p>
				</CardContent>
			</Card>
		</div>
	);
}

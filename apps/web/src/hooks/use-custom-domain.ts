import { useCheckCustomDomain } from "@/mutation/custom-domain/check";
import { useConnectCustomDomain } from "@/mutation/custom-domain/connect";
import { useDisconnectCustomDomain } from "@/mutation/custom-domain/disconnect";
import { useCustomDomainQuery } from "@/query/custom-domain/query";

export function useCustomDomain(handle: string | undefined, active: boolean) {
	const domainQuery = useCustomDomainQuery(handle, active);
	const connectMutation = useConnectCustomDomain(handle);
	const checkMutation = useCheckCustomDomain(handle);
	const disconnectMutation = useDisconnectCustomDomain(handle);
	return { domainQuery, connectMutation, checkMutation, disconnectMutation };
}

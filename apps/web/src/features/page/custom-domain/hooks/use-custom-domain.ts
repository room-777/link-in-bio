import { useCheckCustomDomain } from "../mutations/check";
import { useConnectCustomDomain } from "../mutations/connect";
import { useDisconnectCustomDomain } from "../mutations/disconnect";
import { useCustomDomainQuery } from "../queries/domain";

export function useCustomDomain(handle: string | undefined, active: boolean) {
	const domainQuery = useCustomDomainQuery(handle, active);
	const connectMutation = useConnectCustomDomain(handle);
	const checkMutation = useCheckCustomDomain(handle);
	const disconnectMutation = useDisconnectCustomDomain(handle);
	return { domainQuery, connectMutation, checkMutation, disconnectMutation };
}

import { useMutation } from "@tanstack/react-query";
import { changePageHandle } from "@/api/page/api";

export function useChangePageHandle() {
	return useMutation({
		mutationFn: ({
			handle,
			nextHandle,
		}: {
			handle: string;
			nextHandle: string;
		}) => changePageHandle(handle, nextHandle),
	});
}

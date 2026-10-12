import { useMutation } from "@tanstack/react-query";
import { createPage } from "@/api/page/api";

export function useCreatePage() {
	return useMutation({ mutationFn: createPage });
}

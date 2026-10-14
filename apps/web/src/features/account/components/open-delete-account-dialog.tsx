import { overlay } from "overlay-kit";
import DeleteAccountDialog from "./delete-account-dialog";

export function openDeleteAccountDialog() {
	overlay.open(({ isOpen, close, unmount }) => (
		<DeleteAccountDialog
			open={isOpen}
			onOpenChange={(nextOpen) => !nextOpen && close()}
			onOpenChangeComplete={(nextOpen) => !nextOpen && unmount()}
		/>
	));
}

import { overlay } from "overlay-kit";
import SettingDialog from "./setting-dialog";

export function openSettingDialog(handle?: string) {
	overlay.open(({ isOpen, close, unmount }) => (
		<SettingDialog
			handle={handle}
			open={isOpen}
			onOpenChange={(nextOpen) => !nextOpen && close()}
			onOpenChangeComplete={(nextOpen) => !nextOpen && unmount()}
		/>
	));
}

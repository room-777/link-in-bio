import {
  type HandleAvailabilityResponse,
  normalizePageHandle,
} from "@grabbin/api";

const handleAvailabilityMessages = {
  invalid: "Enter a valid handle.",
  reserved: "This handle is reserved.",
  taken: "This handle is already taken.",
} as const;

export type HandleAvailabilityState =
  | "idle"
  | "checking"
  | "available"
  | "duplicate";

export function getHandleAvailabilityError(
  availability: HandleAvailabilityResponse | null,
) {
  if (!availability?.reason) return null;
  return handleAvailabilityMessages[availability.reason];
}

export function getHandleAvailabilityStatus(
  handle: string,
  availability: HandleAvailabilityResponse | null,
  isCheckingHandle = false,
) {
  const normalizedHandle = normalizePageHandle(handle);
  const isCurrentAvailability = availability?.handle === normalizedHandle;
  const canCreatePage =
    availability?.available === true && isCurrentAvailability;
  const availabilityState: HandleAvailabilityState = isCheckingHandle
    ? "checking"
    : canCreatePage
      ? "available"
      : availability?.available === false && isCurrentAvailability
        ? "duplicate"
        : "idle";

  return {
    normalizedHandle,
    canCreatePage,
    availabilityState,
    error: getHandleAvailabilityError(availability),
  };
}

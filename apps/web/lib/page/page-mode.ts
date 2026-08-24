export type PageMode = "view" | "edit";

export function getPageMode(isCurrentUserPage: boolean): PageMode {
  return isCurrentUserPage ? "edit" : "view";
}

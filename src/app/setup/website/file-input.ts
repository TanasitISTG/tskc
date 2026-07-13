type WebsiteImageField = "logo" | "hero";

export function readWebsiteImageFile(formData: FormData, kind: WebsiteImageField) {
  const value = formData.get(kind);

  if (!(value instanceof File)) {
    return undefined;
  }

  const isEmptyControl =
    value.size === 0 &&
    value.type === "application/octet-stream" &&
    (value.name === "" || value.name === "blob");

  return isEmptyControl ? undefined : value;
}

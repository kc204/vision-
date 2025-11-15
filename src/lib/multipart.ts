export type EncodedImageUpload = {
  filename: string;
  mimeType: string;
  dataUrl: string;
};

function isFile(value: FormDataEntryValue): value is File {
  return value instanceof File && value.size > 0;
}

export async function parseRequestWithOptionalFiles<T>(
  request: Request,
  fileFieldName: string
): Promise<{ body: T; files: EncodedImageUpload[] }> {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    const body = (await request.json()) as T;
    return { body, files: [] };
  }

  const formData = await request.formData();
  const payloadRaw = formData.get("payload");

  if (typeof payloadRaw !== "string") {
    throw new Error("Missing payload field in multipart request");
  }

  const body = JSON.parse(payloadRaw) as T;

  const files = formData
    .getAll(fileFieldName)
    .filter(isFile);

  const encoded = await Promise.all(
    files.map(async (file) => {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mimeType = file.type || "application/octet-stream";

      return {
        filename: file.name,
        mimeType,
        dataUrl: `data:${mimeType};base64,${buffer.toString("base64")}`,
      } satisfies EncodedImageUpload;
    })
  );

  return { body, files: encoded };
}

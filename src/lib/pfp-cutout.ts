/** Runs only after a PFP upload, so the segmentation runtime stays out of the initial page. */
export async function makePfpCutout(
  file: File,
  onProgress: (message: string) => void,
): Promise<File> {
  const { newSession, remove } = await import("@bunnio/rembg-web");
  onProgress("Loading the cutout model…");
  const session = await newSession("u2netp", undefined, {
    numThreads: 1,
    executionProviders: ["wasm"],
    onProgress: () => onProgress("Loading the cutout model…"),
  });
  const transparent = await remove(file, {
    session,
    postProcessMask: true,
    onProgress: (progress) => {
      if (progress.step === "processing") onProgress("Separating the character…");
      if (progress.step === "postprocessing") onProgress("Trimming empty space…");
    },
  });

  const bitmap = await createImageBitmap(transparent);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Image processing is unavailable in this browser.");
    context.drawImage(bitmap, 0, 0);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let left = canvas.width;
    let top = canvas.height;
    let right = -1;
    let bottom = -1;
    let opaquePixels = 0;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        if (data[(y * canvas.width + x) * 4 + 3] < 32) continue;
        opaquePixels++;
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
    const imagePixels = canvas.width * canvas.height;
    if (right < left || opaquePixels < imagePixels * 0.015 || opaquePixels > imagePixels * 0.96)
      throw new Error("The character could not be separated from this image.");

    const padding = Math.max(4, Math.round(Math.max(right - left, bottom - top) * 0.035));
    const cropLeft = Math.max(0, left - padding);
    const cropTop = Math.max(0, top - padding);
    const cropRight = Math.min(canvas.width, right + padding + 1);
    const cropBottom = Math.min(canvas.height, bottom + padding + 1);
    const width = cropRight - cropLeft;
    const height = cropBottom - cropTop;
    const scale = Math.min(1, 900 / Math.max(width, height));
    const output = document.createElement("canvas");
    output.width = Math.max(1, Math.round(width * scale));
    output.height = Math.max(1, Math.round(height * scale));
    const outputContext = output.getContext("2d");
    if (!outputContext) throw new Error("Image processing is unavailable in this browser.");
    outputContext.drawImage(canvas, cropLeft, cropTop, width, height, 0, 0, output.width, output.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      output.toBlob((value) => value ? resolve(value) : reject(new Error("Could not export the cutout.")), "image/png"),
    );
    if (blob.size > 4 * 1024 * 1024) throw new Error("The cutout is too large to use.");
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-cutout.png`, { type: "image/png" });
  } finally {
    bitmap.close();
  }
}

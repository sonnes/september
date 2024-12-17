import { pipeline } from "@huggingface/transformers";

class FillMaskPipeline {
  static task = "fill-mask";
  static model = "Xenova/bert-base-cased";
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model, {
        progress_callback,
        quantized: false,
      });
    }
    return this.instance;
  }
}

// Listen for messages from the main thread
self.addEventListener("message", async (event) => {
  // Get the pipeline instance
  let maskFiller = await FillMaskPipeline.getInstance((x) => {
    self.postMessage(x);
  });

  const output = await maskFiller(`${event.data.text} [MASK]`);

  console.log(output);

  // Send the suggestions back to the main thread
  self.postMessage({
    status: "complete",
    suggestions: output,
  });
});

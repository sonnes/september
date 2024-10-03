interface TranscriptionJob {
  id: string;
  audioBlob: Blob;
  status: "pending" | "processing" | "completed" | "error";
  text?: string;
}

class TranscriberQueue {
  private queue: TranscriptionJob[] = [];
  private isProcessing: boolean = false;

  async addJob({
    id,
    audioBlob,
  }: {
    id: string;
    audioBlob: Blob;
  }): Promise<string> {
    this.queue.push({ id, audioBlob, status: "pending" });
    this.processQueue();
    return id;
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const job = this.queue[0];
    job.status = "processing";

    try {
      const formData = new FormData();
      formData.append("audio", job.audioBlob, "audio.webm");

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Transcription failed");
      }

      const result = await response.json();
      job.text = result.text;
      job.status = "completed";
    } catch (error) {
      console.error("Transcription error:", error);
      job.status = "error";
    }

    this.queue.shift();
    this.isProcessing = false;
    this.processQueue();
  }

  getJob(id: string): TranscriptionJob | undefined {
    return this.queue.find((job) => job.id === id);
  }
}

export const transcriber = new TranscriberQueue();

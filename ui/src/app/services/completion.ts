export async function getSuggestions(text: string): Promise<string[]> {
  try {
    const response = await fetch("/api/completion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.suggestions;
    } else {
      console.error("Failed to get suggestions");
      return [];
    }
  } catch (error) {
    console.error("Error calling completion API:", error);
    return [];
  }
}

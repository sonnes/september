# AI Settings Page

These are the settings that allow configuring the these settings for the AI.

Persona is a textarea that describes the language, tone, style, slang, and other aspects of the suggestions the AI should provide. Give 2-3 examples of the persona. Persona is saved in the user's account.

Corpus is a textarea that allows the user to provide a corpus of text that is used for auto-completion. Alternatively it can be auto-generated based on the persona. Corpus is saved as a file in the `llm` bucket.

On save, the corpus is used to generate embeddings and tries using the `Transformers` library.

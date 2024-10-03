export async function POST(req: Request) {
  const { text, prompt } = await req.json();

  return new Response(
    JSON.stringify({
      text: "Hello, world!",
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

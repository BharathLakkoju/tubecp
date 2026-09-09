// Ensure CI runs without real third-party credentials unless explicitly provided.
process.env.YOUTUBE_API_KEY ??= "test-youtube-key";
process.env.OPENROUTER_API_KEY ??= "test-openrouter-key";
process.env.LICENSE_KEY ??= "";

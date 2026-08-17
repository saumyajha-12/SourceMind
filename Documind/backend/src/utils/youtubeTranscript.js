const https = require("https");
const http = require("http");

function extractVideoId(url) {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
  );
  if (match) return match[1];
  if (url.length === 11) return url;
  return null;
}

function fetchUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.get(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          ...options.headers,
        },
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchUrl(res.headers.location, options).then(resolve).catch(reject);
        }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      }
    );
    req.on("error", reject);
    req.setTimeout(20000, () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });
  });
}

async function getVideoTitle(videoId) {
  try {
    const res = await fetchUrl(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    const data = JSON.parse(res);
    return data.title ?? `YouTube Video (${videoId})`;
  } catch {
    return `YouTube Video (${videoId})`;
  }
}

async function getYoutubeTranscript(url) {
  const videoId = extractVideoId(url);
  if (!videoId) throw new Error("Invalid YouTube URL");

  if (!process.env.RAPIDAPI_KEY) {
    throw new Error("RAPIDAPI_KEY is not set in environment variables.");
  }

  // ✅ Correct endpoint from the screenshot
  const res = await fetchUrl(
    `https://yt-api.p.rapidapi.com/get_transcript?id=${videoId}&lang=en`,
    {
      headers: {
        "x-rapidapi-host": "yt-api.p.rapidapi.com",
        "x-rapidapi-key": process.env.RAPIDAPI_KEY,
      },
    }
  );

  // console.log("RapidAPI raw response:", res.slice(0, 300));

  let data;
  try {
    data = JSON.parse(res);
  } catch {
    throw new Error("Invalid response from transcript API.");
  }

  // console.log("RapidAPI status:", data?.status);
  // console.log("RapidAPI keys:", Object.keys(data ?? {}));

  if (data?.status === 429) {
    throw new Error("Monthly transcript quota exceeded. Try again next month.");
  }

  // ✅ Handle different possible response shapes
  const segments =
    data?.transcript ??
    data?.data ??
    data?.captions ??
    data?.subtitles ??
    [];

  if (!Array.isArray(segments) || segments.length === 0) {
    throw new Error(
      "No transcript available for this video. Make sure it has captions enabled."
    );
  }

  const fullText = segments
    .map((s) => s.text ?? s.content ?? s.utf8 ?? "")
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!fullText) {
    throw new Error("Transcript is empty for this video.");
  }

  const title = await getVideoTitle(videoId);
  return { fullText, videoId, title };
}

module.exports = { getYoutubeTranscript, extractVideoId };
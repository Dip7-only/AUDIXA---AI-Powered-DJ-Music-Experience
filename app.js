const STORAGE_KEY = "audixa.queue.v1";
const form = document.getElementById("addForm");
const input = document.getElementById("trackUrl");
const queueList = document.getElementById("queueList");
const count = document.getElementById("trackCount");
const message = document.getElementById("formMessage");
const placeholder = document.getElementById("playerPlaceholder");
const embedWrap = document.getElementById("embedWrap");
const playingLabel = document.getElementById("playingLabel");
let queue = loadQueue();

function loadQueue() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter(item => item && item.id && item.url && item.type) : [];
  } catch { return []; }
}
function saveQueue() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(queue)); } catch {}
}
function parseTrack(raw) {
  let url;
  try { url = new URL(raw.trim()); } catch { return null; }
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host === "open.spotify.com" || host === "spotify.link") {
    const parts = url.pathname.split("/").filter(Boolean);
    const trackIndex = parts.indexOf("track");
    if (trackIndex >= 0 && parts[trackIndex + 1]) {
      const id = parts[trackIndex + 1].split("?")[0];
      if (!/^[A-Za-z0-9]{10,}$/.test(id)) return null;
      return { id: crypto.randomUUID(), type: "spotify", sourceId: id, url: "https://open.spotify.com/track/" + id, title: "Spotify track " + id.slice(0, 6) };
    }
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be" || host === "music.youtube.com") {
    let videoId = "";
    if (host === "youtu.be") videoId = url.pathname.slice(1).split("/")[0];
    else if (url.pathname === "/watch") videoId = url.searchParams.get("v") || "";
    else if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) videoId = url.pathname.split("/")[2] || "";
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
    return { id: crypto.randomUUID(), type: "youtube", sourceId: videoId, url: "https://www.youtube.com/watch?v=" + videoId, title: "YouTube video " + videoId.slice(0, 6) };
  }
  return null;
}
function showMessage(text) { message.textContent = text; }
function playTrack(id) {
  const track = queue.find(item => item.id === id);
  if (!track) return;
  placeholder.hidden = true;
  embedWrap.hidden = false;
  embedWrap.className = "embed-wrap " + track.type;
  embedWrap.replaceChildren();
  const iframe = document.createElement("iframe");
  iframe.title = track.type === "spotify" ? "Spotify music player" : "YouTube music player";
  iframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.loading = "lazy";
  if (track.type === "spotify") {
    iframe.src = "https://open.spotify.com/embed/track/" + encodeURIComponent(track.sourceId) + "?utm_source=generator&theme=0";
    iframe.height = "152";
  } else {
    iframe.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(track.sourceId) + "?autoplay=1&rel=0";
    iframe.allow += "; accelerometer; gyroscope";
  }
  embedWrap.appendChild(iframe);
  playingLabel.textContent = "NOW PLAYING · " + track.type.toUpperCase();
  document.querySelector(".player-card").scrollIntoView({ behavior: "smooth", block: "center" });
}
function renderQueue() {
  count.textContent = queue.length + (queue.length === 1 ? " TRACK" : " TRACKS");
  queueList.replaceChildren();
  if (!queue.length) {
    const empty = document.createElement("div");
    empty.className = "empty-queue";
    empty.innerHTML = '<span class="empty-icon">♫</span><strong>Your queue is waiting</strong><span>Add a track to get the party started.</span>';
    queueList.appendChild(empty);
    return;
  }
  queue.forEach((track, index) => {
    const row = document.createElement("div");
    row.className = "track-row";
    const type = document.createElement("div");
    type.className = "track-type";
    type.textContent = track.type === "spotify" ? "S" : "▶";
    const info = document.createElement("div");
    info.className = "track-info";
    const title = document.createElement("strong");
    title.textContent = track.title || (track.type === "spotify" ? "Spotify track" : "YouTube video");
    const subtitle = document.createElement("span");
    subtitle.textContent = (index + 1).toString().padStart(2, "0") + " · " + track.type.toUpperCase();
    info.append(title, subtitle);
    const play = document.createElement("button");
    play.type = "button"; play.className = "track-play"; play.textContent = "Play";
    play.addEventListener("click", () => playTrack(track.id));
    const remove = document.createElement("button");
    remove.type = "button"; remove.className = "track-remove"; remove.textContent = "×"; remove.setAttribute("aria-label", "Remove track");
    remove.addEventListener("click", () => { queue = queue.filter(item => item.id !== track.id); saveQueue(); renderQueue(); });
    row.append(type, info, play, remove);
    queueList.appendChild(row);
  });
}
form.addEventListener("submit", event => {
  event.preventDefault();
  const track = parseTrack(input.value);
  if (!track) {
    showMessage("Please paste a valid public Spotify track or YouTube video link.");
    return;
  }
  if (queue.some(item => item.type === track.type && item.sourceId === track.sourceId)) {
    showMessage("That track is already in your queue.");
    return;
  }
  queue.push(track);
  saveQueue();
  renderQueue();
  input.value = "";
  showMessage("Added to your queue. Press Play when you're ready.");
});
document.getElementById("clearQueue").addEventListener("click", () => {
  queue = []; saveQueue(); renderQueue();
  embedWrap.replaceChildren(); embedWrap.hidden = true; placeholder.hidden = false;
  playingLabel.textContent = "NOTHING PLAYING YET";
  showMessage("Queue cleared.");
});
renderQueue();
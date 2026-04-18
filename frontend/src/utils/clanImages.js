// One background image per clan, thematically matched.
// Images are tall so they fill the character sheet as you scroll.
const CLAN_BG = {
  "Brujah":     "/assets/clans/1.jpg",   // battle scene — warriors/rebels
  "Toreador":   "/assets/clans/2.jpg",   // baroque ceiling — art and beauty
  "Tremere":    "/assets/clans/3.jpg",   // ornate baroque ceiling — warlocks
  "Ventrue":    "/assets/clans/4.jpg",   // dark damask — aristocratic elegance
  "Ministry":   "/assets/clans/13.jpg",  // bat-winged demon in storm — serpent cult
  "Hecata":     "/assets/clans/7.jpg",   // death figure & skeletons — death clan
  "Salubri":    "/assets/clans/8.jpg",   // winged divine figures — healer angels
  "Malkavian":  "/assets/clans/9.jpg",   // falling masses — madness
  "Lasombra":   "/assets/clans/10.jpg",  // angel over city with divine rays — shadow/church
  "Nosferatu":  "/assets/clans/11.jpg",  // dark crowd scene — hiding in plain sight
  "Ravnos":     "/assets/clans/12.jpg",  // stormy sea boat — nomadic wanderers
  "Gangrel":    "/assets/clans/6.jpg",   // dark nature/flowers — feral, wilderness
  "Banu Haqim": "/assets/clans/14.jpg",  // commanding angel with sword — judge-executioner
  "Caitiff":    "/assets/clans/15.jpg",  // lone ornate sword — fighting without a clan
  "Thin-Blood": "/assets/clans/15.jpg",  // same — outsiders like Caitiff
  "Tzimisce":   "/assets/clans/16.jpg",  // dragon in storm — monstrous shapeshifter
};

const FALLBACK = "/assets/clans/4.jpg";

export function getClanBg(clanName) {
  return CLAN_BG[clanName] ?? FALLBACK;
}

// Full CSS background-image value with dark overlay.
// darkness: 0–1 (0.88 = image clearly visible but dark)
// scrolls naturally with the page so tall images fill the sheet as you scroll.
export function clanBgStyle(clanName, darkness = 0.94) {
  const url = getClanBg(clanName);
  const overlay = `rgba(0,0,0,${darkness})`;
  return {
    backgroundImage: `linear-gradient(${overlay}, ${overlay}), url('${url}')`,
    backgroundSize: "cover",
    backgroundPosition: "center top",
    backgroundAttachment: "scroll",
    backgroundRepeat: "no-repeat",
  };
}

// Lighter version for small cards (GM session cards, etc.)
export function clanCardStyle(clanName, darkness = 0.78) {
  return clanBgStyle(clanName, darkness);
}

export const drinkBackgrounds: Record<string, string> = {
  thai: "linear-gradient(145deg, #c06f29 0%, #f5a142 42%, #704018 100%)",
  matcha: "linear-gradient(145deg, #dcefc1 0%, #76a944 50%, #244d12 100%)",
  cocoa: "linear-gradient(145deg, #9a5b38 0%, #5f351f 52%, #2d1b12 100%)",
  pink: "linear-gradient(145deg, #ffd7dd 0%, #f48ba0 52%, #b84568 100%)",
  caramel: "linear-gradient(145deg, #f6d4a4 0%, #b66a2b 48%, #5a321b 100%)",
  blacktea: "linear-gradient(145deg, #b66a2a 0%, #764019 55%, #25160d 100%)"
};

export function imageStyle(key: string) {
  return { background: drinkBackgrounds[key] ?? drinkBackgrounds.thai };
}

import { readFileSync, writeFileSync } from "node:fs";

const base64 = readFileSync("public/logo.png").toString("base64");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <image width="512" height="512" href="data:image/png;base64,${base64}" />
</svg>`;

writeFileSync("public/logo.svg", svg);
writeFileSync("src/app/icon.svg", svg);
console.log("Created public/logo.svg and src/app/icon.svg");

import { CardProps } from "../components/Card/Card";
import { Author, CardItem, ColourScheme, SchemeIni, Snippet, SortBoxOption } from "../types/marketplace-types";

/**
 * Get localStorage data (or fallback value), given a key
 * @param key The localStorage key
 * @param fallback Fallback value if the key is not found
 * @returns The data stored in localStorage, or the fallback value if not found
 */
export const getLocalStorageDataFromKey = (key: string, fallback?: unknown) => {
  const data = localStorage.getItem(key);

  if (data) {
    try {
      // If it's json parse it
      return JSON.parse(data);
    } catch (err) {
      // If it's just a string or something
      return data;
    }
  } else {
    return fallback;
  }
};

/**
 * Convert hexadeciaml string to rgb values
 * @param hex 3 or 6 character hex string
 * @returns Array of RGB values
 */
const hexToRGB = (hex: string) => {
  if (hex.length === 3) {
    hex = hex.split("").map((char) => char + char).join("");
  } else if (hex.length != 6) {
    throw "Only 3- or 6-digit hex colours are allowed.";
  } else if (hex.match(/[^0-9a-f]/i)) {
    throw "Only hex colours are allowed.";
  }

  const aRgbHex = hex.match(/.{1,2}/g);
  if (!aRgbHex || aRgbHex.length !== 3) {
    throw "Could not parse hex colour.";
  }

  const aRgb = [
    parseInt(aRgbHex[0], 16),
    parseInt(aRgbHex[1], 16),
    parseInt(aRgbHex[2], 16),
  ];

  return aRgb;
};

/**
* Parse INI file into a colour scheme object
* @param data The INI file string data
* @returns Object containing the parsed colour schemes
*/
export const parseIni = (data: string) => {
  const regex = {
    section: /^\s*\[\s*([^\]]*)\s*\]\s*$/,
    param: /^\s*([^=]+?)\s*=\s*(.*?)\s*$/,
    comment: /^\s*;.*$/,
  };
  const value = {};
  const lines = data.split(/[\r\n]+/);
  let section: string | null = null;
  lines.forEach(function(line) {
    if (regex.comment.test(line)) {
      return;
    } else if (regex.param.test(line)) {
      const match: string[] | null = line.match(regex.param);

      // TODO: github copilot made this part, but I have no idea what it does
      // if (match?.length !== 3) {
      //   throw "Could not parse INI file.";
      // }

      if (section) {
        value[section][match?.[1]] = match?.[2].split(";")[0].trim();
      } else if (match) {
        value[match[1]] = match[2].split(";")[0].trim();
      }
    } else if (regex.section.test(line)) {
      const match = line.match(regex.section);
      if (match) {
        value[match[1]] = {};
        section = match[1];
      }
    } else if (line.length == 0 && section) {
      section = null;
    }
  });
  return value;
};

/* Pretty much just reverse the above function */
export const unparseIni = (data: SchemeIni) => {
  let output = "";
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      if (typeof data[key] === "object") {
        output += `[${key}]\n`;
        for (const subKey in data[key]) {
          if (Object.prototype.hasOwnProperty.call(data[key], subKey)) {
            output += `${subKey}=${data[key][subKey]}\n`;
          }
        }
      } else {
        output += `${key}=${data[key]}\n`;
      }
    }
  }
  return output;
};

/**
* Loop through the snippets and add the contents of the code as a style tag in the DOM
* @param snippets The snippets to initialize
*/
// TODO: keep this in sync with the extension.js file
export const initializeSnippets = (snippets: Snippet[]) => {
  // Remove any existing marketplace snippets
  const existingSnippets = document.querySelector("style.marketplaceSnippets");
  if (existingSnippets) existingSnippets.remove();

  const style = document.createElement("style");
  const styleContent = snippets.reduce((accum, snippet) => {
    accum += `/* ${snippet.title} - ${snippet.description} */\n`;
    accum += `${snippet.code}\n`;
    return accum;
  }, "");

  style.innerHTML = styleContent;
  style.classList.add("marketplaceSnippets");
  document.head.appendChild(style);
};

export const fileToBase64 = (file: File) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = (error) => {
      reject(error);
    };
  });
};

/**
 * Format an array of authors, given the data from the manifest and the repo owner.
 * @param authors Array of authors
 * @param user The repo owner
 * @returns The authors, with anything missing added
 */
export const processAuthors = (authors: Author[], user: string) => {
  let parsedAuthors: Author[] = [];

  if (authors && authors.length > 0) {
    parsedAuthors = authors.map((author) => ({
      name: author.name,
      url: author.url.startsWith("javascript:")
        ? ""
        : author.url,
    }));
  } else {
    parsedAuthors.push({
      name: user,
      url: "https://github.com/" + user,
    });
  }

  return parsedAuthors;
};

/**
* Generate a list of options for the schemes dropdown.
* @param schemes The schemes object from the theme.
* @returns Array of options for the schemes dropdown.
*/
export const generateSchemesOptions = (schemes: SchemeIni) => {
  // e.g. [ { key: "red", value: "Red" }, { key: "dark", value: "Dark" } ]
  if (!schemes) return [];
  return Object.keys(schemes).map(schemeName => (
    { key: schemeName, value: schemeName } as SortBoxOption
  ));
};

// Reset any Marketplace localStorage keys (effectively resetting it completely)
export const resetMarketplace = () => {
  console.log("Resetting Marketplace");

  // Loop through and reset marketplace keys
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("marketplace:")) {
      localStorage.removeItem(key);
      console.log(`Removed ${key}`);
    }
  });

  console.log("Marketplace has been reset");
  location.reload();
};

// NOTE: Keep in sync with extension.js
export const injectColourScheme = (scheme: ColourScheme | null) => {

  // Remove any existing marketplace scheme
  const existingMarketplaceSchemeCSS = document.querySelector("style.marketplaceCSS.marketplaceScheme");
  if (existingMarketplaceSchemeCSS) existingMarketplaceSchemeCSS.remove();

  if (scheme) {
    // Add new marketplace scheme
    const schemeTag = document.createElement("style");
    schemeTag.classList.add("marketplaceCSS");
    schemeTag.classList.add("marketplaceScheme");

    let injectStr = ":root {";
    const themeIniKeys = Object.keys(scheme);
    themeIniKeys.forEach((key) => {
      injectStr += `--spice-${key}: #${scheme[key]} !important;`;
      injectStr += `--spice-rgb-${key}: ${hexToRGB(scheme[key])} !important;`;
    });
    injectStr += "}";
    schemeTag.innerHTML = injectStr;
    document.head.appendChild(schemeTag);
  } else {
    // Re-add default user.css
    const originalColorsCSS = document.createElement("link");
    originalColorsCSS.setAttribute("rel", "stylesheet");
    originalColorsCSS.setAttribute("href", "colors.css");
    originalColorsCSS.classList.add("userCSS");
    document.head.appendChild(originalColorsCSS);
  }
};

/**
 * Update the user.css in the DOM
 * @param userCSS The contents of the new user.css
 */
export const injectUserCSS = (userCSS?: string) => {
  try {
    // Remove any existing Spicetify user.css
    const existingUserThemeCSS = document.querySelector("link[href='user.css']");
    if (existingUserThemeCSS) existingUserThemeCSS.remove();

    // Remove any existing marketplace scheme
    const existingMarketplaceUserCSS = document.querySelector("style.marketplaceCSS.marketplaceUserCSS");
    if (existingMarketplaceUserCSS) existingMarketplaceUserCSS.remove();

    if (userCSS) {
      // Add new marketplace scheme
      const userCssTag = document.createElement("style");
      userCssTag.classList.add("marketplaceCSS");
      userCssTag.classList.add("marketplaceUserCSS");
      userCssTag.innerHTML = userCSS;
      document.head.appendChild(userCssTag);
    } else {
      // Re-add default user.css
      const originalUserThemeCSS = document.createElement("link");
      originalUserThemeCSS.setAttribute("rel", "stylesheet");
      originalUserThemeCSS.setAttribute("href", "user.css");
      originalUserThemeCSS.classList.add("userCSS");
      document.head.appendChild(originalUserThemeCSS);
    }
  } catch (error) {
    console.warn(error);
  }
};

// I guess this is okay to not have an end condition on the interval
// because if they turn the setting on or off,
// closing the settings modal will reload the page
export const initColorShiftLoop = (schemes: SchemeIni) => {
  let i = 0;
  const NUM_SCHEMES = Object.keys(schemes).length;
  setInterval(() => {
    // Resets to zero when passes the last scheme
    i = i % NUM_SCHEMES;
    const style = document.createElement("style");
    style.className = "colorShift-style";
    style.innerHTML = `* {
      transition-duration: 400ms;
    }
    main-type-bass {
      transition-duration: unset !important;
    }`;

    document.body.appendChild(style);
    injectColourScheme(Object.values(schemes)[i]);
    i++;
    style.remove();
  }, 60 * 1000);
};

export const parseCSS = async (themeData: CardItem) => {
  if (!themeData.cssURL) throw new Error("No CSS URL provided");

  const userCssUrl = themeData.cssURL.indexOf("raw.githubusercontent.com") > -1
  // TODO: this should probably be the URL stored in localstorage actually (i.e. put this url in localstorage)
    ? `https://cdn.jsdelivr.net/gh/${themeData.user}/${themeData.repo}@${themeData.branch}/${themeData.manifest.usercss}`
    : themeData.cssURL;
  // TODO: Make this more versatile
  const assetsUrl = userCssUrl.replace("/user.css", "/assets/");

  console.log("Parsing CSS: ", userCssUrl);
  let css = await fetch(`${userCssUrl}?time=${Date.now()}`).then(res => res.text());
  // console.log("Parsed CSS: ", css);

  const urls = css.matchAll(/url\(['|"](?<path>.+?)['|"]\)/gm) || [];

  for (const match of urls) {
    const url = match?.groups?.path;
    if (!url) continue;

    // console.log(url);
    // If it's a relative URL, transform it to HTTP URL
    if (!url.startsWith("http") && !url.startsWith("data")) {
      const newUrl = assetsUrl + url.replace(/\.\//g, "");
      css = css.replace(url, newUrl);
    }
  }

  // console.log("New CSS: ", css);

  return css;
};

/**
 * Get user, repo, and branch from a GitHub raw URL
 * @param url Github Raw URL
 * @returns { { user: string, repo: string, branch: string, filePath: string } }
 */
export const getParamsFromGithubRaw = (url: string) => {
  const regex_result = url.match(/https:\/\/raw\.githubusercontent\.com\/(?<user>[^/]+)\/(?<repo>[^/]+)\/(?<branch>[^/]+)\/(?<filePath>.+$)/);
  // e.g. https://raw.githubusercontent.com/spicetify/spicetify-extensions/main/featureshuffle/featureshuffle.js

  const obj = {
    user: regex_result ? regex_result.groups?.user : null,
    repo: regex_result ? regex_result.groups?.repo : null,
    branch: regex_result ? regex_result.groups?.branch : null,
    filePath: regex_result ? regex_result.groups?.filePath : null,
  };

  return obj;
};

export function addToSessionStorage(items, key?) {
  if (!items) return;
  items.forEach(item => {
    if (!key) key = `${items.user}-${items.repo}`;
    // If the key already exists, it will append to it instead of overwriting it
    const existing = window.sessionStorage.getItem(key);
    const parsed = existing ? JSON.parse(existing) : [];
    parsed.push(item);
    window.sessionStorage.setItem(key, JSON.stringify(parsed));
  });
}
export function getInvalidCSS(): string[] {
  const unparsedCSS = document.querySelector("head > style.marketplaceCSS.marketplaceUserCSS");
  const classNameList = unparsedCSS?.innerHTML;
  const regex = new RegExp (`.-?[_a-zA-Z]+[_a-zA-Z0-9-]*\\s*{`, "g");
  if (!classNameList) return ["Error: Class name list not found; please create an issue"];
  const matches = classNameList.matchAll(regex);
  const invalidCssClassName: string[] = [];
  for (const match of matches) {
    // Check if match is the same class name as an html element
    const className = match[0].replace("{", "").trim();
    const classesArr = className.split(" ");
    let element;
    for (let i = 0; i < classesArr.length; i++) {
      try {
        element = document.querySelector(`${classesArr[i]}`);
      }
      catch (e) {
        element = document.getElementsByClassName(`${className}`);
      }
      if (!element) {
        invalidCssClassName.push(className);
      }
    }
  }
  return invalidCssClassName;
}

export async function getMarkdownHTML(markdown: string, user: string, repo: string) {
  try {
    const postBody = {
      text: markdown,
      context: `${user}/${repo}`,
      mode: "gfm",
    };

    const response = await fetch("https://api.github.com/markdown", {
      method: "POST",
      body: JSON.stringify(postBody),
    });
    if (!response.ok) throw Spicetify.showNotification(`Error parsing markdown (HTTP ${response.status})`);

    const html = await response.text();

    return html;
  } catch (err) {
    return null;
  }
}

// This function is used to sleep for a certain amount of time
export function sleep(ms: number | undefined) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateKey(props: CardProps) {
  const prefix = props.type === "snippet" ? "snippet:" : `${props.item.user}/${props.item.repo}/`;

  let cardId: string;
  switch (props.type) {
  case "snippet":
    cardId = props.item.title.replaceAll(" ", "-");
    break;
  case "theme":
    cardId = props.item.manifest?.usercss || "";
    break;
  case "extension":
    cardId = props.item.manifest?.main || "";
    break;
  case "app":
    cardId = props.item.manifest?.name?.replaceAll(" ", "-") || "";
    break;
  }

  return `marketplace:installed:${prefix}${cardId}`;
}

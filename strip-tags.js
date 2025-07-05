const re = /<('[^']*?'|"[^"]*?"|[^>])+?>/g;
export const stripTags = (input) => input.replace(re, "");

export const process = (url) => {
  const urlDecomposerRegex = /^([^:\/?#]+:)?(?:\/\/([^\/?#]*))?([^?#]+)?(\?[^#]*)?(#.*)?/;
  const urlParts = url?.match(urlDecomposerRegex);

  if (!urlParts) return;

  // [0] - Original
  // [1] - Protocol
  // [2] - Hostname
  // [3] - Uri
  // [4] - Parameters
  // [5] - Hash

  // if !Protocol and !Hostname, it's an internal link
  // See
  //    - //www.youtube.com/  <- protocol aware link
  //    - /www.youtube.com/   <- relative url
  if (!urlParts[1] && !urlParts[2]) {
    return; // meh, we follow external links :)
  }

  return `${urlParts[1] || 'http:'}${urlParts[0]}`; // if does not have protocol (i.e. //www.youtube.com/)
};

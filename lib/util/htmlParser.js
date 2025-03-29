import Cheerio from 'cheerio';
import JsonFile from 'jsonfile';
import UrlUtil from './url';
import Puid from 'puid';

class HtmlParser {
  constructor(postData) {
    this.postData = postData;
    this._linkSchema = JsonFile.readFileSync(`${__dirname}/../data/linkSchema.json`);
    this.$ = Cheerio.load(postData.content);
  }

  getLinkSchemaTemplate() {
    return JSON.parse(JSON.stringify(this._linkSchema));
  }

  processTag(querySelector, linkType, urlSelectorCb, labelSelectorCB) {
    const linkContainer = [];
    const puid = new Puid();

    this.$(querySelector).each((_, element) => {
      const elementUrl = UrlUtil.process(urlSelectorCb(element));

      if (!elementUrl) return;

      const linkSchema = this.getLinkSchemaTemplate();
      linkSchema.id = puid.generate();
      linkSchema.url = elementUrl;
      linkSchema.link.type = linkType;
      linkSchema.link.label = labelSelectorCB(element);
      linkSchema.source.title = this.postData.title;
      linkSchema.source.file = this.postData.source;

      linkContainer.push(linkSchema);
    });

    return linkContainer;
  }

  processATags() {
    return this.processTag('a', 'Text', (elem) => {
      return this.$(elem).attr('href');
    }, (elem) => {
      return this.$(elem).text();
    });
  }

  processImgTags() {
    return this.processTag('img', 'Image', (elem) => {
      return this.$(elem).attr('src');
    }, (elem) => {
      const alt = this.$(elem).attr('alt');
      const title = this.$(elem).attr('title');

      return alt || title || '';
    });
  }

  processYouTube() {
    return this.processTag('iframe[src*="youtube.com"]', 'YouTube', (elem) => {
      return this.$(elem).attr('src');
    }, () => {
      return 'YouTube Video';
    });
  }
}

export default HtmlParser;

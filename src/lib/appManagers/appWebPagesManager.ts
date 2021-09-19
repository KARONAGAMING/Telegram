/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2019-2021 Eduard Kuzmenko
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 * 
 * Originally from:
 * https://github.com/zhukov/webogram
 * Copyright (C) 2014 Igor Zhukov <igor.beatle@gmail.com>
 * https://github.com/zhukov/webogram/blob/master/LICENSE
 */

import appPhotosManager from "./appPhotosManager";
import appDocsManager from "./appDocsManager";
import { RichTextProcessor } from "../richtextprocessor";
import { ReferenceContext } from "../mtproto/referenceDatabase";
import rootScope from "../rootScope";
import { safeReplaceObject } from "../../helpers/object";
import { limitSymbols } from "../../helpers/string";
import { WebPage } from "../../layer";
import { MOUNT_CLASS_TO } from "../../config/debug";

const photoTypeSet = new Set(['photo', 'video', 'gif', 'document']);

export class AppWebPagesManager {
  private webpages: {
    [webPageId: string]: WebPage
  } = {};
  private pendingWebPages: {
    [webPageId: string]: Set<string>
  } = {};
  
  constructor() {
    rootScope.addMultipleEventsListeners({
      updateWebPage: (update) => {
        this.saveWebPage(update.webpage);
      }
    });
  }
  
  public saveWebPage(apiWebPage: WebPage, messageKey?: string, mediaContext?: ReferenceContext) {
    if(apiWebPage._ === 'webPageNotModified') return;
    const {id} = apiWebPage;

    if(apiWebPage._ === 'webPage') {
      if(apiWebPage.photo?._ === 'photo') {
        apiWebPage.photo = appPhotosManager.savePhoto(apiWebPage.photo, mediaContext);
      } else {
        delete apiWebPage.photo;
      }
  
      if(apiWebPage.document?._ === 'document') {
        apiWebPage.document = appDocsManager.saveDoc(apiWebPage.document, mediaContext);
      } else {
        if(apiWebPage.type === 'document') {
          delete apiWebPage.type;
        }
  
        delete apiWebPage.document;
      }

      const siteName = apiWebPage.site_name;
      let shortTitle = apiWebPage.title || apiWebPage.author || siteName || '';
      if(siteName && shortTitle === siteName) {
        delete apiWebPage.site_name;
      }

      shortTitle = limitSymbols(shortTitle, 80, 100);

      apiWebPage.rTitle = RichTextProcessor.wrapRichText(shortTitle, {noLinks: true, noLinebreaks: true});
      let contextHashtag = '';
      if(siteName === 'GitHub') {
        const matches = apiWebPage.url.match(/(https?:\/\/github\.com\/[^\/]+\/[^\/]+)/);
        if(matches) {
          contextHashtag = matches[0] + '/issues/{1}';
        }
      }

      // delete apiWebPage.description
      const shortDescriptionText = limitSymbols(apiWebPage.description || '', 150, 180);
      apiWebPage.rDescription = RichTextProcessor.wrapRichText(shortDescriptionText, {
        contextSite: siteName || 'external',
        contextHashtag: contextHashtag
      });

      if(!photoTypeSet.has(apiWebPage.type) &&
        !apiWebPage.description &&
        apiWebPage.photo) {
        apiWebPage.type = 'photo';
      }
    }
    
    let pendingSet = this.pendingWebPages[id];
    if(messageKey) {
      if(!pendingSet) pendingSet = this.pendingWebPages[id] = new Set();
      pendingSet.add(messageKey);
    }
    
    if(this.webpages[id] === undefined) {
      this.webpages[id] = apiWebPage;
    } else {
      safeReplaceObject(this.webpages[id], apiWebPage);
    }
    
    if(!messageKey && pendingSet !== undefined) {
      const msgs: {peerId: number, mid: number, isScheduled: boolean}[] = [];
      pendingSet.forEach((value) => {
        const splitted = value.split('_');
        msgs.push({
          peerId: +splitted[0], 
          mid: +splitted[1], 
          isScheduled: !!splitted[2]
        });
      });

      rootScope.dispatchEvent('webpage_updated', {
        id,
        msgs
      });
    }

    return apiWebPage;
  }

  public getMessageKeyForPendingWebPage(peerId: number, mid: number, isScheduled = false) {
    return peerId + '_' + mid + (isScheduled ? '_s' : '');
  }

  public deleteWebPageFromPending(webPage: WebPage, messageKey: string) {
    const id = (webPage as WebPage.webPage).id;
    if(!id) return;

    const set = this.pendingWebPages[id];
    if(set && set.has(messageKey)) {
      set.delete(messageKey);

      if(!set.size) {
        delete this.pendingWebPages[id];
      }
    }
  }

  public getWebPage(id: string) {
    return this.webpages[id];
  }
}

const appWebPagesManager = new AppWebPagesManager();
MOUNT_CLASS_TO && (MOUNT_CLASS_TO.appWebPagesManager = appWebPagesManager);
export default appWebPagesManager;

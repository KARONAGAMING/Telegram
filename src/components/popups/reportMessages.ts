/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2019-2021 Eduard Kuzmenko
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import findUpClassName from "../../helpers/dom/findUpClassName";
import whichChild from "../../helpers/dom/whichChild";
import { ReportReason } from "../../layer";
import appStickersManager from "../../lib/appManagers/appStickersManager";
import { LangPackKey } from "../../lib/langPack";
import Button from "../button";
import PopupPeer from "./peer";
import PopupReportMessagesConfirm from "./reportMessagesConfirm";

export default class PopupReportMessages extends PopupPeer {
  constructor(peerId: number, mids: number[], onConfirm?: () => void) {
    super('popup-report-messages', {titleLangKey: 'ChatTitle.ReportMessages', buttons: [], body: true});

    mids = mids.slice();

    const buttons: [LangPackKey, ReportReason['_']][] = [
      ['ReportChatSpam', 'inputReportReasonSpam'],
      ['ReportChatViolence', 'inputReportReasonViolence'],
      ['ReportChatChild', 'inputReportReasonChildAbuse'],
      ['ReportChatPornography', 'inputReportReasonPornography'],
      ['ReportChatOther', 'inputReportReasonOther']
    ];

    const className = 'btn-primary btn-transparent';
    buttons.forEach(b => {
      const button = Button(className, {/* icon: 'edit',  */text: b[0]});
      this.body.append(button);
    });

    const preloadStickerPromise = appStickersManager.preloadAnimatedEmojiSticker(PopupReportMessagesConfirm.STICKER_EMOJI);

    this.body.addEventListener('click', (e) => {
      const target = findUpClassName(e.target, 'btn-primary');
      const reason = buttons[whichChild(target)][1];

      preloadStickerPromise.then(() => {
        this.hide();

        new PopupReportMessagesConfirm(peerId, mids, reason, onConfirm);
      });
    });
    
    this.body.style.margin = '0 -1rem';
    this.buttons.style.marginTop = '.5rem';

    this.show();
  }
}
